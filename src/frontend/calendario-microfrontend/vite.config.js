import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "calendario",
      filename: "remoteEntry.js",
      exposes: {
        "./CalendarioAgricola": "./src/components/calendario/CalendarioAgricola.jsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  server: {
    port: 5178,
    cors: true,
  },
  preview: {
    port: 5178,
    cors: true,
  },
  build: {
    target: "esnext",
    minify: false,
  },
});
