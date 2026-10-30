import { sendN8nAction } from "./n8nClient.js";

/**
 * Catálogo canónico de productos agrícolas homologados por MIDAGRI
 * Identificados mediante sus IDs maestros (productos_maestro) para GMML y MMF2.
 */
export const PRODUCTOS_OFICIALES = [
  { id: 101, nombre: "Papa Blanca", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Papa blanca comercial mayorista de consumo masivo en Lima." },
  { id: 102, nombre: "Papa Amarilla", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Papa amarilla nativa de alta cotización culinaria." },
  { id: 103, nombre: "Papa Canchán", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Variedad de papa de consumo masivo comercializada en GMML." },
  { id: 104, nombre: "Papa Yungay", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Variedad de alta productividad procedente de la sierra central." },
  { id: 105, nombre: "Camote Amarillo", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Tubérculo dulce procedente de valles costeros en GMML." },
  { id: 106, nombre: "Yuca Amarilla", categoria: "Tubérculos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Yuca fresca procedente de selva central cotizada en GMML." },
  { id: 201, nombre: "Cebolla Cabeza Roja", categoria: "Hortalizas", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Hortaliza de alto volumen mayorista en GMML." },
  { id: 202, nombre: "Tomate Katia", categoria: "Hortalizas", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Hortaliza de fruto cotizada diariamente en GMML." },
  { id: 203, nombre: "Zanahoria", categoria: "Hortalizas", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Hortaliza de raíz comercializada en GMML." },
  { id: 204, nombre: "Zapallo Macre", categoria: "Hortalizas", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Zapallo de pulpa anaranjada de alta demanda en Lima." },
  { id: 205, nombre: "Arveja Verde Americana", categoria: "Legumbres y Granos", mercados: ["GMML"], unidad: "Kilogramo", descripcion: "Legumbre fresca comercializada en GMML." },
  { id: 301, nombre: "Limón Sutil", categoria: "Frutas", mercados: ["GMML", "MMF2"], unidad: "Kilogramo", descripcion: "Cítrico comercializado tanto en GMML como en el Mercado de Frutas N° 2 (MMF2)." },
  { id: 302, nombre: "Maracuyá", categoria: "Frutas", mercados: ["GMML", "MMF2"], unidad: "Kilogramo", descripcion: "Fruta ácida cotizada en ambos mercados mayoristas (GMML y MMF2)." },
  { id: 303, nombre: "Palta Fuerte", categoria: "Frutas", mercados: ["GMML", "MMF2"], unidad: "Kilogramo", descripcion: "Fruto de alta cotización presente en ambos mercados mayoristas." },
  { id: 304, nombre: "Plátano Seda", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Fruta líder en volumen mayorista en el Mercado de Frutas N° 2 (MMF2)." },
  { id: 305, nombre: "Manzana Delicia", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Variedad de manzana nacional comercializada en MMF2." },
  { id: 306, nombre: "Papaya Selva", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Fruta tropical de gran abastecimiento en MMF2." },
  { id: 307, nombre: "Piña Golden", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Fruta tropical dulce cotizada en MMF2." },
  { id: 308, nombre: "Sandía", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Fruta estacional de gran volumen en MMF2." },
  { id: 309, nombre: "Pera Agua Italiana", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Fruta comercializada en MMF2 (caso de validación del parser WF0)." },
  { id: 310, nombre: "Fresa", categoria: "Frutas", mercados: ["MMF2"], unidad: "Kilogramo", descripcion: "Baya fresca comercializada en MMF2." },
];

export function getCatalogoProductos() {
  return PRODUCTOS_OFICIALES;
}

/**
 * Normaliza nombres para comparación flexible insensible a mayúsculas y tildes.
 */
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Valida la equivalencia de unidades comerciales (Criterio 1).
 */
export function sonUnidadesEquivalentes(unidadA, unidadB) {
  if (!unidadA || !unidadB) return false;
  const a = normalizarTexto(unidadA);
  const b = normalizarTexto(unidadB);

  const kgAliases = ["kilogramo", "kg", "kilo", "kilogramos"];
  const cajonAliases = ["cajon", "cajón"];
  const bolsaAliases = ["bolsa"];
  const docenaAliases = ["docena"];
  const atadoAliases = ["atado"];

  if (kgAliases.includes(a) && kgAliases.includes(b)) return true;
  if (cajonAliases.includes(a) && cajonAliases.includes(b)) return true;
  if (bolsaAliases.includes(a) && bolsaAliases.includes(b)) return true;
  if (docenaAliases.includes(a) && docenaAliases.includes(b)) return true;
  if (atadoAliases.includes(a) && atadoAliases.includes(b)) return true;

  return a === b;
}

/**
 * Parsea fechas en lenguaje natural o ISO.
 */
function parsearFechaTexto(fechaStr) {
  if (!fechaStr) return null;
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
    julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12",
    ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
    jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12"
  };

  const str = String(fechaStr).trim();

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-${String(isoMatch[3]).padStart(2, "0")}`;
  }

  // DD de [Mes] de YYYY
  const natMatch = str.match(/(\d{1,2})\s+de\s+([A-Za-z]+)(?:\s+de\s+(\d{4}))?/i);
  if (natMatch) {
    const dia = String(natMatch[1]).padStart(2, "0");
    const mesNom = normalizarTexto(natMatch[2]);
    const mes = meses[mesNom] || "01";
    const anio = natMatch[3] || "2026";
    return `${anio}-${mes}-${dia}`;
  }

  return str;
}

export function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return "";
  const partes = String(fechaStr).split("-");
  if (partes.length === 3) {
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    const mesNum = parseInt(partes[1], 10);
    return `${parseInt(partes[2], 10)} ${meses[mesNum - 1] || ""}`;
  }
  return fechaStr;
}

export function formatearFecha(fechaStr) {
  if (!fechaStr) return "Fecha no disponible";
  const partes = String(fechaStr).split("-");
  if (partes.length === 3) {
    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const mesNum = parseInt(partes[1], 10);
    return `${parseInt(partes[2], 10)} de ${meses[mesNum - 1] || ""} de ${partes[0]}`;
  }
  return fechaStr;
}

/**
 * Parsea el texto estructurado que genera WF2 con base en la consulta SQL a precios_diarios:
 * Ej:
 * Precios de [Producto] — consulta del [Fecha]
 * • GMML: Precio de hoy: S/ 3.20 por Kilogramo (20 de agosto de 2026).
 *   Historial anterior: 19 de agosto de 2026: S/ 3.25; 18 de agosto de 2026: S/ 3.28.
 * • MMF2: Precio de hoy: S/ 3.40 por Kilogramo (20 de agosto de 2026).
 * • MMF2: sin registros disponibles.
 */
function parsearRespuestaWF(textoRespuesta, productoConsultado) {
  if (!textoRespuesta || typeof textoRespuesta !== "string") return [];

  const lineas = textoRespuesta.split("\n");
  const registros = [];

  let mercadoActual = null;
  let unidadActual = "Kilogramo";

  for (const rawLinea of lineas) {
    const linea = rawLinea.trim();

    // Detección de variedad o unidad en el texto: "Producto — Unidad"
    const headerUnidad = linea.match(/—\s*([A-Za-z]+)$/);
    if (headerUnidad) {
      unidadActual = headerUnidad[1].trim();
    }

    // Detección de línea GMML
    if (linea.includes("• GMML:")) {
      mercadoActual = "GMML";
      if (linea.includes("sin registros disponibles")) {
        continue;
      }
      const matchPrecio = linea.match(/S\/\s*([\d.]+)\s*por\s*([^\n(]+)\s*\(([^)]+)\)/i);
      if (matchPrecio) {
        const precio = parseFloat(matchPrecio[1]);
        const unidad = matchPrecio[2].trim();
        const fechaRaw = matchPrecio[3].trim();
        const fechaIso = parsearFechaTexto(fechaRaw);
        registros.push({
          mercado: "GMML",
          fecha: fechaIso,
          fechaTexto: fechaRaw,
          precio,
          unidad,
          producto: productoConsultado.nombre,
          producto_id: productoConsultado.id,
        });
      }
    }

    // Detección de línea MMF2
    if (linea.includes("• MMF2:")) {
      mercadoActual = "MMF2";
      if (linea.includes("sin registros disponibles")) {
        continue;
      }
      const matchPrecio = linea.match(/S\/\s*([\d.]+)\s*por\s*([^\n(]+)\s*\(([^)]+)\)/i);
      if (matchPrecio) {
        const precio = parseFloat(matchPrecio[1]);
        const unidad = matchPrecio[2].trim();
        const fechaRaw = matchPrecio[3].trim();
        const fechaIso = parsearFechaTexto(fechaRaw);
        registros.push({
          mercado: "MMF2",
          fecha: fechaIso,
          fechaTexto: fechaRaw,
          precio,
          unidad,
          producto: productoConsultado.nombre,
          producto_id: productoConsultado.id,
        });
      }
    }

    // Detección de "Historial anterior: Fecha: S/ X; Fecha: S/ Y"
    if (linea.includes("Historial anterior:") && mercadoActual) {
      const matchHist = linea.match(/Historial anterior:\s*([^\n]+)/i);
      if (matchHist) {
        const partes = matchHist[1].replace(/\.$/, "").split(";");
        for (const parte of partes) {
          const itemMatch = parte.match(/(.+?):\s*S\/\s*([\d.]+)/);
          if (itemMatch) {
            const fechaRaw = itemMatch[1].trim();
            const precio = parseFloat(itemMatch[2]);
            const fechaIso = parsearFechaTexto(fechaRaw);
            registros.push({
              mercado: mercadoActual,
              fecha: fechaIso,
              fechaTexto: fechaRaw,
              precio,
              unidad: unidadActual,
              producto: productoConsultado.nombre,
              producto_id: productoConsultado.id,
            });
          }
        }
      }
    }
  }

  return registros;
}

/**
 * Normaliza cualquier formato devuelto por los workflows de n8n:
 * - Arrays estructurados (result.datos, result.precios, result.data, result.filas)
 * - Respuestas de texto analítico emitidas por WF2 (result.respuesta)
 */
export function normalizarRegistrosWF(n8nResponse, productoConsultado) {
  if (!n8nResponse) return [];

  // Si devuelve array directo o propiedad de array
  const rawList =
    (Array.isArray(n8nResponse) ? n8nResponse : null) ||
    n8nResponse?.datos ||
    n8nResponse?.precios ||
    n8nResponse?.filas ||
    n8nResponse?.data ||
    n8nResponse?.productos;

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((row) => ({
      mercado: String(row.mercado || "GMML").toUpperCase(),
      fecha: parsearFechaTexto(row.fecha || row.date),
      precio: Number(row.precio || row.price || 0),
      unidad: row.unidad || row.unit || productoConsultado.unidad || "Kilogramo",
      producto: row.producto || row.name || productoConsultado.nombre,
      producto_id: row.producto_id || productoConsultado.id,
      volumen_t: row.volumen_t !== undefined ? Number(row.volumen_t) : null,
    }));
  }

  // Si devuelve texto formateado por el agente WF2
  const textContent = n8nResponse?.respuesta || n8nResponse?.response || n8nResponse?.text;
  if (typeof textContent === "string" && textContent.length > 0) {
    return parsearRespuestaWF(textContent, productoConsultado);
  }

  return [];
}

/**
 * Construye la comparativa analítica completa a partir de los registros extraídos de los WFs:
 * Cumple con los criterios de aceptación:
 * - Criterio 1: Homologación por ID Maestro, comparación GMML vs MMF2 solo con unidades equivalentes.
 * - Criterio 2: Filtros por horizonte (semana, mes, trimestre), variación % y promedios identificados como período.
 * - Criterio 3: Discontinuidad visual en gráficos (spanGaps: false) sin inventar valores, mensajes explicativos y última fecha por fuente.
 */
export function procesarComparativa({
  registros = [],
  producto,
  horizonte = "mes", // 'semana' | 'mes' | 'trimestre'
  mercados = ["GMML", "MMF2"],
}) {
  const prod = producto || PRODUCTOS_OFICIALES[0];

  // Separar registros de los flujos por mercado
  const registrosGMML = registros.filter(
    (r) => r.mercado === "GMML" && r.precio > 0
  );
  const registrosMMF2 = registros.filter(
    (r) => r.mercado === "MMF2" && r.precio > 0
  );

  // Determinar la última fecha registrada para cada fuente oficial (Criterio 3)
  const ultimaFechaGMML =
    registrosGMML.length > 0
      ? registrosGMML.reduce((max, r) => (r.fecha > max ? r.fecha : max), "")
      : null;

  const ultimaFechaMMF2 =
    registrosMMF2.length > 0
      ? registrosMMF2.reduce((max, r) => (r.fecha > max ? r.fecha : max), "")
      : null;

  const unidadGMML = registrosGMML[0]?.unidad || prod.unidad || "Kilogramo";
  const unidadMMF2 = registrosMMF2[0]?.unidad || prod.unidad || "Kilogramo";

  const tienenAmbosRegistros = registrosGMML.length > 0 && registrosMMF2.length > 0;
  const sonEquivalentes =
    tienenAmbosRegistros && sonUnidadesEquivalentes(unidadGMML, unidadMMF2);

  let mensajeEquivalencia = null;
  if (tienenAmbosRegistros && !sonEquivalentes) {
    mensajeEquivalencia = `Las unidades comerciales no son equivalentes (${unidadGMML} en GMML vs. ${unidadMMF2} en MMF2). La diferencia de precios directa no debe calcularse para preservar la validez comercial.`;
  }

  // Extraer universo de fechas ordenadas cronológicamente
  const todasLasFechas = Array.from(
    new Set(registros.map((r) => r.fecha).filter(Boolean))
  ).sort();

  // Limitar al horizonte temporal seleccionado (Criterio 2)
  let limiteRegistros = 30;
  let labelHorizonte = "Último Mes";
  if (horizonte === "semana") {
    limiteRegistros = 7;
    labelHorizonte = "Última Semana";
  } else if (horizonte === "trimestre") {
    limiteRegistros = 90;
    labelHorizonte = "Último Trimestre";
  }

  const fechasHorizonte = todasLasFechas.slice(-limiteRegistros);

  const mapGMML = new Map(registrosGMML.map((r) => [r.fecha, r]));
  const mapMMF2 = new Map(registrosMMF2.map((r) => [r.fecha, r]));

  const seriesLabels = [];
  const seriesGMML = [];
  const seriesMMF2 = [];
  const tabla = [];
  const discontinuidades = [];

  let sumaGMML = 0;
  let countGMML = 0;
  let sumaMMF2 = 0;
  let countMMF2 = 0;

  fechasHorizonte.forEach((fecha) => {
    const regGMML = mapGMML.get(fecha) || null;
    const regMMF2 = mapMMF2.get(fecha) || null;

    const precioGMML = regGMML ? Number(regGMML.precio) : null;
    const precioMMF2 = regMMF2 ? Number(regMMF2.precio) : null;

    seriesLabels.push(formatearFechaCorta(fecha));

    if (mercados.includes("GMML")) {
      seriesGMML.push(precioGMML);
      if (precioGMML !== null) {
        sumaGMML += precioGMML;
        countGMML++;
      }
    } else {
      seriesGMML.push(null);
    }

    if (mercados.includes("MMF2")) {
      seriesMMF2.push(precioMMF2);
      if (precioMMF2 !== null) {
        sumaMMF2 += precioMMF2;
        countMMF2++;
      }
    } else {
      seriesMMF2.push(null);
    }

    // Registrar discontinuidades para transparencia visual (Criterio 3)
    if (mercados.includes("GMML") && !regGMML) {
      discontinuidades.push({
        fecha,
        mercado: "GMML",
        motivo: "Sin cotización registrada en GMML para esta fecha",
      });
    }
    if (mercados.includes("MMF2") && !regMMF2) {
      discontinuidades.push({
        fecha,
        mercado: "MMF2",
        motivo: "Sin cotización registrada en MMF2 para esta fecha",
      });
    }

    // Comparación solo si hay registros y son equivalentes (Criterio 1)
    let diferenciaSoles = null;
    let diferenciaPct = null;
    let estadoComparacion = "comparable";

    if (precioGMML !== null && precioMMF2 !== null) {
      if (sonEquivalentes) {
        diferenciaSoles = Number((precioGMML - precioMMF2).toFixed(2));
        diferenciaPct = Number(
          (((precioGMML - precioMMF2) / precioMMF2) * 100).toFixed(1)
        );
      } else {
        estadoComparacion = "unidades_distintas";
      }
    } else if (precioGMML !== null || precioMMF2 !== null) {
      estadoComparacion = "registro_parcial";
    } else {
      estadoComparacion = "sin_registros";
    }

    tabla.push({
      fecha,
      fechaFormateada: formatearFechaCorta(fecha),
      fechaCompleta: formatearFecha(fecha),
      productoId: prod.id,
      productoNombre: prod.nombre,
      gmml: {
        precio: precioGMML,
        unidad: regGMML?.unidad || unidadGMML,
        disponible: precioGMML !== null,
        volumen_t: regGMML?.volumen_t || null,
      },
      mmf2: {
        precio: precioMMF2,
        unidad: regMMF2?.unidad || unidadMMF2,
        disponible: precioMMF2 !== null,
        volumen_t: regMMF2?.volumen_t || null,
      },
      diferenciaSoles,
      diferenciaPct,
      sonEquivalentes,
      estadoComparacion,
    });
  });

  // Cálculo de promedios de período (identificados claramente, Criterio 2)
  const promedioPeriodoGMML =
    countGMML > 0 ? Number((sumaGMML / countGMML).toFixed(2)) : null;
  const promedioPeriodoMMF2 =
    countMMF2 > 0 ? Number((sumaMMF2 / countMMF2).toFixed(2)) : null;

  let diferenciaPromediosSoles = null;
  let diferenciaPromediosPct = null;
  if (
    promedioPeriodoGMML !== null &&
    promedioPeriodoMMF2 !== null &&
    sonEquivalentes
  ) {
    diferenciaPromediosSoles = Number(
      (promedioPeriodoGMML - promedioPeriodoMMF2).toFixed(2)
    );
    diferenciaPromediosPct = Number(
      (
        ((promedioPeriodoGMML - promedioPeriodoMMF2) / promedioPeriodoMMF2) *
        100
      ).toFixed(1)
    );
  }

  // Cálculo de variación en el período (Criterio 2)
  const validosGMML = seriesGMML.filter((p) => p !== null);
  const variacionPeriodoGMML =
    validosGMML.length >= 2
      ? Number(
          (
            ((validosGMML[validosGMML.length - 1] - validosGMML[0]) /
              validosGMML[0]) *
            100
          ).toFixed(1)
        )
      : 0;

  const validosMMF2 = seriesMMF2.filter((p) => p !== null);
  const variacionPeriodoMMF2 =
    validosMMF2.length >= 2
      ? Number(
          (
            ((validosMMF2[validosMMF2.length - 1] - validosMMF2[0]) /
              validosMMF2[0]) *
            100
          ).toFixed(1)
        )
      : 0;

  const ultimoRegistroGMML = registrosGMML[registrosGMML.length - 1] || null;
  const ultimoRegistroMMF2 = registrosMMF2[registrosMMF2.length - 1] || null;

  return {
    producto: prod,
    horizonte,
    labelHorizonte,
    mercadosSeleccionados: mercados,
    tienenAmbosRegistros,
    sonEquivalentes,
    mensajeEquivalencia,
    ultimaFechaGMML,
    ultimaFechaMMF2,
    unidadGMML,
    unidadMMF2,
    ultimosPrecios: {
      gmml: ultimoRegistroGMML
        ? {
            precio: ultimoRegistroGMML.precio,
            fecha: ultimoRegistroGMML.fecha,
            fechaFormateada: formatearFecha(ultimoRegistroGMML.fecha),
            unidad: ultimoRegistroGMML.unidad,
          }
        : null,
      mmf2: ultimoRegistroMMF2
        ? {
            precio: ultimoRegistroMMF2.precio,
            fecha: ultimoRegistroMMF2.fecha,
            fechaFormateada: formatearFecha(ultimoRegistroMMF2.fecha),
            unidad: ultimoRegistroMMF2.unidad,
          }
        : null,
    },
    promediosPeriodo: {
      gmml: promedioPeriodoGMML,
      mmf2: promedioPeriodoMMF2,
      diferenciaSoles: diferenciaPromediosSoles,
      diferenciaPct: diferenciaPromediosPct,
      label: `Promedio del Período (${labelHorizonte})`,
      aclaracion:
        "Este valor representa el promedio estadístico durante el período elegido y no debe confundirse con la cotización diaria.",
    },
    variacionesPeriodo: {
      gmml: variacionPeriodoGMML,
      mmf2: variacionPeriodoMMF2,
    },
    grafico: {
      labels: seriesLabels,
      seriesGMML,
      seriesMMF2,
    },
    discontinuidades,
    tabla,
    fuente: "MIDAGRI — Boletines Diarios SISAP (GMML y MMF2)",
  };
}

/**
 * Consulta precios y comparativas directamente al webhook de n8n / base de datos.
 * Sin ningún archivo de dataset estático ni números inventados.
 */
export async function fetchComparativaMercados({
  productoId = 101,
  horizonte = "mes",
  mercados = ["GMML", "MMF2"],
}) {
  const producto =
    PRODUCTOS_OFICIALES.find((p) => p.id === Number(productoId)) ||
    PRODUCTOS_OFICIALES[0];

  try {
    const response = await sendN8nAction({
      action: "get_market_prices",
      tipo: "mercados",
      producto_id: producto.id,
      producto: producto.nombre,
      mercados,
      horizonte,
      pregunta: `¿Cuál es el precio y evolución de ${producto.nombre} en GMML y MMF2 en el horizonte de ${horizonte}?`,
    });

    if (response) {
      const registros = normalizarRegistrosWF(response, producto);
      return procesarComparativa({
        registros,
        producto,
        horizonte,
        mercados,
      });
    }
  } catch (error) {
    console.warn(
      `Consulta al webhook n8n (${error.message}). Procesando estado con registros disponibles:`,
      error
    );
    throw error;
  }

  return procesarComparativa({
    registros: [],
    producto,
    horizonte,
    mercados,
  });
}
