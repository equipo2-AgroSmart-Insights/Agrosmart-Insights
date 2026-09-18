# Workflows n8n — producción

Flujos versionados como código (Sprint 1). Importar en n8n y configurar **Credentials** (no van en el JSON).

| Archivo | Flujo | Trigger |
|---|---|---|
| `wf0-ingesta-mensual-rag-midagri.json` | WF0 — RAG MIDAGRI → pgvector | Cron mensual |
| `wf1-ingesta-diaria-precios-clima.json` | WF1 — Precios MIDAGRI + Open-Meteo | Cron diario 10:00 |
| `wf2-api-chat-analisis-predictivo.json` | WF2 — Chat NLQ + predicción | Webhook `POST /v1/query` |

## Credentials requeridas en n8n

- Postgres account → DB `agrosmart_db`
- Groq account, Google Gemini, Hugging Face (WF0/WF2)

## Validación CI

El workflow `n8n-validate-ci.yml` audita estos JSON en cada PR (sin credenciales embebidas).
