import { useQueryContext } from "../../context/QueryContext";

export default function LoadingIndicator() {
  const { status } = useQueryContext();
  if (status !== "loading") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-semibold text-forest-green mb-6 shadow-xs"
    >
      <span className="w-2 h-2 rounded-full bg-forest-green animate-ping" />
      Cargando consulta...
    </div>
  );
}
