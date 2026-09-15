import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ESTILOS = {
  exito: { icon: CheckCircle2, bg: 'bg-[#1f7a3d]', ring: 'ring-[#1f7a3d]/15' },
  error: { icon: AlertTriangle, bg: 'bg-[#c0392b]', ring: 'ring-[#c0392b]/15' },
  info: { icon: Info, bg: 'bg-navy', ring: 'ring-navy/15' }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const quitar = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const mostrar = useCallback((tipo, texto, duracion = 3500) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, tipo, texto }]);
    if (duracion) setTimeout(() => quitar(id), duracion);
    return id;
  }, [quitar]);

  const api = {
    exito: (texto) => mostrar('exito', texto),
    error: (texto) => mostrar('error', texto, 5000),
    info: (texto) => mostrar('info', texto)
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:top-5">
        {toasts.map((t) => {
          const cfg = ESTILOS[t.tipo] || ESTILOS.info;
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl ${cfg.bg} px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-4 ${cfg.ring} animate-toast-in`}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-none" strokeWidth={2.25} />
              <p className="flex-1 text-sm font-semibold leading-snug">{t.texto}</p>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => quitar(t.id)}
                className="-m-1 flex-none rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
