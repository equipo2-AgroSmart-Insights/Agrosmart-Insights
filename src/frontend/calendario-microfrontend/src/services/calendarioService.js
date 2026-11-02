const API_URL = import.meta.env.VITE_CALENDARIO_API_URL;

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthDateRange(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  return {
    desde: toISODate(new Date(year, monthIndex, 1)),
    hasta: toISODate(new Date(year, monthIndex + 1, 0)),
  };
}

export async function fetchCalendarEvents({ month, filters, signal }) {
  if (!API_URL) {
    throw new Error("Configura VITE_CALENDARIO_API_URL para consultar el calendario MIDAGRI.");
  }

  const monthRange = getMonthDateRange(month);
  const desde = filters.desde && filters.desde > monthRange.desde
    ? filters.desde
    : monthRange.desde;
  const hasta = filters.hasta && filters.hasta < monthRange.hasta
    ? filters.hasta
    : monthRange.hasta;

  if (desde > hasta) {
    return { total: 0, eventos: [] };
  }

  const url = new URL(API_URL);
  url.searchParams.set("desde", desde);
  url.searchParams.set("hasta", hasta);

  for (const [filter, parameter] of [
    ["departamento", "departamento"],
    ["modalidad", "modalidad"],
    ["entidad", "entidad"],
    ["q", "q"],
  ]) {
    const value = filters[filter]?.trim();
    if (value) url.searchParams.set(parameter, value);
  }

  const response = await fetch(url, { method: "GET", signal });
  if (!response.ok) {
    throw new Error(`El servicio del calendario respondió con estado ${response.status}.`);
  }

  const result = await response.json();
  if (!result || !Array.isArray(result.eventos)) {
    throw new Error("La respuesta del calendario no contiene una lista válida de eventos.");
  }
  if (!Number.isFinite(Number(result.total)) || Number(result.total) < 0) {
    throw new Error("La respuesta del calendario no contiene un total válido.");
  }
  if (result.eventos.some((event) => !event || typeof event !== "object" || Array.isArray(event))) {
    throw new Error("La respuesta del calendario contiene un evento inválido.");
  }

  return {
    total: Number(result.total),
    eventos: result.eventos,
  };
}
