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

## Seguridad
- `.env` está en `.gitignore`.
- Las llaves reales van en **GitHub Secrets** y en **Credentials de n8n** (nunca en el repo ni en JSON exportados).
- Secrets actuales del stack: `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`, `POSTGRES_PASSWORD`.
- `POSTGRES_PASSWORD` es la **contraseña de la base de datos**, no una API key.
- Prohibido pegar API keys en JSON de n8n o en el frontend.
