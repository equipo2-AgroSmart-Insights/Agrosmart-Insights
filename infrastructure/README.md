# Infrastructure

**Owner:** Líder DevSecOps

## Contenido
- `docker-compose.yml` — n8n + PostgreSQL/pgvector + Arize Phoenix (observabilidad)
- `.env.example` — plantilla de variables (sin secretos reales)

## Servicios locales

| Servicio | URL |
|---|---|
| n8n | http://localhost:5678 |
| PostgreSQL | localhost:5432 |
| Phoenix | http://localhost:6006 |

## Uso
```bash
copy .env.example .env
docker compose up -d
docker compose ps
docker compose logs -f n8n
```

## Cómo probar todo lo de producción en local (guía para el equipo)

El local corre exactamente el mismo stack que Render (n8n `1.83.2` + Postgres/pgvector), así que cualquier workflow que funcione aquí, funciona igual allá. Pasos para cada integrante:

1. **Levantar el stack**
   ```bash
   cd infrastructure
   copy .env.example .env
   ```
   Edita `.env` y pon tus propias API keys de prueba (gratuitas) de `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY` y `MAPTILER_API_KEY`. Pon cualquier contraseña en `POSTGRES_PASSWORD` (es solo de tu base local).
   ```bash
   docker compose up -d
   docker compose ps
   ```
   Debe verse `postgres`, `n8n` y `phoenix` como `healthy`/`running`.

2. **Crear tu usuario en n8n local**
   Abre http://localhost:5678 — la primera vez te pide crear un usuario owner (con cualquier correo/clave, es solo local).

3. **Crear tus credenciales dentro de n8n** (Settings → Credentials → Add):
   - **Groq account** (Groq API) — pega tu `GROQ_API_KEY`
   - **Google Gemini(PaLM) Api account** — pega tu `GEMINI_API_KEY`
   - **HuggingFace Api account** — pega tu `HUGGINGFACE_API_KEY`
   - **Postgres account** — Host `postgres`, Port `5432`, Database `agrosmart_db`, User `postgres`, Password: la misma que pusiste en `.env`

   *(MapTiler no necesita credencial de n8n: el nodo la lee directo de la variable de entorno `MAPTILER_API_KEY` que ya definiste en `.env`.)*

4. **Importar los 3 workflows de producción**
   En n8n: `Workflows → Add workflow → Import from File`, uno por uno desde `src/n8n-workflows/production/`:
   `wf0-ingesta-mensual-rag-midagri.json`, `wf1-ingesta-diaria-precios-clima.json`, `wf2-api-chat-analisis-predictivo.json`.

   Como los `id` de credenciales del JSON son los de Render (no existen en tu n8n local), cada nodo de IA/Postgres se va a ver con un ⚠️ — entra a cada uno y selecciona la credencial que creaste en el paso 3 (son pocos nodos repetidos, toma 2-3 minutos por workflow).

5. **Poblar tu base de datos local** (está vacía al inicio, solo tiene el esquema). Dos opciones:

   - **Opción rápida (recomendada):** cargar el seed de datos demo ya incluido en el repo (~9k filas reales de precios/clima):
     ```bash
     docker exec -i agrosmart_db psql -U postgres -d agrosmart_db < ../src/database/seeders/002_seed_v2.sql
     ```
     Con esto el chat (WF2) ya tiene datos de `precios_diarios` y `clima_diario` para responder, sin depender de MIDAGRI.

   - **Opción completa:** correr los workflows reales para traer datos frescos.
     - Abre **WF0** y dale `Test workflow` → carga los documentos de MIDAGRI al `documentos_rag` (necesario para el RAG del chat; el seed no lo incluye).
     - Abre **WF1** y dale `Test workflow` → carga `precios_diarios` y `clima_diario` actualizados.
     - Nota: WF1 llama a la API de MIDAGRI, que bloquea IPs de datacenter/nube — pero funciona bien desde una red residencial normal (tu wifi de casa), así que en local debería andar sin problema.

   En la práctica: corre siempre WF0 (para tener el RAG), y usa el seed rápido o WF1 para los precios/clima según qué tan al día necesites la data.

6. **Probar el chat (WF2)**
   Activa WF2 (o solo dale `Listen for test event`). Copia la URL del nodo Webhook (debería ser `http://localhost:5678/webhook/v1/query`) y pruébala con curl o desde el frontend:
   ```bash
   cd ../src/frontend/agrosmart-frontend
   copy .env.example .env
   ```
   El `.env.example` del frontend ya apunta a `http://localhost:5678/webhook/v1/query` por defecto, así que con `npm install && npm run dev` el chat local ya debería conversar contra tu propio n8n.

7. **(Opcional) Ver las trazas en Phoenix**
   http://localhost:6006 — muestra cada llamada a los modelos (Groq/Gemini) del WF2 mientras pruebas el chat.

Con esto puedes editar un nodo, romperlo, probar cosas raras, todo sin tocar el n8n compartido de Render. Solo cuando el cambio funcione, expórtalo y súbelo por PR (ver regla en `src/n8n-workflows/README.md`).

## Flujo para futuros cambios (backend/n8n, frontend o BD)

Una vez que ya tienes el stack local levantado (pasos de arriba), este es el ciclo normal para cualquier cambio, de aquí en adelante:

1. `git checkout main && git pull` y crea tu rama: `git checkout -b tu-nombre/lo-que-vas-a-hacer`.
2. Haz el cambio **en local**, no en Render/Vercel:
   - Cambios de n8n → edítalos en tu n8n de `localhost:5678`, no en el de Render.
   - Cambios de frontend → `npm run dev` en `src/frontend/agrosmart-frontend`, contra tu n8n local.
   - Cambios de BD → edita las migraciones en `src/database/migrations/` y prueba con `docker compose down -v && docker compose up -d` (recrea la BD local desde cero para validar que la migración corre limpia).
3. Verifica que funciona de punta a punta en local (chat responde, workflow corre sin error, etc.).
4. Si el cambio fue en n8n: expórtalo (`Download`) y reemplaza el `.json` correspondiente en `src/n8n-workflows/production/`.
5. `git add`, commit, `git push` tu rama y abre PR contra `main` con la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`).
6. Aprobación: nadie aprueba su propio PR. Cristhian (Arquitecto) aprueba los de Gabriel; Gabriel aprueba los del resto del equipo.
7. Al mergear a `main`, el deploy a Vercel/Render es automático (`.github/workflows/deploy.yml`) — recién ahí el cambio llega a producción.

## Scripts (Sprint 1)

| Script | Uso |
|---|---|
| `scripts/health-check.sh` | Verifica HTTP 200 de n8n, Phoenix y frontend |
| `scripts/rollback.sh` | Reinicia stack Docker desde compose del repo |

```bash
chmod +x scripts/*.sh
./scripts/health-check.sh
```
- `.env` está en `.gitignore`.
- Las llaves reales van en **GitHub Secrets** y en **Credentials de n8n** (nunca en el repo ni en JSON exportados).
- Secrets actuales del stack: `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`, `POSTGRES_PASSWORD`.
- `POSTGRES_PASSWORD` es la **contraseña de la base de datos**, no una API key.
- Prohibido pegar API keys en JSON de n8n o en el frontend.
