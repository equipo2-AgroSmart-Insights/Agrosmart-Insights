const fs = require('fs');
const path = require('path');
const { generarDataset } = require('./generate_dataset'); // Importa la extracción de DB

// Configuración de producción
const N8N_WEBHOOK_URL = 'https://agrosmart-n8n.onrender.com/webhook/v1/query'; 
const DATASET_PATH = path.join(__dirname, 'dataset_ground_truth.json');

// Credenciales opcionales de Langfuse
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || 'pk-lf-...';
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || 'sk-lf-...';
const LANGFUSE_HOST = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

function extraerPrecio(respuestaTexto) {
  if (!respuestaTexto) return null;
  const matchSoles = respuestaTexto.match(/(?:S\/\.?|soles)\s*(\d+(?:[\.,]\d+)?)/i) || 
                     respuestaTexto.match(/(\d+(?:[\.,]\d+)?)\s*soles/i);
  if (matchSoles) return parseFloat(matchSoles[1].replace(',', '.'));
  const matchDecimal = respuestaTexto.match(/\b(\d+[\.,]\d{1,2})\b/);
  if (matchDecimal) return parseFloat(matchDecimal[1].replace(',', '.'));
  return null;
}

function calcularP95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function obtenerMetricasLangfuse() {
  const auth = Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64');
  try {
    const res = await fetch(`${LANGFUSE_HOST}/api/public/metrics/daily`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

async function ejecutarAuditoria() {
  console.log('========================================');
  console.log(' INICIANDO AUDITORÍA AGROSMART INSIGHTS ');
  console.log('========================================\n');

  // 1. PASO AUTOMÁTICO: Extrae precios reales de PostgreSQL y actualiza dataset_ground_truth.json
  await generarDataset();

  // 2. Lee el dataset recién actualizado
  const rawData = fs.readFileSync(DATASET_PATH, 'utf-8');
  const dataset = JSON.parse(rawData);

  const latencias = [];
  let correctas = 0;
  let alucinaciones = 0;
  let erroresSolicitud = 0;
  let rechazosIndebidos = 0; // ver sección 2 de docs/sprint-4/S4-LLMOps-Inventario-Modelos-y-Evals.md

  // 3. Ejecuta la prueba contra la IA
  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const idx = i + 1;
    const pregunta = item.pregunta;
    const precioEsperado = parseFloat(item.precio_esperado);

    const startTime = Date.now();

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta })
      });

      const endTime = Date.now();
      const latencia = (endTime - startTime) / 1000;
      latencias.push(latencia);

      if (response.ok) {
        const data = await response.json();
        const respuestaIA = data.respuesta || '';
        const precioObtenido = extraerPrecio(respuestaIA);

        // Caso aparte: el chat rechazó una pregunta de precio legítima como
        // "fuera de alcance" / "información sensible". Esto NO es lo mismo
        // que una alucinación de precio -- es un falso rechazo, y es la
        // señal más confiable de las dos (el precio real fluctúa a diario,
        // así que comparar el número exacto contra un dataset de hace
        // semanas da falsos positivos solo por eso; un rechazo indebido no
        // depende de cuándo se generó el dataset).
        const esRechazoIndebido = data.estado === 'fuera_de_alcance' || /no puede ser atendida/i.test(respuestaIA);

        let estado = 'DISCREPANCIA / ALUCINACIÓN';
        if (esRechazoIndebido) {
          estado = 'RECHAZO INDEBIDO';
          rechazosIndebidos++;
        } else if (precioObtenido !== null && Math.abs(precioObtenido - precioEsperado) < 0.01) {
          estado = 'CORRECTA';
          correctas++;
        } else {
          alucinaciones++;
        }

        console.log(`[${idx}/${dataset.length}] Pregunta: ${pregunta}`);
        console.log(`      Esperado (DB): S/ ${precioEsperado.toFixed(2)} | Obtenido (IA): ${respuestaIA}`);
        console.log(`      Resultado: ${estado} | Latencia: ${latencia.toFixed(2)}s\n`);
      } else {
        erroresSolicitud++;
        console.log(`[${idx}/${dataset.length}] Error HTTP ${response.status} al procesar la pregunta.\n`);
      }
    } catch (error) {
      const endTime = Date.now();
      latencias.push((endTime - startTime) / 1000);
      erroresSolicitud++;
      console.log(`[${idx}/${dataset.length}] Excepción: ${error.message}\n`);
    }
  }

  // 4. Reporte técnico final
  const totalEvaluadas = dataset.length;
  const exactitud = totalEvaluadas > 0 ? (correctas / totalEvaluadas) * 100 : 0;
  const tasaRechazoIndebido = totalEvaluadas > 0 ? (rechazosIndebidos / totalEvaluadas) * 100 : 0;
  const latenciaPromedio = latencias.length > 0 ? latencias.reduce((a, b) => a + b, 0) / latencias.length : 0;
  const latenciaP95 = calcularP95(latencias);
  const tasaExito = totalEvaluadas > 0 ? ((totalEvaluadas - erroresSolicitud) / totalEvaluadas) * 100 : 0;

  const langfuseData = await obtenerMetricasLangfuse();

  console.log('========================================');
  console.log('     REPORTE TÉCNICO DE AUDITORÍA       ');
  console.log('========================================');
  console.log(`Preguntas evaluadas:       ${totalEvaluadas}`);
  console.log(`Exactitud numérica:         ${exactitud.toFixed(2)}% (informativo -- el precio real cambia a diario, no es un gate de CI)`);
  console.log(`Alucinaciones:              ${alucinaciones}`);
  console.log(`Rechazos indebidos:         ${rechazosIndebidos} (${tasaRechazoIndebido.toFixed(2)}%) -- preguntas de precio legítimas bloqueadas como "fuera de alcance"`);
  console.log(`Tasa de éxito HTTP:         ${tasaExito.toFixed(2)}%\n`);
  console.log(`Latencia promedio:          ${latenciaPromedio.toFixed(2)} s`);
  console.log(`Latencia p95:               ${latenciaP95.toFixed(2)} s`);
  console.log(`Objetivo p95:               < 4.0 s\n`);

  if (langfuseData) {
    console.log(`Tokens acumulados:          ${langfuseData.totalTokens || 'N/A'}`);
    console.log(`Costo acumulado:            $${langfuseData.totalCost || '0.00'}`);
  }
  console.log('========================================');

  // Código de salida: antes este script nunca fallaba, sin importar el
  // resultado -- un reporte que nadie corría ni leía. Se falla sobre señales
  // que NO dependen de que el precio de mercado haya cambiado desde que se
  // generó el dataset (eso es ruido esperado, no una regresión real):
  //   - Tasa de éxito HTTP baja: el servicio o la red están fallando.
  //   - Rechazos indebidos: el chat está bloqueando preguntas legítimas.
  // Umbrales generosos a propósito -- es la primera corrida con datos
  // reales, ver sección 4 de docs/sprint-4/S4-LLMOps-Inventario-Modelos-y-Evals.md.
  const UMBRAL_TASA_EXITO_MIN = 90;
  const UMBRAL_RECHAZO_INDEBIDO_MAX = 20;

  if (tasaExito < UMBRAL_TASA_EXITO_MIN) {
    console.error(`\n❌ FALLO: tasa de éxito HTTP (${tasaExito.toFixed(2)}%) por debajo del umbral (${UMBRAL_TASA_EXITO_MIN}%).`);
    return 1;
  }
  if (tasaRechazoIndebido > UMBRAL_RECHAZO_INDEBIDO_MAX) {
    console.error(`\n❌ FALLO: ${rechazosIndebidos} preguntas legítimas rechazadas como "fuera de alcance" (${tasaRechazoIndebido.toFixed(2)}%, umbral ${UMBRAL_RECHAZO_INDEBIDO_MAX}%).`);
    return 1;
  }
  return 0;
}

ejecutarAuditoria().then((codigoSalida) => process.exit(codigoSalida || 0));