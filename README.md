# AgroSmart Insights
**Caso 2 — Optimización de Mercados y Precios Agrícolas**  
Célula 2 | Curso: Ingeniería de Software (DevSecOps + n8n + IA Ops)

## 📌 Arquitectura del Sistema
- **Frontend:** Microfrontend NLQ (Natural Language Query)
- **Orquestación:** n8n Self-Hosted (Docker Compose)
- **Base de Datos:** PostgreSQL + pgvector
- **IA Ops:** Observabilidad con Langfuse y Pruebas Unitarias de Prompts

## 🚀 Despliegue Local de Infraestructura
```bash
cd infrastructure
docker compose up -d
```
- n8n: http://localhost:5678  
- Postgres: `localhost:5432` (DB `agrosmart_db`)

### 4. Flujo Git obligatorio
1. Crear rama desde `main` (nunca push directo a `main`).
2. Vincular Issue en el PR (plantilla `.github/PULL_REQUEST_TEMPLATE.md`).
3. Esperar checks verdes + 1 aprobación (DevSecOps o Arquitecto).
4. Resolver conversaciones antes del merge.

## Canal DevSecOps (estado Sprint 0)

- Branch protection en `main`: PR obligatorio, 1 approval, status checks, conversation resolution, sin bypass admin.
- Secrets (GitHub → Settings → Secrets and variables): `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`, `POSTGRES_PASSWORD` (contraseña de la DB). No hardcodear keys.
- Stack IA/APIs de los flujos n8n actuales: Groq, Google Gemini, Hugging Face, MapTiler, Open-Meteo (sin key) + Postgres/pgvector.
- Evidencia de avance: solo lo que está en este repositorio.

## Roadmap por sprint (DevSecOps)

| Sprint | Entregable DevSecOps |
|---|---|
| 0 | Estructura, `.env.example`, protection, secrets, informes |
| 1 | WF0/WF1/WF2 versionados, frontend React, Docker+Phoenix, Vercel+Render |
| 2–3 | `ai-testing-ci` + observabilidad Langfuse/Phoenix |
| 4 | Métricas de pipeline y auditoría final |

## Licencia / curso
Material académico de la célula. Uso interno del taller de proyectos.
