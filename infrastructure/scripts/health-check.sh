#!/usr/bin/env sh
# Health check AgroSmart — Sprint 1 DevSecOps (S1-01)
# Uso: ./health-check.sh
# Variables opcionales: N8N_URL, FRONTEND_URL, PHOENIX_URL

set -eu

N8N_URL="${N8N_URL:-http://localhost:5678/healthz}"
FRONTEND_URL="${FRONTEND_URL:-}"
PHOENIX_URL="${PHOENIX_URL:-}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"

check_url() {
  name="$1"
  url="$2"
  if [ -z "$url" ]; then
    echo "⏭️  $name: omitido (URL no configurada)"
    return 0
  fi
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then
    echo "✅ $name: HTTP $code ($url)"
    return 0
  fi
  echo "❌ $name: HTTP $code ($url)"
  return 1
}

failed=0
check_url "n8n" "$N8N_URL" || failed=1
check_url "Phoenix" "$PHOENIX_URL" || true
check_url "Frontend" "$FRONTEND_URL" || true

if [ "$failed" -ne 0 ]; then
  echo "Health check falló."
  exit 1
fi

echo "Health check OK."
