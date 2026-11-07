import { Component } from "react";

const MFE_CONFIG = {
  "nueva-consulta": {
    name: "chat",
    dir: "src/frontend/chat-microfrontend",
    port: "5174",
    envVar: "VITE_CHAT_REMOTE_URL",
    remoteUrl: import.meta.env.VITE_CHAT_REMOTE_URL,
  },
  "monitoreo-satelital": {
    name: "monitoreo satelital",
    dir: "src/frontend/monitoreo-microfrontend",
    port: "5175",
    envVar: "VITE_MONITOREO_REMOTE_URL",
    remoteUrl: import.meta.env.VITE_MONITOREO_REMOTE_URL,
  },
  "mercados-midagri": {
    name: "mercados MIDAGRI",
    dir: "src/frontend/mercados-microfrontend",
    port: "5176",
    envVar: "VITE_MERCADOS_REMOTE_URL",
    remoteUrl: import.meta.env.VITE_MERCADOS_REMOTE_URL,
  },
  "alertas-riesgo": {
    name: "alertas de riesgo",
    dir: "src/frontend/alertas-microfrontend",
    port: "5177",
    envVar: "VITE_ALERTAS_REMOTE_URL",
    remoteUrl: import.meta.env.VITE_ALERTAS_REMOTE_URL,
  },
  "calendario-agricola": {
    name: "calendario agrícola",
    dir: "src/frontend/calendario-microfrontend",
    port: "5178",
    envVar: "VITE_CALENDARIO_REMOTE_URL",
    remoteUrl: import.meta.env.VITE_CALENDARIO_REMOTE_URL,
  },
};

function resolveMfeMetadata(view, errStr) {
  if (view && MFE_CONFIG[view]) {
    return MFE_CONFIG[view];
  }
  if (errStr.includes("calendario") || errStr.includes("5178")) {
    return MFE_CONFIG["calendario-agricola"];
  }
  if (errStr.includes("alertas") || errStr.includes("5177")) {
    return MFE_CONFIG["alertas-riesgo"];
  }
  if (errStr.includes("monitoreo") || errStr.includes("5175")) {
    return MFE_CONFIG["monitoreo-satelital"];
  }
  if (errStr.includes("mercados") || errStr.includes("5176")) {
    return MFE_CONFIG["mercados-midagri"];
  }
  return MFE_CONFIG["nueva-consulta"];
}

export default class MicrofrontendErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error cargando el microfrontend:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errStr = String(this.state.error?.message || "");
      const mfe = resolveMfeMetadata(this.props.view, errStr);
      const isDev = Boolean(import.meta.env.DEV);
      const rawRemoteUrl = (mfe.remoteUrl || "").trim();
      const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(rawRemoteUrl);
      const hasProductionRemoteUrl = Boolean(rawRemoteUrl && !isLocalUrl);

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="bg-error-container/20 border border-error/30 text-error rounded-2xl p-6 max-w-lg shadow-sm">
            <h3 className="text-lg font-bold mb-2">Microfrontend no disponible</h3>
            {isDev ? (
              <>
                <p className="text-sm text-on-surface-variant mb-4">
                  No se pudo cargar el microfrontend de {mfe.name} desde{" "}
                  <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-xs">
                    {rawRemoteUrl || `http://localhost:${mfe.port}`}
                  </code>.
                </p>
                <div className="text-left text-xs bg-surface-container-lowest p-3 rounded-lg border border-outline-variant font-mono space-y-1">
                  <p className="font-semibold text-on-surface">
                    Para solucionarlo, abre otra terminal y ejecuta:
                  </p>
                  <p className="text-primary">cd {mfe.dir}</p>
                  <p className="text-primary">npm run build</p>
                  <p className="text-primary">npm run preview</p>
                </div>
              </>
            ) : hasProductionRemoteUrl ? (
              <>
                <p className="text-sm text-on-surface-variant mb-4">
                  No se pudo cargar el microfrontend de {mfe.name} desde{" "}
                  <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-xs break-all">
                    {rawRemoteUrl}
                  </code>.
                </p>
                <div className="text-left text-xs bg-surface-container-lowest p-3 rounded-lg border border-outline-variant space-y-1 text-on-surface-variant">
                  <p className="font-semibold text-on-surface">Posibles causas:</p>
                  <p>• El servicio remoto del microfrontend se encuentra temporalmente inactivo o en despliegue.</p>
                  <p>• La URL configurada en <code className="font-mono">{mfe.envVar}</code> no es accesible públicamente.</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant mb-4">
                  No se pudo cargar el microfrontend de {mfe.name} porque su URL remota de producción no está configurada.
                </p>
                <div className="text-left text-xs bg-surface-container-lowest p-3 rounded-lg border border-outline-variant space-y-1 text-on-surface-variant">
                  <p className="font-semibold text-on-surface">Configuración pendiente en despliegue:</p>
                  <p>
                    Define la variable de entorno{" "}
                    <code className="font-mono text-primary">{mfe.envVar}</code> con la URL pública de{" "}
                    <code className="font-mono">/assets/remoteEntry.js</code> del microfrontend y vuelve a desplegar la aplicación principal.
                  </p>
                </div>
              </>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-5 px-4 py-2 bg-primary text-on-primary font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
