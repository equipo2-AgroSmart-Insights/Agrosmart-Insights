import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CalendarioAgricola from "./components/calendario/CalendarioAgricola";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CalendarioAgricola />
  </StrictMode>,
);
