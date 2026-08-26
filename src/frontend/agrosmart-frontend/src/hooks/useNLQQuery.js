import { sendNLQQuery } from "../services/n8nClient";
import { useQueryContext } from "../context/QueryContext";

export function useNLQQuery() {
  const { setStatus, setResult, setError } = useQueryContext();

  async function runQuery(query) {
    setStatus("loading");
    setError(null);
    try {
      const data = await sendNLQQuery(query);
      console.log("Respuesta de n8n:", data);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return { runQuery };
}