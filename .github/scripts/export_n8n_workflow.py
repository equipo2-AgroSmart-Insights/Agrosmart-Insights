#!/usr/bin/env python3
"""Exporta uno o más workflows desde producción (Render Postgres) a archivos
JSON listos para commitear en src/n8n-workflows/production/, con los
secretos ya redactados.

Nace de un problema recurrente: n8n-drift-check.yml detecta cuando un
workflow se editó en vivo en el editor y la copia en git quedó vieja, pero
hasta ahora resincronizar esa copia significaba conectarse a mano a la base
de datos de producción con psycopg2 y armar el JSON a mano. Este script
hace ese resync de forma repetible, usando el MISMO secret
(RENDER_DATABASE_URL) que ya existe en GitHub Actions — nunca hace falta
que el secreto pase por la laptop de nadie.

Solo lee (SELECT) — nunca escribe en workflow_entity. Pensado para correrse
vía workflow_dispatch en n8n-export.yml, que abre un PR con el resultado en
vez de commitear directo a main (mismo principio que el resto del repo:
nada toca `main` sin pasar por review).

Uso:
    python export_n8n_workflow.py <workflow_id> [<workflow_id> ...]
    python export_n8n_workflow.py --all-known   # todos los que ya están en git

Requiere RENDER_DATABASE_URL en el entorno.
"""
import json
import os
import sys
from pathlib import Path

import psycopg2

from n8n_secrets import redact

PROD_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "n8n-workflows" / "production"


def existing_git_files_by_id():
    mapping = {}
    for f in sorted(PROD_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        wf_id = data.get("id")
        if wf_id:
            mapping[wf_id] = f.name
    return mapping


def fetch_workflow(cur, wf_id):
    cur.execute(
        "SELECT id, name, nodes, connections, active, settings, \"versionId\", meta "
        "FROM workflow_entity WHERE id = %s;",
        (wf_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    wf_id, name, nodes, connections, active, settings, version_id, meta = row
    return {
        "name": name,
        "nodes": nodes,
        "pinData": {},
        "connections": connections,
        "active": active,
        "settings": settings or {},
        "versionId": version_id,
        "meta": meta or {},
        "id": wf_id,
    }


def redact_workflow(workflow):
    # Redacta a nivel de texto (no campo por campo) para no tener que saber
    # de antemano en qué parámetro de qué nodo puede aparecer un secreto —
    # mismo enfoque que check_n8n_drift.py usa para el hash.
    raw = json.dumps(workflow, ensure_ascii=False)
    raw = redact(raw)
    return json.loads(raw)


def main():
    args = sys.argv[1:]
    if not args:
        print("Uso: export_n8n_workflow.py <workflow_id> [...] | --all-known", file=sys.stderr)
        return 2

    known = existing_git_files_by_id()

    if args == ["--all-known"]:
        ids = list(known.keys())
    else:
        ids = args

    conn = psycopg2.connect(os.environ["RENDER_DATABASE_URL"], sslmode="require")
    cur = conn.cursor()

    exported, missing = [], []
    for wf_id in ids:
        workflow = fetch_workflow(cur, wf_id)
        if workflow is None:
            missing.append(wf_id)
            continue

        workflow = redact_workflow(workflow)

        filename = known.get(wf_id)
        if filename is None:
            # Workflow activo sin copia en git todavía (el caso más grave
            # que ya reporta check_n8n_drift.py) — igual lo exportamos, con
            # un nombre que deja claro que hay que revisarlo y renombrarlo.
            filename = f"wf-nuevo-revisar-nombre-{wf_id}.json"

        out_path = PROD_DIR / filename
        out_path.write_text(
            json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        exported.append((wf_id, filename, len(workflow["nodes"])))

    conn.close()

    print("=== Export de workflows n8n ===\n")
    for wf_id, filename, node_count in exported:
        print(f"  - {filename} (id={wf_id}): {node_count} nodos exportados")
    if missing:
        print(f"\nNo encontrados en producción (¿id incorrecto?): {', '.join(missing)}")

    print(
        "\nREVISAR ANTES DE COMMITEAR: la redacción es genérica por patrón "
        "({{SECRETO_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}} para los que no "
        "matchean un proveedor conocido). Si aparece ese placeholder "
        "genérico, vale la pena revisar a mano si merece un nombre más "
        "descriptivo antes de abrir el PR."
    )
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
