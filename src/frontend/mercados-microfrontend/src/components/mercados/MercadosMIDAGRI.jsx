import "../../index.css";
import { useEffect, useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  buscarProductos,
  fetchComparativaMercados,
  formatearFecha,
} from "../../services/mercadosService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export default function MercadosMIDAGRI() {
  // Estados interactivos
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedHorizonte, setSelectedHorizonte] = useState("mes"); // 'semana' | 'mes' | 'trimestre'
  const [selectedMercados, setSelectedMercados] = useState(["GMML", "MMF2"]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filtroTabla, setFiltroTabla] = useState("todos"); // 'todos' | 'comparables' | 'discontinuos'

  const buscar = async (event) => {
    event.preventDefault();
    const termino = searchTerm.trim();
    if (termino.length < 2) {
      setSearchError("Ingresa al menos dos caracteres para buscar.");
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const resultados = await buscarProductos(termino);
      setSearchResults(resultados);
      if (resultados.length === 0) {
        setSearchError(
          "No se encontraron cotizaciones para esa búsqueda en los mercados consultados."
        );
      }
    } catch (error) {
      setSearchError(error.message || "No se pudo buscar el producto.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Cargar datos desde los flujos de n8n / base de datos
  const cargarComparativa = async (isManual = false) => {
    if (!selectedProduct) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const resultado = await fetchComparativaMercados({
        producto: selectedProduct,
        horizonte: selectedHorizonte,
        mercados: selectedMercados,
      });
      setData(resultado);
    } catch (err) {
      console.error("Error al consultar comparativa a n8n:", err);
      setErrorMsg(
        err.message ||
          "No se pudo conectar con el flujo n8n. El servidor en Render puede estar iniciando; reintenta en breve."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarComparativa();
  }, [selectedProduct, selectedHorizonte, selectedMercados]);

  const toggleMercado = (mercado) => {
    setSelectedMercados((prev) => {
      if (prev.includes(mercado)) {
        if (prev.length === 1) return prev; // Mantener al menos un mercado activo
        return prev.filter((m) => m !== mercado);
      }
      return [...prev, mercado];
    });
  };

  // Configuración del gráfico con soporte para discontinuidad visual (Criterio 3: spanGaps = false)
  const chartData = useMemo(() => {
    if (!data?.grafico) return null;

    const datasets = [];

    if (selectedMercados.includes("GMML")) {
      datasets.push({
        label: `GMML${data.unidadGMML ? ` (${data.unidadGMML})` : ""}`,
        data: data.grafico.seriesGMML || [],
        borderColor: "#1b4332",
        backgroundColor: "rgba(27, 67, 50, 0.08)",
        borderWidth: 2.5,
        tension: 0.25,
        spanGaps: false, // Discontinuidad visual cuando no hay registro
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#1b4332",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      });
    }

    if (selectedMercados.includes("MMF2")) {
      datasets.push({
        label: `MMF2${data.unidadMMF2 ? ` (${data.unidadMMF2})` : ""}`,
        data: data.grafico.seriesMMF2 || [],
        borderColor: "#c85a17",
        backgroundColor: "rgba(200, 90, 23, 0.08)",
        borderWidth: 2.5,
        tension: 0.25,
        spanGaps: false, // Discontinuidad visual cuando no hay registro
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#c85a17",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      });
    }

    return {
      labels: data.grafico.labels || [],
      datasets,
    };
  }, [data, selectedMercados]);

  // Filtrado de filas de la tabla
  const filasTabla = useMemo(() => {
    if (!data?.tabla) return [];
    if (filtroTabla === "comparables") {
      return data.tabla.filter((f) => f.estadoComparacion === "comparable");
    }
    if (filtroTabla === "discontinuos") {
      return data.tabla.filter((f) => f.estadoComparacion !== "comparable");
    }
    return data.tabla;
  }, [data, filtroTabla]);

  const productoActual = selectedProduct;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn">
      {/* 1. Header principal */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-forest-green animate-pulse"></span>
            Módulo de Comparación Mayorista MIDAGRI (GMML & MMF2)
          </div>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-forest-green font-bold tracking-tight">
            Comparativa de Precios: GMML vs. MMF2
          </h1>
          <p className="font-body-md text-on-surface-variant mt-1 text-sm sm:text-base max-w-3xl">
            Herramienta para productores y comerciantes: busque productos con cotizaciones disponibles y compare sus precios en GMML y MMF2. Las diferencias solo se calculan cuando la respuesta permite verificar ID maestro y unidad.
          </p>
        </div>

        {/* Botón de sincronización con n8n */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => cargarComparativa(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-surface-container-high/80 hover:bg-surface-container-high px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-on-surface transition-all border border-outline-variant/30 cursor-pointer shadow-sm disabled:opacity-60"
            title="Sincronizar y consultar flujos de n8n"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-forest-green ${
                refreshing || loading ? "animate-spin" : ""
              }`}
            >
              sync
            </span>
            <span>{refreshing ? "Sincronizando..." : "Actualizar"}</span>
          </button>
        </div>
      </header>

      {/* 2. Barra de Selección de Producto, Mercados y Filtros Dinámicos */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          {/* Búsqueda de productos con cotizaciones disponibles */}
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              1. Buscar producto agrícola:
            </label>
            <form onSubmit={buscar} className="flex gap-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Escribe el nombre del producto"
                aria-label="Buscar producto agrícola"
                className="min-w-0 flex-1 pl-4 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-2xl text-sm font-semibold text-on-surface focus:outline-none focus:border-forest-green shadow-sm"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-green text-white text-sm font-semibold disabled:opacity-60"
              >
                {searchLoading ? "Buscando..." : "Buscar"}
              </button>
            </form>
            <p className="text-[11px] text-on-surface-variant">
              Se muestran productos y unidades presentes en los resultados consultados.
            </p>
            {searchError && (
              <p role="status" className="text-xs text-amber-800">
                {searchError}
              </p>
            )}
            {searchResults.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
                {searchResults.map((product) => (
                  <li key={`${product.nombre}|${product.unidad}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setData(null);
                        setSearchResults([]);
                        setSearchError(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low"
                    >
                      <span className="font-semibold">{product.nombre}</span>
                      <span className="ml-2 text-on-surface-variant">
                        / {product.unidad}
                      </span>
                      {product.id && (
                        <span className="ml-2 text-xs text-on-surface-variant">
                          ID maestro #{product.id}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {productoActual && (
              <p className="text-xs text-forest-green font-semibold">
                Seleccionado: {productoActual.nombre} / {productoActual.unidad}
              </p>
            )}
          </div>

          {/* Selector de Mercados Mayoristas (Criterio 1) */}
          <div className="lg:col-span-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              2. Mercados a Comparar:
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => toggleMercado("GMML")}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all border ${
                  selectedMercados.includes("GMML")
                    ? "bg-forest-green text-on-primary border-forest-green shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {selectedMercados.includes("GMML") ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span>GMML</span>
              </button>

              <button
                type="button"
                onClick={() => toggleMercado("MMF2")}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all border ${
                  selectedMercados.includes("MMF2")
                    ? "bg-[#c85a17] text-white border-[#c85a17] shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {selectedMercados.includes("MMF2") ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span>MMF2 (Frutas)</span>
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              GMML: Gran Mercado Mayorista | MMF2: Mercado de Frutas N° 2
            </p>
          </div>

          {/* Selector de Horizonte Temporal (Criterio 2) */}
          <div className="lg:col-span-3 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              3. Horizonte Temporal:
            </label>
            <div className="flex items-center bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
              <button
                onClick={() => setSelectedHorizonte("semana")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedHorizonte === "semana"
                    ? "bg-forest-green text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedHorizonte("mes")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedHorizonte === "mes"
                    ? "bg-forest-green text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setSelectedHorizonte("trimestre")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedHorizonte === "trimestre"
                    ? "bg-forest-green text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Trimestre
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* Estado de Error o Reconexión */}
      {errorMsg && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[24px] shrink-0">
              cloud_off
            </span>
            <div className="text-xs sm:text-sm text-amber-900 space-y-1">
              <p className="font-bold">Estado de Conexión con Flujo n8n</p>
              <p>{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => cargarComparativa(true)}
            className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-xl text-xs shrink-0 hover:bg-amber-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Estado de Carga */}
      {loading && (
        <div className="bg-surface-container-lowest rounded-3xl p-12 border border-outline-variant/30 text-center space-y-3">
          <div className="inline-block animate-spin text-forest-green">
            <span className="material-symbols-outlined text-[40px]">sync</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">
            Consultando registros oficiales en los flujos n8n y base de datos...
          </p>
          <p className="text-xs text-on-surface-variant">
            Extrayendo cotizaciones de GMML y MMF2 para {productoActual?.nombre}
          </p>
        </div>
      )}

      {!loading && !selectedProduct && (
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 text-center">
          <p className="text-sm font-semibold text-on-surface">
            Busca y selecciona un producto para consultar los registros disponibles.
          </p>
        </div>
      )}

      {/* Contenido Principal (solo si no está cargando y hay datos) */}
      {!loading && data && (
        <>
          {/* Banners Informativos de Diagnóstico (Criterios 1 y 3) */}
          {data.mensajeEquivalencia && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <span className="material-symbols-outlined text-amber-600 text-[24px] shrink-0">
                warning
              </span>
              <div className="text-xs sm:text-sm text-amber-900 space-y-1">
                <p className="font-bold">Comparación no disponible</p>
                <p>{data.mensajeEquivalencia}</p>
              </div>
            </div>
          )}

          {(!data.ultimosPrecios?.gmml || !data.ultimosPrecios?.mmf2) && (
            <div className="bg-surface-container-high/60 border-l-4 border-forest-green p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <span className="material-symbols-outlined text-forest-green text-[24px] shrink-0">
                info
              </span>
              <div className="text-xs sm:text-sm text-on-surface space-y-1">
                <p className="font-bold">Información Parcial de Mercado Oficial</p>
                <p>
                  {!data.ultimosPrecios?.gmml && (
                    <span>El Gran Mercado Mayorista (GMML) no cuenta con registros para {productoActual?.nombre}. </span>
                  )}
                  {!data.ultimosPrecios?.mmf2 && (
                    <span>No se encontraron cotizaciones para {productoActual?.nombre} en MMF2. </span>
                  )}
                  Se muestran con fidelidad los registros del mercado disponible sin inventar cifras faltantes.
                </p>
              </div>
            </div>
          )}

          {/* 3. Tarjetas KPI de Precios y Promedios del Período (Criterio 2) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tarjeta GMML */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest-green">
                    Gran Mercado Mayorista (GMML)
                  </span>
                  {data.variacionesPeriodo?.gmml != null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        data.variacionesPeriodo.gmml > 0
                          ? "bg-error-container text-on-error-container"
                          : data.variacionesPeriodo.gmml < 0
                          ? "bg-primary-fixed text-on-primary-fixed"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {data.variacionesPeriodo.gmml > 0 ? "↑ +" : data.variacionesPeriodo.gmml < 0 ? "↓ " : "— "}
                      {data.variacionesPeriodo.gmml}% en período
                    </span>
                  )}
                </div>

                <div className="my-2">
                  {data.ultimosPrecios?.gmml ? (
                    <>
                      <span className="text-3xl sm:text-4xl font-extrabold text-on-surface">
                        S/ {data.ultimosPrecios.gmml.precio.toFixed(2)}
                      </span>
                      <span className="text-sm font-medium text-on-surface-variant ml-1.5">
                        / {data.ultimosPrecios.gmml.unidad}
                      </span>
                    </>
                  ) : (
                    <div className="py-2">
                      <span className="inline-block px-3 py-1 bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface-variant">
                        Sin registros disponibles
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  Cotización diaria al cierre
                </p>
              </div>

              {/* Promedio del Período Claramente Distinguido (Criterio 2) */}
              <div className="mt-4 pt-4 border-t border-outline-variant/20 bg-surface-container-low/60 -mx-6 -mb-6 p-4 rounded-b-3xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Promedio del Período ({data.labelHorizonte}):
                  </span>
                  <span className="font-bold text-forest-green text-sm">
                    {data.promediosPeriodo?.gmml !== null
                      ? `S/ ${data.promediosPeriodo.gmml.toFixed(2)} / ${data.unidadGMML}`
                      : "—"}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Última fecha GMML: {data.ultimaFechaGMML ? formatearFecha(data.ultimaFechaGMML) : "Sin fecha"}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {data.promediosPeriodo?.aclaracion}
                </p>
              </div>
            </div>

            {/* Tarjeta MMF2 */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#c85a17]">
                    Mercado de Frutas N° 2 (MMF2)
                  </span>
                  {data.variacionesPeriodo?.mmf2 != null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        data.variacionesPeriodo.mmf2 > 0
                          ? "bg-error-container text-on-error-container"
                          : data.variacionesPeriodo.mmf2 < 0
                          ? "bg-primary-fixed text-on-primary-fixed"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {data.variacionesPeriodo.mmf2 > 0 ? "↑ +" : data.variacionesPeriodo.mmf2 < 0 ? "↓ " : "— "}
                      {data.variacionesPeriodo.mmf2}% en período
                    </span>
                  )}
                </div>

                <div className="my-2">
                  {data.ultimosPrecios?.mmf2 ? (
                    <>
                      <span className="text-3xl sm:text-4xl font-extrabold text-on-surface">
                        S/ {data.ultimosPrecios.mmf2.precio.toFixed(2)}
                      </span>
                      <span className="text-sm font-medium text-on-surface-variant ml-1.5">
                        / {data.ultimosPrecios.mmf2.unidad}
                      </span>
                    </>
                  ) : (
                    <div className="py-2">
                      <span className="inline-block px-3 py-1 bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface-variant">
                        Sin registros disponibles
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  Cotización diaria al cierre
                </p>
              </div>

              {/* Promedio del Período Claramente Distinguido (Criterio 2) */}
              <div className="mt-4 pt-4 border-t border-outline-variant/20 bg-surface-container-low/60 -mx-6 -mb-6 p-4 rounded-b-3xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Promedio del Período ({data.labelHorizonte}):
                  </span>
                  <span className="font-bold text-[#c85a17] text-sm">
                    {data.promediosPeriodo?.mmf2 !== null
                  ? `S/ ${data.promediosPeriodo.mmf2.toFixed(2)} / ${data.unidadMMF2}`
                  : "—"}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Última fecha MMF2: {data.ultimaFechaMMF2 ? formatearFecha(data.ultimaFechaMMF2) : "Sin fecha"}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {data.promediosPeriodo?.aclaracion}
                </p>
              </div>
            </div>

            {/* Tarjeta Diferencial entre Mercados */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Diferencial entre Mercados
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                    GMML vs. MMF2
                  </span>
                </div>

                <div className="my-2">
                  {data.comparacionMasReciente ? (
                    (() => {
                      const { diferenciaSoles: dif, diferenciaPct: difPct, fechaCompleta } =
                        data.comparacionMasReciente;
                      const esPositivo = dif > 0;
                      return (
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-3xl sm:text-4xl font-extrabold ${esPositivo ? "text-[#c85a17]" : "text-forest-green"}`}>
                              {dif > 0 ? `+S/ ${dif.toFixed(2)}` : `S/ ${dif.toFixed(2)}`}
                            </span>
                            <span className="text-sm font-bold">
                              ({dif > 0 ? `+${difPct}%` : `${difPct}%`})
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Comparación del {fechaCompleta}.{" "}
                            {esPositivo
                              ? "GMML cotiza a mayor precio que MMF2"
                              : dif < 0
                              ? "GMML cotiza a menor precio que MMF2"
                              : "Precios idénticos en ambos mercados"}
                          </p>
                        </div>
                      );
                    })()
                  ) : data.mensajeEquivalencia ? (
                    <div className="py-2">
                      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold">
                        No homologado
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1">
                        No se calcula brecha directa
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      <span className="inline-block px-3 py-1 bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface-variant">
                        {data.tienenAmbosRegistros
                          ? "Sin fecha comparable"
                          : "Una fuente con registros"}
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {data.tienenAmbosRegistros
                          ? "Hay datos en ambos mercados, pero no una fecha común homologada."
                          : "Solo una de las fuentes consultadas devolvió registros."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-outline-variant/20 bg-surface-container-low/60 -mx-6 -mb-6 p-4 rounded-b-3xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Diferencia Promedio del Período:
                  </span>
                  <span className="font-bold text-on-surface text-sm">
                    {data.promediosPeriodo?.diferenciaSoles !== null
                      ? `${data.promediosPeriodo.diferenciaSoles > 0 ? "+" : ""}S/ ${data.promediosPeriodo.diferenciaSoles.toFixed(2)}`
                      : "No comparable"}
                  </span>
                </div>
                <p className="text-[10px] text-outline">
                  Calculado exclusivamente sobre fechas y unidades comparables
                </p>
              </div>
            </div>
          </section>

          {/* 4. Gráfico Temporal Comparativo con Discontinuidad Visual (Criterio 3) */}
          <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                  Evolución Temporal de Precios: {productoActual?.nombre}
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Comparación temporal entre GMML y MMF2 ({data.labelHorizonte}). Se muestran quiebres visuales donde hay ausencia de registros (sin reemplazo artificial).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                {selectedMercados.includes("GMML") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-forest-green inline-block"></span>
                    <span>GMML{data.unidadGMML ? ` (${data.unidadGMML})` : ""}</span>
                  </div>
                )}
                {selectedMercados.includes("MMF2") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#c85a17] inline-block"></span>
                    <span>MMF2{data.unidadMMF2 ? ` (${data.unidadMMF2})` : ""}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              {chartData && (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: "index",
                      intersect: false,
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "#1a1c18",
                        padding: 12,
                        cornerRadius: 12,
                        titleFont: { family: "Hanken Grotesk", size: 13, weight: "bold" },
                        bodyFont: { family: "Hanken Grotesk", size: 12 },
                        callbacks: {
                          label: function (context) {
                            const val = context.parsed.y;
                            if (val === null || isNaN(val)) {
                              return `${context.dataset.label}: Sin dato devuelto`;
                            }
                            return `${context.dataset.label}: S/ ${val.toFixed(2)}`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: "#414844",
                          font: { family: "Hanken Grotesk", size: 11 },
                        },
                      },
                      y: {
                        grid: { color: "rgba(65, 72, 68, 0.08)" },
                        ticks: {
                          color: "#414844",
                          font: { family: "Hanken Grotesk", size: 11 },
                          callback: (val) => `S/ ${Number(val).toFixed(2)}`,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-on-surface-variant border-t border-outline-variant/15 gap-2">
              <p>
                <span className="font-bold text-on-surface">Datos incompletos:</span> Las líneas interrumpidas indican fechas sin un dato devuelto por el workflow; esto no confirma que la base de datos carezca de registros en esas fechas.
              </p>
              <p className="text-outline">
                Horizonte activo: {data.labelHorizonte} ({data.tabla?.length || 0} jornadas analizadas)
              </p>
            </div>
          </section>

          {/* 5. Tabla Comparativa Interactiva (Criterios 1, 2 y 3) */}
          <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline-variant/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                  Tabla Comparativa Diaria
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Detalle diario por fecha, cotización por mercado, unidad comercial y cálculo de brechas.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-semibold text-on-surface-variant">Ver:</span>
                <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs">
                  <button
                    onClick={() => setFiltroTabla("todos")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filtroTabla === "todos"
                        ? "bg-forest-green text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Todos ({data.tabla?.length || 0})
                  </button>
                  <button
                    onClick={() => setFiltroTabla("comparables")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filtroTabla === "comparables"
                        ? "bg-forest-green text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Comparables
                  </button>
                  <button
                    onClick={() => setFiltroTabla("discontinuos")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filtroTabla === "discontinuos"
                        ? "bg-forest-green text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Discontinuidades
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/70 text-on-surface-variant text-xs font-semibold">
                    <th className="py-3 px-4 rounded-l-xl">Fecha</th>
                    <th className="py-3 px-4">Producto & ID Maestro</th>
                    <th className="py-3 px-4">GMML (Santa Anita)</th>
                    <th className="py-3 px-4">MMF2 (Frutas)</th>
                    <th className="py-3 px-4">Diferencial (GMML - MMF2)</th>
                    <th className="py-3 px-4 rounded-r-xl">Estado de Comparabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-xs sm:text-sm">
                  {filasTabla.map((fila) => {
                    const tieneGMML = fila.gmml.disponible;
                    const tieneMMF2 = fila.mmf2.disponible;

                    return (
                      <tr
                        key={fila.fecha}
                        className="hover:bg-surface-container-low/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-on-surface whitespace-nowrap">
                          {fila.fechaCompleta}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">
                              {fila.productoNombre}
                            </span>
                            {fila.productoId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                                ID maestro #{fila.productoId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {tieneGMML ? (
                            <div>
                              <span className="font-bold text-forest-green">
                                S/ {fila.gmml.precio.toFixed(2)}
                              </span>
                              <span className="text-[11px] text-on-surface-variant ml-1">
                                / {fila.gmml.unidad}
                              </span>
                            </div>
                          ) : (
                            <span className="text-outline italic text-xs">
                              Sin dato devuelto
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {tieneMMF2 ? (
                            <div>
                              <span className="font-bold text-[#c85a17]">
                                S/ {fila.mmf2.precio.toFixed(2)}
                              </span>
                              <span className="text-[11px] text-on-surface-variant ml-1">
                                / {fila.mmf2.unidad}
                              </span>
                            </div>
                          ) : (
                            <span className="text-outline italic text-xs">
                              Sin dato devuelto
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {fila.diferenciaSoles !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                fila.diferenciaSoles > 0
                                  ? "text-[#c85a17]"
                                  : fila.diferenciaSoles < 0
                                  ? "text-forest-green"
                                  : "text-on-surface"
                              }`}
                            >
                              {fila.diferenciaSoles > 0 ? "+" : ""}
                              S/ {fila.diferenciaSoles.toFixed(2)}
                              <span className="text-xs font-normal">
                                ({fila.diferenciaPct > 0 ? "+" : ""}{fila.diferenciaPct}%)
                              </span>
                            </span>
                          ) : fila.estadoComparacion === "unidades_distintas" ? (
                            <span className="text-xs text-amber-700 italic">
                              Unidades no equivalentes
                            </span>
                          ) : fila.estadoComparacion === "producto_no_homologado" ? (
                            <span className="text-xs text-amber-700 italic">
                              ID maestro no coincide o no disponible
                            </span>
                          ) : (
                            <span className="text-xs text-outline italic">
                              — No comparable —
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {fila.estadoComparacion === "comparable" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-fixed text-on-primary-fixed">
                              ✓ Homologado
                            </span>
                          ) : fila.estadoComparacion === "unidades_distintas" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                              ⚠ Unidades distintas
                            </span>
                          ) : fila.estadoComparacion === "producto_no_homologado" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                              ID maestro no coincide
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-container-high text-on-surface-variant">
                              Discontinuidad parcial
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-on-surface-variant gap-2">
              <p>
                <span className="font-semibold text-on-surface">Fuente de datos:</span> {data.fuente}
              </p>
              <div className="flex items-center gap-4">
                <span>Última fecha GMML: {data.ultimaFechaGMML || "N/A"}</span>
                <span>Última fecha MMF2: {data.ultimaFechaMMF2 || "N/A"}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
