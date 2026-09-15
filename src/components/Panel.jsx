export default function Panel({ titulo, icon: Icon, children }) {
  return (
    <div className="mb-5 rounded-panel bg-white p-5 shadow-panel">
      <div className="mb-2.5 mt-1 flex items-center gap-2 border-b-2 border-verde-borde pb-1.5 text-sm font-extrabold uppercase tracking-wide text-verde-fuerte">
        {Icon && <Icon className="h-4 w-4" strokeWidth={2.25} />}
        {titulo}
      </div>
      {children}
    </div>
  );
}
