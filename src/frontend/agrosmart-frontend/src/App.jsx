import { useState, Suspense, lazy } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import MonitoreoSatelital from "./components/monitoreo/MonitoreoSatelital";
import CalendarioAgricola from "./components/calendario/CalendarioAgricola";
import ComingSoon from "./components/shared/ComingSoon";
import MicrofrontendErrorBoundary from "./components/shared/MicrofrontendErrorBoundary";

// Carga el microfrontend de chat vía Module Federation.
// El remote "chat" está configurado en vite.config.js y corre en :5174.
const ChatApp = lazy(() => import("chat/ChatApp"));

const VIEWS = {
  "nueva-consulta": ChatApp,
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
                Cargando chat…
              </div>
            }>
              {CurrentView ? <CurrentView /> : <ComingSoon title="Mercados MIDAGRI" />}
            </Suspense>
          </MicrofrontendErrorBoundary>
        </main>
      </div>
    </>
  );
}
