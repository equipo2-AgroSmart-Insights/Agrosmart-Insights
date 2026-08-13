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
- Las llaves reales de OpenAI/Anthropic/Langfuse van en **GitHub Secrets** del repositorio.
- Prohibido pegar API keys en JSON de n8n o en el frontend.
