# Despliegue — AgroSmart Insights

> Guía completa Sprint 1: `docs/sprint-1/SETUP-VERCEL-RENDER.md`  
> Secrets GitHub: `docs/sprint-1/SECRETS-GITHUB-SPRINT1.md`

## Pipeline CD (GitHub Actions)

Tras merge a `main`, el workflow `.github/workflows/deploy.yml` ejecuta:

1. **Validar** — lint, build frontend, JSON n8n  
2. **Vercel** — deploy producción (si `VERCEL_TOKEN` configurado)  
3. **Render** — trigger deploy hook n8n (si `RENDER_DEPLOY_HOOK_N8N` configurado)  
4. **Health check** — HTTP 200 (si URLs configuradas)

## Frontend → Vercel

1. Conectar GitHub en [vercel.com/account/settings/authentication](https://vercel.com/account/settings/authentication).
2. **Import Project** → repo `equipo2-AgroSmart-Insights/Agrosmart-Insights`.
3. **Root Directory:** `src/frontend/agrosmart-frontend`
4. **Environment Variable:**
   - `VITE_N8N_WEBHOOK_URL` = URL pública del webhook WF2 (ej. `https://agrosmart-n8n.onrender.com/webhook/v1/query`)
5. Deploy automático en cada merge a `main`.

## Backend → Render

1. Dashboard Render → **New** → **Blueprint** → pegar `render.yaml` del repo.
2. Completar variables `sync: false`:
   - `N8N_HOST` (dominio Render de n8n)
   - `WEBHOOK_URL` (misma base + `/`)
   - `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`
3. Tras crear Postgres, ejecutar migraciones:
   ```bash
   psql $DATABASE_URL -f src/database/migrations/001_schema.sql
   psql $DATABASE_URL -f src/database/migrations/002_indexes.sql
   # Seed opcional (datos demo):
   psql $DATABASE_URL -f src/database/seeders/002_seed_v2.sql
   ```
4. Importar workflows desde `src/n8n-workflows/production/` en n8n UI y mapear credentials.

## Local (desarrollo)

```bash
cd infrastructure
copy .env.example .env
docker compose up -d
cd ../src/frontend/agrosmart-frontend
copy .env.example .env
npm install && npm run dev
```

- n8n: http://localhost:5678  
- Phoenix: http://localhost:6006  
- Frontend: http://localhost:5173
