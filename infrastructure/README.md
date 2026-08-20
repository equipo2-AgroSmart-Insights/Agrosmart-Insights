# Infrastructure

**Owner:** Líder DevSecOps

## Contenido
- `docker-compose.yml` — n8n Self-Hosted + PostgreSQL con pgvector
- `.env.example` — plantilla de variables (sin secretos reales)

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
- Secrets actuales del stack: `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `MAPTILER_API_KEY`, `POSTGRES_PASSWORD_DEV`.
- `POSTGRES_PASSWORD` / `POSTGRES_PASSWORD_DEV` es la **contraseña de la base de datos**, no una API key.
- Prohibido pegar API keys en JSON de n8n o en el frontend.
