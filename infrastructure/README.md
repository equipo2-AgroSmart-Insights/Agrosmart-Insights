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

5. **Poblar tu base de datos local** (está vacía al inicio, solo tiene el esquema)
   - Abre **WF0** y dale `Test workflow` → carga los documentos de MIDAGRI al `documentos_rag` (para el RAG del chat).
   - Abre **WF1** y dale `Test workflow` → carga `precios_diarios` y `clima_diario`.
   - Nota: WF1 llama a la API de MIDAGRI, que bloquea IPs de datacenter/nube — pero funciona bien desde una red residencial normal (tu wifi de casa), así que en local debería andar sin problema.

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
