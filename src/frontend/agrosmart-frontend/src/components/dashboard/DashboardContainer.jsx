import { useQueryContext } from "../../context/QueryContext";
import ErrorState from "./ErrorState";
import PriceChart from "./PriceChart";

function extractAnswer(result) {
  return result?.respuesta || result?.response || result?.text || "";
}

function extractChart(result) {
  return result?.grafico || result?.trend_data || result?.chart || null;
}

export default function DashboardContainer() {
  const { status, result, error } = useQueryContext();

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  if (status !== "success" || !result) {
    return null;
  }

  const answer = extractAnswer(result);
  const chart = extractChart(result);

  return (
    <div className="w-full max-w-3xl bg-surface-container-lowest rounded-xl shadow-sm p-6 mb-10 text-left">
      {answer && (
        <section>
          <h3 className="font-headline-sm text-headline-sm text-forest-green mb-2">
            Respuesta
          </h3>
          <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
            {answer}
          </p>
        </section>
      )}
      {chart?.labels?.length > 0 && (
        <section className="mt-6">
          <h3 className="font-headline-sm text-headline-sm text-forest-green mb-2">
            Tendencia
          </h3>
          <PriceChart data={chart} />
        </section>
      )}
    </div>
  );
}