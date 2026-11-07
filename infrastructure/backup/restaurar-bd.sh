#!/usr/bin/env bash
# Restaura la base de datos de la app en una base NUEVA y vacía, a partir de
# un respaldo ya descomprimido (la carpeta agrosmart-respaldo-AAAAMMDD-HHMM).
#
# Uso (Linux, macOS o Git Bash en Windows, con psql/pg_restore 18 en el PATH):
#   TARGET_DATABASE_URL=postgresql://usuario:clave@host:5432/base \
#     bash restaurar-bd.sh <carpeta_del_respaldo>
#
# Pasos: 1) crea la extensión pgvector, 2) restaura tablas y datos,
# 3) aplica 003_alertas_riesgo.sql para recrear las funciones que usa WF5
# (es idempotente: no duplica tablas ni reglas que ya vinieron en el dump).
set -euo pipefail

: "${TARGET_DATABASE_URL:?Falta TARGET_DATABASE_URL (cadena de conexión de la base nueva)}"
PKG=${1:?Uso: restaurar-bd.sh <carpeta_del_respaldo>}
DUMP="$PKG/bd/agrosmart_app.dump"
MIG003="$PKG/bd/migraciones/003_alertas_riesgo.sql"
[ -f "$DUMP" ] || { echo "No existe $DUMP: ¿descomprimiste el .7z y pasaste la carpeta correcta?"; exit 1; }

# No se usa --clean: si la base ya tiene estas tablas, se aborta en vez de
# borrar datos de alguien por error.
EXISTENTES=$(psql "$TARGET_DATABASE_URL" -XAtc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('precios_diarios','clima_diario','alertas_riesgo_reglas')")
if [ "$EXISTENTES" != "0" ]; then
  echo "La base de destino ya tiene tablas de AgroSmart. Usa una base nueva y vacía."
  exit 1
fi

echo "1/3 Extensión pgvector"
psql "$TARGET_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector"

echo "2/3 Tablas y datos"
pg_restore --dbname "$TARGET_DATABASE_URL" --no-owner --no-privileges --exit-on-error "$DUMP"

echo "3/3 Funciones de alertas de riesgo (003)"
psql "$TARGET_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$MIG003" > /dev/null

echo "Base restaurada."
