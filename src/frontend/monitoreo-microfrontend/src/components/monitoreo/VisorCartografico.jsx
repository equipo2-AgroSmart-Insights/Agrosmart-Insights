import { useEffect, useRef, useState, useTransition } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  INDICADORES,
  METADATOS_INDICADORES,
  fetchCapaIndicador,
} from "../../services/satelitalService";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || "";

// URLs de capas base
const TILE_PROVIDERS = {
  satellite: {
    name: "MapTiler Satélite",
    url: MAPTILER_KEY
      ? `https://api.maptiler.com/maps/satellite-v2/256/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: MAPTILER_KEY
      ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>'
      : '&copy; Esri World Imagery',
    maxZoom: 19,
  },
  streets: {
    name: "MapTiler Terreno / Calles",
    url: MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: MAPTILER_KEY
      ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; OpenStreetMap'
      : '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export default function VisorCartografico({
  selectedLocation,
  onLocationChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const geospatialLayerGroupRef = useRef(null);

  // Estados del visor
  const [baseMapType, setBaseMapType] = useState("satellite");
  const [baseMapLoading, setBaseMapLoading] = useState(true);
  const [baseMapLoadTime, setBaseMapLoadTime] = useState(null);

  // Estados del indicador
  const [indicadorActivo, setIndicadorActivo] = useState(INDICADORES.SEQUIA);
  const [capaData, setCapaData] = useState(null);
  const [capaLoading, setCapaLoading] = useState(false);
  const [capaError, setCapaError] = useState("");
  const [, startTransition] = useTransition();

  // 1. Inicialización del mapa base con Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const mapInitStartTime = performance.now();
    const defaultCenter = selectedLocation
      ? [selectedLocation.latitude, selectedLocation.longitude]
      : [-12.0464, -77.0428]; // Lima, Perú

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: selectedLocation ? 9 : 6,
      zoomControl: false, // Lo agregamos en posición personalizada
      attributionControl: true,
    });

    // Control de zoom estilizado
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    // Grupo para capas dinámicas del indicador
    const layerGroup = L.layerGroup().addTo(map);
    geospatialLayerGroupRef.current = layerGroup;

    // Configurar capa base inicial
    const provider = TILE_PROVIDERS[baseMapType];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    });

    tileLayer.on("loading", () => setBaseMapLoading(true));
    tileLayer.on("load", () => {
      setBaseMapLoading(false);
      setBaseMapLoadTime(Math.round(performance.now() - mapInitStartTime));
    });

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Cambio de capa base (Satélite <-> Calles/Terreno)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const mapChangeStartTime = performance.now();
    setBaseMapLoading(true);

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[baseMapType];
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    });

    newTileLayer.on("load", () => {
      setBaseMapLoading(false);
      setBaseMapLoadTime(Math.round(performance.now() - mapChangeStartTime));
    });

    newTileLayer.addTo(map);
    currentTileLayerRef.current = newTileLayer;
  }, [baseMapType]);

  // 3. Carga y actualización de la capa del indicador desde WF2
  useEffect(() => {
    if (!selectedLocation) return;

    let ignore = false;
    setCapaLoading(true);
    setCapaError("");

    async function loadCapa() {
      try {
        const result = await fetchCapaIndicador({
          location: selectedLocation,
          indicadorId: indicadorActivo,
        });

        if (!ignore) {
          startTransition(() => {
            setCapaData(result);
          });
        }
      } catch (err) {
        if (!ignore) {
          setCapaError(err.message || "Error al recuperar capa geoespacial");
        }
      } finally {
        if (!ignore) {
          setCapaLoading(false);
        }
      }
    }

    loadCapa();

    return () => {
      ignore = true;
    };
  }, [selectedLocation, indicadorActivo]);

  // 4. Renderizado visual de la capa geoespacial en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = geospatialLayerGroupRef.current;
    if (!map || !layerGroup) return;

    // Limpiar capa anterior
    layerGroup.clearLayers();

    if (!selectedLocation) return;

    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;

    // Recentrar suavemente el mapa a la región
    map.flyTo([lat, lng], 10, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    // Si el indicador NO está disponible (caso NDVI), no graficar datos simulados
    if (!capaData || !capaData.disponible) {
      // Agregamos únicamente un marcador de ubicación neutral
      const neutralIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-slate-400 opacity-40"></span>
            <div class="relative w-8 h-8 rounded-full bg-slate-700 border-2 border-white flex items-center justify-center text-white shadow-lg">
              <span class="material-symbols-outlined text-[16px]">location_on</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const neutralMarker = L.marker([lat, lng], { icon: neutralIcon }).bindPopup(`
        <div class="p-2 text-on-surface">
          <p class="font-bold text-sm text-forest-green">${selectedLocation.name}</p>
          <p class="text-xs text-on-surface-variant">${selectedLocation.admin1 || "Perú"}</p>
          <div class="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded">
            <strong>Indicador no disponible:</strong> ${capaData?.motivo || "No se muestran datos simulados."}
          </div>
        </div>
      `);

      layerGroup.addLayer(neutralMarker);
      return;
    }

    // Caso especial NDVI: Capa raster satelital Sentinel-2 (L.imageOverlay)
    if (capaData.isRasterImage && capaData.imageUrl && capaData.bounds) {
      const ndviOverlay = L.imageOverlay(capaData.imageUrl, capaData.bounds, {
        opacity: 0.85,
        interactive: true,
        alt: `Raster NDVI de ${selectedLocation.name}`,
      });

      const popupContent = `
        <div style="min-width: 220px; font-family: 'Hanken Grotesk', sans-serif;" class="p-1 text-on-surface">
          <div class="flex items-center justify-between border-b pb-2 mb-2">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1b4332;">${selectedLocation.name}</h4>
            <span style="font-size: 11px; background: #edefe7; padding: 2px 6px; border-radius: 999px;">Sentinel-2 CDSE</span>
          </div>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #414844;"><strong>Capa:</strong> Raster multiespectral NDVI</p>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #1b4332; font-weight: 600;">
            Resolución: 10m por píxel (Sentinel-2 L2A)
          </p>
          <div style="font-size: 11px; color: #717973; border-top: 1px dashed #c1c8c2; pt-2; margin-top: 6px;">
            Fuente: ${capaData.fuente}<br/>
            Actualizado: ${capaData.fechaActualizacion}
          </div>
        </div>
      `;

      ndviOverlay.bindPopup(popupContent);
      layerGroup.addLayer(ndviOverlay);

      const ndviIcon = L.divIcon({
        className: "custom-risk-icon",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full opacity-35 bg-forest-green"></span>
            <div class="relative w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl bg-forest-green">
              <span class="material-symbols-outlined text-[18px]">grass</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const centerMarker = L.marker([lat, lng], { icon: ndviIcon }).bindPopup(popupContent);
      layerGroup.addLayer(centerMarker);

      map.fitBounds(capaData.bounds, { padding: [20, 20], maxZoom: 13 });
      return;
    }

    // Para indicadores DISPONIBLES (Sequía o Humedad con datos de WF2)
    const color = capaData.nivelRiesgo?.color || "#1b4332";

    // 1. Círculo de cobertura de análisis geoespacial
    const bufferCircle = L.circle([lat, lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.25,
      weight: 2.5,
      radius: 12000, // 12 km de radio de monitoreo agrícola
    });

    // 2. Marcador con icono temático
    const riskIcon = L.divIcon({
      className: "custom-risk-icon",
      html: `
        <div class="relative flex items-center justify-center cursor-pointer">
          <span style="background-color: ${color};" class="animate-ping absolute inline-flex h-10 w-10 rounded-full opacity-35"></span>
          <div style="background-color: ${color};" class="relative w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl">
            <span class="material-symbols-outlined text-[18px]">
              ${indicadorActivo === INDICADORES.SEQUIA ? "water_drop" : indicadorActivo === INDICADORES.NDVI ? "grass" : "humidity_mid"}
            </span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([lat, lng], { icon: riskIcon });

    const popupContent = `
      <div style="min-width: 220px; font-family: 'Hanken Grotesk', sans-serif;" class="p-1 text-on-surface">
        <div class="flex items-center justify-between border-b pb-2 mb-2">
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1b4332;">${selectedLocation.name}</h4>
          <span style="font-size: 11px; background: #edefe7; padding: 2px 6px; border-radius: 999px;">${selectedLocation.admin1 || "Perú"}</span>
        </div>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #414844;"><strong>Indicador:</strong> ${capaData.nombre}</p>
        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">
          Valor real: <span style="color: ${color};">${capaData.valor} ${capaData.unidad}</span>
        </p>
        <p style="margin: 0 0 6px 0; font-size: 12px; color: ${color}; font-weight: 700;">
          Nivel de riesgo: ${capaData.nivelRiesgo?.label}
        </p>
        <div style="font-size: 11px; color: #717973; border-top: 1px dashed #c1c8c2; pt-2; margin-top: 6px;">
          Fuente: ${capaData.fuente}<br/>
          Actualizado: ${capaData.fechaActualizacion}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    bufferCircle.bindPopup(popupContent);

    layerGroup.addLayer(bufferCircle);
    layerGroup.addLayer(marker);
  }, [capaData, selectedLocation, indicadorActivo]);

  const defIndicadorActual = METADATOS_INDICADORES[indicadorActivo];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de control: Selección de Capa Base y Rendimiento */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container rounded-2xl p-4 border border-outline-variant">
        {/* Selector de Indicador Geoespacial */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-forest-green">layers</span>
            Capa Indicador:
          </span>
          <div className="flex gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant">
            {Object.values(METADATOS_INDICADORES).map((indicador) => {
              const isSelected = indicadorActivo === indicador.id;
              return (
                <button
                  key={indicador.id}
                  type="button"
                  onClick={() => setIndicadorActivo(indicador.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-forest-green text-on-primary shadow-sm"
                      : "text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {indicador.id === INDICADORES.NDVI
                      ? "grass"
                      : indicador.id === INDICADORES.SEQUIA
                      ? "water_loss"
                      : "humidity_percentage"}
                  </span>
                  <span>{indicador.nombre.split(" ")[0]}</span>
                  {!indicador.disponible && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 border border-amber-300">
                      No disp.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tipo de Mapa Base y Estado de Rendimiento */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Tipo de Mapa Base */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant text-xs">
            <button
              type="button"
              onClick={() => setBaseMapType("satellite")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                baseMapType === "satellite"
                  ? "bg-forest-green text-on-primary"
                  : "text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">satellite</span>
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setBaseMapType("streets")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                baseMapType === "streets"
                  ? "bg-forest-green text-on-primary"
                  : "text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">map</span>
              Relieve
            </button>
          </div>

          {/* Panel de Rendimiento Diferenciado (Mapa Base vs Capa Indicador) */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-forest-green">speed</span>
            <div className="flex items-center gap-2">
              <span title="Tiempo de carga de teselas del mapa base">
                Base:{" "}
                <strong className={baseMapLoading ? "text-amber-700" : "text-forest-green"}>
                  {baseMapLoading ? "Cargando..." : `${baseMapLoadTime ?? 0} ms`}
                </strong>
              </span>
              <span className="text-outline-variant">|</span>
              <span title="Tiempo de recuperación de capa desde WF2">
                Capa WF:{" "}
                <strong className={capaLoading ? "text-amber-700" : "text-forest-green"}>
                  {capaLoading ? "Cargando..." : `${capaData?.loadTimeMs ?? 0} ms`}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor del Visor Cartográfico */}
      <div className="relative rounded-2xl overflow-hidden border border-outline-variant shadow-sm bg-surface-container-lowest">
        {/* Overlay de carga del mapa base */}
        {baseMapLoading && (
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-outline-variant text-xs font-medium text-forest-green shadow-md">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-forest-green animate-ping"></span>
            Cargando mapa base {TILE_PROVIDERS[baseMapType].name}...
          </div>
        )}

        {/* Overlay de recuperación de capa geoespacial */}
        {capaLoading && (
          <div className="absolute top-12 left-3 z-[1000] flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-outline-variant text-xs font-medium text-amber-800 shadow-md">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 animate-spin"></span>
            Recuperando capa geoespacial desde WF2...
          </div>
        )}

        {/* Contenedor DOM para Leaflet */}
        <div
          ref={mapContainerRef}
          className="w-full h-[460px] md:h-[540px] z-0 focus:outline-none"
        />

        {/* Panel Flotante: Leyenda de Interpretación y Niveles de Riesgo */}
        <div className="absolute bottom-4 left-4 z-[999] max-w-xs md:max-w-sm bg-surface/95 backdrop-blur-md rounded-2xl border border-outline-variant p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-outline-variant/60">
            <span className="font-label-md text-xs font-bold uppercase tracking-wider text-forest-green flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Leyenda del Indicador
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                (capaData ? capaData.disponible : defIndicadorActual.disponible)
                  ? "bg-primary-fixed text-on-primary-fixed"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              {(capaData ? capaData.disponible : defIndicadorActual.disponible) ? "Disponible" : "No disponible"}
            </span>
          </div>

          <h4 className="font-headline-sm text-sm font-bold text-on-surface mb-1">
            {defIndicadorActual.nombre}
          </h4>
          <p className="text-xs text-on-surface-variant mb-3">
            {defIndicadorActual.descripcion}
          </p>

          {/* Si es capa raster NDVI, mostrar gradiente continuo espectral */}
          {indicadorActivo === INDICADORES.NDVI && capaData?.isRasterImage ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-on-surface-variant">
                Escala de Vigor Vegetativo (NDVI):
              </p>
              <div className="h-3.5 w-full rounded-full shadow-inner border border-outline-variant/60 bg-gradient-to-r from-[#ba1a1a] via-[#e9c46a] via-[#86af99] to-[#1b4332]"></div>
              <div className="flex justify-between text-[10px] text-on-surface-variant font-medium px-0.5">
                <span>&lt; 0.1 (Suelo)</span>
                <span>0.3 (Escaso)</span>
                <span>0.5 (Medio)</span>
                <span>0.7+ (Óptimo)</span>
              </div>
              <div className="mt-2.5 p-2 rounded-xl bg-surface-container border border-outline-variant/50 text-xs">
                <p className="font-bold text-forest-green mb-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">satellite</span>
                  Capa Raster Sentinel-2 (CDSE):
                </p>
                <p className="text-on-surface text-[11px] leading-relaxed">
                  {capaData.interpretacion}
                </p>
              </div>
            </div>
          ) : (capaData ? capaData.disponible : defIndicadorActual.disponible) && defIndicadorActual.reglasRiesgo?.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase text-on-surface-variant">
                Escala y Niveles de Riesgo ({defIndicadorActual.unidad}):
              </p>
              {defIndicadorActual.reglasRiesgo.map((regla) => (
                <div
                  key={regla.nivel}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-container-low"
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: regla.color }}
                      className="w-3 h-3 rounded-full inline-block shadow-sm"
                    />
                    <span className="text-on-surface font-medium">{regla.etiqueta}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${regla.bg} ${regla.text}`}>
                    Riesgo {regla.nivel}
                  </span>
                </div>
              ))}

              {capaData?.disponible && capaData.interpretacion && (
                <div className="mt-3 p-2.5 rounded-xl bg-surface-container border border-outline-variant/50 text-xs">
                  <p className="font-bold text-forest-green mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Estado en {selectedLocation?.name}:
                  </p>
                  <p className="text-on-surface">{capaData.interpretacion}</p>
                </div>
              )}
            </div>
          ) : (
            /* Caso no disponible: NO SIMULAR DATOS */
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <span className="material-symbols-outlined text-amber-700 text-[18px]">warning</span>
                <span>Indicador no disponible</span>
              </div>
              <p className="leading-relaxed">
                {capaData?.motivo || defIndicadorActual.motivoNoDisponible}
              </p>
              <div className="mt-2 text-[11px] text-amber-800/80 italic">
                * Conforme a la política de calidad e integridad de AgroSmart Insights, no se representan datos sintéticos ni simulados.
              </div>
            </div>
          )}
        </div>

        {/* Panel Flotante: Metadatos Oficiales de la Capa */}
        <div className="absolute top-4 right-4 z-[999] max-w-[260px] bg-surface/95 backdrop-blur-md rounded-2xl border border-outline-variant p-3.5 shadow-xl text-xs space-y-2">
          <p className="font-label-md text-[11px] font-bold uppercase tracking-wider text-forest-green flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            Ficha Técnica de Capa
          </p>

          <div>
            <span className="text-on-surface-variant block text-[10px] uppercase">Fuente:</span>
            <span className="font-semibold text-on-surface">
              {capaData?.fuente || defIndicadorActual.fuente}
            </span>
          </div>

          <div>
            <span className="text-on-surface-variant block text-[10px] uppercase">Fecha de actualización:</span>
            <span className="font-semibold text-on-surface">
              {capaData?.fechaActualizacion || "Pendiente"}
            </span>
          </div>

          <div>
            <span className="text-on-surface-variant block text-[10px] uppercase">Cobertura geográfica:</span>
            <span className="font-semibold text-on-surface">
              {capaData?.coberturaGeografica || (selectedLocation ? `${selectedLocation.name}, ${selectedLocation.admin1 || "Perú"}` : "Perú")}
            </span>
            {selectedLocation && (
              <span className="block text-[10px] text-outline mt-0.5">
                Coords: [{selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°]
              </span>
            )}
          </div>
        </div>
      </div>

      {capaError ? (
        <div className="rounded-xl border border-error-container bg-error-container/30 p-3 text-xs text-on-error-container flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{capaError}</span>
        </div>
      ) : null}
    </div>
  );
}
