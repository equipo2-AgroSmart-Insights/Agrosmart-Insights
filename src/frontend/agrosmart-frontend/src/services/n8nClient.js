const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000;

function getSessionId() {
  const key = "agrosmart_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export async function sendNLQQuery(query) {
  return sendN8nAction({ pregunta: query });
}

export async function sendN8nAction(payload = {}) {
  if (!WEBHOOK_URL) {
    throw new Error("VITE_N8N_WEBHOOK_URL no está configurada. Copia .env.example a .env");
  }

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
      throw new Error(`La consulta tardó más de ${Math.round(TIMEOUT_MS / 1000)} segundos. Intenta de nuevo.`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}