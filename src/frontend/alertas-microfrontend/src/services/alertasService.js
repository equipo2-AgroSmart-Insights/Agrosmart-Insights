const WEBHOOK_URL = import.meta.env.VITE_ALERTS_WEBHOOK_URL;
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000;
const SESSION_KEY = "agrosmart_alert_session_id";

export function getAlertSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    if (!globalThis.crypto?.randomUUID) {
      throw new Error("Este navegador no permite crear un identificador de sesión seguro.");
    }
    sessionId = globalThis.crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

async function sendAction(action, values = {}) {
  if (!WEBHOOK_URL) {
    throw new Error("Configura VITE_ALERTS_WEBHOOK_URL para habilitar la API de alertas.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        session_id: getAlertSessionId(),
        ...values,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`La API de alertas respondió con estado ${response.status}.`);
    }

    const body = await response.json();
    const result = Array.isArray(body)
      ? body[0]?.result ?? body[0]
      : body?.result ?? body;
    if (typeof result === "string") {
      return JSON.parse(result);
    }
    if (!result || typeof result !== "object") {
      throw new Error("La API de alertas devolvió una respuesta vacía o inválida.");
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`La consulta tardó más de ${Math.round(TIMEOUT_MS / 1000)} segundos.`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchAlerts() {
  const result = await sendAction("list");
  if (!Array.isArray(result.alerts)) {
    throw new Error("La API de alertas no devolvió la lista esperada.");
  }
  return result;
}

export async function fetchAlertDetails(alertId) {
  const result = await sendAction("details", { alert_id: alertId });
  if (!result.alert) {
    throw new Error("La API no encontró el detalle de esta alerta.");
  }
  return result.alert;
}

export async function updateAlertStatus(alertId, status) {
  const result = await sendAction("update", {
    alert_id: alertId,
    status,
  });
  if (!result.alert) {
    throw new Error("La API no confirmó el cambio de estado.");
  }
  return result.alert;
}
