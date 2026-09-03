export default function ChatInput({ value, onChange, onSubmit }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit();
  }

  return (
    <div className="w-full max-w-3xl relative mb-16 z-10">
      <div className="relative bg-surface-container-lowest rounded-full shadow-[0_4px_24px_rgba(125,90,80,0.08)] flex items-center p-2 transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(125,90,80,0.12)] focus-within:ring-2 focus-within:ring-wheat-gold">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center ml-2 shrink-0 text-forest-green">
          <span className="material-symbols-outlined text-[28px]">smart_toy</span>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center flex-1">
          <input
            className="w-full bg-transparent border-none outline-none font-body-lg text-body-lg text-on-surface px-6 placeholder:text-outline/60 h-16"
            placeholder="Ej. ¿Debo vender mi cosecha de papa hoy o esperar?"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="submit"
            className="h-14 px-8 rounded-full bg-forest-green text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-2 shrink-0 mr-1 shadow-sm"
          >
            <span>Consultar</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </form>
      </div>
    </div>
  );
}