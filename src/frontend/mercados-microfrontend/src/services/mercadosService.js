import { sendN8nAction } from "./n8nClient.js";

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

function obtenerIdMaestro(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
function parsearFechaTexto(fechaStr, anioReferencia) {
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
    let anio = Number(natMatch[3] || anioReferencia || new Date().getFullYear());
    if (!natMatch[3] && anioReferencia) {
      const fechaReferencia = String(anioReferencia).match(/^(\d{4})-(\d{2})-/);
      const mesReferencia = fechaReferencia ? Number(fechaReferencia[2]) : null;
      const numeroMes = Number(mes);
      if (mesReferencia && numeroMes > mesReferencia) anio -= 1;
    }
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
 * • GMML: Precio de hoy: S/ [precio] por [unidad] ([fecha]).
 *   Historial anterior: [fecha]: S/ [precio]; [fecha]: S/ [precio].
 * • MMF2: Precio de hoy: S/ [precio] por [unidad] ([fecha]).
 * • MMF2: sin registros disponibles.
 */
// Arma un registro a partir de las piezas ya extraídas (precio, unidad,
// fecha opcional). Compartido entre el formato con viñetas y el formato
// libre, para no duplicar el parseo de precio/fecha dos veces.
function construirRegistro(mercado, precioRaw, unidadRaw, fechaRaw, fechaReferencia, producto, productoConsultado) {
  const precio = Number(String(precioRaw).replace(",", "."));
  const unidad = String(unidadRaw).trim().replace(/\.$/, "");
  const fechaTexto = fechaRaw ? String(fechaRaw).trim() : null;
  const fechaIso = fechaTexto ? parsearFechaTexto(fechaTexto, fechaReferencia) : fechaReferencia;
  return {
    mercado,
    fecha: fechaIso,
    fechaTexto: fechaTexto || fechaReferencia,
    precio,
    unidad,
    producto: producto || productoConsultado.nombre,
    producto_id: null,
  };
}

// fechaConsultaFallback: la fecha que el propio backend reporta como
// consultada (n8nResponse.fecha_consultada), usada cuando la respuesta en
// texto libre no repite la fecha en cada línea de precio -- ver 3.3.2 en
// Informe-04 Sprint 4 para el caso real que motivó esto.
function parsearRespuestaWF(textoRespuesta, productoConsultado, fechaConsultaFallback) {
  if (!textoRespuesta || typeof textoRespuesta !== "string") return [];

  const lineas = textoRespuesta.split("\n");
  const registros = [];
  const fechaReferenciaTexto = textoRespuesta.match(
    /(?:consulta del|—)\s*(\d{1,2}\s+de\s+[A-Za-záéíóú]+\s+de\s+\d{4})/i
  )?.[1];
  const fechaReferencia = fechaReferenciaTexto
    ? parsearFechaTexto(fechaReferenciaTexto)
    : fechaConsultaFallback || null;

  let mercadoActual = null;
  let productoActual = null;
  let unidadActual = null;

  for (const rawLinea of lineas) {
    const linea = rawLinea.trim();
    if (!linea) continue;

    const headerUnidad = linea.match(/^(.+?)\s+—\s+(.+)$/);
    if (headerUnidad) {
      productoActual = headerUnidad[1].trim();
      unidadActual = headerUnidad[2].trim();
      mercadoActual = null;
      continue;
    }

    // Detección de línea GMML (formato con viñeta: "• GMML: S/ X por Y (fecha)")
    if (linea.includes("• GMML:") || linea.includes("- GMML:")) {
      mercadoActual = "GMML";
      if (/sin registros disponibles|no encontr[eé]/i.test(linea)) continue;
      const matchPrecio = linea.match(/S\/\s*([\d.,]+)\s*por\s*([^\n(]+?)\s*\(([^)]+)\)/i);
      if (matchPrecio) {
        registros.push(
          construirRegistro("GMML", matchPrecio[1], matchPrecio[2], matchPrecio[3], fechaReferencia, productoActual, productoConsultado)
        );
      }
      continue;
    }

    // Detección de línea MMF2 (formato con viñeta)
    if (linea.includes("• MMF2:") || linea.includes("- MMF2:")) {
      mercadoActual = "MMF2";
      if (/sin registros disponibles|no encontr[eé]/i.test(linea)) continue;
      const matchPrecio = linea.match(/S\/\s*([\d.,]+)\s*por\s*([^\n(]+?)\s*\(([^)]+)\)/i);
      if (matchPrecio) {
        registros.push(
          construirRegistro("MMF2", matchPrecio[1], matchPrecio[2], matchPrecio[3], fechaReferencia, productoActual, productoConsultado)
        );
      }
      continue;
    }

    // Encabezado de mercado SIN viñeta (ej. "Gran Mercado Mayorista de Lima
    // (GMML)"): el formato que el modelo actual devuelve en consultas
    // directas -- ya no sigue las viñetas del diseño original. El precio
    // llega en una línea aparte (siguiente bloque), no en la misma línea.
    if (/\(GMML\)/i.test(linea)) {
      mercadoActual = "GMML";
      continue;
    }
    if (/\(MMF2\)/i.test(linea)) {
      mercadoActual = "MMF2";
      continue;
    }

    // Línea de precio en formato libre: "Producto: S/ X por Unidad[, (fecha)]".
    // La fecha entre paréntesis ya no es obligatoria -- sin ella se usa
    // fechaReferencia (de la propia respuesta, o fechaConsultaFallback).
    if (mercadoActual) {
      const matchLibre = linea.match(/^(.+?):\s*S\/\s*([\d.,]+)\s*por\s*([^\n(]+?)(?:\s*\(([^)]+)\))?\.?\s*$/i);
      if (matchLibre) {
        registros.push(
          construirRegistro(
            mercadoActual,
            matchLibre[2],
            matchLibre[3],
            matchLibre[4],
            fechaReferencia,
            matchLibre[1].trim() || productoActual,
            productoConsultado
          )
        );
        continue;
      }
    }

    // Detección de "Historial anterior: Fecha: S/ X; Fecha: S/ Y"
    if (linea.includes("Historial anterior:") && mercadoActual) {
      const matchHist = linea.match(/Historial anterior:\s*([^\n]+)/i);
      if (matchHist) {
        const partes = matchHist[1].replace(/\.$/, "").split(";");
        for (const parte of partes) {
          const itemMatch = parte.match(/(.+?):\s*S\/\s*([\d.,]+)/);
          if (itemMatch) {
            const fechaRaw = itemMatch[1].trim();
            const precio = Number(itemMatch[2].replace(",", "."));
            const fechaIso = parsearFechaTexto(fechaRaw, fechaReferencia);
            registros.push({
              mercado: mercadoActual,
              fecha: fechaIso,
              fechaTexto: fechaRaw,
              precio,
              unidad: unidadActual,
              producto: productoActual || productoConsultado.nombre,
              producto_id: null,
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
      mercado: String(row.mercado || "").toUpperCase(),
      fecha: parsearFechaTexto(row.fecha || row.date),
      precio: Number(row.precio ?? row.price ?? 0),
      unidad: row.unidad || row.unit || null,
      producto: row.producto || row.name || productoConsultado.nombre,
      producto_id: obtenerIdMaestro(
        row.producto_id ??
          row.productoId ??
          row.id_maestro ??
          row.master_product_id ??
          row.product_id
      ),
      volumen_t: row.volumen_t != null ? Number(row.volumen_t) : null,
    }));
  }

  // Si devuelve texto formateado por el agente WF2
  const textContent = n8nResponse?.respuesta || n8nResponse?.response || n8nResponse?.text;
  if (typeof textContent === "string" && textContent.length > 0) {
    return parsearRespuestaWF(textContent, productoConsultado, n8nResponse?.fecha_consultada || null);
  }

  return [];
}

async function consultarPreciosWF(nombreProducto) {
  const nombre = String(nombreProducto || "").trim();
  if (!nombre) throw new Error("Ingresa el nombre de un producto agrícola.");

  const response = await sendN8nAction({
    action: "get_market_prices",
    tipo: "mercados",
    producto: nombre,
    mercados: ["GMML", "MMF2"],
    pregunta: `¿Cuál es el precio actual de ${nombre} en GMML y MMF2?`,
  });
  if (!response || typeof response !== "object") {
    throw new Error("El workflow de mercados devolvió una respuesta inválida.");
  }
  return response;
}

export async function buscarProductos(termino) {
  const query = String(termino || "").trim();
  if (query.length < 2) return [];

  const response = await consultarPreciosWF(query);
  const registros = normalizarRegistrosWF(response, { nombre: query });
  const productos = new Map();
  for (const registro of registros) {
    if (!registro.producto || !registro.unidad) continue;
    const key = `${normalizarTexto(registro.producto)}|${normalizarTexto(registro.unidad)}`;
    if (!productos.has(key)) {
      productos.set(key, {
        id: obtenerIdMaestro(registro.producto_id),
        idMaestroEnConflicto: false,
        nombre: registro.producto,
        unidad: registro.unidad,
      });
    } else {
      const productoEncontrado = productos.get(key);
      const idRegistro = obtenerIdMaestro(registro.producto_id);
      if (idRegistro && productoEncontrado.id && idRegistro !== productoEncontrado.id) {
        productoEncontrado.id = null;
        productoEncontrado.idMaestroEnConflicto = true;
      } else if (!productoEncontrado.id && !productoEncontrado.idMaestroEnConflicto) {
        productoEncontrado.id = idRegistro;
      }
    }
  }
  return Array.from(productos.values()).map(
    ({ idMaestroEnConflicto, ...producto }) => producto
  );
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
  const prod = producto || { id: null, nombre: "" };

  // Separar registros de los flujos por mercado
  const productoNormalizado = normalizarTexto(prod.nombre);
  const registrosProducto = registros.filter(
    (registro) =>
      normalizarTexto(registro.producto) === productoNormalizado &&
      (!prod.unidad ||
        normalizarTexto(registro.unidad) === normalizarTexto(prod.unidad))
  );
  const registrosGMML = registrosProducto
    .filter((r) => r.mercado === "GMML" && r.precio > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const registrosMMF2 = registrosProducto
    .filter((r) => r.mercado === "MMF2" && r.precio > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Determinar la última fecha registrada para cada fuente oficial (Criterio 3)
  const ultimaFechaGMML =
    registrosGMML.length > 0
      ? registrosGMML.reduce((max, r) => (r.fecha > max ? r.fecha : max), "")
      : null;

  const ultimaFechaMMF2 =
    registrosMMF2.length > 0
      ? registrosMMF2.reduce((max, r) => (r.fecha > max ? r.fecha : max), "")
      : null;

  const ultimoRegistroGMML = registrosGMML.at(-1) || null;
  const ultimoRegistroMMF2 = registrosMMF2.at(-1) || null;
  const unidadGMML = ultimoRegistroGMML?.unidad || null;
  const unidadMMF2 = ultimoRegistroMMF2?.unidad || null;

  const tienenAmbosRegistros = registrosGMML.length > 0 && registrosMMF2.length > 0;
  const idsMaestros = new Set(
    registrosProducto
      .map((registro) => obtenerIdMaestro(registro.producto_id))
      .filter((id) => id !== null)
  );
  const tieneIdMaestro =
    idsMaestros.size === 1 &&
    registrosProducto.every(
      (registro) => obtenerIdMaestro(registro.producto_id) !== null
    );
  const idMaestro = tieneIdMaestro ? idsMaestros.values().next().value : null;
  const sonEquivalentes =
    tienenAmbosRegistros &&
    tieneIdMaestro &&
    registrosProducto.every(
      (registro) =>
        obtenerIdMaestro(registro.producto_id) === idMaestro &&
        sonUnidadesEquivalentes(registro.unidad, unidadGMML)
    ) &&
    registrosProducto.every(
      (registro) =>
        obtenerIdMaestro(registro.producto_id) === idMaestro &&
        sonUnidadesEquivalentes(registro.unidad, unidadMMF2)
    );

  let mensajeEquivalencia = null;
  if (tienenAmbosRegistros && !tieneIdMaestro) {
    mensajeEquivalencia =
      "El workflow disponible no incluye el ID maestro en su respuesta. Se muestran los precios consultados, pero no se calcula una diferencia sin poder verificar la homologación.";
  } else if (tienenAmbosRegistros && !sonEquivalentes) {
    mensajeEquivalencia = `Las unidades comerciales no son equivalentes (${unidadGMML} en GMML vs. ${unidadMMF2} en MMF2). La diferencia de precios directa no debe calcularse para preservar la validez comercial.`;
  }

  let diasHorizonte = 30;
  let labelHorizonte = "Último Mes";
  if (horizonte === "semana") {
    diasHorizonte = 7;
    labelHorizonte = "Última Semana";
  } else if (horizonte === "trimestre") {
    diasHorizonte = 90;
    labelHorizonte = "Último Trimestre";
  }

  const partesHoy = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const hoyParts = Object.fromEntries(
    partesHoy.map(({ type, value }) => [type, value])
  );
  const fechaFinal = Date.UTC(
    Number(hoyParts.year),
    Number(hoyParts.month) - 1,
    Number(hoyParts.day)
  );
  const fechaInicio = new Date(
    fechaFinal - (diasHorizonte - 1) * 86400000
  ).toISOString().slice(0, 10);
  const fechasHorizonte = Array.from({ length: diasHorizonte }, (_, index) =>
    new Date(fechaFinal - (diasHorizonte - index - 1) * 86400000)
      .toISOString()
      .slice(0, 10)
  );

  const registrosGMMLPeriodo = registrosGMML.filter(
    (registro) => registro.fecha >= fechaInicio
  );
  const registrosMMF2Periodo = registrosMMF2.filter(
    (registro) => registro.fecha >= fechaInicio
  );
  const mapGMML = new Map(registrosGMMLPeriodo.map((r) => [r.fecha, r]));
  const mapMMF2 = new Map(registrosMMF2Periodo.map((r) => [r.fecha, r]));

  const seriesLabels = [];
  const seriesGMML = [];
  const seriesMMF2 = [];
  const tabla = [];
  const discontinuidades = [];

  let sumaGMML = 0;
  let countGMML = 0;
  let sumaMMF2 = 0;
  let countMMF2 = 0;
  let sumaGMMLComparable = 0;
  let sumaMMF2Comparable = 0;
  let countFechasComparables = 0;

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
        motivo: "El workflow no devolvió una cotización de GMML para esta fecha",
      });
    }
    if (mercados.includes("MMF2") && !regMMF2) {
      discontinuidades.push({
        fecha,
        mercado: "MMF2",
        motivo: "El workflow no devolvió una cotización de MMF2 para esta fecha",
      });
    }

    // Comparación solo si hay registros y son equivalentes (Criterio 1)
    let diferenciaSoles = null;
    let diferenciaPct = null;
    let estadoComparacion = "comparable";
    const idsEquivalentes =
      regGMML &&
      regMMF2 &&
      obtenerIdMaestro(regGMML.producto_id) !== null &&
      obtenerIdMaestro(regGMML.producto_id) ===
        obtenerIdMaestro(regMMF2.producto_id);

    if (precioGMML !== null && precioMMF2 !== null) {
      if (
        idsEquivalentes &&
        sonUnidadesEquivalentes(regGMML.unidad, regMMF2.unidad)
      ) {
        diferenciaSoles = Number((precioGMML - precioMMF2).toFixed(2));
        diferenciaPct = Number(
          (((precioGMML - precioMMF2) / precioMMF2) * 100).toFixed(1)
        );
        sumaGMMLComparable += precioGMML;
        sumaMMF2Comparable += precioMMF2;
        countFechasComparables++;
      } else {
        estadoComparacion =
          !regGMML.unidad || !regMMF2.unidad
            ? "unidad_no_disponible"
            : idsEquivalentes
              ? "unidades_distintas"
              : "producto_no_homologado";
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
      productoId: idMaestro || obtenerIdMaestro(prod.id),
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
      sonEquivalentes: Boolean(
        idsEquivalentes &&
          sonUnidadesEquivalentes(regGMML?.unidad, regMMF2?.unidad)
      ),
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
  if (countFechasComparables > 0) {
    const promedioGMMLComparable =
      sumaGMMLComparable / countFechasComparables;
    const promedioMMF2Comparable =
      sumaMMF2Comparable / countFechasComparables;
    diferenciaPromediosSoles = Number(
      (promedioGMMLComparable - promedioMMF2Comparable).toFixed(2)
    );
    diferenciaPromediosPct = Number(
      (
        ((promedioGMMLComparable - promedioMMF2Comparable) /
          promedioMMF2Comparable) *
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
      : null;

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
      : null;

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
    comparacionMasReciente: tabla
        .filter((fila) => fila.estadoComparacion === "comparable")
        .at(-1) || null,
    promediosPeriodo: {
      gmml: promedioPeriodoGMML,
      mmf2: promedioPeriodoMMF2,
      diferenciaSoles: diferenciaPromediosSoles,
      diferenciaPct: diferenciaPromediosPct,
      label: `Promedio del Período (${labelHorizonte})`,
      aclaracion:
        "Promedio de las cotizaciones que el workflow devolvió dentro del período elegido; no debe confundirse con el precio diario ni con una serie completa si la fuente no entregó todos los días.",
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
  producto,
  horizonte = "mes",
  mercados = ["GMML", "MMF2"],
}) {
  if (!producto?.nombre?.trim()) {
    throw new Error("Busca y selecciona un producto para consultar sus precios.");
  }

  try {
    const response = await consultarPreciosWF(producto.nombre);

    if (response) {
      const registros = normalizarRegistrosWF(response, producto);
      const registrosMercados = registros.filter((registro) =>
        mercados.includes(registro.mercado)
      );
      return procesarComparativa({
        registros: registrosMercados,
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
