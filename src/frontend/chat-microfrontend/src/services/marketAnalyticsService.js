import { sendN8nAction } from "./n8nClient";

/**
 * Paleta de colores de alto contraste accesible (WCAG 2.1 AA/AAA) para dispositivos
 * Garantiza legibilidad en pantallas móviles, exteriores y para usuarios con daltonismo.
 */
export const ACCESSIBLE_PALETTE = {
  emerald: {
    stroke: "#046a38",
    fill: "rgba(4, 106, 56, 0.15)",
    text: "#024223",
    pointStyle: "circle"
  },
  amber: {
    stroke: "#b45309",
    fill: "rgba(180, 83, 9, 0.12)",
    text: "#78350f",
    pointStyle: "rectRot"
  },
  sapphire: {
    stroke: "#1d4ed8",
    fill: "rgba(29, 78, 216, 0.85)",
    text: "#1e3a8a",
    pointStyle: "triangle"
  },
  teal: {
    stroke: "#0f766e",
    fill: "rgba(15, 118, 110, 0.85)",
    text: "#115e59",
    pointStyle: "star"
  },
  crimson: {
    stroke: "#b91c1c",
    fill: "rgba(185, 28, 28, 0.85)",
    text: "#7f1d1d",
    pointStyle: "cross"
  },
  purple: {
    stroke: "#7e22ce",
    fill: "rgba(126, 34, 206, 0.85)",
    text: "#581c87",
    pointStyle: "rect"
  }
};

/**
 * Normaliza y extrae dinámicamente los registros de datos devueltos por n8n o la base de datos.
 * NO utiliza datos fijos ni hardcodeados. Todo se deriva de la respuesta del webhook/SQL.
 */
export function extractDynamicRecords(result) {
  if (!result) return [];

  // 1. Extraer si n8n devolvió registros directos de SQL (datos_completos o precios_diarios)
  if (Array.isArray(result.datos_completos) && result.datos_completos.length > 0) {
    return result.datos_completos.map(normalizeRawRow);
  }

  if (Array.isArray(result.precios) && result.precios.length > 0) {
    return result.precios.map(normalizeRawRow);
  }

  if (Array.isArray(result.productos) && result.productos.length > 0) {
    return result.productos.map(normalizeRawRow);
  }

  if (Array.isArray(result.data) && result.data.length > 0) {
    return result.data.map(normalizeRawRow);
  }

  // 2. Extraer si n8n devolvió un formato de gráfico estructurado
  const chartObj = result.grafico || result.chart || result.trend_data;
  if (chartObj && Array.isArray(chartObj.labels) && Array.isArray(chartObj.values)) {
    return chartObj.labels.map((label, idx) => ({
      fecha: label,
      producto: chartObj.producto || result.producto || "Producto Consultado",
      precio: Number(chartObj.values[idx]) || 0,
      volumen: Number(chartObj.volumes?.[idx] || chartObj.volumen?.[idx] || 0),
      mercado: chartObj.mercado || "GMML",
      region: chartObj.region || "Nacional",
      unidad: chartObj.unidad || "kg"
    }));
  }

  // 3. Extraer si n8n devolvió un resumen_mercado (array de strings con producto, precio, volumen)
  if (Array.isArray(result.resumen_mercado) && result.resumen_mercado.length > 0) {
    return result.resumen_mercado.map((itemStr, idx) => {
      // Formato típico: "Papa Blanca: $1.45 (Vol: 680)"
      const match = String(itemStr).match(/([^:]+):\s*[$S\/]?\s*([\d.]+)(?:.*Vol:\s*([\d.]+))?/i);
      if (match) {
        return {
          fecha: `Ítem ${idx + 1}`,
          producto: match[1].trim(),
          precio: parseFloat(match[2]) || 0,
          volumen: parseFloat(match[3]) || 0,
          mercado: "GMML",
          region: "Nacional",
          unidad: "kg"
        };
      }
      return {
        fecha: `Ítem ${idx + 1}`,
        producto: String(itemStr),
        precio: 0,
        volumen: 0,
        mercado: "GMML",
        region: "Nacional",
        unidad: "kg"
      };
    });
  }

  // 4. Si n8n devolvió un modo "específico" con un solo producto y precio
  if (result.producto && (result.precio_actual !== undefined || result.precio !== undefined)) {
    return [
      {
        fecha: result.fecha || new Date().toISOString().split("T")[0],
        producto: result.producto,
        precio: parseFloat(result.precio_actual || result.precio || 0),
        volumen: parseFloat(result.volumen_actual || result.volumen || 0),
        mercado: result.mercado || "GMML",
        region: result.region || "Nacional",
        unidad: result.unidad || "kg"
      }
    ];
  }

  // 5. Parser dinámico de texto para respuestas estructuradas del agente n8n
  const textContent = result.respuesta || result.response || result.text || "";
  if (typeof textContent === "string" && textContent.length > 0) {
    const structuredRows = parseStructuredN8nEvaluation(textContent);
    if (structuredRows.length > 0) return structuredRows;

    const parsedRows = parseTextForMarketNumbers(textContent);
    if (parsedRows.length > 0) return parsedRows;
  }

  return [];
}

/**
 * Parsea un texto de fecha en lenguaje natural ("9 de octubre de 2026") o ISO
 * y devuelve una etiqueta corta legible para el eje X del gráfico.
 */
function parseDateText(dateText) {
  if (!dateText || typeof dateText !== "string") return null;

  const monthMap = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11
  };

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Formato lenguaje natural: "9 de octubre de 2026" o "9 de octubre"
  const textMatch = dateText.match(/(\d{1,2})\s+de\s+([A-Za-z]+)(?:\s+de\s+(\d{4}))?/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthName = textMatch[2].toLowerCase();
    const month = monthMap[monthName] !== undefined ? monthMap[monthName] : null;
    if (month !== null) {
      return `${String(day).padStart(2, "0")} ${monthNames[month]}`;
    }
  }

  // Formato ISO: "2026-10-09"
  const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return `${String(day).padStart(2, "0")} ${monthNames[month]}`;
  }

  // Si no se puede parsear, devolver el texto tal cual
  return dateText.trim();
}

/**
 * Analizador especializado para reportes de evaluación comercial emitidos por n8n / IA.
 * SOLO extrae datos reales explícitamente mencionados en la respuesta del chat.
 * No inventa ni interpola datos. Si el chat menciona 1 precio, se muestra 1 punto;
 * si menciona 2, se muestran 2, y así sucesivamente.
 */
function parseStructuredN8nEvaluation(text) {
  if (!text || typeof text !== "string") return [];

  // 1. Extraer nombre del producto y mercado del encabezado
  let producto = "";
  let mercado = "GMML";
  let unidad = "kg";

  const headerMatch = text.match(/Evaluaci[oó]n comercial de ([^—–\n]+)(?:[—–]\s*([^\n]+))?/i);
  if (headerMatch) {
    producto = headerMatch[1].trim();
    if (headerMatch[2]) mercado = headerMatch[2].trim();
  }

  // Extraer unidad si se menciona: "por Kilogramo" o "por kg"
  const unidadMatch = text.match(/por\s+([A-Za-z]+)/i);
  if (unidadMatch) {
    const u = unidadMatch[1].toLowerCase();
    unidad = u.includes("kilo") ? "kg" : u;
  }

  const prodName = producto || "Producto Consultado";
  const records = [];

  // 2. Extraer último precio y su fecha — dato real explícito de n8n
  const ultPrecioMatch = text.match(/[UÚuú]ltimo precio:\s*S\/\s*([\d,.]+)(?:[^\(\n]*\(([^)]+)\))?/i);
  const ultPrecio = ultPrecioMatch ? parseFloat(ultPrecioMatch[1].replace(",", ".")) : null;
  const ultPrecioFechaRaw = ultPrecioMatch && ultPrecioMatch[2] ? ultPrecioMatch[2].trim() : "";

  // 3. Extraer último volumen y su fecha — dato real explícito de n8n
  const ultVolMatch = text.match(/[UÚuú]ltimo volumen(?: registrado)?:\s*([\d,.]+)\s*(?:toneladas|TM|kg)(?:[^\(\n]*\(([^)]+)\))?/i);
  const ultVol = ultVolMatch ? parseFloat(ultVolMatch[1].replace(",", ".")) : 0;
  const ultVolFechaRaw = ultVolMatch && ultVolMatch[2] ? ultVolMatch[2].trim() : "";

  // 4. Extraer precio anterior — dato real mencionado en la respuesta
  const precioAntMatch = text.match(/precio anterior\s*\((?:S\/\s*)?([\d,.]+)\)/i);
  const precioAnterior = precioAntMatch ? parseFloat(precioAntMatch[1].replace(",", ".")) : null;

  // Si no hay ningún dato real explícito, no generar registros
  if (ultPrecio === null && precioAnterior === null) return [];

  // 5. Construir registros SOLO con datos explícitos del chat

  // Agregar precio anterior si fue mencionado explícitamente en la respuesta
  if (precioAnterior !== null) {
    records.push({
      fecha: "Reg. anterior",
      producto: prodName,
      precio: precioAnterior,
      volumen: 0,
      mercado,
      region: mercado,
      unidad
    });
  }

  // Agregar último precio (dato más reciente con fecha explícita)
  if (ultPrecio !== null) {
    const fechaLabel = parseDateText(ultPrecioFechaRaw) || new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
    records.push({
      fecha: fechaLabel,
      producto: prodName,
      precio: ultPrecio,
      volumen: ultVol,
      mercado,
      region: mercado,
      unidad
    });
  }

  return records;
}

/**
 * Normaliza una fila individual proveniente de SQL / Postgres / n8n.
 */
function normalizeRawRow(row) {
  let fechaStr = row.fecha || row.date || "";
  if (fechaStr instanceof Date) {
    fechaStr = fechaStr.toISOString().split("T")[0];
  } else if (typeof fechaStr === "string" && fechaStr.includes("T")) {
    fechaStr = fechaStr.split("T")[0];
  }

  return {
    fecha: String(fechaStr || "Fecha no esp."),
    producto: String(row.producto || row.nombre || row.name || "Agrícola").trim(),
    precio: parseFloat(row.precio || row.price || row.precio_actual || 0),
    volumen: parseFloat(row.volumen || row.volume || row.volumen_actual || 0),
    mercado: String(row.mercado || row.market || "GMML").trim(),
    region: String(row.region || row.origen || row.ubicacion || row.mercado || "Nacional").trim(),
    unidad: String(row.unidad || row.unit || "kg").trim()
  };
}

/**
 * Analizador genérico para extraer pares de datos (Producto / Fecha / Precio / Volumen)
 * directamente de textos libres.
 */
function parseTextForMarketNumbers(text) {
  const rows = [];
  const lines = text.split("\n");

  // Buscar si en todo el texto hay una mención global de volumen
  const globalVolMatch = text.match(/([\d,.]+)\s*(?:toneladas|TM)/i);
  const defaultVol = globalVolMatch ? parseFloat(globalVolMatch[1].replace(",", ".")) : 0;

  for (const line of lines) {
    const priceMatch = line.match(/(?:S\/|S\/\.|\$)\s*([\d,.]+)/i);
    const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
    const volMatch = line.match(/([\d,.]+)\s*(?:TM|toneladas|kg|kilos)/i);

    if (priceMatch) {
      const cleanPrice = parseFloat(priceMatch[1].replace(",", "."));
      const cleanVol = volMatch ? parseFloat(volMatch[1].replace(",", ".")) : defaultVol;
      const cleanDate = dateMatch ? dateMatch[1] : `Registro ${rows.length + 1}`;

      let prodName = line.split(/[:\–\-|]/)[0]?.trim();
      if (!prodName || prodName.length > 40) {
        prodName = "Producto Consultado";
      }

      if (!isNaN(cleanPrice) && cleanPrice > 0) {
        rows.push({
          fecha: cleanDate,
          producto: prodName,
          precio: cleanPrice,
          volumen: cleanVol,
          mercado: "GMML",
          region: "Nacional",
          unidad: "kg"
        });
      }
    }
  }

  return rows;
}

/**
 * Consulta dinámica al endpoint analítico de n8n con parámetros de filtro y rango de fechas.
 */
export async function fetchAnalyticsFromN8n({ producto = "", fechaInicio = "", fechaFin = "", region = "" }) {
  const payload = {
    action: "get_market_analytics",
    tipo: "analytics",
    producto,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    region,
    pregunta: `Reporte analítico detallado de precios y volumen para ${producto || "mercado agrícola"} entre ${fechaInicio || "inicio"} y ${fechaFin || "hoy"}`
  };

  return await sendN8nAction(payload);
}

/**
 * Construye los objetos de datos para Chart.js aplicando el rango dinámico de fechas,
 * el producto y la región seleccionada, utilizando la paleta de colores accesible.
 */
export function buildChartDatasetsFromRecords({
  records = [],
  selectedProduct = "all",
  selectedRegion = "all",
  startDate = "",
  endDate = ""
}) {
  if (!records || records.length === 0) {
    return {
      availableProducts: [],
      availableRegions: [],
      timeSeriesData: { labels: [], datasets: [] },
      kpis: null,
      isEmpty: true
    };
  }

  // 1. Extraer listas únicas de productos y regiones dinámicamente de los datos de n8n
  const productsSet = new Set();
  const regionsSet = new Set();

  records.forEach((r) => {
    if (r.producto) productsSet.add(r.producto);
    if (r.region && r.region !== "Nacional") regionsSet.add(r.region);
    if (r.mercado) regionsSet.add(r.mercado);
  });

  const availableProducts = Array.from(productsSet);
  const availableRegions = Array.from(regionsSet);

  // 2. Filtrado dinámico por Producto, Región y Rango de Fechas
  let filtered = [...records];

  if (selectedProduct && selectedProduct !== "all") {
    filtered = filtered.filter(
      (r) => r.producto.toLowerCase() === selectedProduct.toLowerCase()
    );
  }

  if (selectedRegion && selectedRegion !== "all") {
    filtered = filtered.filter(
      (r) =>
        r.region?.toLowerCase() === selectedRegion.toLowerCase() ||
        r.mercado?.toLowerCase() === selectedRegion.toLowerCase()
    );
  }

  if (startDate) {
    filtered = filtered.filter((r) => !r.fecha || r.fecha >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((r) => !r.fecha || r.fecha <= endDate);
  }

  // Si tras filtros queda vacío, intentar relajar producto o mostrar todo lo disponible
  if (filtered.length === 0) {
    filtered = [...records];
  }

  // Ordenar por fecha cronológica si las fechas son comparables
  filtered.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  // Extraer etiquetas de fechas únicas
  const labels = filtered.map((r) => r.fecha);
  const priceValues = filtered.map((r) => r.precio);
  const volumeValues = filtered.map((r) => r.volumen);

  // Paleta accesible
  const { emerald, amber, sapphire, teal, crimson, purple } = ACCESSIBLE_PALETTE;

  // 1. DATASET DE SERIES DE TIEMPO (Precios)
  const timeSeriesDatasets = [
    {
      type: "line",
      label: `Precio (${selectedProduct !== "all" ? selectedProduct : "Promedio"}) [S/]`,
      data: priceValues,
      borderColor: emerald.stroke,
      backgroundColor: emerald.fill,
      fill: true,
      tension: 0.25,
      borderWidth: 3,
      pointBackgroundColor: emerald.stroke,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: emerald.pointStyle
    }
  ];

  // Si hay volúmenes o un segundo parámetro, podemos graficar la tendencia o margen
  const minPrice = Math.min(...priceValues.filter((v) => v > 0));
  if (priceValues.length > 1) {
    timeSeriesDatasets.push({
      type: "line",
      label: "Línea Base / Referencial",
      data: filtered.map(() => Number(minPrice.toFixed(2))),
      borderColor: amber.stroke,
      backgroundColor: "transparent",
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      pointStyle: amber.pointStyle
    });
  }

  const timeSeriesData = {
    labels,
    datasets: timeSeriesDatasets
  };

  // 2. DATASET DE VOLUMEN Y DISPERSIÓN - eliminados (ya no se usan en el componente)

  // 3. CÁLCULO DE KPIS DINÁMICOS
  const validPrices = priceValues.filter((p) => p > 0);
  const avgPrice =
    validPrices.length > 0
      ? validPrices.reduce((acc, p) => acc + p, 0) / validPrices.length
      : 0;

  const currentPrice = priceValues[priceValues.length - 1] || 0;
  const initialPrice = priceValues[0] || currentPrice;
  const priceDiff = currentPrice - initialPrice;
  const pctChange =
    initialPrice > 0 ? Number(((priceDiff / initialPrice) * 100).toFixed(1)) : 0;

  return {
    availableProducts,
    availableRegions,
    timeSeriesData,
    kpis: {
      currentPrice: Number(currentPrice.toFixed(2)),
      avgPrice: Number(avgPrice.toFixed(2)),
      pctChange,
      isUp: pctChange >= 0,
      unit: filtered[0]?.unidad || "kg",
      totalRecords: filtered.length,
      sampleProduct: filtered[0]?.producto || "General"
    },
    isEmpty: false
  };
}
