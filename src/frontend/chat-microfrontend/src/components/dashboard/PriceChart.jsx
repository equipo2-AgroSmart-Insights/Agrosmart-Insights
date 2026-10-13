import { useState, useMemo, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar, Scatter } from "react-chartjs-2";
import {
  extractDynamicRecords,
  fetchAnalyticsFromN8n,
  buildChartDatasetsFromRecords
} from "../../services/marketAnalyticsService";
import LoadingSkeleton from "./LoadingSkeleton";

// Registro modular de componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PriceChart({ result, query = "" }) {
  // Estado local para los registros extraídos dinámicamente de n8n
  const [records, setRecords] = useState([]);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  // Estados de filtros interactivos
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [chartType, setChartType] = useState("timeSeries"); // 'timeSeries' | 'volume' | 'scatter'

  // Selector dinámico de rango de fechas
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState("all"); // 'all' | '7d' | '15d' | '30d'

  // Al recibir un nuevo resultado del chat (webhook n8n), extraer los datos reales dinámicamente
  useEffect(() => {
    if (result) {
      const extracted = extractDynamicRecords(result);
      setRecords(extracted);

      // Si hay productos en los datos dinámicos, seleccionar el primero automáticamente
      if (extracted.length > 0 && extracted[0].producto) {
        setSelectedProduct(extracted[0].producto);
      } else {
        setSelectedProduct("all");
      }
      setSelectedRegion("all");
    }
  }, [result]);

  // Manejador de presets rápidos de fechas dinámicas
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split("T")[0];

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const past = new Date(today);
    if (preset === "7d") past.setDate(today.getDate() - 7);
    if (preset === "15d") past.setDate(today.getDate() - 15);
    if (preset === "30d") past.setDate(today.getDate() - 30);

    const startStr = past.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Suscripción / consulta activa a n8n cuando se requiere refrescar o ampliar el rango
  const handleRefreshFromN8n = async () => {
    setIsLoadingDynamic(true);
    try {
      const response = await fetchAnalyticsFromN8n({
        producto: selectedProduct !== "all" ? selectedProduct : "",
        fechaInicio: startDate,
        fechaFin: endDate,
        region: selectedRegion !== "all" ? selectedRegion : ""
      });

      if (response) {
        const freshRecords = extractDynamicRecords(response);
        if (freshRecords.length > 0) {
          setRecords(freshRecords);
        }
      }
    } catch (err) {
      console.warn("Consulta analítica dinámica a n8n finalizada:", err.message);
    } finally {
      setIsLoadingDynamic(false);
    }
  };

  // Construir los datasets para Chart.js a partir de los registros dinámicos
  const {
    availableProducts,
    availableRegions,
    timeSeriesData,
    volumeData,
    scatterData,
    kpis,
    isEmpty
  } = useMemo(() => {
    return buildChartDatasetsFromRecords({
      records,
      selectedProduct,
      selectedRegion,
      startDate,
      endDate
    });
  }, [records, selectedProduct, selectedRegion, startDate, endDate]);

  // Opciones de configuración de Chart.js con paleta accesible y fuentes claras
  const commonOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            font: {
              family: "'Hanken Grotesk', sans-serif",
              size: 13,
              weight: 600
            },
            color: "#1a1c18",
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)", // Slate 900 alto contraste
          titleFont: {
            family: "'Hanken Grotesk', sans-serif",
            size: 13,
            weight: 700
          },
          bodyFont: {
            family: "'Hanken Grotesk', sans-serif",
            size: 12
          },
          padding: 12,
          cornerRadius: 8,
          borderColor: "#334155",
          borderWidth: 1,
          callbacks: {
            label: function (ctx) {
              const label = ctx.dataset.label || "";
              const val = ctx.parsed.y;
              if (chartType === "volume") {
                return ` ${label}: ${Number(val).toLocaleString()} ${kpis?.unit || "TM"}`;
              }
              return ` ${label}: S/ ${Number(val).toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(100, 116, 139, 0.12)",
            drawBorder: false
          },
          ticks: {
            color: "#334155",
            font: {
              family: "'Hanken Grotesk', sans-serif",
              size: 12,
              weight: 500
            }
          }
        },
        y: {
          grid: {
            color: "rgba(100, 116, 139, 0.12)",
            drawBorder: false
          },
          ticks: {
            color: "#334155",
            font: {
              family: "'Hanken Grotesk', sans-serif",
              size: 12,
              weight: 500
            },
            callback: function (value) {
              if (chartType === "volume") return `${value} ${kpis?.unit || "TM"}`;
              return `S/ ${value}`;
            }
          }
        }
      }
    };
  }, [chartType, kpis]);

  // Opciones para gráfico de Dispersión (Scatter)
  const scatterOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            font: {
              family: "'Hanken Grotesk', sans-serif",
              size: 12,
              weight: 600
            },
            color: "#1a1c18"
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              const pt = ctx.raw;
              return `${ctx.dataset.label}: Vol ${pt.x} → Precio S/ ${pt.y} (${pt.fecha})`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: `Volumen Registrado (${kpis?.unit || "TM"})`,
            color: "#1e293b",
            font: { size: 12, weight: 600 }
          },
          ticks: { color: "#334155" }
        },
        y: {
          title: {
            display: true,
            text: "Precio de Mercado (S/)",
            color: "#1e293b",
            font: { size: 12, weight: 600 }
          },
          ticks: {
            color: "#334155",
            callback: (v) => `S/ ${v}`
          }
        }
      }
    };
  }, [kpis]);

  if (isLoadingDynamic) {
    return <LoadingSkeleton />;
  }

  if (isEmpty) {
    return (
      <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 text-center my-6">
        <span className="material-symbols-outlined text-[36px] text-outline mb-2">
          query_stats
        </span>
        <h4 className="text-base font-bold text-on-surface">Esperando datos analíticos</h4>
        <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-1">
          Formula una consulta en el chat para obtener métricas y gráficos directamente de la base de datos o n8n.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-md p-6 mt-6 transition-all duration-300">
      {/* Encabezado con estado dinámico de origen de datos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-outline-variant/20 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-forest-green text-[22px]">
              insights
            </span>
            <h3 className="font-headline-sm text-headline-sm text-forest-green tracking-tight">
              Análisis Analítico en Tiempo Real
            </h3>
          </div>
          <p className="font-body-md text-sm text-on-surface-variant">
            Datos transmitidos desde n8n / Base de Datos Postgres • {records.length} registros cargados dinámicamente
          </p>
        </div>

        {/* Acciones de suscripción y estado */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshFromN8n}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center gap-1.5 transition-colors border border-outline-variant/30 cursor-pointer"
            title="Sincronizar directamente con el endpoint analítico de n8n"
          >
            <span className="material-symbols-outlined text-[16px] text-forest-green">sync</span>
            Sincronizar n8n
          </button>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-forest-green animate-pulse" />
            Live Data
          </span>
        </div>
      </div>

      {/* Barra de Filtros Dinámicos: Producto, Región, Rango de Fechas y Tipo de Gráfico */}
      <div className="space-y-3 my-5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Filtro Dinámico: Producto */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <label
              htmlFor="filter-product"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-forest-green">nutrition</span>
              Producto ({availableProducts.length})
            </label>
            <select
              id="filter-product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-forest-green cursor-pointer shadow-xs"
            >
              <option value="all">Todos los Productos</option>
              {availableProducts.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Dinámico: Región / Mercado */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <label
              htmlFor="filter-region"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-forest-green">location_on</span>
              Región / Mercado
            </label>
            <select
              id="filter-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-forest-green cursor-pointer shadow-xs"
            >
              <option value="all">Todas las Regiones</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Tipo de Gráfico */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-forest-green">analytics</span>
              Vista Analítica
            </span>
            <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setChartType("timeSeries")}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  chartType === "timeSeries"
                    ? "bg-forest-green text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Series de Tiempo (Evolución de Precios)"
              >
                <span className="material-symbols-outlined text-[15px]">show_chart</span>
                <span>Series</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType("volume")}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  chartType === "volume"
                    ? "bg-forest-green text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Volumen de Mercado"
              >
                <span className="material-symbols-outlined text-[15px]">bar_chart</span>
                <span>Volumen</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType("scatter")}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  chartType === "scatter"
                    ? "bg-forest-green text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Dispersión Volumen vs Precio"
              >
                <span className="material-symbols-outlined text-[15px]">bubble_chart</span>
                <span>Dispersión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selector Dinámico de Rango de Fechas */}
        <div className="pt-2 border-t border-outline-variant/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-on-surface-variant flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-[15px] text-forest-green">date_range</span>
              Rango Rápido:
            </span>
            {[
              { id: "all", label: "Historial Completo" },
              { id: "7d", label: "7 Días" },
              { id: "15d", label: "15 Días" },
              { id: "30d", label: "30 Días" }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  datePreset === p.id
                    ? "bg-forest-green text-on-primary font-semibold"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Entradas de Fecha Dinámica */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label htmlFor="date-start" className="text-on-surface-variant font-medium">Desde:</label>
              <input
                id="date-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-surface-container-lowest border border-outline-variant/60 rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-forest-green"
              />
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="date-end" className="text-on-surface-variant font-medium">Hasta:</label>
              <input
                id="date-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-surface-container-lowest border border-outline-variant/60 rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-forest-green"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Calculadas Dinámicamente */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Precio Actual</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-forest-green">
                S/ {kpis.currentPrice.toFixed(2)}
              </span>
              <span className="text-xs text-outline font-medium">/ {kpis.unit}</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
              <span
                className={`px-1.5 py-0.5 rounded flex items-center ${
                  kpis.isUp
                    ? "bg-primary-fixed text-on-primary-fixed"
                    : "bg-error-container text-on-error-container"
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {kpis.isUp ? "arrow_upward" : "arrow_downward"}
                </span>
                {Math.abs(kpis.pctChange)}%
              </span>
            </div>
          </div>

          <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Precio Promedio</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-on-surface">
                S/ {kpis.avgPrice.toFixed(2)}
              </span>
              <span className="text-xs text-outline font-medium">/ {kpis.unit}</span>
            </div>
            <div className="mt-2 text-xs text-on-surface-variant">
              En el período seleccionado
            </div>
          </div>

          <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Volumen Total</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-forest-green">
                {kpis.totalVolume.toLocaleString()}
              </span>
              <span className="text-xs text-outline font-medium">{kpis.unit}</span>
            </div>
            <div className="mt-2 text-xs text-on-surface-variant">
              Suma de registros filtrados
            </div>
          </div>

          <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Muestreo Dinámico</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-amber-700">
                {kpis.totalRecords}
              </span>
              <span className="text-xs text-outline font-medium">puntos</span>
            </div>
            <div className="mt-2 text-xs text-on-surface-variant truncate">
              {kpis.sampleProduct}
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Lienzo de Chart.js */}
      <div className="relative w-full h-[360px] md:h-[400px] bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-inner">
        {chartType === "timeSeries" && (
          <Line key={`timeSeries-${selectedProduct}-${selectedRegion}-${startDate}-${endDate}`} data={timeSeriesData} options={commonOptions} />
        )}

        {chartType === "volume" && (
          <Bar key={`volume-${selectedProduct}-${selectedRegion}-${startDate}-${endDate}`} data={volumeData} options={commonOptions} />
        )}

        {chartType === "scatter" && (
          <Scatter key={`scatter-${selectedProduct}-${selectedRegion}-${startDate}-${endDate}`} data={scatterData} options={scatterOptions} />
        )}
      </div>

      {/* Indicador de accesibilidad y fuente */}
      <div className="mt-4 pt-3 border-t border-outline-variant/15 flex flex-wrap items-center justify-between text-xs text-on-surface-variant gap-2">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-forest-green">accessibility_new</span>
          Paleta accesible de alto contraste (WCAG 2.1 AA/AAA) con diferenciación por formas geométricas
        </span>
        <span className="font-medium text-forest-green">
          Origen: n8n Workflow 2 + Postgres SQL
        </span>
      </div>
    </div>
  );
}
