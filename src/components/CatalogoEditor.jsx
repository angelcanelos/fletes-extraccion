import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Api } from '../lib/api.js';
import Panel from './Panel.jsx';
import { useToast } from './Toast.jsx';

// Editor de catálogo genérico (Géneros, Grúas, Destinos, Fleteros...):
// una tabla de filas con N campos, agregar/quitar filas, y un botón de
// Guardar propio de esta sección que solo escribe su clave en settings
// (no se mezcla con el resto de Ajustes).
export default function CatalogoEditor({
  icon, titulo, descripcion, settingsKey, campos, valorInicial, filaVacia
}) {
  const [filas, setFilas] = useState(valorInicial && valorInicial.length ? valorInicial : [{ ...filaVacia }]);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  function campoFila(idx, key, value) {
    setFilas((f) => f.map((fila, i) => (i === idx ? { ...fila, [key]: value } : fila)));
  }

  function agregarFila() {
    setFilas((f) => [...f, { ...filaVacia }]);
  }

  function quitarFila(idx) {
    setFilas((f) => f.filter((_, i) => i !== idx));
  }

  function saltarAlSiguiente(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.target.form || e.target.closest('form');
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      const idx = inputs.indexOf(e.target);
      if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      const claveP = campos[0].key;
      const limpio = filas
        .filter((fila) => String(fila[claveP] || '').trim())
        .map((fila) => {
          const out = {};
          for (const c of campos) {
            if (c.tipo === 'number') out[c.key] = parseFloat(fila[c.key]) || 0;
            else out[c.key] = String(fila[c.key] || '').trim().toUpperCase();
          }
          return out;
        });
      await Api.actualizarSettings({ [settingsKey]: JSON.stringify(limpio) });
      setFilas(limpio.length ? limpio : [{ ...filaVacia }]);
      toast.exito(`${titulo}: guardado correctamente.`);
    } catch (err) {
      toast.error(err.message || `No se pudo guardar ${titulo.toLowerCase()}.`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Panel titulo={titulo} icon={icon}>
      {descripcion && <p className="mb-3 text-xs text-[#6b7a68]">{descripcion}</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {campos.map((c) => (
              <th key={c.key} className="px-2 py-1 text-left text-xs uppercase text-[#6b7a68]">{c.label}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {campos.map((c) => (
                <td key={c.key} className="px-2 py-2">
                  <input
                    type={c.tipo === 'number' ? 'number' : 'text'}
                    step={c.tipo === 'number' ? '0.01' : undefined}
                    className="form-input w-full"
                    placeholder={c.placeholder || ''}
                    value={fila[c.key]}
                    onChange={(e) => campoFila(i, c.key, e.target.value)}
                    onKeyDown={saltarAlSiguiente}
                  />
                </td>
              ))}
              <td className="px-2 py-2">
                <button
                  type="button"
                  title={`Quitar ${titulo.toLowerCase()}`}
                  aria-label={`Quitar ${titulo.toLowerCase()}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbe4e1] text-[#c0392b] transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={filas.length <= 1}
                  onClick={() => quitarFila(i)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-verde-suave px-5 py-3 text-sm font-bold text-verde-fuerte transition-colors hover:bg-verde-borde"
          onClick={agregarFila}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Agregar
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={guardar}
          className="flex items-center gap-2 rounded-full bg-verde px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte disabled:cursor-not-allowed disabled:opacity-70"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
          Guardar {titulo.toLowerCase()}
        </button>
      </div>
    </Panel>
  );
}
