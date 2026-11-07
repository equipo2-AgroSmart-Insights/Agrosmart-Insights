#!/usr/bin/env bash
# Arma el respaldo completo del proyecto en un solo archivo .7z cifrado:
#   bd/       tablas de la app (detectadas en la base), funciones, vistas,
#             migraciones y conteos de filas
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

# Las tablas de la app se detectan en la base, no se leen de una lista fija:
# el equipo crea y renombra tablas a mano (ej. productos_alias_mmf desapareció
# entre el 02/11 y el 06/11) y una lista fija dejaba el respaldo incompleto.
# Entra todo lo que esté en public salvo las tablas internas de n8n (usuarios,
# credenciales, ejecuciones: datos personales y secretos) y las prueba_*.
N8N_TABLAS='^(activity_event|agent_.*|agents.*|ai_.*|annotation_tag_entity|auth_.*|binary_data|chat_hub_.*|credential_.*|credentials_entity|data_table.*|deployment_key|dynamic_credential_.*|evaluation_.*|event_destinations|execution_.*|folder.*|insights_.*|installed_.*|instance_.*|invalid_auth_token|mcp_registry_.*|migrations|oauth_.*|poller_state|processed_data|project.*|promotion_.*|role.*|scheduled_.*|scope|secrets_provider_.*|settings|shared_.*|tag_entity|test_case_execution|test_run|token_exchange_jti|trusted_key.*|type_availability_.*|user|user_.*|variables|webhook_entity|workflow.*)$'
mapfile -t TABLAS < <(psql "$SOURCE_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public'
     AND tablename !~ '$N8N_TABLAS' AND tablename !~ '^prueba_' ORDER BY 1")
[ "${#TABLAS[@]}" -gt 0 ] || { echo "::error::No se encontró ninguna tabla de la app en public"; exit 1; }

# tablas-app.txt es la lista de tablas conocidas: no decide qué entra, sirve
# para avisar cuando la base cambió sin que nadie lo documentara.
mapfile -t CONOCIDAS < <(grep -vE '^[[:space:]]*(#|$)' "$SCRIPT_DIR/tablas-app.txt" | tr -d '\r')
NUEVAS=$(comm -23 <(printf '%s\n' "${TABLAS[@]}" | sort) <(printf '%s\n' "${CONOCIDAS[@]}" | sort) | paste -sd' ' -)
FALTANTES=$(comm -13 <(printf '%s\n' "${TABLAS[@]}" | sort) <(printf '%s\n' "${CONOCIDAS[@]}" | sort) | paste -sd' ' -)
[ -z "$NUEVAS" ] || echo "::warning::Tablas nuevas incluidas en el respaldo (agregarlas a tablas-app.txt): $NUEVAS"
[ -z "$FALTANTES" ] || echo "::warning::Tablas de tablas-app.txt que ya no existen en la base: $FALTANTES"

TABLE_ARGS=()
for t in "${TABLAS[@]}"; do TABLE_ARGS+=(--table "public.\"$t\""); done

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

# Extensiones que usa la base (pgvector para el chat, unaccent en
# resolver_producto_mmf2...). La restauración las crea todas antes de nada.
psql "$SOURCE_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 \
  -c "SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY 1" > "$PKG/bd/extensiones.txt"

# pg_dump --table no incluye funciones ni vistas, y hay funciones creadas a
# mano fuera de las migraciones que usan los workflows (ej.
# resolver_producto_mmf2 en WF0-MMF2 y WF1). Se excluyen las que trae una
# extensión (se recrean con CREATE EXTENSION) y las internas de n8n.
echo "== Funciones y vistas"
SQL_FUNCIONES="FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
    AND p.proname !~ '^(increment_workflow_version)$'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')"
# Igual que hace pg_dump: sin validar cuerpos al crearlas, para que el orden
# no importe (una función puede llamar a otra que se crea después).
{
  echo "SET check_function_bodies = false;"
  psql "$SOURCE_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 \
    -c "SELECT pg_get_functiondef(p.oid) || ';' $SQL_FUNCIONES ORDER BY p.proname, p.oid"
} > "$PKG/bd/funciones.sql"
psql "$SOURCE_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 \
  -c "SELECT DISTINCT p.proname $SQL_FUNCIONES ORDER BY 1" > "$PKG/bd/funciones.txt"
psql "$SOURCE_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 \
  -c "SELECT format('CREATE OR REPLACE VIEW public.%I AS %s;', viewname, rtrim(rtrim(definition), ';'))
      FROM pg_views WHERE schemaname = 'public' ORDER BY viewname" > "$PKG/bd/vistas.sql"
N_FUNCIONES=$(grep -c . "$PKG/bd/funciones.txt" || true)
N_VISTAS=$(grep -c '^CREATE OR REPLACE VIEW' "$PKG/bd/vistas.sql" || true)

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
  echo "- Extensiones de PostgreSQL: $(paste -sd' ' "$PKG/bd/extensiones.txt")"
  echo "- Funciones de la base: $N_FUNCIONES ($(paste -sd' ' "$PKG/bd/funciones.txt"))"
  echo "- Vistas: $N_VISTAS"
  [ -z "$NUEVAS" ] || echo "- ⚠️ Tablas nuevas (no estaban en tablas-app.txt): $NUEVAS"
  [ -z "$FALTANTES" ] || echo "- ⚠️ Tablas de tablas-app.txt que ya no existen: $FALTANTES"
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
  echo "- El puente MIDAGRI en ejecución: su código viaja en codigo/ (src/midagri-bridge/), pero hay que encenderlo en una computadora con ngrok (manual, paso 5.3)."
} > "$PKG/MANIFIESTO.md"

echo "== Cifrando"
# -mhe=on cifra también los nombres de archivo. La frase va por argumento
# porque 7-Zip no la lee de una variable; el runner es efímero y GitHub la
# enmascara en los logs.
"$SEVENZ" a -t7z -mx=5 -mhe=on -p"$BACKUP_PASSPHRASE" "$OUT_DIR/$NOMBRE.7z" "$PKG" > /dev/null
(cd "$OUT_DIR" && sha256sum "$NOMBRE.7z" > "$NOMBRE.7z.sha256")

echo "Respaldo listo: $OUT_DIR/$NOMBRE.7z ($(du -h "$OUT_DIR/$NOMBRE.7z" | cut -f1))"
cat "$PKG/MANIFIESTO.md"
