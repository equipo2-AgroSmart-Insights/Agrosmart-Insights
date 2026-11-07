#!/usr/bin/env bash
# Restaura la base de datos de la app en una base NUEVA y vacía, a partir de
# un respaldo ya descomprimido (la carpeta agrosmart-respaldo-AAAAMMDD-HHMM).
#
# Uso (Linux, macOS o Git Bash en Windows, con psql/pg_restore 18 en el PATH):
#   TARGET_DATABASE_URL=postgresql://usuario:clave@host:5432/base \
#     bash restaurar-bd.sh <carpeta_del_respaldo>
#
# El orden importa: las funciones en SQL se validan al crearlas (necesitan
# las tablas) y los triggers necesitan las funciones. Por eso pg_restore va
# por secciones: tablas vacías → funciones y vistas → datos → índices,
# restricciones y triggers. Al final se aplica 003_alertas_riesgo.sql, que
# es idempotente (no duplica tablas ni reglas que ya vinieron en el dump).
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

restaurar_seccion() {
  pg_restore --dbname "$TARGET_DATABASE_URL" --no-owner --no-privileges --exit-on-error --section="$1" "$DUMP"
}
aplicar_sql() {
  if [ -s "$1" ]; then psql "$TARGET_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$1" > /dev/null; fi
}

echo "1/6 Extensiones de PostgreSQL"
EXTENSIONES="vector"
[ -s "$PKG/bd/extensiones.txt" ] && EXTENSIONES=$(tr -d '\r' < "$PKG/bd/extensiones.txt")
for ext in $EXTENSIONES; do
  psql "$TARGET_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS \"$ext\""
done

echo "2/6 Tablas (sin datos)"
restaurar_seccion pre-data

echo "3/6 Funciones y vistas"
aplicar_sql "$PKG/bd/funciones.sql"
aplicar_sql "$PKG/bd/vistas.sql"

echo "4/6 Datos"
restaurar_seccion data

echo "5/6 Índices, restricciones y triggers"
restaurar_seccion post-data

echo "6/6 Migración 003 (alertas de riesgo)"
aplicar_sql "$MIG003"

echo "Base restaurada."
