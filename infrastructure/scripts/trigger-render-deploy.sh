#!/usr/bin/env sh
# Dispara un redeploy en Render mediante Deploy Hook (S1-01).
# Uso: ./trigger-render-deploy.sh "https://api.render.com/deploy/srv-...?key=..."

set -eu

HOOK_URL="${1:-${RENDER_DEPLOY_HOOK:-}}"

if [ -z "$HOOK_URL" ]; then
  echo "❌ Falta URL del Deploy Hook de Render."
  exit 1
fi

code=$(curl -s -o /tmp/render-deploy.out -w "%{http_code}" -X POST "$HOOK_URL")
cat /tmp/render-deploy.out
echo ""

if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "202" ]; then
  echo "✅ Render deploy hook aceptado (HTTP $code)."
  exit 0
fi

echo "❌ Render deploy hook falló (HTTP $code)."
exit 1
