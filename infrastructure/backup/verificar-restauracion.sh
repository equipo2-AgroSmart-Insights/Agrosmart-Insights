#!/usr/bin/env bash
# Prueba que un respaldo sirve: lo descifra, revisa que traiga todo, lo
# restaura en una base vacía con el mismo restaurar-bd.sh del paquete y
# compara las filas restauradas contra las que tenía el origen.
#
# Uso:
#   BACKUP_PASSPHRASE=... TARGET_DATABASE_URL=postgresql://... \
#     bash infrastructure/backup/verificar-restauracion.sh <respaldo.7z>
set -euo pipefail

: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE}"
: "${TARGET_DATABASE_URL:?Falta TARGET_DATABASE_URL}"
ARCHIVO=${1:?Uso: verificar-restauracion.sh <respaldo.7z>}
SEVENZ=$(command -v 7z || command -v 7zz || command -v 7za || true)
[ -n "$SEVENZ" ] || { echo "::error::No se encontró 7-Zip (7z/7zz/7za)"; exit 1; }

FALLOS=0
fallo() { echo "::error::$1"; FALLOS=$((FALLOS + 1)); }

if [ -f "$ARCHIVO.sha256" ]; then
  (cd "$(dirname "$ARCHIVO")" && sha256sum -c "$(basename "$ARCHIVO").sha256" > /dev/null) \
    || fallo "El .7z no coincide con su sha256: archivo dañado"
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
"$SEVENZ" x -p"$BACKUP_PASSPHRASE" -o"$WORK" "$ARCHIVO" > /dev/null
PKG=$(find "$WORK" -mindepth 1 -maxdepth 1 -type d -name 'agrosmart-respaldo-*' | head -1)
[ -n "$PKG" ] || { echo "::error::El .7z no contiene la carpeta agrosmart-respaldo-*"; exit 1; }

echo "== Contenido del paquete"
for f in MANIFIESTO.md MANUAL-RESTAURACION.md ESTRATEGIA-RESPALDO.md restaurar-bd.sh \
         bd/agrosmart_app.dump bd/conteos.tsv bd/migraciones/003_alertas_riesgo.sql \
         codigo/agrosmart-insights-codigo.tar.gz n8n/README.md; do
  [ -s "$PKG/$f" ] || fallo "Falta o está vacío: $f"
done
tar -tzf "$PKG/codigo/agrosmart-insights-codigo.tar.gz" > /dev/null || fallo "El tar.gz del código está dañado"

N_WF=0
for wf in "$PKG"/n8n/*.json; do
  N_WF=$((N_WF + 1))
  jq -e '.nodes and .connections and .id' "$wf" > /dev/null || fallo "Workflow inválido: $(basename "$wf")"
done
[ "$N_WF" -gt 0 ] || fallo "No hay workflows de n8n en el paquete"

echo "== Restaurando en una base vacía"
bash "$PKG/restaurar-bd.sh" "$PKG"

echo "== Comparando filas"
RESUMEN="$WORK/resumen.md"
{
  echo "### Restauración verificada de $(basename "$PKG")"
  echo
  echo "| Tabla | Filas en el respaldo | Filas restauradas | |"
  echo "|---|---|---|---|"
} > "$RESUMEN"
while IFS=$'\t' read -r tabla minimo maximo; do
  restauradas=$(psql "$TARGET_DATABASE_URL" -XAtc "SELECT count(*) FROM public.\"$tabla\"")
  esperado=$([ "$minimo" = "$maximo" ] && echo "$minimo" || echo "$minimo a $maximo")
  if [ "$restauradas" -ge "$minimo" ] && [ "$restauradas" -le "$maximo" ]; then
    estado="OK"
  else
    estado="DISTINTO"
    fallo "$tabla: se esperaban $esperado filas y se restauraron $restauradas"
  fi
  echo "| $tabla | $esperado | $restauradas | $estado |" >> "$RESUMEN"
done < <(tail -n +2 "$PKG/bd/conteos.tsv")

echo "== Funciones de WF5 sobre los datos restaurados"
psql "$TARGET_DATABASE_URL" -XAtc "SELECT alertas_riesgo_evaluar(NULL, true) IS NOT NULL" | grep -qx t \
  || fallo "alertas_riesgo_evaluar() no respondió sobre la base restaurada"
psql "$TARGET_DATABASE_URL" -XAtc "SELECT count(*) FROM pg_extension WHERE extname = 'vector'" | grep -qx 1 \
  || fallo "Falta la extensión pgvector en la base restaurada"

{
  echo
  echo "- Workflows de n8n en el paquete: $N_WF (JSON válidos)"
  echo "- Código fuente: tar.gz íntegro"
  echo "- \`alertas_riesgo_evaluar()\` responde sobre los datos restaurados"
} >> "$RESUMEN"
cat "$RESUMEN"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$RESUMEN" >> "$GITHUB_STEP_SUMMARY"

if [ "$FALLOS" -gt 0 ]; then
  echo "::error::La restauración tuvo $FALLOS problema(s)"
  exit 1
fi
echo "Restauración verificada: el respaldo sirve."
