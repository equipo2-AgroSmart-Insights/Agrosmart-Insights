"""Patrones de secretos compartidos entre check_n8n_drift.py y
export_n8n_workflow.py.

Antes vivían duplicados en cada script. Un fix de 2026-10 (sesión DevSecOps
Sprint 3) encontró que esa duplicación ya había causado falsos positivos de
drift por redacción asimétrica entre un script y otro. Factorizado para que
no pueda volver a pasar: un solo lugar que editar cuando aparezca un nuevo
proveedor con secretos inline.
"""
import re

SECRET_PATTERNS = [
    (re.compile(r'sk-[a-zA-Z0-9]{20,}'), '{{SECRETO_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}'),
    (re.compile(r'jina_[a-zA-Z0-9_-]{20,}'), '{{JINA_API_KEY_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}'),
    (re.compile(r'AIza[a-zA-Z0-9_-]{20,}'), '{{SECRETO_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}'),
    (re.compile(r'sk-or-v1-[a-zA-Z0-9]{20,}'), '{{SECRETO_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}'),
    (re.compile(r'NanamiKento'), '{{BRIDGE_TOKEN_SE_DEBE_MOVER_A_CREDENCIAL}}'),
    (re.compile(r'maptiler\.com[^"\']*?[?&]key=[a-zA-Z0-9_-]{10,}'),
     lambda m: m.group(0).split('key=')[0] + 'key={{MAPTILER_API_KEY_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}'),
    # Placeholders que deja este mismo redactor al correr de nuevo sobre una
    # copia ya redactada — evita doble-escape si el script se corre 2 veces.
    (re.compile(r'\{\{[A-Z0-9_]+\}\}'), lambda m: m.group(0)),
]


def redact(text):
    """Reemplaza cualquier secreto reconocido en `text` por un placeholder
    legible. Usado tanto para el hash de comparación (drift) como para
    escribir un JSON exportado seguro de commitear. `re.sub` acepta tanto
    un string como una función de reemplazo, así que no hace falta
    distinguir el caso acá."""
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text
