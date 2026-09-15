// Cálculo del formato de extracción.
// Géneros y ajustes son listas de largo variable:
//   generos: [{ nombre, metros, precio }, ...]
//   ajustes: [{ etiqueta, monto }, ...]  (monto puede ser negativo = descuento,
//                                          positivo = un cargo extra)

function num(v) {
  v = parseFloat(v);
  return isNaN(v) ? 0 : v;
}

export function calcularFormato(data) {
  const d = data || {};
  const ivaRate = d.iva_rate != null ? num(d.iva_rate) : 0.16;
  const isrRate = d.isr_rate != null ? num(d.isr_rate) : 0.0125;

  const generos = (d.generos || []).map((g) => {
    const metros = num(g.metros);
    const precio = num(g.precio);
    return { nombre: g.nombre, metros, precio, total: metros * precio };
  });
  const ajustes = (d.ajustes || []).map((a) => ({
    etiqueta: a.etiqueta,
    monto: num(a.monto)
  }));

  const totalGeneros = generos.reduce((s, g) => s + g.total, 0);
  const totalAjustes = ajustes.reduce((s, a) => s + a.monto, 0);
  const subtotal = totalGeneros + totalAjustes;
  const iva = subtotal * ivaRate;
  const isr = subtotal * isrRate;
  const totalNeto = subtotal + iva - isr;
  const saldoFavor = totalNeto;

  return {
    generos, ajustes,
    totalGeneros, totalAjustes, subtotal,
    ivaRate, isrRate, iva, isr,
    totalNeto, saldoFavor
  };
}

// Cálculo del flete de madera en rollo.
//   lineas: [{ fecha, folio, paraje, grua, metros }, ...]
export function calcularFlete(data) {
  const d = data || {};
  const ivaRate = d.iva_rate != null ? num(d.iva_rate) : 0.16;
  const retencionRate = d.retencion_rate != null ? num(d.retencion_rate) : 0.04;
  const isrRate = d.isr_rate != null ? num(d.isr_rate) : 0.0125;
  const precioFlete = num(d.precio_flete);

  const lineas = (d.lineas || []).map((l) => ({ ...l, metros: num(l.metros) }));
  const totalMetros = lineas.reduce((s, l) => s + l.metros, 0);
  const totalFlete = totalMetros * precioFlete;
  const iva = totalFlete * ivaRate;
  const retencion = totalFlete * retencionRate;
  const isr = totalFlete * isrRate;
  const total = totalFlete + iva - retencion - isr;

  return {
    lineas, totalMetros, precioFlete, totalFlete,
    ivaRate, retencionRate, isrRate, iva, retencion, isr,
    total, saldoFavor: total
  };
}

export function formatoMoneda(v) {
  const n = num(v);
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatoMonedaConSigno(v) {
  const n = num(v);
  const texto = Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-${texto}` : texto;
}

export function fechaLargaEs(iso) {
  if (!iso) return '';
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const [y, m, d] = iso.split('-').map(Number);
  return `AL ${d} ${meses[m - 1]} ${y}`;
}

export function fechaCortaEs(iso) {
  if (!iso) return '';
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${meses[m - 1]} ${y}`;
}

export function fechaLegible(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d}/${meses[parseInt(m, 10) - 1]}/${y}`;
}
