const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default function CalendarioAgricola() {
  return (
    <div className="px-margin-desktop py-12 max-w-6xl mx-auto">
      <h1 className="font-headline-lg text-headline-lg text-forest-green mb-2">
        Calendario Agrícola
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-10">
        Ventanas óptimas de siembra y cosecha por mes, una vez definidos los
        datos con el equipo.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {MESES.map((mes) => (
          <div
            key={mes}
            className="bg-surface-container-lowest rounded-xl border border-dashed border-earth-brown/20 p-5 h-36 flex flex-col justify-between"
          >
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {mes}
            </span>
            <span className="font-label-md text-label-md text-outline">
              Sin datos aún
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}