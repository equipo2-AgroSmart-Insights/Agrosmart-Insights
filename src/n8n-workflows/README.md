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

## Acceso al n8n compartido (Render)

La instancia de n8n en Render (`agrosmart-n8n`) es Community Edition: no tiene roles granulares de "solo lectura" — cualquier usuario `Member` invitado puede ver **y editar** cualquier workflow directamente en el editor.

**Regla:** ningún cambio hecho directo en el editor de n8n se considera definitivo. Si modificas un nodo ahí para probar algo, debes exportarlo de vuelta como `.json` y subirlo por Pull Request antes del próximo redeploy — de lo contrario, el cambio se pierde o queda sin trazabilidad (viola la regla de oro de arriba).

## Probar cambios en local antes de tocar Render

**Nunca experimentes directamente sobre el n8n de Render.** Es la instancia compartida por todo el equipo y cualquier cambio ahí es visible e impacta a todos de inmediato (ya tuvimos un incidente de producción por esto: un workflow duplicado sin commitear rompió el webhook `v1/query` para todo el chat).

En su lugar, usa el entorno local (`infrastructure/docker-compose.yml`), que corre la misma versión de n8n que Render (`1.83.2`, pineada en ambos lugares) más Postgres+pgvector:

1. `docker compose -f infrastructure/docker-compose.yml up -d`
2. Entra a `http://localhost:5678`, importa los `.json` de `src/n8n-workflows/production/` y configura tus propias credenciales locales (Groq, Gemini, HuggingFace, MapTiler, Postgres) con tus propias API keys de prueba.
3. Prueba y ajusta el flujo ahí.
4. Cuando funcione, exporta el `.json` y súbelo por Pull Request — recién ahí se aplica a Render en el próximo deploy.

Esto evita que un experimento fallido tumbe el chat en producción, y evita que las credenciales de otro entorno (IDs de credenciales, `instanceId`) se cuelen en el archivo versionado.
