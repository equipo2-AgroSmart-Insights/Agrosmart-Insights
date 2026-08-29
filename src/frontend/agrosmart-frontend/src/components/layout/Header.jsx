export default function Header() {
  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-surface/80 backdrop-blur-xl z-40 px-margin-desktop flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <div className="flex items-center bg-surface-container rounded-full px-4 py-2 w-96 border border-earth-brown/5 focus-within:ring-2 focus-within:ring-wheat-gold transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2">
          search
        </span>
        <input
          className="bg-transparent border-none outline-none text-body-md text-on-surface w-full"
          placeholder="Buscar en AgroSmart..."
          type="text"
        />
      </div>

      <button className="relative p-2 text-on-surface-variant hover:text-forest-green transition-colors">
        <span className="material-symbols-outlined">notifications</span>
      </button>
    </header>
  );
}