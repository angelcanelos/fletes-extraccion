import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, FileWarning } from 'lucide-react';
import { Api } from '../lib/api.js';
import ReciboFlete from '../components/ReciboFlete.jsx';

export default function FleteImprimir() {
  const { id } = useParams();
  const [flete, setFlete] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); return; }
    (async () => {
      try {
        const f = await Api.obtenerFlete(id);
        setFlete(f);
        document.title = `Flete ${f.folio || f.id} - ${f.fletero}`;
      } catch {
        setError(true);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#e9efe4] px-0 pb-[60px] pt-6 font-sans">
      <div className="no-imprimir mx-auto mb-6 flex max-w-[420px] flex-wrap items-center justify-center gap-4 px-4">
        <Link
          to="/fletes"
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
          No se encontró ese flete.
        </div>
      )}
      {!error && !id && (
        <div className="flex flex-col items-center gap-3 p-[60px_20px] text-center text-[#555]">
          <FileWarning className="h-10 w-10 text-[#c0392b]" strokeWidth={1.75} />
          No se indicó qué flete imprimir.
        </div>
      )}
      {!error && id && !flete && (
        <div className="no-imprimir flex items-center justify-center gap-2.5 p-[60px_20px] text-center text-[#6b7a68]">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      )}

      {flete && (
        <div className="print:!shadow-none shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
          <ReciboFlete
            fletero={flete.fletero}
            fecha={flete.fecha}
            lineas={flete.lineas}
            precioFlete={flete.precio_flete}
            ivaRate={flete.iva_rate}
            retencionRate={flete.retencion_rate}
            isrRate={flete.isr_rate}
          />
        </div>
      )}
    </div>
  );
}
