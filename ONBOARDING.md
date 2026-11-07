# Manual de Onboarding Local — AgroSmart Insights

Guía para levantar y usar el proyecto completo (n8n + PostgreSQL/pgvector + frontend) en tu propia máquina, sin tocar el n8n compartido de Render. El local corre exactamente el mismo stack que producción (n8n `1.83.2`), así que todo lo que funcione aquí funciona igual allá.

**Regla de oro:** nunca pruebes cosas directo en el n8n de Render — ya tuvimos un incidente de producción por eso (un workflow duplicado rompió el chat para todo el equipo). Prueba siempre acá primero.

---

## 1. Requisitos

- Docker Desktop
- Node.js
- Git

---

## 2. Clonar y ubicarse en la rama correcta

```bash
git clone https://github.com/equipo2-AgroSmart-Insights/Agrosmart-Insights.git
cd Agrosmart-Insights
git checkout main
git pull
```

---

## 3. Levantar el backend (n8n + Postgres + Phoenix)

```bash
cd infrastructure
copy .env.example .env
```

Abre el `.env` recién creado (no el `.example`) y pega tus propias API keys de prueba:

```
GROQ_API_KEY=tu_key_real
GEMINI_API_KEY=tu_key_real
MAPTILER_API_KEY=tu_key_real
POSTGRES_PASSWORD=cualquier_password_que_invente
```

Luego:

```bash
docker compose up -d
docker compose ps
```

Debe verse `postgres` (healthy), `n8n` y `phoenix` corriendo.

> ⚠️ **Importante:** crea el `.env` **antes** de correr `docker compose up -d` por primera vez. Postgres solo lee `POSTGRES_PASSWORD` la primera vez que se crea su volumen — si cambias el `.env` después, Postgres se queda con el password viejo (ver sección de Problemas Conocidos si esto te pasa).

---

## 4. Crear tu cuenta en n8n

Abre `http://localhost:5678` — la primera vez te pide crear un usuario owner local (cualquier nombre/correo/clave, no se sincroniza con nada externo).

---

## 5. Crear tus credenciales dentro de n8n

`Settings → Credentials → Add credential`:

| Tipo a buscar | Nombre sugerido | Valor |
|---|---|---|
| Groq API | Groq account | tu `GROQ_API_KEY` |
| Google Gemini(PaLM) Api | Google Gemini(PaLM) Api account | tu `GEMINI_API_KEY` |
| Postgres | Postgres account | Host `postgres`, Port `5432`, Database `agrosmart_db`, User `postgres`, Password = tu `POSTGRES_PASSWORD` del `.env` |

*(MapTiler no necesita credencial de n8n — el nodo la lee directo de la variable de entorno `MAPTILER_API_KEY`. HuggingFace ya no se usa en el stack, ver sección 9.)*

---

## 6. Importar los 3 workflows de producción

En n8n: `Workflows → Add workflow → Import from File`, uno por uno desde `src/n8n-workflows/production/`:

- `wf0-ingesta-mensual-rag-midagri.json`
- `wf1-ingesta-diaria-precios-clima.json`
- `wf2-api-chat-analisis-predictivo.json`

Los `id` de credenciales del JSON son los de Render, no existen en tu instancia local — cada nodo de IA/Postgres se va a ver con ⚠️. Entra a cada uno y selecciona la credencial que creaste en el paso 5.

---

## 7. Poblar la base de datos local

Arranca vacía (solo el esquema). Dos formas de llenarla:

**Opción rápida (recomendada) — seed de datos demo:**
```bash
docker exec -i agrosmart_db psql -U postgres -d agrosmart_db < ../src/database/seeders/002_seed_v2.sql
```
Esto carga ~9k filas de `precios_diarios` (no incluye clima ni RAG).

**Opción completa — correr los workflows reales:**
- Abre **WF0** → botón `Test workflow` → carga los documentos del RAG en `documentos_rag`.
- Abre **WF1** → botón `Test workflow` → carga `precios_diarios` y `clima_diario` actualizados (llama a MIDAGRI/Open-Meteo; funciona bien desde red residencial normal).

En la práctica: corre siempre **WF0** (el seed no trae RAG), y usa el seed rápido o WF1 según qué tan al día necesites los precios/clima.

---

## 8. Probar el chat completo (WF2 + frontend)

WF2 viene sincronizado con la configuración CORS real de producción, que solo permite el dominio de Vercel. Para probarlo desde tu frontend local (`localhost:5173`) necesitas cambiar el CORS **solo en tu n8n local** (nunca en el archivo de git):

1. Nodo **Webhook** → Options → `Allowed Origins (CORS)` → `http://localhost:5173`
2. En cada uno de los 6 nodos **Respond to Webhook*** → Options → header `Access-Control-Allow-Origin` → `http://localhost:5173`
3. Activa WF2 (toggle "Active").

Luego:
```bash
cd ../src/frontend/agrosmart-frontend
copy .env.example .env
npm install
npm run dev
```
Chat en `http://localhost:5173` contra tu n8n local. Opcional: revisa las trazas en Phoenix (`http://localhost:6006`).

---

## 9. Problemas conocidos y cómo se resolvieron

### 9.1 "password authentication failed for user postgres"
**Causa:** el contenedor de Postgres se creó antes de terminar de editar el `.env` con el password real, y Postgres solo aplica ese valor la primera vez que inicializa su volumen.
**Fix:**
```bash
docker compose down
docker volume rm infrastructure_pgdata
docker compose up -d
```
Esto recrea la base con el password actual de tu `.env`. No borra tus workflows/credenciales de n8n (viven en un volumen separado), pero sí borra los datos de negocio (`precios_diarios`, `clima_diario`, `documentos_rag`) — hay que repetir el paso 7.

> ⚠️ Ojo: la base interna de n8n (`n8n_system`, con tus workflows y credenciales) **también vive dentro de este mismo Postgres**. Si necesitas resetear el volumen completo (`docker compose down -v`), vas a perder también tus workflows importados y credenciales — tendrías que rehacer los pasos 5 y 6.

### 9.2 Embeddings rotos: HuggingFace ya no sirve
**Causa:** el nodo "Embeddings HuggingFace Inference" usaba el endpoint legado `api-inference.huggingface.co`, dado de baja por HuggingFace. Y aunque se corrija la URL al nuevo router (`router.huggingface.co/hf-inference`), el modelo específico (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`) ya no está disponible en el servicio gratuito de Inference Providers — error genérico `"An error occurred while fetching the blob"`.
**Fix aplicado (ya está en `main`):** se reemplazó el proveedor de embeddings de HuggingFace por **Google Gemini** (`models/gemini-embedding-001`), reutilizando la misma credencial de Gemini que ya usa el chat. Aplica en WF0 y en los dos nodos de WF2. Ya no hace falta crear credencial de HuggingFace.

### 9.3 CORS bloqueado en el frontend local
**Causa:** WF2 viene con el CORS fijado al dominio de Vercel (así debe estar en producción). El navegador bloquea la respuesta si el origen no coincide (`curl` no lo bloquea porque CORS es una restricción exclusiva del navegador).
**Fix:** cambiar `Allowed Origins` y los 6 headers `Access-Control-Allow-Origin` a `http://localhost:5173`, **solo en tu instancia local** (ver paso 8). Nunca subas ese cambio al archivo de git — ese debe seguir reflejando la config real de producción.

### 9.4 MIDAGRI 404 al correr WF1/WF0 muy temprano
**Causa:** el reporte diario de MIDAGRI se publica más tarde en el día — si corres el workflow muy temprano, el PDF de "hoy" aún no existe (404, no es un bug de código).
**Fix:** no es necesario arreglar nada; simplemente corre el workflow más tarde, o usa el seed de datos (paso 7) mientras tanto.

---

## 10. Flujo para cualquier cambio nuevo (de aquí en adelante)

1. `git checkout main && git pull`, luego `git checkout -b tu-nombre/lo-que-vas-a-hacer`.
2. Haz el cambio **en tu entorno local** (n8n, frontend o BD) — nunca directo en Render/Vercel.
3. Prueba de punta a punta en local que funciona.
4. Si el cambio fue en n8n: expórtalo (`Download`) y reemplaza el `.json` correspondiente en `src/n8n-workflows/production/`.
5. Commit, push, y abre PR contra `main` con la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`).
6. Aprobación: nadie aprueba su propio PR. Cristhian (Arquitecto) aprueba los de Gabriel; Gabriel aprueba los del resto del equipo.
7. Al mergear a `main`, el deploy a Vercel/Render sale automático (`.github/workflows/deploy.yml`).

---

## 11. Roles del equipo

| Rol | Integrante |
|---|---|
| Líder DevSecOps | Gabriel León |
| Backend / IA | Fiorella Camayoc |
| Frontend | Cindy Huanca |
| QA / Prompt Eng | Sebastián Borda |
| Arquitecto | Cristhian Pimentel |
| Scrum Master | Jesús De la Cruz |

Dudas sobre esta guía → Gabriel León (Líder DevSecOps).
