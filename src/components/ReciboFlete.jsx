import { useState } from 'react';
import { calcularFlete, fechaCortaEs } from '../lib/calc.js';

// Estructura del comprobante "Flete de Madera en Rollo". Usa las clases
// de src/styles/flete.css (prefijo ft-, independiente de formato.css /
// Extracción) para no tocar ese diseño. Se usa tanto en la vista previa
// como en la pantalla de impresión, así siempre se ven igual.

export default function ReciboFlete({
  fletero,
  fecha,
  lineas,
  precioFlete,
  ivaRate,
  retencionRate,
  isrRate,
  logoSrc = '/images/logo.png'
}) {
  const [logoError, setLogoError] = useState(false);
  const r = calcularFlete({ lineas, precio_flete: precioFlete, iva_rate: ivaRate, retencion_rate: retencionRate, isr_rate: isrRate });
  const M = (v) => Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ivaPct = ivaRate * 100;
  const retencionPct = retencionRate * 100;
  const isrPct = isrRate * 100;
  const pct = (n) => (Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2));

  return (
    <div className="ft-hoja">
      <div className="ft-encabezado">
        <div className="ft-titulo-box">Flete De<br />Madera En<br />Rollo</div>
        <div className="ft-logo-wrap">
          {logoError
            ? <div className="ft-logo-fallback">LOGO</div>
            : <img src={logoSrc} alt="logo" onError={() => setLogoError(true)} />}
        </div>
      </div>

      <div className="ft-fletero">{fletero || 'FLETERO'}</div>

      <div className="ft-fecha-box">{fechaCortaEs(fecha) || 'FECHA'}</div>

      <table className="ft-tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Folio</th>
            <th>Paraje</th>
            <th>Grua #</th>
            <th className="ft-num">Metros</th>
          </tr>
        </thead>
        <tbody>
          {r.lineas.map((l, i) => (
            <tr key={i}>
              <td>{l.fecha ? l.fecha.split('-').reverse().join('/') : ''}</td>
              <td>{l.folio}</td>
              <td>{l.paraje}</td>
              <td>{l.grua}</td>
              <td className="ft-num">{Number(l.metros || 0).toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="ft-totales">
        <tbody>
          <tr><td className="ft-label">Total en metros</td><td className="ft-val">{Number(r.totalMetros || 0).toFixed(3)}</td></tr>
          <tr><td className="ft-label">Precio flete</td><td className="ft-val">{M(r.precioFlete)}</td></tr>
          <tr><td className="ft-label">Total $</td><td className="ft-val">{M(r.totalFlete)}</td></tr>
        </tbody>
      </table>

      <table className="ft-resumen">
        <tbody>
          <tr><td className="ft-label">Flete de madera en rollo</td><td className="ft-val">{M(r.totalFlete)}</td></tr>
          <tr><td className="ft-label">Mas pago de iva {pct(ivaPct)} %</td><td className="ft-val">{M(r.iva)}</td></tr>
          {retencionRate > 0 && (
            <tr><td className="ft-label">Menos pago de retencion {pct(retencionPct)} %</td><td className="ft-val">{M(r.retencion)}</td></tr>
          )}
          {isrRate > 0 && (
            <tr><td className="ft-label">Menos pago de isr retenido {pct(isrPct)} %</td><td className="ft-val">{M(r.isr)}</td></tr>
          )}
          <tr className="ft-total"><td className="ft-label">Total</td><td className="ft-val">{M(r.total)}</td></tr>
        </tbody>
      </table>

      <div className="ft-saldo">
        <span>Saldo a favor:</span>
        <span className="ft-val">{M(r.saldoFavor)}</span>
      </div>
      <div className="ft-footer-space"></div>
    </div>
  );
}
