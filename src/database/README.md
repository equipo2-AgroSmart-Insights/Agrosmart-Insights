# Base de datos — PostgreSQL + pgvector

## Migraciones (`migrations/`)

| Archivo | Contenido |
|---|---|
| `001_schema.sql` | Tablas `precios_diarios`, `clima_diario`, `documentos_rag` + extensión vector |
| `002_indexes.sql` | Índices B-Tree para consultas frecuentes |
| `003_alertas_riesgo.sql` | Alertas de riesgo: reglas, alertas, historial de estados y funciones que usa WF5 (`POST /v1/alertas`) |

Montadas automáticamente en Docker init (`infrastructure/docker-compose.yml`).

### Aplicar una migración en producción (Render)

Desde GitHub Actions → **Base de datos — aplicar migración en producción** (`db-migrate.yml`):

1. Correr con modo **probar**: ejecuta la migración y una simulación dentro de `BEGIN … ROLLBACK`. No deja cambios; sirve para ver cuántas alertas saldrían con los datos reales.
2. Si el resultado se ve bien, correr con modo **aplicar**.

Usa el secret `RENDER_DATABASE_URL`, así la URL no pasa por ninguna laptop.

## Alertas de riesgo (`003_alertas_riesgo.sql`)

| Objeto | Para qué |
|---|---|
| `alertas_riesgo_reglas` | Reglas configurables: tipo (`volumen` o `precipitacion`), mercado o región, ventanas y umbrales de caída (%) |
| `alertas_riesgo` | Una alerta por regla y serie (producto o región). Solo una abierta a la vez por serie |
| `alertas_riesgo_historial` | Quién cambió el estado (sesión del navegador) y cuándo |
| `alertas_riesgo_ejecuciones` | Resumen de cada cálculo (reglas desactualizadas o con datos insuficientes) |
| `alertas_riesgo_evaluar(fecha, simular)` | Calcula las alertas. `simular = true` no escribe nada |
| `alertas_riesgo_listar()` / `_detalle(id)` / `_actualizar(id, estado, sesion)` | Respuestas JSON del webhook, con el formato de `alertas-microfrontend` |

**Reglas iniciales** (definidas por el equipo el 2026-11-02, editables con `UPDATE`):

| Código | Qué compara | Umbrales de caída (informativo / moderado / crítico) | Activa |
|---|---|---|---|
| `VOL-GMML-7V28` | Volumen diario ingresado al GMML: últimos 7 días vs 28 previos, productos con ≥ 5 t/día | 20 % / 35 % / 50 % | Sí |
| `VOL-MMF2-7V28` | Igual, para el Mercado Mayorista de Frutas N.° 2 | 20 % / 35 % / 50 % | Sí |
| `PP-PRONOSTICO-7V28` | Lluvia pronosticada próximos 7 días vs 28 previos | 40 % / 60 % / 80 % | No: `clima_diario` solo guarda pronósticos |

Para cambiar un umbral sin tocar código:

```sql
-- 1. Ver qué saldría con el cambio, sin escribir nada
BEGIN;
UPDATE alertas_riesgo_reglas SET umbral_informativo = 25 WHERE codigo = 'VOL-GMML-7V28';
SELECT jsonb_pretty(alertas_riesgo_evaluar(NULL, true));
ROLLBACK;
-- 2. Si convence, repetir el UPDATE sin BEGIN/ROLLBACK.
```

Pruebas: `src/database/tests/` (las corre `db-migrations-ci.yml` en cada PR que toque `src/database/`).

## Seeders (`seeders/`)

Datos demo GMML — ver `seeders/README.md` (carga manual).

## Stack

- Imagen: `pgvector/pgvector:pg16`
- Consumido por: WF0 (RAG), WF1 (ingesta), WF2 (chat/predicción), WF5 (alertas de riesgo)
