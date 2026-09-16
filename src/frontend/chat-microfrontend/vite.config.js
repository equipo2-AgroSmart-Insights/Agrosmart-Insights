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
      name: 'chat',
      filename: 'remoteEntry.js',
      exposes: {
        // Componente raíz expuesto al shell
        './ChatApp': './src/ChatApp.jsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    // esnext elimina los warnings de top-level await de Module Federation
    target: 'esnext',
    minify: false,
  },
})
