import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, FileWarning } from 'lucide-react';
import { Api } from '../lib/api.js';
import { fechaLargaEs } from '../lib/calc.js';
import ReciboFormato from '../components/ReciboFormato.jsx';

export default function Imprimir() {
  const { id } = useParams();
  const [formato, setFormato] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); return; }
    (async () => {
      try {
        const [f, s] = await Promise.all([Api.obtenerFormato(id), Api.obtenerSettings()]);
        setFormato(f);
        setSettings(s);
        document.title = `Formato ${f.folio || f.id} - ${f.productor}`;
      } catch {
        setError(true);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#e9efe4] px-0 pb-[60px] pt-6 font-sans">
      <div className="no-imprimir mx-auto mb-6 flex max-w-[420px] flex-wrap items-center justify-center gap-4 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-[#33402f] no-underline shadow-panel transition-transform hover:scale-[1.03] hover:bg-[#eef1ec]"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} /> Volver al listado
        </Link>
        <button
          className="flex items-center gap-2 rounded-full bg-verde px-7 py-3.5 text-[15px] font-bold text-white shadow-panel transition-transform hover:scale-[1.03] hover:bg-verde-fuerte"
          onClick={() => window.print()}
        >
          <Printer className="h-[18px] w-[18px]" strokeWidth={2.5} /> Imprimir
        </button>
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 p-[60px_20px] text-center text-[#555]">
          <FileWarning className="h-10 w-10 text-[#c0392b]" strokeWidth={1.75} />
          No se encontró ese formato.
        </div>
      )}
      {!error && !id && (
        <div className="flex flex-col items-center gap-3 p-[60px_20px] text-center text-[#555]">
          <FileWarning className="h-10 w-10 text-[#c0392b]" strokeWidth={1.75} />
          No se indicó qué formato imprimir.
        </div>
      )}
      {!error && id && !(formato && settings) && (
        <div className="no-imprimir flex items-center justify-center gap-2.5 p-[60px_20px] text-center text-[#6b7a68]">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      )}

      {formato && settings && (
        <div className="print:!shadow-none shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
          <ReciboFormato
            productor={formato.productor}
            grua={formato.grua}
            fechaTexto={fechaLargaEs(formato.fecha)}
            productoFsc={formato.producto_fsc}
            etiquetaExtra={settings.etiqueta_extra}
            generos={formato.generos}
            ajustes={formato.ajustes}
            ivaRate={formato.iva_rate}
            isrRate={formato.isr_rate}
          />
        </div>
      )}
    </div>
  );
}
