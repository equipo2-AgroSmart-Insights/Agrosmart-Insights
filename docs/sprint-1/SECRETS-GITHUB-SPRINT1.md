# GitHub Secrets — Sprint 1 DevSecOps (S1-01)

Configurar en: **Settings → Secrets and variables → Actions → Repository secrets**

## Vercel (Frontend — pipeline `deploy-vercel`)

| Secret | Dónde obtenerlo |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel → Project → Settings → General (Team/Org ID) |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General (Project ID) |
| `VITE_N8N_WEBHOOK_URL` | URL pública WF2, ej. `https://agrosmart-n8n.onrender.com/webhook/v1/query` |
| `FRONTEND_HEALTH_URL` | URL del frontend en Vercel, ej. `https://agrosmart.vercel.app` |

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
1. Validación (lint, build, JSON n8n)
2. Deploy Vercel (si tokens configurados)
3. Trigger Render (si deploy hook configurado)
4. Health check post-deploy (si URLs configuradas)
