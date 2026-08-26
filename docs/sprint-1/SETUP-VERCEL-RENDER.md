# Setup Vercel + Render — Guía práctica Sprint 1

Guía paso a paso para **S1-01**: tener AgroSmart funcionando en la nube y con despliegue automático desde GitHub.

---

## ¿Qué vamos a lograr? (en una frase)

Un usuario abre la página en **Vercel**, escribe una pregunta, y el frontend llama por HTTP al **webhook de n8n en Render**, que consulta PostgreSQL y responde con texto y/o gráfico.

---

## Mapa mental — ¿Quién hace qué?

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO (navegador)                                        │
│       │ escribe pregunta                                    │
│       ▼                                                     │
│  VERCEL  →  Frontend React (agrosmart-frontend)             │
│       │ POST { pregunta, session_id }                       │
│       ▼                                                     │
│  RENDER  →  n8n (WF2 webhook /webhook/v1/query)             │
│       │ consulta SQL                                        │
│       ▼                                                     │
│  RENDER  →  PostgreSQL (agrosmart_db)                       │
└─────────────────────────────────────────────────────────────┘
```

| Servicio | Plataforma | Qué es | Archivo clave en el repo |
|---|---|---|---|
| Frontend chat | **Vercel** | Página web React + Vite | `src/frontend/agrosmart-frontend/` |
| Motor n8n | **Render** | Automatización + API del chat | `render.yaml` |
| Base de datos | **Render** | PostgreSQL con pgvector | `src/database/migrations/` |

**¿Por qué dos plataformas?** Vercel es ideal para frontend estático (rápido, gratis). Render permite correr n8n y Postgres en el plan free. Es el diseño acordado en Sprint 1.

---

## Orden recomendado (síguelo en este orden)

| Paso | Dónde | Qué haces | Por qué este orden |
|---|---|---|---|
| **1** | Render | Crear n8n + Postgres | Necesitas la URL del webhook antes de configurar Vercel |
| **2** | Render | Ejecutar migraciones SQL | n8n necesita tablas en la BD |
| **3** | Render | Importar workflows n8n | WF2 es el webhook que usa el frontend |
| **4** | Vercel | Importar frontend | Ya sabes la URL de n8n para la variable de entorno |
| **5** | GitHub | Secrets para CD automático | Opcional: deploy solo con push a `main` |
| **6** | Navegador | Probar el chat | Verificar que todo conecta |

> Si ya empezaste Vercel (como en tus capturas), está bien. Solo falta el paso 4.4 cuando Render esté listo.

---

# PARTE 1 — Render (Backend: n8n + PostgreSQL)

## Paso 1.1 — Crear cuenta y conectar GitHub

1. Ir a [dashboard.render.com](https://dashboard.render.com).
2. Registrarse / iniciar sesión (puede ser con la misma cuenta GitHub).
3. Autorizar acceso al repo `equipo2-AgroSmart-Insights/Agrosmart-Insights`.

## Paso 1.2 — Crear servicios con Blueprint

Un **Blueprint** es un archivo YAML que le dice a Render qué crear automáticamente. Nosotros ya lo tenemos: `render.yaml` en la raíz del repo.

1. Render Dashboard → **New +** → **Blueprint**.
2. Seleccionar el repo `Agrosmart-Insights`.
3. Render lee `render.yaml` y propone crear:
   - **Base de datos:** `agrosmart-postgres`
   - **Servicio web:** `agrosmart-n8n` (imagen Docker de n8n)

4. Clic en **Apply**.

## Paso 1.3 — Completar variables secretas

Render pedirá valores para variables marcadas `sync: false`. Rellenar:

| Variable | Qué poner | Ejemplo |
|---|---|---|
| `N8N_HOST` | Dominio de n8n **sin** `https://` | `agrosmart-n8n.onrender.com` |
| `WEBHOOK_URL` | URL base pública de n8n | `https://agrosmart-n8n.onrender.com/` |
| `GROQ_API_KEY` | Tu key de Groq | `gsk_...` |
| `GEMINI_API_KEY` | Tu key de Google Gemini | `AI...` |
| `HUGGINGFACE_API_KEY` | Tu key de Hugging Face | `hf_...` |
| `MAPTILER_API_KEY` | Tu key de MapTiler | (desde Sprint 0) |

**¿De dónde sale `N8N_HOST`?** Render asigna un dominio al crear el servicio. Lo ves en: Service `agrosmart-n8n` → **Settings** → dominio tipo `agrosmart-n8n-xxxx.onrender.com`. Copia solo el host (sin `https://`).

Las demás variables de BD (`DB_POSTGRESDB_*`) las enlaza Render automáticamente desde la base de datos.

## Paso 1.4 — Esperar que n8n arranque

1. Ir a **agrosmart-n8n** → **Logs**.
2. Esperar mensajes de inicio sin errores (~2–5 min en plan free).
3. Abrir la URL pública del servicio en el navegador → debe cargar la UI de n8n.
4. **Primera vez:** crear usuario admin de n8n (email + contraseña).

## Paso 1.5 — Ejecutar migraciones SQL

La base de datos está vacía. Hay que crear tablas.

**Opción A — Desde tu PC (recomendada):**

1. Render → **agrosmart-postgres** → **Connect** → copiar **External Database URL**.
2. En terminal (con `psql` instalado):

```bash
# Reemplaza DATABASE_URL con la URL que copiaste
psql "DATABASE_URL" -f src/database/migrations/001_schema.sql
psql "DATABASE_URL" -f src/database/migrations/002_indexes.sql

# Opcional — datos de demo para probar el chat:
psql "DATABASE_URL" -f src/database/seeders/002_seed_v2.sql
```

**Opción B — Shell web de Render:**

Render → Postgres → **Shell** → pegar el contenido de los archivos SQL.

## Paso 1.6 — Importar workflows n8n

1. Abrir n8n en el navegador (URL de Render).
2. **Workflows** → **Import from File**.
3. Importar los 3 JSON del repo:
   - `src/n8n-workflows/production/wf0-ingesta-mensual-rag-midagri.json`
   - `src/n8n-workflows/production/wf1-ingesta-diaria-precios-clima.json`
   - `src/n8n-workflows/production/wf2-api-chat-analisis-predictivo.json`
4. En cada workflow: configurar **Credentials** (Postgres, Groq, Gemini, etc.) apuntando a los mismos valores del Blueprint.
5. **Activar WF2** (toggle verde). WF0/WF1 son cron — activar cuando quieras ingesta automática.

## Paso 1.7 — Anotar la URL del webhook (importante)

WF2 expone un webhook en la ruta `v1/query`. La URL completa será:

```
https://<tu-dominio-n8n>.onrender.com/webhook/v1/query
```

**Guárdala.** La necesitas en Vercel.

Para probar manualmente (opcional):

```bash
curl -X POST "https://TU-N8N.onrender.com/webhook/v1/query" \
  -H "Content-Type: application/json" \
  -d "{\"pregunta\":\"precio de papa\",\"session_id\":\"test-1\"}"
```

## Paso 1.8 — Deploy Hook para GitHub (CD automático)

1. Render → **agrosmart-n8n** → **Settings** → **Deploy Hook** → **Create**.
2. Copiar la URL del hook.
3. GitHub repo → **Settings** → **Secrets** → **Actions** → New secret:
   - Nombre: `RENDER_DEPLOY_HOOK_N8N`
   - Valor: la URL del hook
4. Otro secret: `N8N_HEALTH_URL` = `https://<tu-n8n>.onrender.com/healthz`

---

# PARTE 2 — Vercel (Frontend React)

## Paso 2.1 — Importar el repositorio

1. [vercel.com](https://vercel.com) → **Add New → Project**.
2. Elegir repo **`equipo2-AgroSmart-Insights/Agrosmart-Insights`**.
3. Rama: **`main`**.
4. Nombre sugerido: **`agrosmart-insights`**.

> Evidencia: ver informe `docs/sprint-1/informes/devsecops/Informe-Configuracion-Vercel-Sprint1.md`.

## Paso 2.2 — Root Directory (paso crítico)

Por defecto Vercel usa `./` (raíz). **Eso falla** porque el frontend está en una subcarpeta.

1. Clic en **Edit** junto a *Root Directory*.
2. Navegar: `src` → `frontend` → **`agrosmart-frontend`**.
3. Vercel detecta **Vite** automáticamente.
4. **Continue**.

Ruta final:

```
src/frontend/agrosmart-frontend
```

## Paso 2.3 — Verificar Build Settings

| Campo | Valor esperado |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |

Estos valores también están en `vercel.json` dentro de esa carpeta.

## Paso 2.4 — Variable de entorno

En la pantalla de deploy **o** después en **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `VITE_N8N_WEBHOOK_URL` | `https://<tu-n8n>.onrender.com/webhook/v1/query` |

Marcar entorno: **Production** (y Preview si quieres).

> **Importante:** en Vite las variables deben empezar con `VITE_` para que el build las incluya. Si cambias esta variable después, debes **redeploy** (Redeploy en Vercel).

## Paso 2.5 — Deploy

1. Clic en **Deploy**.
2. Esperar build (~1–2 min).
3. Obtienes URL tipo: `https://agrosmart-insights.vercel.app`.

## Paso 2.6 — Secrets en GitHub (CD automático)

Para que `deploy.yml` despliegue solo al push a `main`:

| Secret GitHub | Dónde obtenerlo |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Project → Settings → General |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General |
| `VITE_N8N_WEBHOOK_URL` | Misma URL del webhook |
| `FRONTEND_HEALTH_URL` | URL pública de Vercel |

Detalle: `docs/sprint-1/SECRETS-GITHUB-SPRINT1.md`.

---

# PARTE 3 — Conectar todo y probar

## Checklist final

- [x] Render: n8n responde en su URL pública
- [x] Render: Postgres tiene tablas (migraciones ejecutadas)
- [x] Render: WF2 activo y webhook responde POST (`/webhook/v1/query`)
- [x] Vercel: Root Directory = `src/frontend/agrosmart-frontend`
- [x] Vercel: `VITE_N8N_WEBHOOK_URL` apunta al webhook de Render
- [ ] Navegador: abrir Vercel URL → escribir pregunta → recibir respuesta (tras merge del timeout 30 s)

## Health check DevSecOps

```bash
N8N_URL=https://TU-N8N.onrender.com/healthz \
FRONTEND_URL=https://TU-APP.vercel.app \
./infrastructure/scripts/health-check.sh
```

Ambos deben dar HTTP 200.

---

# PARTE 4 — ¿Qué pasa cuando haces push a `main`?

```
Developer mergea PR a main
        │
        ▼
GitHub Actions (deploy.yml)
        │
        ├─► Valida: lint + build frontend + JSONs n8n
        │
        ├─► Deploy Vercel (si secrets VERCEL_* existen)
        │
        ├─► Trigger Render redeploy (si RENDER_DEPLOY_HOOK_N8N existe)
        │
        └─► Health check HTTP (si URLs configuradas)
```

Los **3 checks obligatorios del PR** (n8n, frontend, IA) son independientes y corren **antes** del merge. El deploy cloud corre **después** del merge.

---

# Errores frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Vercel build falla | Root Directory en `./` | Cambiar a `src/frontend/agrosmart-frontend` |
| Chat dice "VITE_N8N_WEBHOOK_URL no configurada" | Falta variable en Vercel | Agregar variable y **Redeploy** |
| Chat carga pero no responde | WF2 inactivo o URL incorrecta | Activar WF2; verificar `/webhook/v1/query` |
| Chat dice «tardó más de 6 segundos» | Timeout corto del cliente + cold start Render free | Este repo usa 30 s (`n8nClient.js`). Tras merge, Redeploy en Vercel |
| n8n error de BD | Migraciones no ejecutadas | Correr `001_schema.sql` y `002_indexes.sql` |
| Render "spin down" lento | Plan free duerme servicios | Primera petición tarda ~30s — normal en free |
| CORS error | n8n mal configurado | Verificar `N8N_HOST` y `WEBHOOK_URL` en Render |

---

# Alternativa: servidor propio (VPS + SSH)

Si no usas Render:

1. Secrets GitHub: `SSH_KEY`, `SERVER_HOST`, `SERVER_USER`
2. GitHub → Actions → **Deploy Sprint 1** → **Run workflow** (manual)
3. Job **Despliegue Docker vía SSH** ejecuta `docker compose up -d`

Ver `infrastructure/docker-compose.yml` para entorno local/VPS.

---

**Referencias:** `docs/DEPLOY.md` · `docs/sprint-1/SECRETS-GITHUB-SPRINT1.md` · Informe Vercel: `docs/sprint-1/informes/devsecops/Informe-Configuracion-Vercel-Sprint1.md`
