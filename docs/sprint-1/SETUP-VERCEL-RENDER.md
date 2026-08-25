# Setup Vercel + Render — Pipeline CD Sprint 1

Guía paso a paso para cerrar **S1-01** con servicios en cloud y CD desde GitHub Actions.

---

## Parte A — Vercel (Frontend)

### A1. Conectar GitHub
1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Importar `equipo2-AgroSmart-Insights/Agrosmart-Insights`
3. **Root Directory:** `src/frontend/agrosmart-frontend`
4. Framework: Vite (auto-detectado)

### A2. Variable de entorno en Vercel
- `VITE_N8N_WEBHOOK_URL` = URL del webhook n8n (Render, paso B)

### A3. Secrets en GitHub (para pipeline Actions)
Copiar desde Vercel → Project Settings:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- También `VITE_N8N_WEBHOOK_URL` y `FRONTEND_HEALTH_URL`

Ver lista completa: `SECRETS-GITHUB-SPRINT1.md`

### A4. Verificar pipeline
Tras merge a `main`, el job **Desplegar Frontend en Vercel** en `.github/workflows/deploy.yml` despliega automáticamente.

---

## Parte B — Render (n8n + PostgreSQL)

### B1. Crear Blueprint
1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
2. Conectar repo y seleccionar `render.yaml`
3. Completar variables sync:false:
   - `N8N_HOST` → dominio que asigne Render (sin https)
   - `WEBHOOK_URL` → `https://<dominio-n8n>/`
   - API keys: GROQ, GEMINI, HUGGINGFACE, MAPTILER

### B2. Migraciones SQL
En Render Postgres → Connect → usar `psql` o shell:

```bash
psql "$DATABASE_URL" -f src/database/migrations/001_schema.sql
psql "$DATABASE_URL" -f src/database/migrations/002_indexes.sql
# Opcional seed demo:
psql "$DATABASE_URL" -f src/database/seeders/002_seed_v2.sql
```

### B3. Deploy Hook → GitHub Secret
1. Render → Service **agrosmart-n8n** → Settings → **Deploy Hook**
2. Copiar URL → GitHub Secret `RENDER_DEPLOY_HOOK_N8N`
3. Agregar `N8N_HEALTH_URL` = `https://<dominio>/healthz`

### B4. Importar workflows n8n
En UI de n8n (URL Render): importar JSON desde `src/n8n-workflows/production/` y mapear Credentials.

---

## Parte C — Verificación (Health Check)

```bash
# Local
cd infrastructure
./scripts/health-check.sh

# Tras deploy cloud (con URLs en .env o secrets)
N8N_URL=https://xxx.onrender.com/healthz \
FRONTEND_URL=https://xxx.vercel.app \
./scripts/health-check.sh
```

Si falla: `./scripts/rollback.sh` (local) o redeploy desde Vercel/Render dashboard.

---

## Parte D — Alternativa SSH (planning doc)

Si usas VPS propio en lugar de Render:
1. Secrets: `SSH_KEY`, `SERVER_HOST`, `SERVER_USER`
2. GitHub Actions → **Deploy Sprint 1** → **Run workflow** (manual)
3. Job **Despliegue Docker vía SSH** ejecuta `docker compose up -d` + health check + rollback automático si falla.

---

## Flujo CD unificado (lo que pide la profe)

```
PR → 3 checks obligatorios (n8n, frontend, ia-ops)
       ↓ merge a main
push main → deploy.yml
       ├─ validate (lint, build, JSON)
       ├─ deploy-vercel (prod)
       ├─ deploy-render (hook)
       └─ health check HTTP 200
```

Este flujo cumple **S1-01** (pipeline CI/CD + cloud + health + rollback).
