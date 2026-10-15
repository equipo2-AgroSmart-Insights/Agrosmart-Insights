import { useState, Suspense, lazy } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import CalendarioAgricola from "./components/calendario/CalendarioAgricola";
import ComingSoon from "./components/shared/ComingSoon";
import MicrofrontendErrorBoundary from "./components/shared/MicrofrontendErrorBoundary";

// Carga de microfrontends remotos vía Module Federation
const ChatApp = lazy(() => import("chat/ChatApp"));
const MonitoreoSatelital = lazy(() => import("monitoreo/MonitoreoSatelital"));
const MercadosMIDAGRI = lazy(() => import("mercados/MercadosMIDAGRI"));

const VIEWS = {
  "nueva-consulta": ChatApp,
  "mercados-midagri": MercadosMIDAGRI,
  "monitoreo-satelital": MonitoreoSatelital,
  "calendario-agricola": CalendarioAgricola,
};

export default function App() {
  const [view, setView] = useState("nueva-consulta");
  const CurrentView = VIEWS[view];

  return (
    <>
      <Sidebar activeView={view} onNavigate={setView} />
      <div className="pl-72">
        <Header />
        <main className="relative pt-20 min-h-screen bg-background">
          <MicrofrontendErrorBoundary key={view}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-[calc(100vh-80px)] text-on-surface-variant font-label-md text-label-md">
                Cargando módulo…
              </div>
            }>
              {CurrentView ? <CurrentView /> : <ComingSoon title="Sección no disponible" />}
            </Suspense>
          </MicrofrontendErrorBoundary>
        </main>
      </div>
    </>
  );
}
