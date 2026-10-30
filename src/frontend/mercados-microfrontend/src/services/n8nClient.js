const DEFAULT_WEBHOOK = "https://agrosmart-n8n.onrender.com/webhook/v1/query";

const WEBHOOK_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_N8N_WEBHOOK_URL) ||
  (typeof process !== "undefined" ? process.env?.VITE_N8N_WEBHOOK_URL : "") ||
  DEFAULT_WEBHOOK;

const TIMEOUT_MS = Number(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TIMEOUT_MS) ||
  (typeof process !== "undefined" ? process.env?.VITE_API_TIMEOUT_MS : 40000) ||
  40000
);

function getSessionId() {
  const key = "agrosmart_session_id";
  if (typeof sessionStorage === "undefined") {
    return "session-default";
  }
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "session-" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export async function sendN8nAction(payload = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        ...payload,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`n8n respondió con estado ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `La consulta a n8n tardó más de ${Math.round(TIMEOUT_MS / 1000)} segundos. El servidor puede estar iniciando; reintenta en breve.`,
        { cause: error }
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
