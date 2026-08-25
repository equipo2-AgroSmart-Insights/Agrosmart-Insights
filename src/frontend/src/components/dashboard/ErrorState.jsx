export default function ErrorState({ message }) {
  return (
    <div className="error-state" role="alert">
      <strong>No se pudo completar la consulta.</strong>
      <p>{message}</p>
    </div>
  );
}
