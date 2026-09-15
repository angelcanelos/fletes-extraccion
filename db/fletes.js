// Capa de acceso a datos para "fletes" (Flete de Madera en Rollo).
// Mismo patrón que db/formatos.js: toda la app habla con la base de datos
// solo a través de estas funciones.

const db = require('./database');
const { getSettings } = require('./formatos');

function nowIso() {
  return new Date().toISOString();
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function generarFolio(id, fecha) {
  const anio = (fecha || '').slice(0, 4) || String(new Date().getFullYear());
  return `F${anio}-${String(id).padStart(4, '0')}`;
}

function normalizarLineas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((l) => ({
      fecha: (l && l.fecha) || '',
      folio: String((l && l.folio) || '').trim(),
      paraje: String((l && l.paraje) || '').trim(),
      grua: String((l && l.grua) || '').trim(),
      metros: num(l && l.metros)
    }))
    .filter((l) => l.grua || l.folio || l.paraje || l.metros);
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    lineas: JSON.parse(row.lineas_json || '[]')
  };
}

function listFletes({ q, grua, desde, hasta, estado } = {}) {
  let sql = 'SELECT * FROM fletes WHERE 1=1';
  const params = {};

  if (q) {
    sql += ' AND (fletero LIKE @q OR folio LIKE @q OR observaciones LIKE @q OR lineas_json LIKE @q)';
    params.q = `%${q}%`;
  }
  if (grua) {
    sql += ' AND lineas_json LIKE @grua';
    params.grua = `%"grua":"${grua}"%`;
  }
  if (desde) {
    sql += ' AND fecha >= @desde';
    params.desde = desde;
  }
  if (hasta) {
    sql += ' AND fecha <= @hasta';
    params.hasta = hasta;
  }
  if (estado) {
    sql += ' AND estado = @estado';
    params.estado = estado;
  }
  sql += ' ORDER BY fecha DESC, id DESC';

  const rows = db.prepare(sql).all(params);
  return rows.map(mapRow);
}

function getFlete(id) {
  const row = db.prepare('SELECT * FROM fletes WHERE id = ?').get(id);
  return mapRow(row);
}

function createFlete(data) {
  const settings = getSettings();
  const ts = nowIso();
  const lineas = normalizarLineas(data.lineas);

  const info = db.prepare(`
    INSERT INTO fletes (
      folio, fletero, fecha, fecha_texto, lineas_json, precio_flete,
      iva_rate, retencion_rate, isr_rate, observaciones, estado,
      created_at, updated_at
    ) VALUES (
      @folio, @fletero, @fecha, @fecha_texto, @lineas_json, @precio_flete,
      @iva_rate, @retencion_rate, @isr_rate, @observaciones, @estado,
      @created_at, @updated_at
    )
  `).run({
    folio: null,
    fletero: data.fletero,
    fecha: data.fecha,
    fecha_texto: data.fecha_texto || null,
    lineas_json: JSON.stringify(lineas),
    precio_flete: num(data.precio_flete),
    iva_rate: data.iva_rate != null ? num(data.iva_rate) : num(settings.fletes_iva_rate || 0.16),
    retencion_rate: data.retencion_rate != null ? num(data.retencion_rate) : num(settings.fletes_retencion_rate || 0.04),
    isr_rate: data.isr_rate != null ? num(data.isr_rate) : num(settings.fletes_isr_rate || 0.0125),
    observaciones: data.observaciones || null,
    estado: data.estado || 'guardado',
    created_at: ts,
    updated_at: ts
  });

  const id = info.lastInsertRowid;
  const folio = generarFolio(id, data.fecha);
  db.prepare('UPDATE fletes SET folio = ? WHERE id = ?').run(folio, id);

  return getFlete(id);
}

function updateFlete(id, data) {
  const existing = getFlete(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const ts = nowIso();
  const lineas = normalizarLineas(data.lineas !== undefined ? data.lineas : existing.lineas);

  db.prepare(`
    UPDATE fletes SET
      fletero = @fletero,
      fecha = @fecha,
      fecha_texto = @fecha_texto,
      lineas_json = @lineas_json,
      precio_flete = @precio_flete,
      iva_rate = @iva_rate,
      retencion_rate = @retencion_rate,
      isr_rate = @isr_rate,
      observaciones = @observaciones,
      estado = @estado,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    fletero: merged.fletero,
    fecha: merged.fecha,
    fecha_texto: merged.fecha_texto || null,
    lineas_json: JSON.stringify(lineas),
    precio_flete: num(merged.precio_flete),
    iva_rate: num(merged.iva_rate),
    retencion_rate: num(merged.retencion_rate),
    isr_rate: num(merged.isr_rate),
    observaciones: merged.observaciones || null,
    estado: merged.estado || 'guardado',
    updated_at: ts
  });

  return getFlete(id);
}

function deleteFlete(id) {
  const info = db.prepare('DELETE FROM fletes WHERE id = ?').run(id);
  return info.changes > 0;
}

function stats() {
  const totalFletes = db.prepare('SELECT COUNT(*) c FROM fletes').get().c;
  const mesActual = new Date().toISOString().slice(0, 7);
  const esteMes = db.prepare('SELECT COUNT(*) c FROM fletes WHERE fecha LIKE ?').get(`${mesActual}%`).c;
  return { totalFletes, esteMes };
}

module.exports = {
  listFletes,
  getFlete,
  createFlete,
  updateFlete,
  deleteFlete,
  stats
};
