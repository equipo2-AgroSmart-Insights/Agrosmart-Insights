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
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      sessionId =
        "session-" +
        Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      sessionId = "session-default";
    }
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
