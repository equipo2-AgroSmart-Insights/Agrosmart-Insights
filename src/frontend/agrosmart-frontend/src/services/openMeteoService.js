import { sendN8nAction } from "./n8nClient";

function getWaterRisk(precipitation, evapotranspiration) {
  const waterBalance = precipitation - evapotranspiration;

  if (waterBalance < -20) {
    return {
      label: "Alto riesgo hídrico",
      tone: "text-terracotta",
      badge: "bg-error-container text-on-error-container",
    };
  }

  if (waterBalance < 0) {
    return {
      label: "Riesgo moderado",
      tone: "text-on-tertiary-container",
      badge: "bg-tertiary-container text-on-tertiary",
    };
  }

  return {
    label: "Balance saludable",
    tone: "text-forest-green",
    badge: "bg-primary-fixed text-on-primary-fixed",
  };
}

function normalizeLocations(payload) {
  const rawResults =
    payload?.locations ??
    payload?.ubicaciones ??
    payload?.data?.locations ??
    payload?.data?.ubicaciones ??
    payload?.results ??
    payload?.data?.results ??
    [];

  return (Array.isArray(rawResults) ? rawResults : []).map((result, index) => ({
    id: result.id ?? `${result.latitude ?? index}-${result.longitude ?? index}`,
    name: result.name ?? result.region ?? result.label ?? "Ubicación",
    admin1: result.admin1 ?? result.region ?? result.departamento ?? "Región",
    country: result.country ?? "Perú",
    latitude: Number(result.latitude ?? 0),
    longitude: Number(result.longitude ?? 0),
    timezone: result.timezone ?? "auto",
    elevation: Number(result.elevation ?? 0),
  }));
}

function normalizeClimate(payload, location) {
  const raw = payload?.climate ?? payload?.data?.climate ?? payload?.data ?? payload;
  const daily = raw?.daily ?? raw?.series ?? {};

  const labels = (daily.time ?? []).slice(-7).map((date) =>
    new Date(date).toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
    })
  );

  const precipitation = (daily.precipitation_sum ?? []).slice(-7).map((value) => Number(value || 0));
  const maxTemp = (daily.temperature_2m_max ?? []).slice(-7).map((value) => Number(value || 0));
  const minTemp = (daily.temperature_2m_min ?? []).slice(-7).map((value) => Number(value || 0));
  const evapotranspiration = (daily.et0_fao_evapotranspiration ?? []).slice(-7).map((value) => Number(value || 0));
  const humidityValues = (daily.relative_humidity_2m ?? []).slice(-24).map((value) => Number(value || 0));

  const temperatureSeries = maxTemp.map((max, index) => Number(((max + (minTemp[index] ?? max)) / 2).toFixed(1)));
  const latestIndex = precipitation.length - 1;
  const precipitationCurrent = precipitation[latestIndex] ?? 0;
  const temperatureCurrent = temperatureSeries[latestIndex] ?? 0;
  const evapotranspirationCurrent = evapotranspiration[latestIndex] ?? 0;
  const humidityCurrent = humidityValues.length
    ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
    : 0;

  const risk = getWaterRisk(precipitationCurrent, evapotranspirationCurrent);

  return {
    location,
    lastUpdated: labels[labels.length - 1] ?? "Hoy",
    summary: {
      precipitation: precipitationCurrent,
      temperature: temperatureCurrent,
      humidity: humidityCurrent,
      evapotranspiration: evapotranspirationCurrent,
      risk,
    },
    series: {
      labels,
      precipitation,
      temperature: temperatureSeries,
      waterBalance: precipitation.map((value, index) => Number((value - (evapotranspiration[index] ?? 0)).toFixed(1))),
    },
  };
}

export async function searchLocationsByName(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const response = await sendN8nAction({
    action: "search_locations",
    tipo: "clima",
    pregunta: `Busca ubicaciones agrícolas para "${trimmedQuery}". Devuelve un JSON con una lista de ubicaciones con id, name, admin1, country, latitude, longitude, timezone.`,
    query: trimmedQuery,
  });

  return normalizeLocations(response);
}

export async function fetchLocationClimate(location) {
  const response = await sendN8nAction({
    action: "climate_by_coordinates",
    tipo: "clima",
    pregunta: `Consulta climática para ${location.name ?? "la zona agrícola"} con coordenadas ${location.latitude}, ${location.longitude}. Devuelve el clima de los últimos 7 días con precipitación, temperatura y balance hídrico.`,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    locationName: location.name,
    country: location.country,
    region: location.admin1,
  });

  return normalizeClimate(response, location);
}
