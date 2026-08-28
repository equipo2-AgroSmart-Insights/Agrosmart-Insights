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
    <div className="dashboard">
      {answer && (
        <section>
          <h3>Respuesta</h3>
          <p style={{ whiteSpace: "pre-line" }}>{answer}</p>
        </section>
      )}
      {chart?.labels?.length > 0 && (
        <section>
          <h3>Tendencia</h3>
          <PriceChart data={chart} />
        </section>
      )}
    </div>
  );
}
