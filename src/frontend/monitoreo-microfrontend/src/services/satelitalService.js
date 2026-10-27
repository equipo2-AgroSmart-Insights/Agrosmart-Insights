import { sendN8nAction } from "./n8nClient";
import { fetchLocationClimate } from "./openMeteoService";

export const INDICADORES = {
  SEQUIA: "sequia",
  HUMEDAD: "humedad",
  NDVI: "ndvi",
};

export const METADATOS_INDICADORES = {
  [INDICADORES.SEQUIA]: {
    id: INDICADORES.SEQUIA,
    nombre: "Sequía y Déficit Hídrico",
    descripcion: "Balance hídrico entre precipitación acumulada y evapotranspiración de cultivo (ET0).",
    fuente: "Open-Meteo & MapTiler",
    disponible: true,
    unidad: "mm (Balance)",
    tipoDato: "Agroclimático continuo",
    reglasRiesgo: [
      { nivel: "Alto", etiqueta: "Alto déficit hídrico (< -20 mm)", color: "#ba1a1a", bg: "bg-error-container", text: "text-on-error-container" },
      { nivel: "Medio", etiqueta: "Déficit moderado (-20 a 0 mm)", color: "#e9c46a", bg: "bg-wheat-gold/20", text: "text-amber-800" },
      { nivel: "Bajo", etiqueta: "Balance saludable (≥ 0 mm)", color: "#1b4332", bg: "bg-forest-green/20", text: "text-forest-green" },
    ],
  },
  [INDICADORES.HUMEDAD]: {
    id: INDICADORES.HUMEDAD,
    nombre: "Humedad del Suelo y Ambiental",
    descripcion: "Porcentaje de humedad relativa en zona de cultivo geolocalizada.",
    fuente: "Open-Meteo & MapTiler",
    disponible: true,
    unidad: "%",
    tipoDato: "Relativa horaria/diaria",
    reglasRiesgo: [
      { nivel: "Alto", etiqueta: "Estrés hídrico severo (< 30%)", color: "#ba1a1a", bg: "bg-error-container", text: "text-on-error-container" },
      { nivel: "Medio", etiqueta: "Humedad moderada (30% - 60%)", color: "#e9c46a", bg: "bg-wheat-gold/20", text: "text-amber-800" },
      { nivel: "Bajo", etiqueta: "Humedad óptima (> 60%)", color: "#1b4332", bg: "bg-forest-green/20", text: "text-forest-green" },
    ],
  },
  [INDICADORES.NDVI]: {
    id: INDICADORES.NDVI,
    nombre: "NDVI (Índice de Vegetación de Diferencia Normalizada)",
    descripcion: "Índice espectral satelital para medir vigor vegetativo de parcelas agrícolas.",
    fuente: "Sentinel-2 / Landsat (No integrado en pipeline WF2)",
    disponible: false, // NO SIMULADO NI INVENTADO
    motivoNoDisponible: "El flujo n8n (WF2) actualmente no procesa bandas espectrales raster de Sentinel/Landsat ni devuelve matrices NDVI. En cumplimiento de la política de cero datos inventados, este indicador se expone como NO DISPONIBLE.",
    unidad: "Adimensional (-1 a 1)",
    tipoDato: "Raster multiespectral",
    reglasRiesgo: [],
  },
};

/**
 * Consulta la información satelital y geoespacial real a través de WF2 / servicios agroclimáticos.
 * Mide además el tiempo exacto de respuesta de la capa para el reporte de rendimiento.
 */
export async function fetchCapaIndicador({ location, indicadorId }) {
  const startTime = performance.now();
  const def = METADATOS_INDICADORES[indicadorId];

  if (!def) {
    throw new Error(`Indicador desconocido: ${indicadorId}`);
  }

  // Si el indicador no está disponible en el backend/WF, devolver estado NO DISPONIBLE sin inventar datos
  if (!def.disponible) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      indicadorId,
      disponible: false,
      motivo: def.motivoNoDisponible,
      nombre: def.nombre,
      fuente: def.fuente,
      fechaActualizacion: "Sin registro en WF",
      coberturaGeografica: location ? `${location.name}, ${location.admin1 || "Perú"}` : "Sin cobertura",
      coordenadas: location ? [location.latitude, location.longitude] : null,
      loadTimeMs: elapsed,
      valor: null,
      nivelRiesgo: null,
    };
  }

  // Para indicadores disponibles, recuperar datos reales vinculados a la geolocalización de MapTiler
  let climateData = null;
  let wf2Respuesta = null;

  try {
    // 1. Intenta invocar el webhook de WF2 con intención de análisis satelital
    try {
      wf2Respuesta = await sendN8nAction({
        action: "analisis_satelital_riesgo",
        tipo: "analisis_satelital_riesgo",
        pregunta: `análisis satelital de ${location.name} para monitoreo de riesgo agrícola`,
        lugar: location.name,
        coordenadas: [location.longitude, location.latitude],
      });
    } catch (n8nErr) {
      console.warn("Llamada directa al webhook WF2 n8n falló o no respondió, usando datos climáticos reales de respaldo:", n8nErr);
    }

    // 2. Traer los datos agroclimáticos georreferenciados (Open-Meteo con las coordenadas de MapTiler)
    climateData = await fetchLocationClimate(location);
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    throw new Error(`Error recuperando datos geoespaciales desde WF: ${err.message}`);
  }

  const elapsed = Math.round(performance.now() - startTime);

  // Procesamiento específico según el indicador solicitado
  let valor = null;
  let nivelRiesgo = null;
  let interpretacion = "";

  if (indicadorId === INDICADORES.SEQUIA) {
    const prec = climateData?.summary?.precipitation ?? 0;
    const evap = climateData?.summary?.evapotranspiration ?? 0;
    const balance = Number((prec - evap).toFixed(1));
    valor = balance;

    if (balance < -20) {
      nivelRiesgo = { nivel: "Alto", label: "Alto déficit hídrico", color: "#ba1a1a", badge: "bg-error-container text-on-error-container" };
      interpretacion = "Evapotranspiración supera ampliamente las precipitaciones. Riesgo crítico de estrés por sequía.";
    } else if (balance < 0) {
      nivelRiesgo = { nivel: "Medio", label: "Déficit moderado", color: "#e9c46a", badge: "bg-amber-100 text-amber-800" };
      interpretacion = "Balance hídrico negativo leve a moderado. Se sugiere control de riego.";
    } else {
      nivelRiesgo = { nivel: "Bajo", label: "Balance saludable", color: "#1b4332", badge: "bg-forest-green/10 text-forest-green" };
      interpretacion = "Aporte hídrico adecuado para las demandas del cultivo.";
    }
  } else if (indicadorId === INDICADORES.HUMEDAD) {
    const humedad = Number(climateData?.summary?.humidity ?? 0);
    valor = humedad;

    if (humedad < 30) {
      nivelRiesgo = { nivel: "Alto", label: "Estrés hídrico severo", color: "#ba1a1a", badge: "bg-error-container text-on-error-container" };
      interpretacion = "Humedad ambiente crítica (<30%), alta tasa de transpiración vegetal.";
    } else if (humedad <= 60) {
      nivelRiesgo = { nivel: "Medio", label: "Humedad moderada", color: "#e9c46a", badge: "bg-amber-100 text-amber-800" };
      interpretacion = "Humedad dentro de rangos operativos normales (30% - 60%).";
    } else {
      nivelRiesgo = { nivel: "Bajo", label: "Humedad óptima", color: "#1b4332", badge: "bg-forest-green/10 text-forest-green" };
      interpretacion = "Condiciones de humedad favorables (>60%).";
    }
  }

  return {
    indicadorId,
    disponible: true,
    nombre: def.nombre,
    fuente: def.fuente,
    fechaActualizacion: climateData?.lastUpdated || new Date().toLocaleDateString("es-PE"),
    coberturaGeografica: `${location.name}, ${location.admin1 || "Perú"}`,
    coordenadas: [location.latitude, location.longitude],
    loadTimeMs: elapsed,
    valor,
    unidad: def.unidad,
    nivelRiesgo,
    interpretacion,
    wfReporte: wf2Respuesta?.respuesta || null,
  };
}
