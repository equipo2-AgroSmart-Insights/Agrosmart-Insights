import { useQueryContext } from "../../context/QueryContext";

export default function LoadingIndicator() {
  const { status } = useQueryContext();
  if (status !== "loading") return null;
  return (
    <p className="font-label-md text-label-md text-on-surface-variant mb-6">
      Analizando tu consulta…
    </p>
  );
}