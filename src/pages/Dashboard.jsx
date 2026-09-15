import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Truck, Filter, X,
  Printer, SquarePen, Trash2, TreePine, FileStack, CalendarCheck, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { calcularFormato, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

function totalDe(f) {
  const r = calcularFormato({
    generos: f.generos, ajustes: f.ajustes,
    iva_rate: f.iva_rate, isr_rate: f.isr_rate
  });
  return r.totalNeto;
}

const filtrosVacios = { q: '', grua: '', desde: '', hasta: '', estado: '' };

export default function Dashboard() {
  const [stats, setStats] = useState({ totalFormatos: 0, esteMes: 0, gruas: [] });
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [formatos, setFormatos] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const confirmar = useConfirm();
  const toast = useToast();

  const cargarTarjetas = useCallback(async () => {
    setStats(await Api.stats());
  }, []);

  const cargarTabla = useCallback(async (f) => {
    const data = await Api.listarFormatos(f);
    setFormatos(data);
  }, []);

  useEffect(() => { cargarTarjetas(); }, [cargarTarjetas]);
  useEffect(() => { cargarTabla(filtros); }, [filtros, cargarTabla]);

  async function eliminar(f) {
    const ok = await confirmar({
      titulo: `¿Eliminar el formato de ${f.productor}?`,
      texto: `Folio ${f.folio || f.id} · esta acción no se puede deshacer.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!ok) return;
    setEliminandoId(f.id);
    try {
      await Api.eliminarFormato(f.id);
      await Promise.all([cargarTabla(filtros), cargarTarjetas()]);
      toast.exito('Formato eliminado correctamente.');
    } catch {
      toast.error('No se pudo eliminar el formato. Intenta de nuevo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const campo = (name, value) => setFiltros((prev) => ({ ...prev, [name]: value }));
  const hayFiltrosActivos = Object.values(filtros).some(Boolean);

  return (
    <PageLayout
      title="Formatos de extracción"
      subtitle="Consulta, busca, imprime o crea un nuevo formato de extracción de trocería en rollo."
      action={
        <Link to="/formato/nuevo" className="inline-flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Nuevo formato
        </Link>
      }
    >
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        <Tarjeta icon={FileStack} valor={stats.totalFormatos} etiqueta="Formatos guardados" />
        <Tarjeta icon={CalendarCheck} valor={stats.esteMes} etiqueta="Formatos este mes" />
        <Tarjeta icon={Truck} valor={stats.gruas.length} etiqueta="Grúas con movimientos" />
      </div>

      <div className="mb-5 rounded-panel bg-white p-5 shadow-panel">
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-verde-fuerte">
          <Filter className="h-3.5 w-3.5" strokeWidth={2.5} /> Filtros
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <Campo label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa696]" strokeWidth={2.25} />
              <input
                type="text"
                className="campo-input min-w-[160px] pl-9"
                placeholder="Productor, folio, observaciones..."
                value={filtros.q}
                onChange={(e) => campo('q', e.target.value)}
              />
            </div>
          </Campo>
          <Campo label="Grúa">
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa696]" strokeWidth={2.25} />
              <select className="campo-input min-w-[150px] pl-9" value={filtros.grua} onChange={(e) => campo('grua', e.target.value)}>
                <option value="">Todas</option>
                {[...stats.gruas].sort().map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </Campo>
          <Campo label="Desde">
            <input type="date" className="campo-input min-w-[140px]" value={filtros.desde} onChange={(e) => campo('desde', e.target.value)} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" className="campo-input min-w-[140px]" value={filtros.hasta} onChange={(e) => campo('hasta', e.target.value)} />
          </Campo>
          <Campo label="Estado">
            <select className="campo-input min-w-[140px]" value={filtros.estado} onChange={(e) => campo('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="guardado">Guardado</option>
              <option value="pagado">Pagado</option>
            </select>
          </Campo>
          {hayFiltrosActivos && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-[#eef1ec] px-[18px] py-2.5 text-sm font-bold text-[#33402f] transition-colors hover:bg-[#e1e6dc]"
              onClick={() => setFiltros(filtrosVacios)}
            >
              <X className="h-4 w-4" strokeWidth={2.5} /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-panel bg-white shadow-panel">
        {formatos === null ? (
          <div className="flex items-center justify-center gap-2.5 p-10 text-center text-[#6b7a68]">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
          </div>
        ) : formatos.length === 0 ? (
          <div className="p-[50px_20px] text-center text-[#6b7a68]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-verde-suave">
              <TreePine className="h-8 w-8 text-verde-fuerte" strokeWidth={1.75} />
            </div>
            {hayFiltrosActivos ? (
              <>No se encontró ningún formato con esos filtros.</>
            ) : (
              <>
                Aún no hay formatos guardados.<br />
                <Link to="/formato/nuevo" className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte">
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear el primer formato
                </Link>
              </>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Folio', 'Fecha', 'Productor', 'Grúa', 'Total neto', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="border-b-2 border-verde-borde px-2.5 py-2.5 text-left text-[12.5px] uppercase tracking-wide text-verde-fuerte">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formatos.map((f) => (
                <tr key={f.id} className={`border-b border-[#eef1ea] hover:bg-[#fbfdf8] ${eliminandoId === f.id ? 'opacity-40' : ''}`}>
                  <td className="px-2.5 py-3">{f.folio || f.id}</td>
                  <td className="px-2.5 py-3">{fechaLegible(f.fecha)}</td>
                  <td className="px-2.5 py-3">{f.productor}</td>
                  <td className="px-2.5 py-3">{f.grua}</td>
                  <td className="px-2.5 py-3 font-bold">${formatoMoneda(totalDe(f))}</td>
                  <td className="px-2.5 py-3">
                    <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${f.estado === 'pagado' ? 'bg-[#dff3e3] text-[#1f7a3d]' : 'bg-[#fdf1da] text-[#a8710b]'}`}>
                      {f.estado === 'pagado' ? 'Pagado' : 'Guardado'}
                    </span>
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        className="flex items-center gap-1.5 rounded-full bg-verde-suave px-3 py-1.5 text-[12.5px] font-bold text-verde-fuerte transition-colors hover:bg-verde-borde"
                        href={`/imprimir/${f.id}`} target="_blank" rel="noreferrer" title="Imprimir formato"
                      >
                        <Printer className="h-3.5 w-3.5" strokeWidth={2.25} /> Imprimir
                      </a>
                      <Link
                        className="flex items-center gap-1.5 rounded-full bg-[#eef1ec] px-3 py-1.5 text-[12.5px] font-bold text-[#33402f] transition-colors hover:bg-[#e1e6dc]"
                        to={`/formato/${f.id}/editar`} title="Editar formato"
                      >
                        <SquarePen className="h-3.5 w-3.5" strokeWidth={2.25} /> Editar
                      </Link>
                      <button
                        className="flex items-center gap-1.5 rounded-full bg-[#fbe4e1] px-3 py-1.5 text-[12.5px] font-bold text-[#c0392b] transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => eliminar(f)}
                        disabled={eliminandoId === f.id}
                        title="Eliminar formato"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}

function Tarjeta({ icon: Icon, valor, etiqueta }) {
  return (
    <div className="flex items-center gap-3.5 rounded-panel bg-white p-4 px-[18px] shadow-panel">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-verde-suave">
        <Icon className="h-5 w-5 text-verde-fuerte" strokeWidth={2.1} />
      </div>
      <div>
        <div className="text-[26px] font-extrabold leading-none text-verde-fuerte">{valor}</div>
        <div className="mt-1 text-[13px] text-[#6b7a68]">{etiqueta}</div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12.5px] font-semibold text-[#6b7a68]">{label}</label>
      {children}
    </div>
  );
}
