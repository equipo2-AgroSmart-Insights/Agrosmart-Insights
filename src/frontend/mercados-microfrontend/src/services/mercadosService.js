import { sendN8nAction } from "./n8nClient";

/**
 * Genera la etiqueta de fecha actual dinámica en español sin hora fija.
 * Ejemplo: "Actualizado hoy, 16 de setiembre"
 */
export function getDynamicDateLabel(customDate) {
  const dateObj = customDate ? new Date(customDate) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const day = validDate.getDate();
  const month = validDate.toLocaleDateString("es-PE", { month: "long" });
  const year = validDate.getFullYear();

  // Detectar si la fecha corresponde al día de hoy
  const today = new Date();
  const isToday =
    validDate.getDate() === today.getDate() &&
    validDate.getMonth() === today.getMonth() &&
    validDate.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Actualizado hoy, ${day} de ${month}`;
  }
  return `Actualizado: ${day} de ${month} de ${year}`;
}

/**
 * Genera fechas de los últimos N días para las etiquetas de sparkline.
 */
function getLastNDaysLabels(n = 7) {
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("es-PE", { day: "numeric", month: "short" })
    );
  }
  return labels;
}

/**
 * Catálogo base de referencia para benchmarks de origen y mercados secundarios.
 * Complementa los datos de GMML traídos de n8n.
 */
const PRODUCTS_REFERENCE = [
  {
    id: "papa-blanca",
    nombre: "Papa Blanca",
    nombreCorto: "PAPA BLANCA",
    categoria: "Tubérculos",
    origenRegion: "Junín",
    origenValle: "Tarma",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 1.45,
    precioOrigenDefault: 0.65,
    unidad: "kg",
    sparklineDefault: [1.25, 1.28, 1.32, 1.4, 1.35, 1.42, 1.45],
    volatilidad: "Alto",
  },
  {
    id: "limon-sutil",
    nombre: "Limón Sutil",
    nombreCorto: "LIMÓN SUTIL",
    categoria: "Frutas",
    origenRegion: "Piura",
    origenValle: "Chulucanas",
    mercadoPrincipal: "Mercado de Frutas",
    precioLimaDefault: 3.2,
    precioOrigenDefault: 1.7,
    unidad: "kg",
    sparklineDefault: [3.6, 3.5, 3.4, 3.35, 3.28, 3.25, 3.2],
    volatilidad: "Normal",
  },
  {
    id: "arroz-extra",
    nombre: "Arroz Extra",
    nombreCorto: "ARROZ EXTRA",
    categoria: "Legumbres y Granos",
    origenRegion: "San Martín",
    origenValle: "Tarapoto",
    mercadoPrincipal: "Productores Santa Anita",
    precioLimaDefault: 3.85,
    precioOrigenDefault: 2.9,
    unidad: "kg",
    sparklineDefault: [3.85, 3.85, 3.84, 3.85, 3.86, 3.85, 3.85],
    volatilidad: "Estable",
  },
  {
    id: "cebolla-roja",
    nombre: "Cebolla Roja",
    nombreCorto: "CEBOLLA ROJA",
    categoria: "Hortalizas",
    origenRegion: "Arequipa",
    origenValle: "Majes",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 1.15,
    precioOrigenDefault: 0.55,
    unidad: "kg",
    sparklineDefault: [0.95, 1.0, 1.05, 1.1, 1.08, 1.12, 1.15],
    volatilidad: "Alto",
  },
  {
    id: "tomate-katia",
    nombre: "Tomate Katia",
    nombreCorto: "TOMATE KATIA",
    categoria: "Hortalizas",
    origenRegion: "Ica",
    origenValle: "Pisco",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 2.5,
    precioOrigenDefault: 1.8,
    unidad: "kg",
    sparklineDefault: [2.6, 2.55, 2.5, 2.45, 2.48, 2.5, 2.5],
    volatilidad: "Estable",
  },
  {
    id: "zanahoria",
    nombre: "Zanahoria",
    nombreCorto: "ZANAHORIA",
    categoria: "Hortalizas",
    origenRegion: "Junín",
    origenValle: "Jauja",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 1.3,
    precioOrigenDefault: 0.7,
    unidad: "kg",
    sparklineDefault: [1.2, 1.25, 1.22, 1.28, 1.3, 1.28, 1.3],
    volatilidad: "Normal",
  },
  {
    id: "camote-amarillo",
    nombre: "Camote Amarillo",
    nombreCorto: "CAMOTE AMARILLO",
    categoria: "Tubérculos",
    origenRegion: "Lima Provincias",
    origenValle: "Cañete",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 2.48,
    precioOrigenDefault: 1.4,
    unidad: "kg",
    sparklineDefault: [2.35, 2.4, 2.42, 2.45, 2.46, 2.47, 2.48],
    volatilidad: "Estable",
  },
  {
    id: "choclo-serrano",
    nombre: "Choclo Serrano",
    nombreCorto: "CHOCLO SERRANO",
    categoria: "Hortalizas",
    origenRegion: "Cusco",
    origenValle: "Urubamba",
    mercadoPrincipal: "GM Santa Anita",
    precioLimaDefault: 3.4,
    precioOrigenDefault: 1.95,
    unidad: "kg",
    sparklineDefault: [3.1, 3.2, 3.25, 3.3, 3.38, 3.42, 3.4],
    volatilidad: "Normal",
  },
];

/**
 * Normaliza y enriquece los datos de n8n para la interfaz.
 */
export function normalizeMarketPayload(n8nPayload) {
  const dynamicDate = getDynamicDateLabel(
    n8nPayload?.fecha || n8nPayload?.data?.fecha || n8nPayload?.updated_at
  );
  const sparklineLabels = getLastNDaysLabels(7);

  // Extraer lista de productos devuelta por n8n si existe
  const rawProducts =
    n8nPayload?.precios ||
    n8nPayload?.productos ||
    n8nPayload?.data?.precios ||
    n8nPayload?.data?.productos ||
    (Array.isArray(n8nPayload) ? n8nPayload : null);

  const enrichedProducts = PRODUCTS_REFERENCE.map((ref) => {
    // Buscar coincidencia en la respuesta de n8n
    let match = null;
    if (rawProducts && Array.isArray(rawProducts)) {
      match = rawProducts.find((p) => {
        const pName = (p.producto || p.nombre || p.name || "").toLowerCase();
        return (
          pName.includes(ref.nombre.toLowerCase()) ||
          ref.nombre.toLowerCase().includes(pName)
        );
      });
    }

    // Precio en Lima (GMML)
    const precioLima = match
      ? Number(match.precio || match.price || ref.precioLimaDefault)
      : ref.precioLimaDefault;

    // Precio en Origen
    const precioOrigen = match?.precio_origen
      ? Number(match.precio_origen)
      : ref.precioOrigenDefault;

    // Calcular brecha porcentual de intermediación: ((Lima - Origen) / Origen) * 100
    const brechaPorcentaje = Math.round(
      ((precioLima - precioOrigen) / precioOrigen) * 100
    );

    // Variación diaria de precio Lima
    let sparkline = ref.sparklineDefault;
    if (match?.historico && Array.isArray(match.historico) && match.historico.length >= 2) {
      sparkline = match.historico.map(Number);
    } else {
      // Ajustar último valor al precio actual
      sparkline = [...ref.sparklineDefault];
      sparkline[sparkline.length - 1] = precioLima;
    }

    const prevPrice = sparkline[sparkline.length - 2] ?? precioLima;
    const diff = precioLima - prevPrice;
    const pctChange =
      prevPrice > 0 ? Number(((diff / prevPrice) * 100).toFixed(1)) : 0;

    // Estado del margen
    let estadoMargen = "Estable";
    let tonoEstado = "bg-primary-fixed text-on-primary-fixed";
    if (brechaPorcentaje >= 100) {
      estadoMargen = "Brecha Alta";
      tonoEstado = "bg-error-container text-on-error-container";
    } else if (brechaPorcentaje >= 60) {
      estadoMargen = "Brecha Moderada";
      tonoEstado = "bg-tertiary-fixed text-on-tertiary-fixed";
    }

    // Precios estimados en otros mercados para comparación
    const mercadosComparativa = [
      {
        nombre: "GM Santa Anita (GMML)",
        tipo: "Mayorista Principal",
        precio: precioLima,
        variacion: pctChange,
      },
      {
        nombre: "Mayorista de Frutas / Productores",
        tipo: "Mayorista Secundario",
        precio: Number((precioLima * 1.06).toFixed(2)),
        variacion: Number((pctChange * 0.9).toFixed(1)),
      },
      {
        nombre: "Mercados Minoristas (Lima)",
        tipo: "Minorista al Consumidor",
        precio: Number((precioLima * 1.45).toFixed(2)),
        variacion: Number((pctChange * 0.7).toFixed(1)),
      },
    ];

    return {
      id: ref.id,
      nombre: ref.nombre,
      nombreCorto: ref.nombreCorto,
      categoria: ref.categoria,
      origenRegion: ref.origenRegion,
      origenValle: ref.origenValle,
      origenCompleto: `${ref.origenRegion} (${ref.origenValle})`,
      mercadoPrincipal: ref.mercadoPrincipal,
      precioLima,
      precioOrigen,
      unidad: ref.unidad,
      brechaPorcentaje,
      estadoMargen,
      tonoEstado,
      sparkline,
      pctChange,
      volatilidad: ref.volatilidad,
      mercadosComparativa,
    };
  });

  return {
    lastUpdated: dynamicDate,
    labels: sparklineLabels,
    products: enrichedProducts,
    fuente: "MIDAGRI - Sistema de Información de Abastecimiento y Precios (SISAP) / GMML",
  };
}

/**
 * Consulta precios de mercados a n8n.
 * Si n8n está en ejecución, recupera datos en vivo. Si no, aplica fallback enriquecido.
 */
export async function fetchMercadosData() {
  try {
    const response = await sendN8nAction({
      action: "get_market_prices",
      tipo: "mercados",
      mercado: "GMML",
      pregunta:
        "Consulta de precios diarios mayoristas del Gran Mercado Mayorista de Lima (MIDAGRI) para papa, limón, cebolla, tomate, arroz, zanahoria y camote.",
    });

    if (response) {
      return normalizeMarketPayload(response);
    }
  } catch (error) {
    console.warn(
      "No se pudo contactar con n8n para precios de mercados, utilizando datos de referencia MIDAGRI:",
      error.message
    );
  }

  // Fallback garantizado y dinámico
  return normalizeMarketPayload(null);
}
