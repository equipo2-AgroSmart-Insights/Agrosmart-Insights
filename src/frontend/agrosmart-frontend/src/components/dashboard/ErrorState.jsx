export default function ErrorState({ message }) {
  return (
    <div className="w-full max-w-3xl bg-error-container text-on-error-container rounded-xl p-6 mb-10 text-left">
      <p className="font-label-md text-label-md">No se pudo procesar la consulta.</p>
      <p className="font-body-md text-body-md mt-1">{message}</p>
    </div>
  );
}