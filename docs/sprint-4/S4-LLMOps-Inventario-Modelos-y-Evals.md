# S4 — LLMOps: Inventario de modelos de IA y activación de evaluaciones automáticas

**Rol:** Gabriel León (DevSecOps)
**Fecha:** 01/11/2026
**Motivación:** dos incidentes reales esta semana (ambos por `models/gemini-2.5-pro` deprecado en nodos distintos de WF2, ver `Informe-04-Correcciones-Semana3-Sprint4`) mostraron que no existía ningún inventario de qué modelo usa cada nodo, ni ninguna prueba automática que detectara una respuesta de IA incorrecta más allá de "¿devolvió HTTP 200?".

## 1. Inventario de modelos de IA en WF2 (verificado en vivo, 01/11/2026)

Revisado nodo por nodo en el editor de n8n (solo lectura, sin guardar cambios).

| Nodo | Tipo | Modelo configurado | Estado |
|---|---|---|---|
| Google Gemini Chat Model2 | Modelo principal (AI Agent3) | `models/gemini-3.1-pro-preview` | ✅ Correcto |
| Google Gemini Chat Model5 | Modelo principal | `models/gemini-3.1-pro-preview` | ✅ Correcto |
| Google Gemini Chat Model6 | Modelo principal | `models/gemini-3.1-pro-preview` | ✅ Correcto |
| Google Gemini Chat Model8 | Modelo principal | `models/gemini-3.1-pro-preview` | ✅ Correcto |
| Google Gemini Chat Model10 | Modelo principal (AI Agent2) | `models/gemini-3.1-pro-preview` | ✅ Correcto |
| OpenRouter Chat Model | Modelo de respaldo (fallback) | `inclusionai/ling-3.0-flash` | ✅ Correcto |
| OpenRouter Chat Model2 | Modelo de respaldo | `inclusionai/ling-3.0-flash` | ✅ Correcto |
| OpenRouter Chat Model3 | Modelo de respaldo | `inclusionai/ling-3.0-flash` | ✅ Correcto |
| OpenRouter Chat Model4 | Modelo de respaldo | `inclusionai/ling-3.0-flash` | ✅ Correcto |
| OpenRouter Chat Model6 | Modelo de respaldo | `inclusionai/ling-3.0-flash` | ✅ Correcto |

**Nota sobre la numeración:** no existen "Model1", "Model3", "Model7", "Model9", "Model5" (OpenRouter) ni similares — son huecos normales de cuando n8n autoincrementa el nombre al duplicar un nodo y luego alguno se borra. Confirmado que no falta ningún nodo real: 5 modelos principales + 5 de respaldo, todos consistentes.

**Conclusión:** al 01/11/2026, los dos incidentes de modelo deprecado ya están resueltos en los 5 nodos principales. Este inventario queda como línea base — la próxima vez que se sospeche un problema de modelo, revisar esta tabla primero en vez de abrir nodo por nodo a ciegas.

## 2. Hallazgo nuevo encontrado al activar las evaluaciones: falso rechazo de consultas legítimas

Al correr `audit_eval.js` (ver sección 3) contra las 50 preguntas del dataset, **24 de 50 (48%)** fueron rechazadas con:

```json
{"respuesta":"La consulta no puede ser atendida por AgroSmart. El asistente está diseñado para
responder consultas relacionadas con precios agrícolas... y no proporciona información interna
o sensible del sistema.","estado":"fuera_de_alcance"}
```

Para productos completamente normales: Ajo, Brócoli, Espinaca, Plátano, Perejil, Palta, Mango, Piña, Apio, Mandarina, Naranja, Manzana, Olluco, Pepinillo, Poro, Vainita, Kion, Caigua, Choclo, Haba, Limón, Alverja.

**Diagnóstico:** el rechazo depende de la frase exacta, no del producto en sí.

| Frase | Resultado |
|---|---|
| `"cual es el precio del brocoli"` | ✅ Responde bien (S/ 3.63, dato real) |
| `"precio del ajo hoy"` | ✅ Responde bien (S/ 4.63 y S/ 6.38, datos reales) |
| `"¿A cuánto está el Brócoli?"` | ❌ Rechazado como "fuera de alcance" |
| `"¿A cuánto está la Ajo criollo?"` | ❌ Rechazado como "fuera de alcance" |

Es decir: el patrón específico `"¿A cuánto está la/el [Producto]?"` dispara un falso positivo en la clasificación de la consulta (en algún nodo de validación dentro de WF2 — no se identificó el nodo exacto porque requiere editar/inspeccionar más a fondo el flujo de clasificación, fuera del alcance de esta revisión de solo lectura). Con frases naturales equivalentes, el mismo producto responde correctamente.

**Por qué importa:** no es un riesgo inmediato para el uso normal (la gente no suele escribir con esa estructura formal exacta), pero si una demo o un formulario guiado usa esa plantilla de pregunta, fallaría con casi la mitad de los productos. Queda documentado para que Fiorella o Cristhian lo revisen directamente en el nodo de clasificación de WF2.

## 3. Activación de evaluaciones automáticas (evals)

Ya existía un harness de evaluación (`src/ia-ops/tests/audit_eval.js` + `generate_dataset.js` + `dataset_ground_truth.json`, construido por Cristhian el 17/09/2026) que:
- Extrae precios reales de la base de datos de producción como "verdad de referencia".
- Le hace la misma pregunta al chat real.
- Compara el precio que devuelve la IA contra el de la base de datos.
- Mide latencia (promedio y p95) y tasa de éxito HTTP.

**El problema: nunca se integró a ningún workflow de CI** — existía, pero nadie lo corría. Se integró en `.github/workflows/ai-evals.yml` (ver PR asociado), programado cada 12 horas, usando el mismo secreto `RENDER_DATABASE_URL` que ya existe para refrescar el dataset contra la base real antes de evaluar (evita el problema de comparar contra precios de hace semanas, que de otro modo generan falsos "fallos" solo porque el precio de mercado cambió, no porque la IA esté mal).

Se ajustó el script para que falle el job (código de salida distinto de cero) cuando la tasa de alucinación supere un umbral, en vez de solo imprimir un reporte que nadie lee.

## 4. Pendiente (fuera del alcance de hoy, requiere editor de n8n o decisión del equipo)

- Encontrar el nodo exacto de WF2 responsable del falso rechazo de la sección 2 y corregir su lógica de clasificación.
- Revisar el registro con fecha `03/01/2024` encontrado para "Zapallo Macre" durante esta prueba — parece un dato de ingesta mucho más antiguo que el resto (la mayoría son de octubre/noviembre 2026); vale la pena confirmar si es un error de carga histórica o un producto con muy baja rotación.
- Umbral de alerta de `ai-evals.yml` (actualmente solo abre/comenta un Issue, igual que los demás workflows programados) — revisar después de unas corridas reales con dataset fresco cuál es un porcentaje de alucinación realista como línea base, ya que hoy no se pudo calibrar con datos frescos (sin acceso a `RENDER_DATABASE_URL` en esta sesión).
