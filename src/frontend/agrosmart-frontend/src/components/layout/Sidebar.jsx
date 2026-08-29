const NAV_ITEMS = [
  { key: "nueva-consulta", label: "Nueva Consulta", icon: "add_circle", active: true },
  { key: "historial", label: "Historial", icon: "history", active: false },
  { key: "mercados-midagri", label: "Mercados MIDAGRI", icon: "monitoring", active: false },
  { key: "clima", label: "Clima", icon: "wb_sunny", active: false },
  { key: "calendario-agricola", label: "Planificación", icon: "calendar_month", active: false },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low border-r border-earth-brown/10 flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <span className="font-headline-sm text-headline-sm text-forest-green">
          AgroSmart
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href="#"
            aria-current={item.active ? "page" : undefined}
            className={
              item.active
                ? "flex items-center gap-4 px-4 py-3.5 rounded-full transition-all bg-primary-fixed text-on-primary-fixed font-bold shadow-sm"
                : "flex items-center gap-4 px-4 py-3.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md text-label-md">{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}