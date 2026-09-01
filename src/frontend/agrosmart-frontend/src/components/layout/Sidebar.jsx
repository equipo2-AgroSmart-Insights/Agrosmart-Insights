const NAV_ITEMS = [
  { key: "nueva-consulta", label: "Nueva Consulta", icon: "add_circle" },
  { key: "mercados-midagri", label: "Mercados MIDAGRI", icon: "monitoring" },
  { key: "monitoreo-satelital", label: "Monitoreo Satelital", icon: "satellite_alt" },
  { key: "calendario-agricola", label: "Calendario Agrícola", icon: "calendar_month" },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low border-r border-earth-brown/10 flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <span className="font-headline-sm text-headline-sm text-forest-green">
          AgroSmart
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "flex items-center gap-4 px-4 py-3.5 rounded-full transition-all bg-primary-fixed text-on-primary-fixed font-bold shadow-sm text-left"
                  : "flex items-center gap-4 px-4 py-3.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all text-left"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}