# Integración de ramas — Sprint 1

Estado al integrar entregables de **HuancaMamani** (Frontend) y **CamayocBernable** (Backend) en `LeonCangalaya`.

## Frontend — Cindy Huanca (`HuancaMamani`)

| Ítem | Estado |
|---|---|
| App React `agrosmart-frontend/` | Integrado desde rama `origin/HuancaMamani` |
| Chat NLQ + contexto + hook | OK |
| Cliente n8n (`pregunta`, `session_id`) | OK — alineado con WF2 |
| UI (CSS, assets, ESLint) | OK |
| Gráfico Chart.js en dashboard | Mejorado para leer `respuesta` + `grafico` |
| Vercel / CI apuntando a subcarpeta | OK |

## Backend — Fiorella Camayoc (`CamayocBernable`)

| Ítem | Estado |
|---|---|
| ZIP / rama remota con workflows n8n | **No incluidos** (solo infra básica Sprint 0) |
| WF0 / WF1 / WF2 versionados | Ya en repo desde integración previa (`src/n8n-workflows/production/`) |
| Esquema SQL v2 + seed GMML | Ya en repo (`src/database/`) |
| Docker + Phoenix + secrets Groq/Gemini | Ya en repo (`infrastructure/`) |

> **Acción recomendada:** pedir a Backend que suba su rama con los JSON de n8n actualizados o confirmar que los de `production/` son la versión final.

## Pendiente global (post-integración)

1. **PR `LeonCangalaya` → `main`** con checks + aprobación.
2. **Vercel:** conectar GitHub, root `src/frontend/agrosmart-frontend`, var `VITE_N8N_WEBHOOK_URL`.
3. **Render:** blueprint `render.yaml`, migraciones SQL, importar WF0–WF2 en n8n UI.
4. **Credentials n8n:** Postgres, Groq, Gemini, Hugging Face (no en JSON).
5. **Seed demo:** cargar `002_seed_v2.sql` en Postgres.
6. **Activar WF1 cron** y validar ingesta MIDAGRI + Open-Meteo en cloud.
7. **ESLint en CI:** el frontend de Huanca tiene `npm run lint`; verificar que pase en PR.
