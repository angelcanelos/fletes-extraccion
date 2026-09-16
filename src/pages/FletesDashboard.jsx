import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, X, ArrowLeft, FolderOpen, UserRound,
  Printer, SquarePen, Trash2, TreePine, FileStack, CalendarCheck, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { calcularFlete, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

function totalDe(f, preciosPorGrua) {
  const r = calcularFlete({
    lineas: f.lineas, precio_flete: f.precio_flete,
    iva_rate: f.iva_rate, retencion_rate: f.retencion_rate, isr_rate: f.isr_rate,
    precios_por_grua: preciosPorGrua
  });
  return r.total;
}

function parseFleteros(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((f) => f && f.nombre);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function parseGruas(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function preciosPorGruaDe(gruas) {
  const mapa = {};
  gruas.forEach((g) => { if (g && g.grua) mapa[g.grua] = g.precio_flete; });
  return mapa;
}

const filtrosVacios = { q: '', fletero: '', desde: '', hasta: '', estado: '' };

export default function FletesDashboard() {
  const [stats, setStats] = useState({ totalFletes: 0, esteMes: 0 });
  const [fleteros, setFleteros] = useState([]);
  const [preciosPorGrua, setPreciosPorGrua] = useState({});
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [fletes, setFletes] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const confirmar = useConfirm();
  const toast = useToast();

  const cargarTarjetas = useCallback(async () => {
    setStats(await Api.statsFletes());
  }, []);

  const cargarFleteros = useCallback(async () => {
    const s = await Api.obtenerSettings();
    setFleteros(parseFleteros(s.fleteros_json));
    setPreciosPorGrua(preciosPorGruaDe(parseGruas(s.gruas_json)));
  }, []);

  const cargarTabla = useCallback(async (f) => {
    const data = await Api.listarFletes(f);
    setFletes(data);
  }, []);

  useEffect(() => { cargarTarjetas(); cargarFleteros(); }, [cargarTarjetas, cargarFleteros]);
  useEffect(() => { cargarTabla(filtros); }, [filtros, cargarTabla]);

  async function eliminar(f) {
    const ok = await confirmar({
      titulo: `¿Eliminar el flete de ${f.fletero}?`,
      texto: `Folio ${f.folio || f.id} · esta acción no se puede deshacer.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!ok) return;
    setEliminandoId(f.id);
    try {
      await Api.eliminarFlete(f.id);
      await Promise.all([cargarTabla(filtros), cargarTarjetas()]);
      toast.exito('Flete eliminado correctamente.');
    } catch {
      toast.error('No se pudo eliminar el flete. Intenta de nuevo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const campo = (name, value) => setFiltros((prev) => ({ ...prev, [name]: value }));
  const hayFiltrosActivos = Object.values(filtros).some(Boolean);
  const vistaCarpetas = !hayFiltrosActivos;
  const grupoAbierto = fleteros.find((f) => f.nombre === filtros.fletero);

  function abrirFletero(nombre) {
    setFiltros({ ...filtrosVacios, fletero: nombre });
  }

  // Conteo y total por fletero, calculados sobre los fletes ya cargados
  // (cuando no hay filtros activos, fletes trae todos).
  const resumenPorFletero = {};
  if (vistaCarpetas && fletes) {
    for (const f of fletes) {
      if (!resumenPorFletero[f.fletero]) resumenPorFletero[f.fletero] = { cantidad: 0, total: 0 };
      resumenPorFletero[f.fletero].cantidad += 1;
      resumenPorFletero[f.fletero].total += totalDe(f, preciosPorGrua);
    }
  }

  return (
    <PageLayout
      title="Fletes de madera en rollo"
      subtitle="Consulta, busca, imprime o crea un nuevo comprobante de flete."
      action={
        <Link to="/fletes/nuevo" className="inline-flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Nuevo flete
        </Link>
      }
    >
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        <Tarjeta icon={FileStack} valor={stats.totalFletes} etiqueta="Fletes guardados" />
        <Tarjeta icon={CalendarCheck} valor={stats.esteMes} etiqueta="Fletes este mes" />
        <Tarjeta icon={UserRound} valor={fleteros.length} etiqueta="Fleteros registrados" />
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
                placeholder="Fletero, folio, paraje..."
                value={filtros.q}
                onChange={(e) => campo('q', e.target.value)}
              />
            </div>
          </Campo>
          <Campo label="Fletero">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa696]" strokeWidth={2.25} />
              <select className="campo-input min-w-[170px] pl-9" value={filtros.fletero} onChange={(e) => campo('fletero', e.target.value)}>
                <option value="">Todos</option>
                {fleteros.map((f) => <option key={f.nombre} value={f.nombre}>{f.nombre}</option>)}
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

      {vistaCarpetas ? (
        fletes === null ? (
          <div className="flex items-center justify-center gap-2.5 rounded-panel bg-white p-10 text-center text-[#6b7a68] shadow-panel">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
          </div>
        ) : fleteros.length === 0 ? (
          <EstadoVacio />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {fleteros.map((f) => {
              const r = resumenPorFletero[f.nombre] || { cantidad: 0, total: 0 };
              return (
                <button
                  key={f.nombre}
                  type="button"
                  onClick={() => abrirFletero(f.nombre)}
                  className="flex flex-col items-start gap-2.5 rounded-panel bg-white p-4 text-left shadow-panel transition-transform hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(20,40,10,0.12)]"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-verde-suave">
                      <FolderOpen className="h-5 w-5 text-verde-fuerte" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#1c2b1a]">{f.nombre}</div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between border-t border-[#eef1ea] pt-2.5 text-xs">
                    <span className="font-semibold text-[#6b7a68]">{r.cantidad} flete{r.cantidad === 1 ? '' : 's'}</span>
                    {r.cantidad > 0 && <span className="font-bold text-verde-fuerte">${formatoMoneda(r.total)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-auto rounded-panel bg-white shadow-panel">
          {grupoAbierto && filtros.fletero && !filtros.q && !filtros.desde && !filtros.hasta && !filtros.estado && (
            <div className="flex items-center gap-2.5 border-b border-[#eef1ea] px-4 py-3">
              <button
                type="button"
                onClick={() => setFiltros(filtrosVacios)}
                className="flex items-center gap-1.5 rounded-full bg-[#eef1ec] px-3.5 py-1.5 text-xs font-bold text-[#33402f] transition-colors hover:bg-[#e1e6dc]"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Fleteros
              </button>
              <span className="text-sm font-bold text-[#1c2b1a]">{grupoAbierto.nombre}</span>
            </div>
          )}
          {fletes === null ? (
            <div className="flex items-center justify-center gap-2.5 p-10 text-center text-[#6b7a68]">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
            </div>
          ) : fletes.length === 0 ? (
            <EstadoVacio hayFiltrosActivos />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Folio', 'Fecha', 'Fletero', 'Viajes', 'Total', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="border-b-2 border-verde-borde px-2.5 py-2.5 text-left text-[12.5px] uppercase tracking-wide text-verde-fuerte">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fletes.map((f) => (
                  <tr key={f.id} className={`border-b border-[#eef1ea] hover:bg-[#fbfdf8] ${eliminandoId === f.id ? 'opacity-40' : ''}`}>
                    <td className="px-2.5 py-3">{f.folio || f.id}</td>
                    <td className="px-2.5 py-3">{fechaLegible(f.fecha)}</td>
                    <td className="px-2.5 py-3">{f.fletero}</td>
                    <td className="px-2.5 py-3">{(f.lineas || []).length}</td>
                    <td className="px-2.5 py-3 font-bold">${formatoMoneda(totalDe(f, preciosPorGrua))}</td>
                    <td className="px-2.5 py-3">
                      <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${f.estado === 'pagado' ? 'bg-[#dff3e3] text-[#1f7a3d]' : 'bg-[#fdf1da] text-[#a8710b]'}`}>
                        {f.estado === 'pagado' ? 'Pagado' : 'Guardado'}
                      </span>
                    </td>
                    <td className="px-2.5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <a
                          className="flex items-center gap-1.5 rounded-full bg-verde-suave px-3 py-1.5 text-[12.5px] font-bold text-verde-fuerte transition-colors hover:bg-verde-borde"
                          href={`/fletes/imprimir/${f.id}`} target="_blank" rel="noreferrer" title="Imprimir flete"
                        >
                          <Printer className="h-3.5 w-3.5" strokeWidth={2.25} /> Imprimir
                        </a>
                        <Link
                          className="flex items-center gap-1.5 rounded-full bg-[#eef1ec] px-3 py-1.5 text-[12.5px] font-bold text-[#33402f] transition-colors hover:bg-[#e1e6dc]"
                          to={`/fletes/${f.id}/editar`} title="Editar flete"
                        >
                          <SquarePen className="h-3.5 w-3.5" strokeWidth={2.25} /> Editar
                        </Link>
                        <button
                          className="flex items-center gap-1.5 rounded-full bg-[#fbe4e1] px-3 py-1.5 text-[12.5px] font-bold text-[#c0392b] transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => eliminar(f)}
                          disabled={eliminandoId === f.id}
                          title="Eliminar flete"
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
      )}
    </PageLayout>
  );
}

function EstadoVacio({ hayFiltrosActivos }) {
  return (
    <div className="rounded-panel bg-white p-[50px_20px] text-center text-[#6b7a68] shadow-panel">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-verde-suave">
        <TreePine className="h-8 w-8 text-verde-fuerte" strokeWidth={1.75} />
      </div>
      {hayFiltrosActivos ? (
        <>No se encontró ningún flete con esos filtros.</>
      ) : (
        <>
          Aún no hay fletes guardados.<br />
          <Link to="/fletes/nuevo" className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear el primer flete
          </Link>
        </>
      )}
    </div>
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
