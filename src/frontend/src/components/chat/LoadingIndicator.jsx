export default function LoadingIndicator() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading__spinner" />
      Procesando consulta con n8n…
    </div>
  );
}
