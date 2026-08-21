# System Prompts (versionados)

**Owner:** QA / Prompt Engineer  
**Sprint 0:** carpeta y gobernanza. Los prompts de producción se escriben aquí (no solo dentro de n8n).

## Por qué viven en Git
Permite auditar Few-Shot, delimitadores de seguridad e instrucciones de formato. n8n los lee o se inyectan en el despliegue.

## Archivos esperados (Sprint 2+)
- `agent-nlq-translator.md` — traduce NLQ a consulta/análisis de precios agrícolas
- `evaluator-critic.md` — evalúa alucinaciones y respuestas inseguras

## Seguridad
Ningún prompt debe contener API keys. Las llaves van en GitHub Secrets / `.env` local (nunca en este directorio).
