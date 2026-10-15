import { useQueryContext } from "../../context/QueryContext";
import ErrorState from "./ErrorState";
import PriceChart from "./PriceChart";
import LoadingSkeleton from "./LoadingSkeleton";

function extractAnswer(result) {
  if (typeof result === "string") return result;
  return (
    result?.respuesta ||
    result?.response ||
    result?.text ||
    result?.message ||
    result?.content ||
    ""
  );
}

export default function DashboardContainer() {
  const { status, result, error, query } = useQueryContext();

  if (status === "loading") {
    return (
      <div className="w-full max-w-5xl mb-12 animate-in fade-in duration-300">
        <LoadingSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full max-w-5xl mb-10">
        <ErrorState message={error} />
      </div>
    );
  }

  if (status !== "success" || !result) {
    return null;
  }

  const answer = extractAnswer(result);

  return (
    <div className="w-full max-w-5xl space-y-6 mb-12 text-left animate-in fade-in duration-300">
      {/* Tarjeta de Respuesta del Asistente AgroSmart / n8n */}
      {answer && (
        <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-forest-green text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-headline-sm text-headline-sm text-forest-green tracking-tight">
                  Respuesta de AgroSmart
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-forest-green">check_circle</span>
                  Análisis completado
                </span>
              </div>
              <div className="font-body-md text-base text-on-surface leading-relaxed whitespace-pre-line space-y-3">
                {answer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualizador interactivo de gráficos con Chart.js suscrito a n8n */}
      <PriceChart result={result} query={query} />
    </div>
  );
}
