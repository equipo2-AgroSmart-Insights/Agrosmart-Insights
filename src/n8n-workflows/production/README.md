# Workflows n8n — producción

Flujos versionados como código (Sprint 1). Importar en n8n y configurar **Credentials** (no van en el JSON).

| Archivo | Flujo | Trigger |
|---|---|---|
| `wf0-ingesta-historica-midagri-gmml.json` | WF0 — Ingesta histórica MIDAGRI, mercado GMML | Manual |
| `wf0-ingesta-historica-midagri-mmf2.json` | WF0 — Ingesta histórica MIDAGRI, mercado MMF2 | Manual |
| `wf1-ingesta-diaria-precios-clima.json` | WF1 — Precios MIDAGRI (GMML + MMF2) + Open-Meteo | Cron diario 10:00/11:00/12:00/13:00 (America/Lima) |
| `wf2-api-chat-analisis-predictivo.json` | WF2 — Chat NLQ + predicción | Webhook `POST /v1/query` |

> Desde el 15/10/2026 WF0 se divide en dos workflows independientes (uno por
> mercado) y WF1 consolida ambos mercados en un solo flujo diario. El
> `wf1-ingesta-diaria-precios-clima.json` anterior (un solo mercado) fue
> reemplazado — ver `n8n-drift-check.yml` para cómo se detectó.

## Credentials requeridas en n8n

- Postgres account → DB `agrosmart_db`
- Groq account, Google Gemini, Hugging Face (WF0/WF2)

## Validación CI

El workflow `n8n-validate-ci.yml` audita estos JSON en cada PR (sin credenciales embebidas).
