const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const TIMEOUT_MS = 6000;

export async function sendNLQQuery(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pregunta: query,
        session_id: "sesion-prueba",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`n8n respondió con estado ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("La consulta tardó más de 5 segundos. Intenta de nuevo.");
    }
    throw error;
  }
}