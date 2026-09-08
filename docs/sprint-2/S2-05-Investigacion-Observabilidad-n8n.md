# S2-05 — Investigación: Observabilidad (Langfuse/Phoenix) en n8n

**Issue:** [#67](https://github.com/equipo2-AgroSmart-Insights/Agrosmart-Insights/issues/67)
**Asignados:** Gabriel León (DevSecOps), Sebastián Borda
**Fecha de esta investigación:** 08/09/2026
**Estado:** Causa raíz confirmada y solución validada en aislado — pendiente decisión de actualizar producción

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

El contenedor de prueba fue eliminado al terminar; el entorno de trabajo real (`agrosmart_n8n`, `agrosmart_db`, `agrosmart_phoenix`) no fue modificado en ningún momento.

## Recomendación

Con la prueba end-to-end exitosa, la recomendación de esta investigación es **actualizar n8n a 2.37.10**, ya que resuelve el issue #67 de forma completa y nativa (no solo en WF2, sino también en WF0 y WF1, ambos importados sin problemas). La instrumentación manual (alternativa B) queda descartada como innecesaria: implicaría más trabajo para lograr menos cobertura.

El cambio de imagen ya está preparado en `infrastructure/docker-compose.yml` en la rama `s2-05-n8n-upgrade-test`, listo para aplicarse cuando el equipo decida — **todavía no se ha ejecutado contra el entorno local compartido ni contra producción**, precisamente porque subir la versión de n8n_system es irreversible.

## Decisión pendiente (para el equipo, no solo DevSecOps)

Para cerrar el issue #67 hay dos caminos:

1. **Actualizar n8n a ≥2.33.0** (probablemente `2.37.10` o la más reciente disponible al momento de decidir). Riesgo conocido: la última vez que se cambió la versión de n8n, varios nodos de WF0/WF1/WF2 tuvieron incompatibilidades de `typeVersion` que hubo que corregir uno por uno. Habría que repetir ese proceso de validación con cuidado, en una rama aparte, antes de tocar producción.
2. **Instrumentar manualmente sin subir de versión**: agregar un nodo HTTP Request al final de cada rama de WF2 que envíe manualmente los datos de la ejecución (duración, modelo, error) a la API REST de Langfuse Cloud o al endpoint `/v1/traces` de Phoenix. Más trabajo manual, pero no exige tocar la versión de n8n ni volver a validar compatibilidad de nodos.

## Próximos pasos sugeridos

- [x] Crear la cuenta de Langfuse Cloud y obtener las API keys reales — hecho, keys ya en `.env` local y en GitHub Secrets.
- [x] Validar en aislado que n8n 2.37.10 resuelve el issue (camino feliz y camino de error) — hecho, ver secciones arriba.
- [ ] Decidir entre actualizar n8n o instrumentación manual (reunión de equipo o coordinación con Sebastián, co-asignado del issue). Recomendación de esta investigación: actualizar n8n.
- [ ] Aplicar la actualización al entorno local compartido del equipo (no solo un contenedor aislado) y repetir la validación de `typeVersion` de WF0/WF1/WF2 como se hizo en el PR #59.
- [ ] Decidir y ejecutar la actualización en producción (Render) — solo después de validar en el entorno local compartido.
