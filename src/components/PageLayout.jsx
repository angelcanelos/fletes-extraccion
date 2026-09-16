import NavBar from './NavBar.jsx';

export default function PageLayout({ title, subtitle, action, children, ancho }) {
  // Algunas pantallas (el formulario de Fletes, con una vista previa ancha
  // de 19cm) necesitan todo el ancho de la ventana en vez del máximo de
  // 1100px de siempre, para que la vista previa no quede cortada.
  const anchoClase = ancho === 'completo' ? 'max-w-none' : 'max-w-[1100px]';
  return (
    <>
      <NavBar />
      <div className={`mx-auto ${anchoClase} px-[18px] pb-[60px] pt-6`}>
        {(title || action) && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              {title && <h1 className="m-0 text-[22px] text-verde-fuerte">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-[#6b7a68]">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
      <footer className="p-5 text-center text-[12.5px] text-[#6b7a68]">
        Forestal Tezains — Formato oficial 2026
      </footer>
    </>
  );
}
