import { useQueryContext } from "../../context/QueryContext";
import ErrorState from "./ErrorState";

export default function DashboardContainer() {
  const { status, result, error } = useQueryContext();

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  if (status !== "success" || !result) {
    return null;
  }

  return (
    <div>
      <h3>Respuesta</h3>

      <p style={{ whiteSpace: "pre-line" }}>
        {result.text}
      </p>
    </div>
  );
}