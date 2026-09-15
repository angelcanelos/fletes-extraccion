import { useEffect, useState } from 'react';
import {
  Building2, Trees, Percent, Truck, ImageIcon,
  Plus, Trash2, Save, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import Campo from '../components/Campo.jsx';
import { useToast } from '../components/Toast.jsx';

function parseGenerosDefault(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista) && lista.length) return lista.map((g) => ({ nombre: g.nombre || '', precio: g.precio || 0 }));
  } catch { /* ignora settings corruptos */ }
  return [{ nombre: 'PINO', precio: 280 }];
}

function parseGruas(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista) && lista.length) return lista.map((g) => ({ grua: g.grua || '', productor: g.productor || '' }));
  } catch { /* ignora settings corruptos */ }
  return [{ grua: '', productor: '' }];
}

const vacio = {
  empresa_nombre: '', fsc_texto: '', etiqueta_extra: '',
  generosDefault: [],
  iva_rate_pct: 16, isr_rate_pct: 1.25,
  gruas: []
};

export default function Ajustes() {
  const [datos, setDatos] = useState(vacio);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const s = await Api.obtenerSettings();
      setDatos({
        empresa_nombre: s.empresa_nombre || '',
        fsc_texto: s.fsc_texto || '',
        etiqueta_extra: s.etiqueta_extra || '',
        generosDefault: parseGenerosDefault(s.generos_default_json),
        iva_rate_pct: parseFloat(s.iva_rate || 0.16) * 100,
        isr_rate_pct: parseFloat(s.isr_rate || 0.0125) * 100,
        gruas: parseGruas(s.gruas_json)
      });
      setCargando(false);
    })();
  }, []);

  function campo(name, value) {
    setDatos((d) => ({ ...d, [name]: value }));
  }

  function generoCampo(idx, campoNombre, value) {
    setDatos((d) => ({
      ...d,
      generosDefault: d.generosDefault.map((g, i) => (i === idx ? { ...g, [campoNombre]: value } : g))
    }));
  }

  function agregarGenero() {
    setDatos((d) => ({ ...d, generosDefault: [...d.generosDefault, { nombre: '', precio: 0 }] }));
  }

  function quitarGenero(idx) {
    setDatos((d) => ({ ...d, generosDefault: d.generosDefault.filter((_, i) => i !== idx) }));
  }

  function gruaCampo(idx, campoNombre, value) {
    setDatos((d) => ({
      ...d,
      gruas: d.gruas.map((g, i) => (i === idx ? { ...g, [campoNombre]: value } : g))
    }));
  }

  function agregarGrua() {
    setDatos((d) => ({ ...d, gruas: [...d.gruas, { grua: '', productor: '' }] }));
  }

  function quitarGrua(idx) {
    setDatos((d) => ({ ...d, gruas: d.gruas.filter((_, i) => i !== idx) }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await Api.actualizarSettings({
        empresa_nombre: datos.empresa_nombre.trim(),
        fsc_texto: datos.fsc_texto.trim(),
        etiqueta_extra: datos.etiqueta_extra.trim(),
        generos_default_json: JSON.stringify(
          datos.generosDefault
            .filter((g) => (g.nombre || '').trim())
            .map((g) => ({ nombre: g.nombre.trim().toUpperCase(), precio: parseFloat(g.precio) || 0 }))
        ),
        iva_rate: (parseFloat(datos.iva_rate_pct) || 0) / 100,
        isr_rate: (parseFloat(datos.isr_rate_pct) || 0) / 100,
        gruas_json: JSON.stringify(
          datos.gruas
            .filter((g) => (g.grua || '').trim())
            .map((g) => ({ grua: g.grua.trim().toUpperCase(), productor: (g.productor || '').trim().toUpperCase() }))
        )
      });
      toast.exito('Ajustes guardados correctamente.');
    } catch (err) {
      toast.error(err.message || 'No se pudieron guardar los ajustes.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <PageLayout title="Ajustes">
        <div className="flex items-center justify-center gap-2.5 p-10 text-center text-[#6b7a68]">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Ajustes"
      subtitle="Estos valores se usan como punto de partida al crear un nuevo formato. El diseño del comprobante impreso no cambia."
    >
      <form onSubmit={guardar}>
        <Panel titulo="Empresa y formato" icon={Building2}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Campo label="Nombre de la empresa">
              <input className="form-input" value={datos.empresa_nombre} onChange={(e) => campo('empresa_nombre', e.target.value)} />
            </Campo>
            <Campo label="Texto del producto FSC">
              <input className="form-input" value={datos.fsc_texto} onChange={(e) => campo('fsc_texto', e.target.value)} />
            </Campo>
            <Campo label='Etiqueta pequeña (ej. "madymsa")'>
              <input className="form-input" value={datos.etiqueta_extra} onChange={(e) => campo('etiqueta_extra', e.target.value)} />
            </Campo>
          </div>
        </Panel>

        <Panel titulo="Géneros por defecto" icon={Trees}>
          <p className="mb-3 text-xs text-[#6b7a68]">
            Estos géneros (y su precio por defecto) aparecen ya listos cada vez que se crea un formato nuevo.
            Puedes agregar, quitar o cambiarles el precio; en cada formato también se puede ajustar libremente.
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Género', 'Precio $ por defecto', ''].map((h) => (
                  <th key={h} className="px-2 py-1 text-left text-xs uppercase text-[#6b7a68]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.generosDefault.map((g, i) => (
                <tr key={i}>
                  <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. DOBLE ARRASTRE" value={g.nombre} onChange={(e) => generoCampo(i, 'nombre', e.target.value)} /></td>
                  <td className="px-2 py-2"><input type="number" step="0.01" className="form-input w-full" value={g.precio} onChange={(e) => generoCampo(i, 'precio', e.target.value)} /></td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      title="Quitar género"
                      aria-label="Quitar género"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbe4e1] text-[#c0392b] transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={datos.generosDefault.length <= 1} onClick={() => quitarGenero(i)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-4 flex items-center gap-2 rounded-full bg-verde-suave px-5 py-3 text-sm font-bold text-verde-fuerte transition-colors hover:bg-verde-borde"
            onClick={agregarGenero}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Agregar género
          </button>
        </Panel>

        <Panel titulo="Impuestos por defecto" icon={Percent}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Campo label="IVA % por defecto">
              <input type="number" step="0.01" className="form-input" value={datos.iva_rate_pct} onChange={(e) => campo('iva_rate_pct', e.target.value)} />
            </Campo>
            <Campo label="ISR % por defecto">
              <input type="number" step="0.0001" className="form-input" value={datos.isr_rate_pct} onChange={(e) => campo('isr_rate_pct', e.target.value)} />
            </Campo>
          </div>
          <p className="mt-2 text-xs text-[#6b7a68]">
            Estos porcentajes se aplican a los formatos nuevos. Los formatos ya guardados conservan las tasas con las que se crearon.
          </p>
        </Panel>

        <Panel titulo="Grúas y productores" icon={Truck}>
          <p className="mb-3 text-xs text-[#6b7a68]">
            Cada grúa tiene un productor fijo. Al crear un formato, solo se elige la grúa y el productor se
            llena solo. Agrega, quita o corrige aquí cuando cambie algún productor.
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Grúa', 'Productor', ''].map((h) => (
                  <th key={h} className="px-2 py-1 text-left text-xs uppercase text-[#6b7a68]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.gruas.map((g, i) => (
                <tr key={i}>
                  <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. GRUA 11" value={g.grua} onChange={(e) => gruaCampo(i, 'grua', e.target.value)} /></td>
                  <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. JUAN PEREZ" value={g.productor} onChange={(e) => gruaCampo(i, 'productor', e.target.value)} /></td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      title="Quitar grúa"
                      aria-label="Quitar grúa"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbe4e1] text-[#c0392b] transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={datos.gruas.length <= 1} onClick={() => quitarGrua(i)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-4 flex items-center gap-2 rounded-full bg-verde-suave px-5 py-3 text-sm font-bold text-verde-fuerte transition-colors hover:bg-verde-borde"
            onClick={agregarGrua}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Agregar grúa
          </button>
        </Panel>

        <Panel titulo="Logo" icon={ImageIcon}>
          <p className="text-xs text-[#6b7a68]">
            Coloca el archivo del logo oficial (PNG o JPG) dentro de la carpeta <code>public/images</code> del
            proyecto con el nombre <code>logo.png</code>, reemplazando el actual. Se usará automáticamente aquí
            y en los formatos impresos.
          </p>
          <div className="mt-3">
            <img src="/images/logo.png" alt="logo actual" className="h-[90px] w-[90px] rounded-full border border-[#ddd] object-cover" />
          </div>
        </Panel>

        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte disabled:cursor-not-allowed disabled:opacity-70"
          >
            {guardando
              ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              : <Save className="h-4 w-4" strokeWidth={2.5} />}
            Guardar ajustes
          </button>
        </div>
      </form>
    </PageLayout>
  );
}
