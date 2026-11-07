import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

// Normaliza la URL de un remoto de Module Federation:
// - Si se proporciona una URL base sin '/assets/remoteEntry.js', lo añade automáticamente.
// - En compilación de producción (mode === 'production'), nunca utiliza 'localhost' como destino.
function resolveRemoteUrl(rawUrl, mfeName, devPort, isProduction) {
  const trimmed = (rawUrl || '').trim()
  if (trimmed) {
    if (isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)) {
      console.warn(
        `[federation] Aviso: El remoto '${mfeName}' tiene una URL local (${trimmed}) en modo producción. Usando ruta relativa '/remotes/${mfeName}/assets/remoteEntry.js'.`
      )
      return `/remotes/${mfeName}/assets/remoteEntry.js`
    }
    return trimmed.endsWith('.js')
      ? trimmed
      : `${trimmed.replace(/\/+$/, '')}/assets/remoteEntry.js`
  }

  if (isProduction) {
    console.warn(
      `[federation] Aviso: Variable de entorno para el remoto '${mfeName}' no definida en producción. Usando '/remotes/${mfeName}/assets/remoteEntry.js'.`
    )
    return `/remotes/${mfeName}/assets/remoteEntry.js`
  }

  return `http://localhost:${devPort}/assets/remoteEntry.js`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production' && env.VITE_ALLOW_LOCALHOST_REMOTES !== 'true'

  const chatRemoteUrl = resolveRemoteUrl(env.VITE_CHAT_REMOTE_URL, 'chat', 5174, isProduction)
  const monitoreoRemoteUrl = resolveRemoteUrl(env.VITE_MONITOREO_REMOTE_URL, 'monitoreo', 5175, isProduction)
  const mercadosRemoteUrl = resolveRemoteUrl(env.VITE_MERCADOS_REMOTE_URL, 'mercados', 5176, isProduction)
  const alertasRemoteUrl = resolveRemoteUrl(env.VITE_ALERTAS_REMOTE_URL, 'alertas', 5177, isProduction)
  const calendarioRemoteUrl = resolveRemoteUrl(env.VITE_CALENDARIO_REMOTE_URL, 'calendario', 5178, isProduction)

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'shell',
        remotes: {
          chat: chatRemoteUrl,
          monitoreo: monitoreoRemoteUrl,
          mercados: mercadosRemoteUrl,
          alertas: alertasRemoteUrl,
          calendario: calendarioRemoteUrl,
        },
        shared: ['react', 'react-dom'],
      }),
    ],
    build: {
      // esnext para compatibilidad con top-level await de Module Federation
      target: 'esnext',
    },
  }
})
