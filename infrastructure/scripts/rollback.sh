#!/usr/bin/env sh
# Rollback local/cloud — Sprint 1 DevSecOps (S1-01)
# Uso local: desde infrastructure/ → ./scripts/rollback.sh
# Restaura el stack Docker al estado del compose del repo y reinicia servicios.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INFRA_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$INFRA_DIR"

echo "⏪ Rollback: deteniendo contenedores actuales..."
docker compose down --remove-orphans 2>/dev/null || true

echo "⏪ Rollback: levantando stack desde docker-compose.yml del repositorio..."
docker compose up -d --build

if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
  sh "$SCRIPT_DIR/health-check.sh" || {
    echo "❌ Rollback completado pero health check falló. Revisar logs: docker compose logs"
    exit 1
  }
fi

echo "✅ Rollback finalizado."
