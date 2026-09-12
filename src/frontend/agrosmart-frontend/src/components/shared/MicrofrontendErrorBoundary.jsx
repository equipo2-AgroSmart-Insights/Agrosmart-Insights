import { Component } from "react";

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
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="bg-error-container/20 border border-error/30 text-error rounded-2xl p-6 max-w-lg shadow-sm">
            <h3 className="text-lg font-bold mb-2">Microfrontend no disponible</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              No se pudo cargar el microfrontend de chat desde <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-xs">http://localhost:5174</code>.
            </p>
            <div className="text-left text-xs bg-surface-container-lowest p-3 rounded-lg border border-outline-variant font-mono space-y-1">
              <p className="font-semibold text-on-surface">Para solucionarlo, abre otra terminal y ejecuta:</p>
              <p className="text-primary">cd src/frontend/chat-microfrontend</p>
              <p className="text-primary">npm run build</p>
              <p className="text-primary">npm run preview</p>
            </div>
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
