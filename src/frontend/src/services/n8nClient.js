const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;
const TIMEOUT_MS = 5000;

export async function postNLQQuery(query, sessionId = crypto.randomUUID()) {
  if (!WEBHOOK_URL) {
    throw new Error('VITE_WEBHOOK_URL no está configurada. Copia .env.example a .env');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: sessionId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Webhook respondió ${response.status}`);
    }

    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado (5s). Verifica que n8n esté activo.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
