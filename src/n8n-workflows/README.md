# n8n Workflows (Backend orquestador)

**Owner:** Backend / IA  
**Sprint 0:** estructura lista. Los JSON de producción se versionan aquí desde Sprint 1.

## Regla de oro
n8n se trata como código. Todo flujo visual debe exportarse a `.json` y entrar por Pull Request. Si no está en GitHub, no existe.

## Estructura
```
src/n8n-workflows/
├── production/   # Flujos estables aprobados
├── templates/    # Borradores / Hello World / experimentos
└── README.md
```

## Validación automática
El workflow `.github/workflows/n8n-validate-ci.yml` (job `Auditar JSONs de n8n`):
1. Verifica sintaxis JSON.
2. Bloquea credenciales hardcodeadas (OpenAI, Anthropic, tokens, connection strings).

## Convención de nombres
- `webhook-nlq-receiver.json` — endpoint NLQ para el frontend
- `data-ingesta-cron.json` — ingesta Open Data MIDAGRI → PostgreSQL
