/**
 * Skeleton de carga fluido y accesible para el panel analítico.
 * Ofrece transiciones suaves y reduce el Cumulative Layout Shift (CLS).
 */
export default function LoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando análisis de mercado interactivo"
      className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 animate-pulse transition-all"
    >
      {/* Encabezado Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-outline-variant/20 gap-4">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-surface-container-high rounded-md" />
          <div className="h-4 w-80 bg-surface-container rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-surface-container-high rounded-full" />
          <div className="h-7 w-20 bg-surface-container rounded-full" />
        </div>
      </div>

      {/* Barra de Filtros Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 my-5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
        <div className="md:col-span-3 space-y-1.5">
          <div className="h-3 w-24 bg-surface-container-high rounded" />
          <div className="h-9 w-full bg-surface-container rounded-lg" />
        </div>
        <div className="md:col-span-3 space-y-1.5">
          <div className="h-3 w-28 bg-surface-container-high rounded" />
          <div className="h-9 w-full bg-surface-container rounded-lg" />
        </div>
        <div className="md:col-span-3 space-y-1.5">
          <div className="h-3 w-28 bg-surface-container-high rounded" />
          <div className="h-9 w-full bg-surface-container rounded-lg" />
        </div>
        <div className="md:col-span-3 space-y-1.5">
          <div className="h-3 w-24 bg-surface-container-high rounded" />
          <div className="h-9 w-full bg-surface-container rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/20 space-y-2"
          >
            <div className="h-3 w-20 bg-surface-container-high rounded" />
            <div className="h-7 w-24 bg-surface-container rounded-md" />
            <div className="h-3 w-16 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>

      {/* Canvas Skeleton con líneas de guía */}
      <div className="relative w-full h-[360px] bg-surface-container-low/40 rounded-xl p-4 border border-outline-variant/20 flex flex-col justify-between overflow-hidden">
        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
          <div className="h-4 w-32 bg-surface-container rounded" />
          <div className="flex gap-2">
            <div className="h-3 w-16 bg-surface-container rounded" />
            <div className="h-3 w-16 bg-surface-container rounded" />
          </div>
        </div>

        {/* Faux Chart Bar Grid */}
        <div className="flex items-end justify-around h-56 gap-2 px-4 opacity-50">
          {[40, 65, 55, 80, 70, 90, 60, 75].map((height, idx) => (
            <div
              key={idx}
              className="w-8 bg-surface-container-high rounded-t-md transition-all"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between pt-2 border-t border-outline-variant/10">
          <div className="h-3 w-12 bg-surface-container rounded" />
          <div className="h-3 w-12 bg-surface-container rounded" />
          <div className="h-3 w-12 bg-surface-container rounded" />
          <div className="h-3 w-12 bg-surface-container rounded" />
        </div>
      </div>

      {/* Insight Skeleton */}
      <div className="mt-4 p-4 rounded-xl bg-surface-container-low border-l-4 border-surface-container-high flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-surface-container-high shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-40 bg-surface-container-high rounded" />
          <div className="h-3 w-full bg-surface-container rounded" />
        </div>
      </div>

      <span className="sr-only">Cargando datos analíticos de n8n...</span>
    </div>
  );
}
