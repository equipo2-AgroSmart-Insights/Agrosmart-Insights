const SUGGESTIONS = [
  {
    icon: "insights",
    iconBg: "bg-primary-fixed",
    iconColor: "text-on-primary-fixed",
    title: "Gráficos de Mercado",
    text: "Dame un gráfico con los precios de la papa blanca de esta semana",
  },
  {
    icon: "trending_up",
    iconBg: "bg-wheat-gold/30",
    iconColor: "text-forest-green",
    title: "Tendencias de Limón Sutil",
    text: "Ver gráfico de precios y dispersión de limón sutil en Piura",
  },
  {
    icon: "local_shipping",
    iconBg: "bg-secondary-fixed",
    iconColor: "text-on-secondary-fixed",
    title: "Márgenes en Origen",
    text: "Comparar precio en chacra vs mercado mayorista de cebolla roja en Arequipa",
  },
];

export default function SuggestedQueries({ onSelect }) {
  return (
    <div className="w-full max-w-5xl flex flex-col items-center">
      <div className="flex items-center gap-3 mb-8 w-full">
        <div className="h-px bg-earth-brown/10 flex-1" />
        <span className="font-label-md text-label-md text-outline tracking-widest uppercase">
          Consultas Sugeridas
        </span>
        <div className="h-px bg-earth-brown/10 flex-1" />
      </div>

      <div
        className="grid gap-6 w-full"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {SUGGESTIONS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onSelect(item.text)}
            className="bg-surface-container-lowest p-6 rounded-xl text-left group hover:bg-surface-container-low transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full transform hover:-translate-y-1"
          >
            <div
              className={`w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center mb-4 ${item.iconColor} group-hover:scale-110 transition-transform duration-300`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 leading-tight">
              {item.title}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant flex-1">
              {item.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
