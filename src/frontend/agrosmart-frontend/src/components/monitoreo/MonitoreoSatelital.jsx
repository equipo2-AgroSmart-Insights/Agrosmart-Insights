import { useEffect, useState } from "react";
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
import { fetchLocationClimate, searchLocationsByName } from "../../services/openMeteoService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "#414844",
      },
    },
    y: {
      grid: {
        color: "rgba(65, 72, 68, 0.08)",
      },
      ticks: {
        color: "#414844",
      },
    },
  },
};

const DEFAULT_QUERY = "Lima, Perú";

export default function MonitoreoSatelital() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadLocations() {
      setLoadingLocations(true);
      setError("");

      try {
        const locations = await searchLocationsByName(query);
        if (!ignore) {
          setSearchResults(locations);
          if (!selectedLocation && locations.length > 0) {
            setSelectedLocation(locations[0]);
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "No se pudieron cargar las ubicaciones agrícolas.");
        }
      } finally {
        if (!ignore) {
          setLoadingLocations(false);
        }
      }
    }

    loadLocations();
    return () => {
      ignore = true;
    };
  }, [query]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    let ignore = false;

    async function loadClimateData() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchLocationClimate(selectedLocation);
        if (!ignore) {
          setData(result);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "No se pudieron cargar los datos climáticos.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadClimateData();
    return () => {
      ignore = true;
    };
  }, [selectedLocation]);

  const precipitationChart = data
    ? {
        labels: data.series.labels,
        datasets: [
          {
            label: "Precipitación (mm)",
            data: data.series.precipitation,
            borderColor: "#1b4332",
            backgroundColor: "rgba(27, 67, 50, 0.12)",
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.35,
          },
        ],
      }
    : null;

  const temperatureChart = data
    ? {
        labels: data.series.labels,
        datasets: [
          {
            label: "Temperatura media (°C)",
            data: data.series.temperature,
            borderColor: "#e9c46a",
            backgroundColor: "rgba(233, 196, 106, 0.15)",
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.35,
          },
        ],
      }
    : null;

  const waterBalanceChart = data
    ? {
        labels: data.series.labels,
        datasets: [
          {
            label: "Balance hídrico",
            data: data.series.waterBalance,
            borderColor: "#ba1a1a",
            backgroundColor: "rgba(186, 26, 26, 0.12)",
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.35,
          },
        ],
      }
    : null;

  return (
    <div className="px-margin-desktop py-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-[0.12em] mb-2">
            Observatorio agrícola
          </p>
          <h1 className="font-headline-lg text-headline-lg text-forest-green mb-2">
            Monitoreo Satelital
          </h1>
        </div>
        <div className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant">
          Actualizado: {data ? data.lastUpdated : "Cargando..."}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <div className="w-full">
              <p className="font-label-md text-label-md text-on-surface-variant">Buscar región o zona productora</p>
              <div className="mt-3 flex gap-3 items-center">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ej: Arequipa, Perú"
                  className="w-full rounded-full border border-outline-variant bg-white px-4 py-2 text-sm text-on-surface outline-none focus:border-forest-green"
                />
                <button
                  type="button"
                  onClick={() => setQuery(query.trim() || DEFAULT_QUERY)}
                  className="rounded-full bg-forest-green px-4 py-2 text-sm font-medium text-on-primary"
                >
                  Buscar
                </button>
              </div>
            </div>
            <span className="material-symbols-outlined text-3xl text-forest-green ml-3">satellite_alt</span>
          </div>

          <div className="p-4">
            {loadingLocations ? (
              <p className="text-sm text-on-surface-variant">Buscando ubicaciones en Open-Meteo...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {searchResults.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setSelectedLocation(location)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      selectedLocation?.id === location.id
                        ? "border-forest-green bg-forest-green text-on-primary"
                        : "border-outline-variant bg-white text-on-surface hover:border-forest-green/40"
                    }`}
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
            <div className="rounded-xl bg-surface p-4">
              <p className="font-label-md text-label-md text-on-surface-variant">Precipitación</p>
              <p className="font-headline-sm text-headline-sm text-on-surface mt-2">
                {loading ? "—" : `${Number(data?.summary?.precipitation ?? 0).toFixed(1)} mm`}
              </p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="font-label-md text-label-md text-on-surface-variant">Temperatura</p>
              <p className="font-headline-sm text-headline-sm text-on-surface mt-2">
                {loading ? "—" : `${Number(data?.summary?.temperature ?? 0).toFixed(1)} °C`}
              </p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="font-label-md text-label-md text-on-surface-variant">Humedad</p>
              <p className="font-headline-sm text-headline-sm text-on-surface mt-2">
                {loading ? "—" : `${Number(data?.summary?.humidity ?? 0).toFixed(0)} %`}
              </p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="font-label-md text-label-md text-on-surface-variant">Riesgo</p>
              <p className={`font-body-md text-body-md mt-2 ${loading ? "text-on-surface-variant" : data?.summary?.risk?.tone}`}>
                {loading ? "—" : data?.summary?.risk?.label}
              </p>
            </div>
          </div>
        </section>

        <aside className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm">
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-[0.12em]">
            Ubicación recuperada
          </p>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mt-2 mb-4">
            {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Sin ubicación"}
          </h3>

          <div className="space-y-4">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Región administrativa</p>
              <p className="font-body-md text-body-md text-on-surface mt-1">
                {selectedLocation ? selectedLocation.admin1 : "—"}
              </p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Coordenadas</p>
              <p className="font-body-md text-body-md text-on-surface mt-1">
                {selectedLocation ? `${selectedLocation.latitude.toFixed(4)}°, ${selectedLocation.longitude.toFixed(4)}°` : "—"}
              </p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Estado climático</p>
              <span
                className={`inline-flex mt-2 rounded-full px-3 py-1 text-sm font-medium ${
                  loading ? "bg-surface text-on-surface-variant" : data?.summary?.risk?.badge
                }`}
              >
                {loading ? "Cargando..." : data?.summary?.risk?.label}
              </span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Evapotranspiración</p>
              <p className="font-body-md text-body-md text-on-surface mt-1">
                {loading ? "—" : `${Number(data?.summary?.evapotranspiration ?? 0).toFixed(1)} mm`}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-error-container bg-error-container/30 p-4 text-on-error-container">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-4">
          <p className="font-label-md text-label-md text-on-surface-variant mb-3">Precipitación</p>
          <div className="h-52">
            {precipitationChart ? <Line data={precipitationChart} options={chartOptions} /> : null}
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline-variant p-4">
          <p className="font-label-md text-label-md text-on-surface-variant mb-3">Temperatura media</p>
          <div className="h-52">
            {temperatureChart ? <Line data={temperatureChart} options={chartOptions} /> : null}
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline-variant p-4">
          <p className="font-label-md text-label-md text-on-surface-variant mb-3">Balance hídrico</p>
          <div className="h-52">
            {waterBalanceChart ? <Line data={waterBalanceChart} options={chartOptions} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}