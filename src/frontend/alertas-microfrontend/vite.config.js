import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "alertas",
      filename: "remoteEntry.js",
      exposes: {
        "./AlertasRiesgo": "./src/components/alertas/AlertasRiesgo.jsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  server: {
    port: 5177,
    cors: true,
  },
  preview: {
    port: 5177,
    cors: true,
  },
  build: {
    target: "esnext",
    minify: false,
  },
});
