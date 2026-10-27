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
    nombre: "NDVI (Vigor Vegetativo)",
    descripcion: "Índice de Vegetación de Diferencia Normalizada obtenido vía Sentinel-2 para evaluar salud del cultivo.",
    fuente: "Copernicus Sentinel-2 (CDSE) vía WF3",
    disponible: true,
    motivoNoDisponible: "El webhook WF3 de n8n no se encuentra activo o requiere rotación de credencial VITE_WF3_NDVI_KEY.",
    unidad: "Raster espectral (-1 a 1)",
    tipoDato: "Raster multiespectral (image/png)",
    reglasRiesgo: [
      { nivel: "Alto", etiqueta: "Vigor crítico o suelo desnudo (< 0.20)", color: "#ba1a1a", bg: "bg-error-container", text: "text-on-error-container" },
      { nivel: "Medio", etiqueta: "Vigor moderado (0.20 a 0.50)", color: "#e9c46a", bg: "bg-wheat-gold/20", text: "text-amber-800" },
      { nivel: "Bajo", etiqueta: "Vigor óptimo / Follaje denso (> 0.50)", color: "#1b4332", bg: "bg-forest-green/20", text: "text-forest-green" },
    ],
  },
};

// Variables de entorno para WF3 (sin claves en texto plano)
const WF3_NDVI_URL =
  import.meta.env.VITE_WF3_NDVI_URL ||
  "https://agrosmart-n8n.onrender.com/webhook/v1/satelital/ndvi";
const WF3_NDVI_KEY = import.meta.env.VITE_WF3_NDVI_KEY || "";

/**
 * Consulta WF3 para obtener la capa raster NDVI (image/png) de Sentinel-2.
 */
async function fetchWF3NdviData(location) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  // Cálculo de bounding box geográfico (~11 km de radio alrededor de la ubicación)
  const delta = 0.1;
  const minLon = Number((location.longitude - delta).toFixed(4));
  const minLat = Number((location.latitude - delta).toFixed(4));
  const maxLon = Number((location.longitude + delta).toFixed(4));
  const maxLat = Number((location.latitude + delta).toFixed(4));

  // WGS84 bbox estándar: [minLon, minLat, maxLon, maxLat]
  const bbox = [minLon, minLat, maxLon, maxLat];

  // Límites para Leaflet L.imageOverlay: [[south, west], [north, east]]
  const bounds = [
    [minLat, minLon],
    [maxLat, maxLon],
  ];

  // Fechas de consulta (últimos 30 días para captura libre de nubes)
  const today = new Date();
  const fechaFin = today.toISOString().split("T")[0];
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30);
  const fechaInicio = pastDate.toISOString().split("T")[0];

  const payload = {
    region: location.admin1 || location.name,
    lugar: location.name,
    bbox: bbox,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  };

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (WF3_NDVI_KEY) {
      headers["X-AgroSmart-Key"] = WF3_NDVI_KEY;
    }

    const response = await fetch(WF3_NDVI_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        disponible: false,
        motivo:
          "Autenticación requerida para WF3: configura la variable de entorno VITE_WF3_NDVI_KEY con la clave actualizada.",
      };
    }

    if (response.status === 404) {
      console.warn("WF3 devolvió 404: el webhook no está activo en n8n.");
      return {
        disponible: false,
        motivo:
          "El webhook WF3 no está activo en n8n (HTTP 404). Activa el workflow en n8n para habilitar la transmisión satelital.",
      };
    }

    if (!response.ok) {
      throw new Error(`WF3 respondió con estado HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // Si la respuesta es una imagen raster (PNG/JPEG)
    if (contentType.includes("image") || contentType.includes("png")) {
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      return {
        disponible: true,
        isRasterImage: true,
        imageUrl,
        bounds,
        fechaActualizacion: fechaFin,
      };
    }

    // Si la respuesta fue JSON
    const data = await response.json();

    // Caso en que devuelva URL de imagen o datos estructurados
    if (data?.image_url || data?.url) {
      return {
        disponible: true,
        isRasterImage: true,
        imageUrl: data.image_url || data.url,
        bounds: data.bounds || bounds,
        fechaActualizacion: data.fecha || fechaFin,
        interpretacion: data.interpretacion,
      };
    }

    return {
      disponible: true,
      isRasterImage: false,
      data,
      bounds,
      fechaActualizacion: fechaFin,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        disponible: false,
        motivo: "La consulta a WF3 tardó más de 20 segundos y expiró.",
      };
    }
    console.warn("Error consultando WF3:", error);
    return {
      disponible: false,
      motivo: `No se pudo conectar con WF3: ${error.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Consulta la información satelital y geoespacial real a través de los Workflows correspondientes.
 * Mide además el tiempo exacto de respuesta de la capa para el reporte de rendimiento.
 */
export async function fetchCapaIndicador({ location, indicadorId }) {
  const startTime = performance.now();
  const def = METADATOS_INDICADORES[indicadorId];

  if (!def) {
    throw new Error(`Indicador desconocido: ${indicadorId}`);
  }

  // CASO NDVI: Conexión con WF3 (Raster Sentinel-2)
  if (indicadorId === INDICADORES.NDVI) {
    const wf3Res = await fetchWF3NdviData(location);
    const elapsed = Math.round(performance.now() - startTime);

    if (!wf3Res.disponible) {
      return {
        indicadorId,
        disponible: false,
        motivo: wf3Res.motivo || def.motivoNoDisponible,
        nombre: def.nombre,
        fuente: def.fuente,
        fechaActualizacion: "Sin registro en WF3",
        coberturaGeografica: location ? `${location.name}, ${location.admin1 || "Perú"}` : "Sin cobertura",
        coordenadas: location ? [location.latitude, location.longitude] : null,
        loadTimeMs: elapsed,
        valor: null,
        nivelRiesgo: null,
      };
    }

    // Si recibimos la imagen raster de Sentinel-2 vía WF3
    if (wf3Res.isRasterImage && wf3Res.imageUrl) {
      return {
        indicadorId,
        disponible: true,
        isRasterImage: true,
        imageUrl: wf3Res.imageUrl,
        bounds: wf3Res.bounds,
        nombre: def.nombre,
        fuente: def.fuente,
        fechaActualizacion: wf3Res.fechaActualizacion || new Date().toLocaleDateString("es-PE"),
        coberturaGeografica: `${location.name}, ${location.admin1 || "Perú"}`,
        coordenadas: [location.latitude, location.longitude],
        loadTimeMs: elapsed,
        valor: "Raster 10m",
        unidad: def.unidad,
        nivelRiesgo: {
          nivel: "Espectral",
          label: "Raster NDVI Multiespectral",
          color: "#1b4332",
          badge: "bg-forest-green/10 text-forest-green",
        },
        interpretacion:
          wf3Res.interpretacion ||
          "Capa satelital raster de Sentinel-2 L2A procesada en Copernicus CDSE. El gradiente verde destaca zonas con alto vigor vegetal y follaje activo.",
      };
    }

    // Si devolvió un JSON con valor numérico
    const raw = wf3Res.data;
    const rawValue =
      raw?.valor ??
      raw?.ndvi ??
      raw?.value ??
      raw?.data?.mean ??
      raw?.data?.ndvi ??
      raw?.datos_geoespaciales?.valor;

    const valorNdvi =
      rawValue !== undefined && rawValue !== null ? Number(Number(rawValue).toFixed(2)) : null;

    let nivelRiesgo = null;
    let interpretacion = "";

    if (valorNdvi !== null && !isNaN(valorNdvi)) {
      if (valorNdvi < 0.2) {
        nivelRiesgo = {
          nivel: "Alto",
          label: "Vigor crítico o suelo (< 0.20)",
          color: "#ba1a1a",
          badge: "bg-error-container text-on-error-container",
        };
        interpretacion = "Baja densidad foliar o suelo con escasa biomasa vegetal.";
      } else if (valorNdvi <= 0.5) {
        nivelRiesgo = {
          nivel: "Medio",
          label: "Vigor moderado (0.20 - 0.50)",
          color: "#e9c46a",
          badge: "bg-amber-100 text-amber-800",
        };
        interpretacion = "Vegetación en desarrollo con cobertura foliar intermedia.";
      } else {
        nivelRiesgo = {
          nivel: "Bajo",
          label: "Vigor óptimo (> 0.50)",
          color: "#1b4332",
          badge: "bg-forest-green/10 text-forest-green",
        };
        interpretacion = "Follaje denso y saludable con óptima actividad fotosintética.";
      }
    }

    return {
      indicadorId,
      disponible: true,
      nombre: def.nombre,
      fuente: def.fuente,
      fechaActualizacion: wf3Res.fechaActualizacion || new Date().toLocaleDateString("es-PE"),
      coberturaGeografica: `${location.name}, ${location.admin1 || "Perú"}`,
      coordenadas: [location.latitude, location.longitude],
      loadTimeMs: elapsed,
      valor: valorNdvi ?? "Sentinel-2",
      unidad: def.unidad,
      nivelRiesgo: nivelRiesgo || { nivel: "Info", label: "NDVI Activo", color: "#1b4332" },
      interpretacion: interpretacion || raw?.interpretacion || "Datos de vigor vegetativo satelital recibidos.",
    };
  }

  // CASOS SEQUÍA Y HUMEDAD: Flujo vigente con WF2 y Open-Meteo
  let climateData = null;
  let wf2Respuesta = null;

  try {
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

    climateData = await fetchLocationClimate(location);
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    throw new Error(`Error recuperando datos geoespaciales desde WF: ${err.message}`);
  }

  const elapsed = Math.round(performance.now() - startTime);

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
