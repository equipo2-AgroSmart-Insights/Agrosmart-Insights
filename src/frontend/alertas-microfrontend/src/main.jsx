import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AlertasRiesgo from "./components/alertas/AlertasRiesgo";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <main className="min-h-screen bg-background p-4">
      <AlertasRiesgo />
    </main>
  </StrictMode>,
);
