import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: 'mercados',
      filename: 'remoteEntry.js',
      exposes: {
        // Componente principal expuesto al shell
        './MercadosMIDAGRI': './src/components/mercados/MercadosMIDAGRI.jsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
  },
})
