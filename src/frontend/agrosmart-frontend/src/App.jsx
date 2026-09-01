import { useState } from "react";
import { QueryProvider } from "./context/QueryContext";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import NLQHome from "./components/chat/NLQHome";
import MonitoreoSatelital from "./components/monitoreo/MonitoreoSatelital";
import CalendarioAgricola from "./components/calendario/CalendarioAgricola";
import ComingSoon from "./components/shared/ComingSoon";

const VIEWS = {
  "nueva-consulta": NLQHome,
  "monitoreo-satelital": MonitoreoSatelital,
  "calendario-agricola": CalendarioAgricola,
};

export default function App() {
  const [view, setView] = useState("nueva-consulta");
  const CurrentView = VIEWS[view];

  return (
    <QueryProvider>
      <Sidebar activeView={view} onNavigate={setView} />
      <div className="pl-72">
        <Header />
        <main className="relative pt-20 min-h-screen bg-background">
          {CurrentView ? <CurrentView /> : <ComingSoon title="Mercados MIDAGRI" />}
        </main>
      </div>
    </QueryProvider>
  );
}