export default function ErrorState({ message }) {
  return (
    <div style={{ color: "#b00020" }}>
      <p>No se pudo procesar la consulta.</p>
      <p>{message}</p>
    </div>
  );
}