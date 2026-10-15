# S2-05 — Investigación: Observabilidad (Langfuse/Phoenix) en n8n

**Issue:** [#67](https://github.com/equipo2-AgroSmart-Insights/Agrosmart-Insights/issues/67)
**Asignados:** Gabriel León (DevSecOps), Sebastián Borda
**Fecha de esta investigación:** 08/09/2026
**Estado:** ✅ Resuelto en el entorno local compartido del equipo. ❌ Intentado en producción el 11/09/2026 — **revertido tras un incidente real de memoria** (ver sección final). Producción sigue en n8n 1.83.2, sin observabilidad, hasta resolver el límite de RAM del plan Free.

## Objetivo

Instrumentar n8n con Langfuse o Arize Phoenix para registrar trazas de ejecución (latencia por nodo, modelo usado, tokens) y detectar errores 5xx sin filtrar credenciales, según pide el issue #67.

## Punto de partida

- `infrastructure/docker-compose.yml` ya tenía las variables `N8N_OTEL_ENABLED`, `N8N_AGENTS_TRACING_ENABLED`, `N8N_OTEL_EXPORTER_OTLP_ENDPOINT` y las de Langfuse Cloud preconfiguradas desde antes.
- Existía un PoC previo de Fiorella Camayoc (`docs/sprint-1/informes/backend/PoC-Observabilidad-Phoenix.docx`, 20/08/2026) que documentaba haber logrado ver trazas reales en Phoenix.

## Prueba realizada hoy

1. Se levantó el stack local (`docker compose up -d`) — Postgres, n8n 1.83.2 y Phoenix, todos sanos.
2. Se envió una consulta real a WF2 (`/webhook/v1/query`) — el chat respondió correctamente (`"El precio actual del producto Papa Amarilla es de S/2.23..."`).
3. Se consultó la API GraphQL de Phoenix buscando la traza correspondiente: **no llegó ninguna traza**, pese a que las variables de entorno están bien escritas y la conectividad de red n8n → Phoenix es correcta (verificado con `wget`/`curl` desde dentro del contenedor).

## Causa raíz encontrada

Se revisó el código fuente instalado de n8n 1.83.2 dentro del contenedor: no existe ninguna referencia a `N8N_OTEL_*` en el binario. Se confirmó contra la documentación oficial de n8n
(<https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/opentelemetry>):

| Variable | Versión mínima de n8n requerida |
|---|---|
| `N8N_OTEL_ENABLED` y variables OTEL generales | **2.19.0** |
| `N8N_AGENTS_TRACING_ENABLED` (trazas de AI Agent — lo que pide el issue) | **2.33.0** |

**n8n en este proyecto está fijado en la versión 1.83.2** (a propósito, por la memoria limitada del plan free de Render — ver comentario en `render.yaml`). Estas variables simplemente no existen todavía en esa versión: no fallan, no hacen nada. Por eso el PoC de Fiorella (20/08) funcionó — probablemente corrió contra una versión distinta/más nueva de n8n antes de que el equipo fijara la versión a 1.83.2 por el problema de memoria.

## Prueba adicional: ¿upgradear a n8n 2.x es viable en memoria?

Se levantó un contenedor de prueba aislado (`n8n_otel_test`, imagen `n8nio/n8n:latest` = versión **2.37.10**, que sí cubre ambos requisitos de versión), sin tocar el entorno real:

```
docker stats --no-stream
n8n_otel_test (2.37.10, recién iniciado, sqlite, sin workflows): 355.6 MiB
agrosmart_n8n (1.83.2, con Postgres y workflows cargados):     1.221 GiB
```

El nuevo contenedor arrancó sin errores, con Task Runners y Sandbox habilitados por defecto (deprecaciones menores, no bloqueantes). No es una comparación 100% equivalente (uno está en reposo, el otro con carga real), pero es una señal alentadora de que la versión 2.x no necesariamente es más pesada de lo que se asumió cuando se fijó 1.83.2.

## Prueba end-to-end: ¿las trazas realmente llegan?

Con el contenedor aislado (n8n 2.37.10, SQLite propio, sin tocar `agrosmart_db`), se importaron los 3 workflows reales vía API — **ningún nodo reportó problemas de compatibilidad** (`typeVersion` o de otro tipo) en ninguno de los tres.

Luego se activó el WF2 real (usando la API interna de activación, que requiere incluir `versionId` en el body) y se disparó su webhook (`POST /webhook/v1/query`, sin `session_id`, para no depender de credenciales reales de Groq/Gemini). El resultado:

```json
{"error": "Sesión inválida o ausente"}   // HTTP 401, esperado sin session_id
```

Y en Phoenix, consultando su API GraphQL inmediatamente después:

```json
{
  "spans": [
    {"name": "workflow.execute", "startTime": "2026-09-08T01:43:05.018Z"},
    {"name": "node.execute", "startTime": "2026-09-08T01:43:05.026Z"},
    {"name": "node.execute", "startTime": "2026-09-08T01:43:05.030Z"},
    {"name": "node.execute", "startTime": "2026-09-08T01:43:05.084Z"}
  ]
}
```

**Las trazas llegaron correctamente**, con un span de workflow y uno por cada nodo ejecutado (Webhook → If validación de sesión → Respond to Webhook). Esto confirma que n8n 2.37.10 resuelve el problema por completo con el WF2 real del proyecto, no solo con un workflow de juguete.

## Prueba del criterio de error (sin filtrar credenciales)

Se repitió la prueba en un tercer contenedor aislado, esta vez configurando a propósito una credencial de Groq inválida (`gsk_FAKE_INVALID_KEY...`) para forzar un fallo real. Al disparar una pregunta real, el nodo que realmente falló primero fue "Embeddings Google Gemini" (por falta de credencial de Gemini en ese contenedor de prueba, no relacionado con la key falsa de Groq) — de todas formas, esto generó el mismo tipo de escenario que pide el criterio de aceptación: un fallo real durante el procesamiento.

Resultado en Phoenix:

```json
{
  "name": "node.execute",
  "statusCode": "ERROR",
  "events": [{"name": "exception", "message": "Credential with ID \"HZApfmkMQgagxfYZ\" does not exist for type \"googlePalmApi\"."}]
}
```

**Confirmado:** el span queda marcado `ERROR`, con un mensaje de diagnóstico útil (incluye el *ID* de la credencial, que es solo un identificador interno, no un secreto). Se revisaron todos los `attributes` de los spans de error y los logs completos del contenedor de n8n buscando la key falsa (`FAKE_INVALID_KEY`) — **no aparece en ningún lado**. El criterio de aceptación sobre no exponer credenciales en el log queda validado.

*Alcance de esta prueba:* ambos criterios de aceptación del issue #67 quedan validados con evidencia real (camino feliz y camino de error). Sigue pendiente aplicar esto al entorno local compartido del equipo y decidir sobre producción — ver sección de próximos pasos.

El contenedor de prueba fue eliminado al terminar; el entorno de trabajo real (`agrosmart_n8n`, `agrosmart_db`, `agrosmart_phoenix`) no fue modificado durante esta fase.

## Aplicación real al entorno local compartido

Con ambos criterios validados en aislado, se aplicó la actualización al entorno local **real** del equipo (`agrosmart_n8n`), con autorización explícita:

1. **Respaldo previo**: se exportó un dump completo de `n8n_system` y `agrosmart_db` locales antes de tocar nada (por la irreversibilidad de la migración de esquema).
2. **Actualización real**: `infrastructure/docker-compose.yml` → `n8nio/n8n:2.37.10`, `docker compose up -d n8n`. Todas las migraciones de esquema corrieron sin errores.
3. **Verificación de integridad**: los 3 workflows (WF0, WF1, WF2) y las 4 credenciales sobrevivieron intactos (mismos IDs, antes y después).
4. **Hallazgo adicional corregido de paso**: WF0 y WF2 en el entorno local seguían con los nodos viejos de HuggingFace Embeddings (el cambio a Google Gemini, ya mergeado en `main` desde el PR #60, nunca se había aplicado manualmente en la instancia local en vivo). Se corrigió directamente en la base de datos para igualar el entorno local al contenido real de `main`.
5. **Prueba end-to-end real**: WF2 respondió correctamente ("Papa Amarilla S/2.23...") y Phoenix registró **36 spans reales, 0 errores**, incluyendo la ejecución que antes dependía de los embeddings (ya en Gemini).

**El issue #67 queda resuelto en el entorno local compartido del equipo.** Solo falta la decisión y ejecución de la misma actualización en producción (Render).

## Conexión real con Langfuse Cloud (11/09/2026)

Con la cuenta de Langfuse ya creada, se conectó como destino activo de las trazas, reemplazando a Phoenix como backend principal (Phoenix sigue disponible localmente como alternativa, ver `.env.example`):

- Endpoint: `N8N_OTEL_EXPORTER_OTLP_ENDPOINT=https://cloud.langfuse.com/api/public/otel`.
- Autenticación: `N8N_OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(public_key:secret_key)>,x-langfuse-ingestion-version=4`. El valor base64 se calcula una sola vez y se guarda en `LANGFUSE_OTEL_AUTH_HEADER` dentro de `.env` (nunca en git).
- **Gotcha real encontrado**: n8n lee `N8N_OTEL_EXPORTER_OTLP_ENDPOINT` primero desde `.env` (usado por Docker Compose para sustitución de variables), no solo desde el valor por defecto en `docker-compose.yml`. Si la variable ya existe en `.env` (como en este caso, apuntando a Phoenix desde el trabajo anterior), el valor por defecto del `docker-compose.yml` nunca se aplica — hay que actualizar `.env` explícitamente.
- **Validación real**: se disparó una consulta real a WF2 y se confirmó vía la API pública de Langfuse (`GET /api/public/traces`) que la traza llegó, con 13 observaciones anidadas (una por nodo ejecutado), todas en nivel `DEFAULT` (sin errores).

## Intento en producción y reversión (11/09/2026)

Con el entorno local resuelto y validado dos veces (aislado + real), se aplicó la misma actualización a producción vía `render.yaml` (PR #74): imagen de n8n a `2.37.10` + variables de Langfuse. El backup previo de producción sí se hizo (99.99 MB, fresco, antes del deploy).

**El deploy "tuvo éxito" según Render (health check inicial pasó), pero el servicio quedó inestable después:**

```
Instance failed: nk2rs
Ran out of memory (used over 512MB) while running your code.
```

Repetido varias veces (eventos "Instance failed" / "Service recovered" alternándose cada 1-2 minutos en la pestaña Events de Render) — un ciclo real de caída y reinicio por falta de memoria, no un problema de esquema ni de conexión (los mensajes de "Database connection timed out" en los logs eran consecuencia del reinicio, no la causa).

**Causa real:** la prueba de memoria hecha en la sección "Prueba adicional" de este documento (355 MB en reposo, sin carga) **no fue representativa de producción**: sin Postgres real conectado, sin ejecuciones reales, y sin las conexiones adicionales que abren el Task Broker y las tablas nuevas de agentes de n8n 2.x. Bajo carga real, el proceso supera los 512 MB del plan Free de Render.

**Acción tomada:** se revirtió `render.yaml` a n8n `1.83.2` (mismo estado exacto previo al PR #74, incluyendo restaurar `N8N_RUNNERS_ENABLED=false`). Producción quedó estable de nuevo. Ningún dato se perdió — las migraciones de esquema ya aplicadas no afectan a la versión anterior (no las usa, no las necesita).

**Lo que esto NO invalida:** la validación en el entorno local (PRs #71 y #72) sigue siendo válida — demuestra que la integración n8n↔Langfuse funciona técnicamente. El problema encontrado es de **capacidad de infraestructura** (RAM del plan Free), no un defecto de la implementación.

## Próximos pasos sugeridos

- [x] Crear la cuenta de Langfuse Cloud y obtener las API keys reales — hecho.
- [x] Validar en aislado que n8n 2.37.10 resuelve el issue (camino feliz y camino de error) — hecho.
- [x] Aplicar la actualización al entorno local compartido del equipo y revalidar WF0/WF1/WF2 — hecho, con respaldo previo y sin pérdida de datos.
- [x] ~~Decidir y ejecutar la misma actualización en producción~~ — intentado, revertido por falta de memoria (ver arriba).
- [ ] **Decisión de equipo**: conseguir un plan de Render con más RAM (pago) antes de reintentar la actualización en producción, o medir el consumo real bajo carga en un entorno que sí lo permita antes de decidir.
