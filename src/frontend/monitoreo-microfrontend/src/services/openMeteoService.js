import { sendN8nAction } from "./n8nClient";

function getWaterRisk(precipitation, evapotranspiration) {
  const waterBalance = precipitation - evapotranspiration;

  if (waterBalance < -20) {
    return {
      label: "Alto déficit hídrico",
      tone: "text-terracotta",
      badge: "bg-error-container text-on-error-container",
    };
  }

  if (waterBalance < 0) {
    return {
      label: "Déficit moderado",
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

function formatDateLabel(dateStr) {
  if (!dateStr) return "Hoy";
  const dateObj = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  });
}

function normalizeLocations(payload, query = "") {
  let rawResults =
    payload?.locations ??
    payload?.ubicaciones ??
    payload?.data?.locations ??
    payload?.data?.ubicaciones ??
    payload?.results ??
    payload?.data?.results ??
    (Array.isArray(payload) ? payload : null);

  if (!rawResults && typeof payload === "object" && payload !== null) {
    if (payload.name || payload.ubicacion || payload.lugar) {
      rawResults = [payload];
    }
  }

  // Si no hay lista explícita, generamos una ubicación dinámica basada en la consulta enviada.
  if (!rawResults || !Array.isArray(rawResults) || rawResults.length === 0) {
    const name = payload?.lugar ?? payload?.ubicacion ?? query ?? "Ubicación";
    rawResults = [
      {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name: name,
        admin1: payload?.region ?? payload?.departamento ?? name,
        country: "Perú",
        latitude: Number(payload?.latitud ?? payload?.latitude ?? -12.0464),
        longitude: Number(payload?.longitud ?? payload?.longitude ?? -77.0428),
        timezone: "America/Lima",
        elevation: Number(payload?.elevation ?? 0),
      },
    ];
  }

  return rawResults.map((result, index) => ({
    id: result.id ?? `${result.latitude ?? index}-${result.longitude ?? index}`,
    name: result.name ?? result.ubicacion ?? result.lugar ?? result.region ?? query ?? "Ubicación",
    admin1: result.admin1 ?? result.region ?? result.departamento ?? "Región",
    country: result.country ?? "Perú",
    latitude: Number(result.latitude ?? result.latitud ?? -12.0464),
    longitude: Number(result.longitude ?? result.longitud ?? -77.0428),
    timezone: result.timezone ?? "America/Lima",
    elevation: Number(result.elevation ?? 0),
  }));
}

function normalizeClimate(payload, location) {
  const raw = payload?.climate ?? payload?.data?.climate ?? payload?.data ?? payload;
  let daily = raw?.daily ?? raw?.series ?? {};

  // Si los datos vienen como array de filas (ej. desde Postgres en n8n)
  if (Array.isArray(raw) || Array.isArray(payload?.respuesta)) {
    const rows = Array.isArray(raw) ? raw : payload.respuesta;
    daily = {
      time: rows.map((r) => r.fecha),
      precipitation_sum: rows.map((r) => r.precipitacion),
      temperature_2m_max: rows.map((r) => r.temperatura),
      temperature_2m_min: rows.map((r) => r.temperatura),
      et0_fao_evapotranspiration: rows.map((r) => r.evapotranspiracion),
      relative_humidity_2m: rows.map((r) => r.humedad),
    };
  }

  const rawTimes = daily.time ?? [];
  const timeSlice = rawTimes.length ? rawTimes.slice(-7) : [];
  const labels = timeSlice.length
    ? timeSlice.map(formatDateLabel)
    : ["Hace 6d", "Hace 5d", "Hace 4d", "Hace 3d", "Hace 2d", "Ayer", "Hoy"];

  const precipitation = (daily.precipitation_sum ?? []).slice(-7).map((v) => Number(v || 0));
  const maxTemp = (daily.temperature_2m_max ?? []).slice(-7).map((v) => Number(v || 0));
  const minTemp = (daily.temperature_2m_min ?? []).slice(-7).map((v) => Number(v || 0));
  const evapotranspiration = (daily.et0_fao_evapotranspiration ?? []).slice(-7).map((v) => Number(v || 0));
  const humidityValues = (daily.relative_humidity_2m ?? daily.relative_humidity_2m_max ?? []).slice(-7).map((v) => Number(v || 0));

  const temperatureSeries = maxTemp.length
    ? maxTemp.map((max, index) => Number(((max + (minTemp[index] ?? max)) / 2).toFixed(1)))
    : [20, 20.5, 19.8, 21.2, 20, 20.8, 21];

  // Si faltan series, se completan manteniendo la consistencia
  while (precipitation.length < labels.length) precipitation.unshift(0);
  while (temperatureSeries.length < labels.length) temperatureSeries.unshift(20);
  while (evapotranspiration.length < labels.length) evapotranspiration.unshift(3);

  // Localizamos el día de hoy dentro de la serie para las tarjetas de resumen
  const todayIso = new Date().toISOString().split("T")[0];
  let currentIdx = timeSlice.findIndex((t) => typeof t === "string" && t.startsWith(todayIso));
  if (currentIdx === -1) {
    // Si hoy no coincide exactamente, tomamos el día actual / inicial de la predicción (índice 0)
    currentIdx = 0;
  }

  const precipitationCurrent = precipitation[currentIdx] ?? precipitation[0] ?? 0;
  const temperatureCurrent = temperatureSeries[currentIdx] ?? temperatureSeries[0] ?? 0;
  const evapotranspirationCurrent = evapotranspiration[currentIdx] ?? evapotranspiration[0] ?? 0;
  const humidityCurrent = humidityValues[currentIdx] ?? (
    humidityValues.length
      ? humidityValues.reduce((sum, v) => sum + v, 0) / humidityValues.length
      : 65
  );

  const risk = getWaterRisk(precipitationCurrent, evapotranspirationCurrent);
  const updatedDateLabel = timeSlice[currentIdx] ? formatDateLabel(timeSlice[currentIdx]) : "Hoy";

  return {
    location,
    lastUpdated: updatedDateLabel,
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
      waterBalance: precipitation.map((v, i) =>
        Number((v - (evapotranspiration[i] ?? 0)).toFixed(1))
      ),
    },
  };
}

export async function searchLocationsByName(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  // 1. Intenta consulta directa a Open-Meteo Geocoding API
  try {
    const directUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=10&language=es&format=json`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        return normalizeLocations(data.results, trimmedQuery);
      }
    }
  } catch (directErr) {
    console.warn("Consulta directa a Open-Meteo Geocoding falló, intentando n8n...", directErr);
  }

  // 2. Respaldo vía n8n
  try {
    const response = await sendN8nAction({
      action: "search_locations",
      tipo: "clima",
      pregunta: `Busca ubicaciones agrícolas para "${trimmedQuery}". Devuelve una lista de ubicaciones con id, name, admin1, country, latitude, longitude, timezone.`,
      query: trimmedQuery,
    });

    return normalizeLocations(response, trimmedQuery);
  } catch (n8nErr) {
    console.error("Respaldo n8n también falló:", n8nErr);
    return normalizeLocations(null, trimmedQuery);
  }
}

export async function fetchLocationClimate(location) {
  // 1. Intenta consulta directa a Open-Meteo Forecast API
  try {
    const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,relative_humidity_2m_max&timezone=auto&past_days=7`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.daily) {
        return normalizeClimate(data, location);
      }
    }
  } catch (directErr) {
    console.warn("Consulta directa a Open-Meteo Forecast falló, intentando n8n...", directErr);
  }

  // 2. Respaldo vía n8n
  try {
    const response = await sendN8nAction({
      action: "climate_by_coordinates",
      tipo: "clima",
      pregunta: `Consulta climática para ${location.name ?? "la zona agrícola"} en ${location.admin1 ?? "Perú"} con coordenadas ${location.latitude}, ${location.longitude}. Devuelve el clima de los últimos 7 días con precipitación, temperatura y evapotranspiración.`,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      locationName: location.name,
      country: location.country,
      region: location.admin1,
    });

    return normalizeClimate(response, location);
  } catch (n8nErr) {
    console.error("Respaldo n8n de clima también falló:", n8nErr);
    return normalizeClimate(null, location);
  }
}
