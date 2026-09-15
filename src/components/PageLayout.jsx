import NavBar from './NavBar.jsx';

export default function PageLayout({ title, subtitle, action, children }) {
  return (
    <>
      <NavBar />
      <div className="mx-auto max-w-[1100px] px-[18px] pb-[60px] pt-6">
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
