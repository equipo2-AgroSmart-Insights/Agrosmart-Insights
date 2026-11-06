#!/usr/bin/env bash
# Arma el respaldo completo del proyecto en un solo archivo .7z cifrado:
#   bd/       dump de las tablas de la app (tablas-app.txt) + migraciones + conteos
#   n8n/      workflows versionados (src/n8n-workflows/production)
#   codigo/   código fuente del commit respaldado
#   MANUAL-RESTAURACION.md, restaurar-bd.sh, MANIFIESTO.md
#
# Uso:
#   SOURCE_DATABASE_URL=postgresql://... BACKUP_PASSPHRASE=... \
#     bash infrastructure/backup/respaldar.sh <carpeta_salida>
#
# Necesita pg_dump/psql de la misma versión mayor que el servidor, tar y 7-Zip.
set -euo pipefail

: "${SOURCE_DATABASE_URL:?Falta SOURCE_DATABASE_URL}"
: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE}"
OUT_DIR=${1:?Uso: respaldar.sh <carpeta_salida>}

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
SEVENZ=$(command -v 7z || command -v 7zz || command -v 7za || true)
[ -n "$SEVENZ" ] || { echo "::error::No se encontró 7-Zip (7z/7zz/7za)"; exit 1; }

FECHA=$(date -u +%Y%m%d-%H%M)
NOMBRE="agrosmart-respaldo-$FECHA"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
PKG="$WORK/$NOMBRE"
mkdir -p "$PKG/bd/migraciones" "$PKG/n8n" "$PKG/codigo" "$OUT_DIR"

mapfile -t TABLAS < <(grep -vE '^[[:space:]]*(#|$)' "$SCRIPT_DIR/tablas-app.txt" | tr -d '\r')
TABLE_ARGS=()
for t in "${TABLAS[@]}"; do TABLE_ARGS+=(--table "public.$t"); done

contar_filas() {
  for t in "${TABLAS[@]}"; do
    printf '%s\t%s\n' "$t" "$(psql "$SOURCE_DATABASE_URL" -XAtc "SELECT count(*) FROM public.\"$t\"")"
  done
}

echo "== Base de datos: ${#TABLAS[@]} tablas de la app"
# Conteo antes y después del dump: si WF1 inserta filas mientras corre, el
# dump queda entre ambos valores. La verificación acepta ese rango.
contar_filas > "$WORK/antes.tsv"
pg_dump "$SOURCE_DATABASE_URL" \
  --format=custom --no-owner --no-privileges --strict-names \
  "${TABLE_ARGS[@]}" \
  --file "$PKG/bd/agrosmart_app.dump"
contar_filas > "$WORK/despues.tsv"
{
  printf 'tabla\tfilas_min\tfilas_max\n'
  paste "$WORK/antes.tsv" "$WORK/despues.tsv" | awk -F'\t' '{print $1 "\t" $2 "\t" $4}'
} > "$PKG/bd/conteos.tsv"
SERVER_VERSION=$(psql "$SOURCE_DATABASE_URL" -XAtc "SHOW server_version")
cp "$REPO_ROOT"/src/database/migrations/*.sql "$PKG/bd/migraciones/"

echo "== Workflows de n8n"
cp "$REPO_ROOT"/src/n8n-workflows/production/*.json "$REPO_ROOT"/src/n8n-workflows/production/README.md "$PKG/n8n/"
N_WORKFLOWS=$(find "$PKG/n8n" -name '*.json' | wc -l)

echo "== Código fuente"
tar --exclude='./.git' --exclude='*/node_modules' --exclude='*/dist' \
  --exclude="./$(basename "$OUT_DIR")" \
  -czf "$PKG/codigo/agrosmart-insights-codigo.tar.gz" -C "$REPO_ROOT" .

cp "$SCRIPT_DIR/restaurar-bd.sh" "$PKG/"
cp "$REPO_ROOT/docs/w1-backup-restore/MANUAL-RESTAURACION.md" \
   "$REPO_ROOT/docs/w1-backup-restore/ESTRATEGIA-RESPALDO.md" "$PKG/"

COMMIT=${GITHUB_SHA:-$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo desconocido)}
N8N_IMAGE=$(grep -oE 'n8nio/n8n:[^[:space:]]+' "$REPO_ROOT/render.yaml" | head -1 || echo desconocida)
{
  echo "# Manifiesto del respaldo $NOMBRE"
  echo
  echo "- Fecha (UTC): $FECHA"
  echo "- Commit del código: \`$COMMIT\`"
  echo "- PostgreSQL de origen: $SERVER_VERSION"
  echo "- Imagen de n8n en render.yaml: \`$N8N_IMAGE\`"
  echo "- Workflows de n8n incluidos: $N_WORKFLOWS"
  echo
  echo "## Filas por tabla al momento del respaldo"
  echo
  echo "| Tabla | Filas |"
  echo "|---|---|"
  tail -n +2 "$PKG/bd/conteos.tsv" | awk -F'\t' '{ r = ($2 == $3) ? $2 : $2 " a " $3; print "| " $1 " | " r " |" }'
  echo
  echo "## Qué NO incluye (a propósito)"
  echo
  echo "- Valores de secretos y API keys: se crean de nuevo en la cuenta nueva (ver manual, sección 2)."
  echo "- Tablas internas de n8n (usuarios, credenciales cifradas, historial de ejecuciones)."
  echo "- El servicio local expuesto por ngrok que usan WF0, WF1 y WF4 (su código no está en el repositorio)."
} > "$PKG/MANIFIESTO.md"

echo "== Cifrando"
# -mhe=on cifra también los nombres de archivo. La frase va por argumento
# porque 7-Zip no la lee de una variable; el runner es efímero y GitHub la
# enmascara en los logs.
"$SEVENZ" a -t7z -mx=5 -mhe=on -p"$BACKUP_PASSPHRASE" "$OUT_DIR/$NOMBRE.7z" "$PKG" > /dev/null
(cd "$OUT_DIR" && sha256sum "$NOMBRE.7z" > "$NOMBRE.7z.sha256")

echo "Respaldo listo: $OUT_DIR/$NOMBRE.7z ($(du -h "$OUT_DIR/$NOMBRE.7z" | cut -f1))"
cat "$PKG/MANIFIESTO.md"
