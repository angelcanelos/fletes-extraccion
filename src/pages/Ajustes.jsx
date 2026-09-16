import { useEffect, useState } from 'react';
import {
  Building2, Percent, ImageIcon, Layers, Trees, Truck, MapPin, UserRound,
  Save, Loader2, Cloud, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { Api } from '../lib/api.js';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import Campo from '../components/Campo.jsx';
import CatalogoEditor, { Switch } from '../components/CatalogoEditor.jsx';
import { useToast } from '../components/Toast.jsx';

function parseJson(json, fallback) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista) && lista.length) return lista;
  } catch { /* ignora settings corruptos */ }
  return fallback;
}

const generalVacio = {
  empresa_nombre: '', fsc_texto: '',
  iva_rate_pct: 16, isr_rate_pct: 1.25,
  fletes_iva_rate_pct: 16, fletes_retencion_rate_pct: 4, fletes_isr_rate_pct: 1.25
};

const nubeVacia = { supabase_enabled: false, supabase_url: '', supabase_key: '' };

function formatearFecha(iso) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Ajustes() {
  const [general, setGeneral] = useState(generalVacio);
  const [catalogos, setCatalogos] = useState(null);
  const [nube, setNube] = useState(nubeVacia);
  const [syncStatus, setSyncStatus] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoGeneral, setGuardandoGeneral] = useState(false);
  const [guardandoNube, setGuardandoNube] = useState(false);
  const [probando, setProbando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const s = await Api.obtenerSettings();
      setGeneral({
        empresa_nombre: s.empresa_nombre || '',
        fsc_texto: s.fsc_texto || '',
        iva_rate_pct: parseFloat(s.iva_rate || 0.16) * 100,
        isr_rate_pct: parseFloat(s.isr_rate || 0.0125) * 100,
        fletes_iva_rate_pct: parseFloat(s.fletes_iva_rate || 0.16) * 100,
        fletes_retencion_rate_pct: parseFloat(s.fletes_retencion_rate || 0.04) * 100,
        fletes_isr_rate_pct: parseFloat(s.fletes_isr_rate || 0.0125) * 100
      });
      setCatalogos({
        generos: parseJson(s.generos_default_json, [{ nombre: 'PINO', precio: 280 }]),
        gruas: parseJson(s.gruas_json, [{ grua: '', productor: '', precio_flete: 0 }]),
        destinos: parseJson(s.destinos_json, [{ nombre: 'FORESTAL TEZAINS' }]),
        fleteros: parseJson(s.fleteros_json, [{ nombre: '' }]),
        parajes: parseJson(s.parajes_json, [{ nombre: 'RANCHO QUEMADO' }])
      });
      setNube({
        supabase_enabled: s.supabase_enabled === 'true',
        supabase_url: s.supabase_url || '',
        supabase_key: s.supabase_key || ''
      });
      setCargando(false);
    })();
  }, []);

  useEffect(() => {
    let activo = true;
    async function refrescarEstado() {
      try {
        const estado = await Api.obtenerSyncStatus();
        if (activo) setSyncStatus(estado);
      } catch { /* sin conexión con el propio servidor local: ignorar */ }
    }
    refrescarEstado();
    const intervalo = setInterval(refrescarEstado, 30000);
    return () => { activo = false; clearInterval(intervalo); };
  }, []);

  function campoGeneral(name, value) {
    setGeneral((d) => ({ ...d, [name]: value }));
  }

  function campoNube(name, value) {
    setNube((d) => ({ ...d, [name]: value }));
  }

  async function guardarNube(e) {
    e.preventDefault();
    setGuardandoNube(true);
    try {
      await Api.actualizarSettings({
        supabase_enabled: nube.supabase_enabled ? 'true' : 'false',
        supabase_url: nube.supabase_url.trim(),
        supabase_key: nube.supabase_key.trim()
      });
      toast.exito('Respaldo en la nube: ajustes guardados.');
      const estado = await Api.obtenerSyncStatus();
      setSyncStatus(estado);
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la configuración de Supabase.');
    } finally {
      setGuardandoNube(false);
    }
  }

  async function probarConexion() {
    setProbando(true);
    try {
      const resultado = await Api.probarConexionSupabase(nube.supabase_url.trim(), nube.supabase_key.trim());
      if (resultado.ok) toast.exito('Conexión con Supabase correcta.');
      else toast.error(resultado.error || 'No se pudo conectar con Supabase.');
    } catch {
      toast.error('No se pudo conectar con Supabase.');
    } finally {
      setProbando(false);
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true);
    try {
      const estado = await Api.sincronizarAhora();
      setSyncStatus(estado);
      if (estado.ultimoError) toast.error(estado.ultimoError);
      else toast.exito('Sincronización con Supabase completada.');
    } catch {
      toast.error('No se pudo sincronizar con Supabase.');
    } finally {
      setSincronizando(false);
    }
  }

  async function guardarGeneral(e) {
    e.preventDefault();
    setGuardandoGeneral(true);
    try {
      await Api.actualizarSettings({
        empresa_nombre: general.empresa_nombre.trim(),
        fsc_texto: general.fsc_texto.trim(),
        iva_rate: (parseFloat(general.iva_rate_pct) || 0) / 100,
        isr_rate: (parseFloat(general.isr_rate_pct) || 0) / 100,
        fletes_iva_rate: (parseFloat(general.fletes_iva_rate_pct) || 0) / 100,
        fletes_retencion_rate: (parseFloat(general.fletes_retencion_rate_pct) || 0) / 100,
        fletes_isr_rate: (parseFloat(general.fletes_isr_rate_pct) || 0) / 100
      });
      toast.exito('Ajustes generales guardados correctamente.');
    } catch (err) {
      toast.error(err.message || 'No se pudieron guardar los ajustes.');
    } finally {
      setGuardandoGeneral(false);
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
      subtitle="Configuración general y catálogos compartidos por Extracción y Fletes. El diseño de los comprobantes impresos no cambia."
    >
      <form onSubmit={guardarGeneral}>
        <Panel titulo="Empresa y formato" icon={Building2}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Campo label="Nombre de la empresa">
              <input className="form-input" value={general.empresa_nombre} onChange={(e) => campoGeneral('empresa_nombre', e.target.value)} />
            </Campo>
            <Campo label="Texto del producto FSC">
              <input className="form-input" value={general.fsc_texto} onChange={(e) => campoGeneral('fsc_texto', e.target.value)} />
            </Campo>
          </div>
        </Panel>

        <Panel titulo="Impuestos por defecto" icon={Percent}>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-verde-fuerte">Extracción</div>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Campo label="IVA % por defecto">
              <input type="number" step="0.01" className="form-input" value={general.iva_rate_pct} onChange={(e) => campoGeneral('iva_rate_pct', e.target.value)} />
            </Campo>
            <Campo label="ISR % por defecto">
              <input type="number" step="0.0001" className="form-input" value={general.isr_rate_pct} onChange={(e) => campoGeneral('isr_rate_pct', e.target.value)} />
            </Campo>
          </div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-verde-fuerte">Fletes</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Campo label="IVA % por defecto">
              <input type="number" step="0.01" className="form-input" value={general.fletes_iva_rate_pct} onChange={(e) => campoGeneral('fletes_iva_rate_pct', e.target.value)} />
            </Campo>
            <Campo label="Retención % por defecto">
              <input type="number" step="0.01" className="form-input" value={general.fletes_retencion_rate_pct} onChange={(e) => campoGeneral('fletes_retencion_rate_pct', e.target.value)} />
            </Campo>
            <Campo label="ISR % por defecto">
              <input type="number" step="0.0001" className="form-input" value={general.fletes_isr_rate_pct} onChange={(e) => campoGeneral('fletes_isr_rate_pct', e.target.value)} />
            </Campo>
          </div>
          <p className="mt-2 text-xs text-[#6b7a68]">
            Estos porcentajes se aplican a los formatos/fletes nuevos. Los ya guardados conservan las tasas con
            las que se crearon; el IVA/ISR/Retención también se puede quitar o cambiar por documento.
          </p>
        </Panel>

        <Panel titulo="Logo" icon={ImageIcon}>
          <p className="text-xs text-[#6b7a68]">
            El logo de la app (barra superior, ícono, pantalla de carga) es <code>public/images/LogoFletes.png</code>.
            El logo del formato impreso de Extracción es <code>public/images/logo.png</code> y no cambia.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <img src="/images/LogoFletes.png" alt="logo de la app" className="h-[70px] w-[70px] rounded-xl border border-[#ddd] object-contain" />
            <img src="/images/logo.png" alt="logo del formato" className="h-[70px] w-[70px] rounded-full border border-[#ddd] object-cover" />
          </div>
        </Panel>

        <div className="mb-2 flex flex-wrap justify-end gap-2.5">
          <button
            type="submit"
            disabled={guardandoGeneral}
            className="flex items-center gap-2 rounded-full bg-verde px-[18px] py-2.5 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte disabled:cursor-not-allowed disabled:opacity-70"
          >
            {guardandoGeneral ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
            Guardar ajustes generales
          </button>
        </div>
      </form>

      <form onSubmit={guardarNube}>
        <Panel titulo="Respaldo en la nube (Supabase)" icon={Cloud}>
          <p className="mb-3 text-xs text-[#6b7a68]">
            Además de guardarse en esta computadora, cada formato y flete se puede subir automáticamente a
            Supabase como copia de seguridad. Se sube solo (al abrir la app, al guardar algo, y cada rato de
            fondo) cuando hay internet; si no hay conexión, no pasa nada y se reintenta después. Esta
            computadora sigue siendo la única fuente de verdad — Supabase es solo el respaldo.
          </p>

          <div className="mb-4 flex items-center gap-3">
            <Switch checked={nube.supabase_enabled} onChange={(val) => campoNube('supabase_enabled', val)} />
            <span className="text-sm font-bold text-[#33402f]">Activar respaldo en la nube</span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            <Campo label="URL del proyecto Supabase">
              <input
                className="form-input"
                placeholder="https://xxxxx.supabase.co"
                value={nube.supabase_url}
                onChange={(e) => campoNube('supabase_url', e.target.value)}
              />
            </Campo>
            <Campo label="Clave (service_role)">
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={nube.supabase_key}
                onChange={(e) => campoNube('supabase_key', e.target.value)}
              />
            </Campo>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={probando || !nube.supabase_url.trim() || !nube.supabase_key.trim()}
              onClick={probarConexion}
              className="flex items-center gap-2 rounded-full bg-verde-suave px-5 py-3 text-sm font-bold text-verde-fuerte transition-colors hover:bg-verde-borde disabled:cursor-not-allowed disabled:opacity-50"
            >
              {probando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Cloud className="h-4 w-4" strokeWidth={2.5} />}
              Probar conexión
            </button>
            <button
              type="submit"
              disabled={guardandoNube}
              className="flex items-center gap-2 rounded-full bg-verde px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-verde-fuerte disabled:cursor-not-allowed disabled:opacity-70"
            >
              {guardandoNube ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
              Guardar
            </button>
            {syncStatus && syncStatus.habilitado && syncStatus.configurado && (
              <button
                type="button"
                disabled={sincronizando}
                onClick={sincronizarAhora}
                className="flex items-center gap-2 rounded-full bg-verde-suave px-5 py-3 text-sm font-bold text-verde-fuerte transition-colors hover:bg-verde-borde disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <RefreshCw className="h-4 w-4" strokeWidth={2.5} />}
                Sincronizar ahora
              </button>
            )}
          </div>

          {syncStatus && (
            <div className="mt-4 flex flex-col gap-1 text-xs text-[#6b7a68]">
              {!syncStatus.habilitado ? (
                <span>El respaldo en la nube está desactivado.</span>
              ) : !syncStatus.configurado ? (
                <span>Falta la URL o la clave del proyecto.</span>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    {syncStatus.ultimoError ? (
                      <XCircle className="h-4 w-4 text-[#c0392b]" strokeWidth={2.25} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-verde-fuerte" strokeWidth={2.25} />
                    )}
                    Última sincronización correcta: {formatearFecha(syncStatus.ultimoExito)}
                  </div>
                  {syncStatus.ultimoError && <div className="text-[#c0392b]">Último error: {syncStatus.ultimoError}</div>}
                  <div>
                    Pendientes de subir: {(syncStatus.pendientes?.formatos || 0) + (syncStatus.pendientes?.fletes || 0)}
                  </div>
                </>
              )}
            </div>
          )}
        </Panel>
      </form>

      <div className="mb-4 mt-8 flex items-center gap-2 border-b-2 border-verde pb-2">
        <Layers className="h-5 w-5 text-verde-fuerte" strokeWidth={2.25} />
        <h2 className="m-0 text-lg font-extrabold text-verde-fuerte">Catálogos</h2>
      </div>
      <p className="-mt-2 mb-4 text-xs text-[#6b7a68]">
        Listas compartidas que se eligen al crear un formato o un flete. Cada catálogo se guarda por su cuenta
        con su propio botón — no hace falta guardar todo junto.
      </p>

      <CatalogoEditor
        icon={Trees}
        titulo="Géneros"
        descripcion="Géneros y su precio por defecto, ya listos al crear un formato de Extracción nuevo."
        settingsKey="generos_default_json"
        valorInicial={catalogos.generos}
        filaVacia={{ nombre: '', precio: 0 }}
        campos={[
          { key: 'nombre', label: 'Género', tipo: 'text', placeholder: 'Ej. DOBLE ARRASTRE' },
          { key: 'precio', label: 'Precio $ por defecto', tipo: 'number' }
        ]}
      />

      <CatalogoEditor
        icon={Truck}
        titulo="Grúas"
        descripcion="Cada grúa tiene un productor fijo (Extracción) y un precio de flete (Fletes)."
        settingsKey="gruas_json"
        valorInicial={catalogos.gruas}
        filaVacia={{ grua: '', productor: '', precio_flete: 0 }}
        campos={[
          { key: 'grua', label: 'Grúa', tipo: 'text', placeholder: 'Ej. GRUA 11' },
          { key: 'productor', label: 'Productor', tipo: 'text', placeholder: 'Ej. JUAN PEREZ' },
          { key: 'precio_flete', label: 'Precio flete $', tipo: 'number' }
        ]}
      />

      <CatalogoEditor
        icon={MapPin}
        titulo="Destinos"
        descripcion="Aparece junto al productor en el formato de Extracción (antes fijo, ahora se elige por formato)."
        settingsKey="destinos_json"
        valorInicial={catalogos.destinos}
        filaVacia={{ nombre: '' }}
        campos={[{ key: 'nombre', label: 'Destino', tipo: 'text', placeholder: 'Ej. FORESTAL TEZAINS' }]}
      />

      <CatalogoEditor
        icon={UserRound}
        titulo="Fleteros"
        descripcion="Nombre del fletero y si aplica retención e ISR. Estos switches se aplican al crear un flete nuevo para ese fletero."
        settingsKey="fleteros_json"
        valorInicial={catalogos.fleteros}
        filaVacia={{ nombre: '', retencion: true, isr: false }}
        campos={[
          { key: 'nombre', label: 'Fletero', tipo: 'text', placeholder: 'Ej. JUAN PEREZ' },
          { key: 'retencion', label: 'Retención 4%', tipo: 'switch' },
          { key: 'isr', label: 'ISR 1.25%', tipo: 'switch' }
        ]}
      />

      <CatalogoEditor
        icon={MapPin}
        titulo="Parajes"
        descripcion="Lugares de origen de la madera, elegibles por cada viaje en el comprobante de Fletes."
        settingsKey="parajes_json"
        valorInicial={catalogos.parajes}
        filaVacia={{ nombre: '' }}
        campos={[{ key: 'nombre', label: 'Paraje', tipo: 'text', placeholder: 'Ej. RANCHO QUEMADO' }]}
      />
    </PageLayout>
  );
}
