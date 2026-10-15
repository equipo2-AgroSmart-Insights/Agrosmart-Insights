#!/usr/bin/env python3
"""Compara los workflows reales en producción (Render Postgres) contra las
copias versionadas en src/n8n-workflows/production/, y detecta:

  1. Workflows ACTIVOS en producción sin ninguna copia en git (el hueco más
     grave: nadie puede revisar ni auditar lo que corre en vivo).
  2. Copias en git cuyo id ya no existe en producción (probablemente el
     workflow fue recreado/duplicado en el editor en vez de editado in-place,
     dejando la copia de git huérfana).
  3. Copias en git cuyo id sí existe pero el contenido (nodes + connections)
     ya no coincide (drift real).

Sale con código distinto de cero si encuentra el caso 1 (el único realmente
peligroso para producción); los casos 2 y 3 se reportan pero no fallan el
job por sí solos, salvo que además involucren un workflow activo.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

import psycopg2

PROD_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "n8n-workflows" / "production"

# Mismos patrones que n8n-validate-ci.yml / sync manual. Se aplican a AMBOS
# lados (git y producción) antes de comparar el hash: las copias en git
# llevan las credenciales redactadas por diseño, así que comparar el JSON
# crudo de producción contra el redactado de git siempre daría "drift" por
# la redacción en sí, no por un cambio real.
SECRET_PATTERNS = [
    re.compile(r'sk-[a-zA-Z0-9]{20,}'),
    re.compile(r'jina_[a-zA-Z0-9_-]{20,}'),
    re.compile(r'AIza[a-zA-Z0-9_-]{20,}'),
    re.compile(r'sk-or-v1-[a-zA-Z0-9]{20,}'),
    re.compile(r'NanamiKento'),
    # Placeholders que deja el sync manual al redactar (ej. "{{JINA_API_KEY_...}}")
    re.compile(r'\{\{[A-Z0-9_]+\}\}'),
]


def content_hash(nodes, connections):
    payload = json.dumps({"nodes": nodes, "connections": connections}, sort_keys=True, ensure_ascii=False)
    for pattern in SECRET_PATTERNS:
        payload = pattern.sub('__REDACTED__', payload)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def load_git_copies():
    copies = {}
    for f in sorted(PROD_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        wf_id = data.get("id")
        if not wf_id:
            continue
        copies[wf_id] = {
            "file": f.name,
            "name": data.get("name"),
            "hash": content_hash(data.get("nodes", []), data.get("connections", {})),
            "node_count": len(data.get("nodes", [])),
        }
    return copies


def load_production():
    conn = psycopg2.connect(os.environ["RENDER_DATABASE_URL"], sslmode="require")
    cur = conn.cursor()
    cur.execute('SELECT id, name, active, nodes, connections FROM workflow_entity;')
    rows = {}
    for wf_id, name, active, nodes, connections in cur.fetchall():
        rows[wf_id] = {
            "name": name,
            "active": active,
            "hash": content_hash(nodes, connections),
            "node_count": len(nodes),
        }
    conn.close()
    return rows


def main():
    git_copies = load_git_copies()
    production = load_production()

    problems_criticos = []
    avisos = []

    for wf_id, prod in production.items():
        if prod["active"] and wf_id not in git_copies:
            problems_criticos.append(
                f"ACTIVO SIN GIT: '{prod['name']}' (id={wf_id}, {prod['node_count']} nodos) "
                f"está corriendo en producción y no tiene ninguna copia versionada."
            )

    for wf_id, git in git_copies.items():
        if wf_id not in production:
            avisos.append(
                f"HUÉRFANO EN GIT: {git['file']} (id={wf_id}, '{git['name']}') ya no existe "
                f"en producción bajo ese id — probablemente fue recreado en el editor."
            )
        else:
            prod = production[wf_id]
            if prod["hash"] != git["hash"]:
                sev = problems_criticos if prod["active"] else avisos
                sev.append(
                    f"DESINCRONIZADO: {git['file']} (id={wf_id}) tiene {git['node_count']} nodos "
                    f"en git vs {prod['node_count']} en producción (active={prod['active']})."
                )

    print("=== Chequeo de sincronización n8n <-> git ===\n")
    if not problems_criticos and not avisos:
        print("Todo sincronizado. Ningún workflow activo sin copia en git, ninguna copia desactualizada.")
        return 0

    if problems_criticos:
        print(f"CRÍTICOS ({len(problems_criticos)}):")
        for p in problems_criticos:
            print(f"  - {p}")
        print()

    if avisos:
        print(f"Avisos ({len(avisos)}):")
        for a in avisos:
            print(f"  - {a}")

    return 1 if problems_criticos else 0


if __name__ == "__main__":
    sys.exit(main())
