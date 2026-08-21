import { useQueryContext } from "../../context/QueryContext";

export default function LoadingIndicator() {
  const { status } = useQueryContext();
  if (status !== "loading") return null;
  return <p>Analizando tu consulta…</p>;
}