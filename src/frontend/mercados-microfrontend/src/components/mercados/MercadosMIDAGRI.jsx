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
} from "chart.js";
import { fetchMercadosData } from "../../services/mercadosService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

/**
 * Componente Sparkline SVG ultra ligero con curva suave bezier y relleno degradado.
 */
function Sparkline({ data = [], trend = 0, colorType = "neutral", height = 64, width = 240 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 8;
  const usableH = height - paddingY * 2;
  const stepX = width / (data.length - 1);

  // Mapeo de coordenadas
  const points = data.map((val, idx) => ({
    x: idx * stepX,
    y: height - paddingY - ((val - min) / range) * usableH,
  }));

  // Algoritmo de suavizado con curvas de Bézier cúbicas
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

  // Colores según tendencia
  let strokeColor = "#414844";
  let fillColorStart = "rgba(65, 72, 68, 0.18)";
  let fillColorEnd = "rgba(65, 72, 68, 0.0)";

  if (trend > 0) {
    // Alza de precio (Terracotta / Rojo suave)
    strokeColor = "#ba1a1a";
    fillColorStart = "rgba(186, 26, 26, 0.22)";
    fillColorEnd = "rgba(186, 26, 26, 0.02)";
  } else if (trend < 0) {
    // Baja de precio (Forest Green)
    strokeColor = "#1b4332";
    fillColorStart = "rgba(27, 67, 50, 0.22)";
    fillColorEnd = "rgba(27, 67, 50, 0.02)";
  }

  const gradId = `spark-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColorStart} />
          <stop offset="100%" stopColor={fillColorEnd} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CATEGORIES = ["Todos", "Tubérculos", "Hortalizas", "Frutas", "Legumbres y Granos"];

export default function MercadosMIDAGRI() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [activeTab, setActiveTab] = useState("origen"); // 'origen' | 'mercados' | 'historico'
  const [selectedProductForHistory, setSelectedProductForHistory] = useState("papa-blanca");

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchMercadosData();
      setData(result);
    } catch (err) {
      console.error("Error al cargar mercados MIDAGRI:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Productos filtrados según búsqueda y categoría
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    return data.products.filter((p) => {
      const matchesCat =
        selectedCategory === "Todos" || p.categoria === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.origenRegion.toLowerCase().includes(q) ||
        p.origenValle.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [data, selectedCategory, searchQuery]);

  // Los 3 primeros productos destacados para las tarjetas superiores (como en la maqueta)
  const highlightProducts = useMemo(() => {
    if (!data?.products) return [];
    // Priorizamos Papa Blanca, Limón Sutil y Arroz Extra si existen
    const preferredIds = ["papa-blanca", "limon-sutil", "arroz-extra"];
    const found = preferredIds
      .map((id) => data.products.find((p) => p.id === id))
      .filter(Boolean);

    if (found.length === 3) return found;
    return data.products.slice(0, 3);
  }, [data]);

  // Producto seleccionado para el gráfico histórico
  const activeProduct = useMemo(() => {
    if (!data?.products) return null;
    return (
      data.products.find((p) => p.id === selectedProductForHistory) ||
      data.products[0]
    );
  }, [data, selectedProductForHistory]);

  // Configuración del gráfico de Chart.js para la pestaña histórica
  const historyChartData = useMemo(() => {
    if (!activeProduct || !data?.labels) return null;

    return {
      labels: data.labels,
      datasets: [
        {
          label: `${activeProduct.nombre} (Lima GMML S/)`,
          data: activeProduct.sparkline,
          borderColor: "#1b4332",
          backgroundColor: "rgba(27, 67, 50, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#1b4332",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: `Precio en Origen / Chacra (S/)`,
          data: activeProduct.sparkline.map(() => activeProduct.precioOrigen),
          borderColor: "#7d5a50",
          borderDash: [6, 4],
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
        },
      ],
    };
  }, [activeProduct, data]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn">
      {/* 1. Header principal idéntico a la maqueta */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-forest-green font-bold tracking-tight">
            Mercados MIDAGRI
          </h1>
          <p className="font-body-md text-on-surface-variant mt-1 text-sm sm:text-base">
            Monitoreo en tiempo real de precios mayoristas en Lima Metropolitana.
          </p>
        </div>

        {/* Badge de fecha dinámica con botón de refresco */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-surface-container-high/60 backdrop-blur-sm border border-outline-variant/40 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-on-surface">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Actualizar datos desde n8n"
              className={`text-forest-green hover:rotate-180 transition-transform duration-500 flex items-center justify-center ${
                refreshing ? "animate-spin" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
            <span>{data?.lastUpdated || "Actualizando datos..."}</span>
          </div>
        </div>
      </header>

      {/* 2. Tarjetas KPI de Precios y Tendencias (Estilo exacto de la maqueta) */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {highlightProducts.map((item) => {
            const isPositive = item.pctChange > 0;
            const isNegative = item.pctChange < 0;

            return (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col justify-between"
              >
                {/* Cabecera de la tarjeta: Título y variación % */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-label-md text-xs tracking-wider uppercase text-on-surface-variant font-bold">
                    {item.nombreCorto || item.nombre}
                  </span>

                  <span
                    className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isPositive
                        ? "bg-error-container text-on-error-container"
                        : isNegative
                        ? "bg-primary-fixed text-on-primary-fixed"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {isPositive ? "↑" : isNegative ? "↓" : "—"} {Math.abs(item.pctChange).toFixed(1)}%
                  </span>
                </div>

                {/* Precio destacado */}
                <div className="my-2">
                  <span className="font-headline-md text-3xl font-bold text-on-surface">
                    S/ {item.precioLima.toFixed(2)}
                  </span>
                  <span className="text-on-surface-variant text-sm font-normal ml-1.5">
                    / {item.unidad}
                  </span>
                </div>

                {/* Minigráfico Sparkline con curva suave */}
                <div className="h-16 my-2">
                  <Sparkline
                    data={item.sparkline}
                    trend={item.pctChange}
                    height={64}
                    width={260}
                  />
                </div>

                {/* Footer de la tarjeta: Mercado y Nivel de Volatilidad */}
                <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20 mt-1">
                  <span className="font-medium text-on-surface">
                    {item.mercadoPrincipal}
                  </span>
                  <span
                    className={`font-semibold ${
                      item.volatilidad === "Alto"
                        ? "text-terracotta"
                        : item.volatilidad === "Normal"
                        ? "text-forest-green"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {item.volatilidad}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Sección de Análisis, Brechas y Comparativa */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
        {/* Cabecera de la sección con Selector de Vistas / Pestañas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline-md text-2xl text-on-surface font-semibold">
              {activeTab === "origen"
                ? "Tendencias de Precios por Origen"
                : activeTab === "mercados"
                ? "Comparativa de Precios entre Mercados"
                : "Evolución Histórica de Precios"}
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {activeTab === "origen"
                ? "Brecha entre el precio pagado en chacra y el precio mayorista en Lima (GMML)."
                : activeTab === "mercados"
                ? "Diferenciales de cotización entre mercados mayoristas y minoristas de Lima."
                : "Tendencia de los últimos 7 días con precio mayorista vs. costo en origen."}
            </p>
          </div>

          {/* Botones de alternancia de vista (estilo píldora como la maqueta) */}
          <div className="flex items-center bg-surface-container-high/60 p-1 rounded-full border border-outline-variant/30 self-start lg:self-center">
            <button
              onClick={() => setActiveTab("origen")}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "origen"
                  ? "bg-forest-green text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Brecha Origen
            </button>
            <button
              onClick={() => setActiveTab("mercados")}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "mercados"
                  ? "bg-forest-green text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Comparar Mercados
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "historico"
                  ? "bg-forest-green text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Barra de Filtros: Categorías y Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Chips de Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary-fixed text-on-primary-fixed font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Input de Búsqueda */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto o valle..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-forest-green"
            />
          </div>
        </div>

        {/* TABLA 1: Vista "Tendencias de Precios por Origen" (Idéntica a la maqueta) */}
        {activeTab === "origen" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-on-surface-variant text-xs font-semibold">
                  <th className="py-3 px-4 rounded-l-xl">Producto / Origen</th>
                  <th className="py-3 px-4">Precio en Origen</th>
                  <th className="py-3 px-4">Precio en Lima</th>
                  <th className="py-3 px-4">Brecha de Precio</th>
                  <th className="py-3 px-4 rounded-r-xl text-center">Estado de Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-container-low/40 transition-colors"
                  >
                    {/* Producto / Origen con ícono de mapa */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                          <span className="material-symbols-outlined text-[18px]">
                            location_on
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">
                            {p.nombre}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {p.origenCompleto}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Precio en Origen */}
                    <td className="py-4 px-4 font-semibold text-on-surface">
                      S/ {p.precioOrigen.toFixed(2)}
                    </td>

                    {/* Precio en Lima */}
                    <td className="py-4 px-4 font-bold text-on-surface">
                      S/ {p.precioLima.toFixed(2)}
                    </td>

                    {/* Brecha de Precio */}
                    <td className="py-4 px-4">
                      <span
                        className={`font-bold ${
                          p.brechaPorcentaje >= 80
                            ? "text-terracotta"
                            : p.brechaPorcentaje >= 50
                            ? "text-on-secondary-container"
                            : "text-forest-green"
                        }`}
                      >
                        +{p.brechaPorcentaje}%
                      </span>
                    </td>

                    {/* Estado de Margen Badge */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${p.tonoEstado}`}
                      >
                        {p.estadoMargen}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLA 2: Vista "Comparativa de Mercados" */}
        {activeTab === "mercados" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-on-surface-variant text-xs font-semibold">
                  <th className="py-3 px-4 rounded-l-xl">Producto</th>
                  <th className="py-3 px-4">GM Santa Anita (GMML)</th>
                  <th className="py-3 px-4">Mayorista Productores/Frutas</th>
                  <th className="py-3 px-4">Mercados Minoristas</th>
                  <th className="py-3 px-4 rounded-r-xl">Margen Minorista vs. GMML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredProducts.map((p) => {
                  const gmml = p.mercadosComparativa[0]?.precio || p.precioLima;
                  const secundario = p.mercadosComparativa[1]?.precio || p.precioLima * 1.06;
                  const minorista = p.mercadosComparativa[2]?.precio || p.precioLima * 1.45;
                  const spreadMinorista = Math.round(((minorista - gmml) / gmml) * 100);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-surface-container-low/40 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-bold text-on-surface">{p.nombre}</p>
                        <p className="text-xs text-on-surface-variant">
                          {p.categoria}
                        </p>
                      </td>
                      <td className="py-4 px-4 font-semibold text-forest-green">
                        S/ {gmml.toFixed(2)} / {p.unidad}
                      </td>
                      <td className="py-4 px-4 font-medium text-on-surface">
                        S/ {secundario.toFixed(2)} / {p.unidad}
                      </td>
                      <td className="py-4 px-4 font-bold text-terracotta">
                        S/ {minorista.toFixed(2)} / {p.unidad}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-surface-container-high rounded-full text-on-surface">
                          +{spreadMinorista}% al consumidor
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA 3: Gráfico de Evolución Histórica */}
        {activeTab === "historico" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mr-2">
                Seleccionar producto:
              </span>
              {data?.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductForHistory(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedProductForHistory === p.id
                      ? "bg-forest-green text-on-primary font-bold shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>

            <div className="h-72 w-full pt-4">
              {historyChartData && (
                <Line
                  data={historyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top",
                        labels: {
                          font: { family: "Hanken Grotesk", size: 12 },
                          color: "#1a1c18",
                        },
                      },
                      tooltip: {
                        backgroundColor: "#1a1c18",
                        padding: 10,
                        titleFont: { family: "Hanken Grotesk", size: 13 },
                        bodyFont: { family: "Hanken Grotesk", size: 12 },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: "#414844" },
                      },
                      y: {
                        grid: { color: "rgba(65, 72, 68, 0.08)" },
                        ticks: {
                          color: "#414844",
                          callback: (val) => `S/ ${Number(val).toFixed(2)}`,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Pie informativo sobre la fuente oficial de datos */}
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-on-surface-variant">
          <p>
            <span className="font-semibold text-on-surface">Fuente:</span>{" "}
            {data?.fuente}
          </p>
          <p className="text-outline">
            Datos sincronizados con flujo n8n y boletines oficiales
          </p>
        </div>
      </section>
    </div>
  );
}
