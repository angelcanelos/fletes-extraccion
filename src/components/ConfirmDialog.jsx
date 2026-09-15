import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((opciones) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogo({
        titulo: opciones.titulo || '¿Confirmar acción?',
        texto: opciones.texto || '',
        textoConfirmar: opciones.textoConfirmar || 'Confirmar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        peligro: opciones.peligro !== false
      });
    });
  }, []);

  function cerrar(resultado) {
    setDialogo(null);
    if (resolverRef.current) {
      resolverRef.current(resultado);
      resolverRef.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {dialogo && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0e2841]/45 p-4 animate-overlay-in"
          onClick={() => cerrar(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-titulo"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-modal-in"
          >
            <div className="flex items-start gap-3.5">
              <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${dialogo.peligro ? 'bg-[#fbe4e1]' : 'bg-verde-suave'}`}>
                <TriangleAlert className={`h-6 w-6 ${dialogo.peligro ? 'text-[#c0392b]' : 'text-verde-fuerte'}`} strokeWidth={2.25} />
              </div>
              <div className="flex-1 pt-1">
                <h2 id="confirm-titulo" className="m-0 text-[16px] font-bold text-[#1c2b1a]">{dialogo.titulo}</h2>
                {dialogo.texto && <p className="mt-1.5 text-sm leading-relaxed text-[#6b7a68]">{dialogo.texto}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => cerrar(false)}
                className="rounded-full bg-[#eef1ec] px-5 py-2.5 text-sm font-bold text-[#33402f] transition-colors hover:bg-[#e1e6dc]"
              >
                {dialogo.textoCancelar}
              </button>
              <button
                type="button"
                onClick={() => cerrar(true)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors ${
                  dialogo.peligro ? 'bg-[#c0392b] hover:bg-[#a3291d]' : 'bg-verde hover:bg-verde-fuerte'
                }`}
              >
                {dialogo.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
