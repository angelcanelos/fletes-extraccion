import { NavLink } from 'react-router-dom';
import { House, FilePlus2, Settings } from 'lucide-react';

const linkClass = ({ isActive }) =>
  `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
    isActive ? 'bg-white/20 opacity-100' : 'opacity-90 hover:bg-white/10'
  }`;

export default function NavBar() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-verde-fuerte to-verde px-5 py-3.5 text-white shadow-panel">
      <div className="flex items-center gap-3 text-lg font-bold">
        <img
          src="/images/logo.png"
          alt="logo"
          className="h-10 w-10 rounded-full bg-white object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span>Extracción de Trocería</span>
      </div>
      <nav className="flex flex-wrap gap-1.5">
        <NavLink to="/" end className={linkClass}>
          <House className="h-4 w-4" strokeWidth={2.25} /> Inicio
        </NavLink>
        <NavLink to="/formato/nuevo" className={linkClass}>
          <FilePlus2 className="h-4 w-4" strokeWidth={2.25} /> Nuevo formato
        </NavLink>
        <NavLink to="/ajustes" className={linkClass}>
          <Settings className="h-4 w-4" strokeWidth={2.25} /> Ajustes
        </NavLink>
      </nav>
    </div>
  );
}
