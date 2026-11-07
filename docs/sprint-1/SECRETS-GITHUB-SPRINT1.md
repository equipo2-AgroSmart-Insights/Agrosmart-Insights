# GitHub Secrets — Sprint 1 DevSecOps (S1-01)

Configurar en: **Settings → Secrets and variables → Actions → Repository secrets**

## Vercel (Frontend Shell — pipeline `deploy-vercel`)

| Secret | Dónde obtenerlo |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel → Project → Settings → General (Team/Org ID) |
| `VERCEL_PROJECT_ID` | Vercel → Project (`agrosmart-frontend`) → Settings → General (Project ID) |
| `VITE_N8N_WEBHOOK_URL` | URL pública WF2, ej. `https://agrosmart-n8n.onrender.com/webhook/v1/query` |
| `VITE_CHAT_REMOTE_URL` | URL pública del `remoteEntry.js` de `chat-microfrontend` en Vercel (`https://<chat-mfe>.vercel.app/assets/remoteEntry.js`) |
| `VITE_MONITOREO_REMOTE_URL` | URL pública del `remoteEntry.js` de `monitoreo-microfrontend` en Vercel (`https://<monitoreo-mfe>.vercel.app/assets/remoteEntry.js`) |
| `VITE_MERCADOS_REMOTE_URL` | URL pública del `remoteEntry.js` de `mercados-microfrontend` en Vercel (`https://<mercados-mfe>.vercel.app/assets/remoteEntry.js`) |
| `VITE_ALERTAS_REMOTE_URL` | URL pública del `remoteEntry.js` de `alertas-microfrontend` en Vercel (`https://<alertas-mfe>.vercel.app/assets/remoteEntry.js`) |
| `VITE_CALENDARIO_REMOTE_URL` | URL pública del `remoteEntry.js` de `calendario-microfrontend` en Vercel (`https://<calendario-mfe>.vercel.app/assets/remoteEntry.js`) |
| `FRONTEND_HEALTH_URL` | URL del frontend en Vercel, ej. `https://agrosmart-insights.vercel.app` |

## Vercel (Microfrontends independientes — pipeline `deploy-microfrontends`)

| Secret | Dónde obtenerlo |
|---|---|
| `VERCEL_PROJECT_ID_CHAT` | Project ID de Vercel para `src/frontend/chat-microfrontend` |
| `VERCEL_PROJECT_ID_MONITOREO` | Project ID de Vercel para `src/frontend/monitoreo-microfrontend` |
| `VERCEL_PROJECT_ID_MERCADOS` | Project ID de Vercel para `src/frontend/mercados-microfrontend` |
| `VERCEL_PROJECT_ID_ALERTAS` | Project ID de Vercel para `src/frontend/alertas-microfrontend` |
| `VERCEL_PROJECT_ID_CALENDARIO` | Project ID de Vercel para `src/frontend/calendario-microfrontend` |
| `VITE_ALERTS_WEBHOOK_URL` | URL pública del webhook de alertas en n8n (usada al compilar `alertas-microfrontend`) |
| `VITE_CALENDARIO_API_URL` | URL pública del webhook de calendario en n8n (usada al compilar `calendario-microfrontend`) |

## Render (Backend n8n — pipeline `deploy-render`)

| Secret | Dónde obtenerlo |
|---|---|
| `RENDER_DEPLOY_HOOK_N8N` | Render → Service agrosmart-n8n → Settings → Deploy Hook |
| `N8N_HEALTH_URL` | `https://<tu-servicio>.onrender.com/healthz` |

## SSH / Docker (alternativa S1-01 — job manual `deploy-via-ssh`)

| Secret | Descripción |
|---|---|
| `SSH_KEY` | Llave privada PEM para el servidor |
| `SERVER_HOST` | IP o dominio del servidor (planning: SERVER_IP) |
| `SERVER_USER` | Usuario SSH (default `root`) |
| `DOCKER_CREDENTIALS` | Opcional: token registry si se usa imagen privada |

## IA / DB (ya configurados Sprint 0)

`GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`, `POSTGRES_PASSWORD_DEV`

## Health check opcional

| Secret | Uso |
|---|---|
| `PHOENIX_HEALTH_URL` | Observabilidad local/cloud |

Tras configurar secrets, un **push a `main`** ejecuta automáticamente:
1. Validación (lint, build del shell y microfrontends, JSON n8n)
2. Deploy de microfrontends remotos y del shell en Vercel (si tokens configurados)
3. Trigger Render (si deploy hook configurado)
4. Health check post-deploy (si URLs configuradas)
