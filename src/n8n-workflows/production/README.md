# Workflows n8n — producción

Flujos versionados como código (Sprint 1). Importar en n8n y configurar **Credentials** (no van en el JSON).

| Archivo | Flujo | Trigger |
|---|---|---|
| `wf0-ingesta-historica-midagri-gmml.json` | WF0 — Ingesta histórica MIDAGRI, mercado GMML | Manual |
| `wf0-ingesta-historica-midagri-mmf2.json` | WF0 — Ingesta histórica MIDAGRI, mercado MMF2 | Manual |
| `wf1-ingesta-diaria-precios-clima.json` | WF1 — Precios MIDAGRI (GMML + MMF2) + Open-Meteo | Cron diario 10:00/11:00/12:00/13:00 (America/Lima) |
| `wf2-api-chat-analisis-predictivo.json` | WF2 — Chat NLQ + predicción | Webhook `POST /v1/query` |
| `wf3-monitoreo-ndvi.json` | WF3 — Monitoreo satelital NDVI (Sentinel Hub / Copernicus) | Webhook `POST /v1/satelital/ndvi` |
| `wf4-calendario-eventos-midagri.json` | WF4 — Calendario de eventos MIDAGRI | Cron mensual 06:00 + Webhook `GET /v1/calendario` |
| `wf5-alertas-riesgo.json` | WF5 — Alertas de riesgo agrícola (cálculo + API de `alertas-microfrontend`) | Cron lun–sáb 14:00 (America/Lima) + Webhook `POST /v1/alertas` |

> WF0, WF1 y WF4 leen del puente MIDAGRI (`src/midagri-bridge/`), un servicio
> local expuesto con ngrok (`sliding-babied-rendering.ngrok-free.dev`: `/pdf` y
> `/calendario-json`, con la cabecera `X-Bridge-Token`). Si ese equipo está
> apagado, la ingesta y el calendario fallan. Para levantarlo en otra máquina:
> `src/midagri-bridge/README.md` o el paso 5.3 del manual de restauración.

> WF5 necesita la migración `src/database/migrations/003_alertas_riesgo.sql`
> aplicada antes de activarse (ver `src/database/README.md`). Tras importarlo
> en n8n, correr `n8n-export.yml` con su ID nuevo y reemplazar este archivo
> con el exportado (`wf-nuevo-revisar-nombre-<id>.json` → `wf5-alertas-riesgo.json`),
> para que la copia en git quede enlazada por `id` y `n8n-drift-check.yml` no
> lo marque como "activo sin git".

> Desde el 15/10/2026 WF0 se divide en dos workflows independientes (uno por
> mercado) y WF1 consolida ambos mercados en un solo flujo diario. El
> `wf1-ingesta-diaria-precios-clima.json` anterior (un solo mercado) fue
> reemplazado — ver `n8n-drift-check.yml` para cómo se detectó.

## Credentials requeridas en n8n

Los JSON buscan las credenciales por nombre: créalas con **exactamente**
estos nombres antes de importar.

| Nombre | Tipo | Workflows |
|---|---|---|
| `Postgres account` | Postgres → DB `agrosmart_db` | WF0, WF1, WF2, WF4, WF5 |
| `OpenRouter account` | OpenRouter | WF2 |
| `langfuse credential` | Basic Auth (public key / secret key) | WF2 |
| `Copernicus OAuth2 - AgroSmart` | OAuth2 API, client credentials (Copernicus Data Space) | WF3 |
| `Header Auth account 2` | Header Auth (`X-AgroSmart-Key`) | WF3 |

Además, la key de Jina va dentro de WF0 y WF2 (marcador
`{{JINA_API_KEY_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}`). Paso a paso completo:
`docs/w1-backup-restore/MANUAL-RESTAURACION.md`.

## Validación CI

El workflow `n8n-validate-ci.yml` audita estos JSON en cada PR (sin credenciales embebidas).
