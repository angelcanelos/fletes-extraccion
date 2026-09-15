// Capa de acceso a datos para "formatos" y "settings".
// Toda la app habla con la base de datos SOLO a través de estas funciones.
// Para migrar a Supabase más adelante, esta es la única pieza que hay
// que reescribir (misma forma de las funciones, pero usando el cliente
// de Supabase/Postgres en lugar de better-sqlite3).

const db = require('./database');

function nowIso() {
  return new Date().toISOString();
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ---------------- Settings ----------------

function getSettings() {
  const rows = db.prepare('SELECT clave, valor FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.clave] = r.valor;
  return obj;
}

function updateSettings(partial) {
  const upsert = db.prepare(`
    INSERT INTO settings (clave, valor) VALUES (@clave, @valor)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `);
  const tx = db.transaction((obj) => {
    for (const [clave, valor] of Object.entries(obj)) {
      upsert.run({ clave, valor: String(valor) });
    }
  });
  tx(partial);
  return getSettings();
}

// ---------------- Formatos ----------------

function generarFolio(id, fecha) {
  const anio = (fecha || '').slice(0, 4) || String(new Date().getFullYear());
  return `${anio}-${String(id).padStart(4, '0')}`;
}

function primerDestino(settings) {
  try {
    const lista = JSON.parse(settings.destinos_json || '[]');
    if (Array.isArray(lista) && lista[0] && lista[0].nombre) return lista[0].nombre;
  } catch { /* ignora settings corruptos */ }
  return 'FORESTAL TEZAINS';
}

function normalizarGeneros(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((g) => ({
      nombre: String((g && g.nombre) || '').trim() || 'GENERO',
      metros: num(g && g.metros),
      precio: num(g && g.precio)
    }))
    .filter((g) => g.nombre);
}

function normalizarAjustes(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((a) => ({
      etiqueta: String((a && a.etiqueta) || '').trim(),
      monto: num(a && a.monto)
    }))
    .filter((a) => a.etiqueta);
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    generos: JSON.parse(row.generos_json || '[]'),
    ajustes: JSON.parse(row.ajustes_json || '[]')
  };
}

function listFormatos({ q, grua, desde, hasta, estado } = {}) {
  let sql = 'SELECT * FROM formatos WHERE 1=1';
  const params = {};

  if (q) {
    sql += ' AND (productor LIKE @q OR folio LIKE @q OR grua LIKE @q OR observaciones LIKE @q)';
    params.q = `%${q}%`;
  }
  if (grua) {
    sql += ' AND grua = @grua';
    params.grua = grua;
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

function getFormato(id) {
  const row = db.prepare('SELECT * FROM formatos WHERE id = ?').get(id);
  return mapRow(row);
}

function createFormato(data) {
  const settings = getSettings();
  const ts = nowIso();

  const generos = normalizarGeneros(data.generos);
  const ajustes = normalizarAjustes(data.ajustes);

  const info = db.prepare(`
    INSERT INTO formatos (
      folio, productor, grua, fecha, fecha_texto, producto_fsc, destino,
      generos_json, ajustes_json, iva_rate, isr_rate,
      observaciones, estado, created_at, updated_at
    ) VALUES (
      @folio, @productor, @grua, @fecha, @fecha_texto, @producto_fsc, @destino,
      @generos_json, @ajustes_json, @iva_rate, @isr_rate,
      @observaciones, @estado, @created_at, @updated_at
    )
  `).run({
    folio: null,
    productor: data.productor,
    grua: data.grua,
    fecha: data.fecha,
    fecha_texto: data.fecha_texto || null,
    producto_fsc: data.producto_fsc || settings.fsc_texto || '',
    destino: data.destino || primerDestino(settings),
    generos_json: JSON.stringify(generos),
    ajustes_json: JSON.stringify(ajustes),
    iva_rate: data.iva_rate != null ? num(data.iva_rate) : num(settings.iva_rate || 0.16),
    isr_rate: data.isr_rate != null ? num(data.isr_rate) : num(settings.isr_rate || 0.0125),
    observaciones: data.observaciones || null,
    estado: data.estado || 'guardado',
    created_at: ts,
    updated_at: ts
  });

  const id = info.lastInsertRowid;
  const folio = generarFolio(id, data.fecha);
  db.prepare('UPDATE formatos SET folio = ? WHERE id = ?').run(folio, id);

  return getFormato(id);
}

function updateFormato(id, data) {
  const existing = getFormato(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const ts = nowIso();
  const generos = normalizarGeneros(data.generos !== undefined ? data.generos : existing.generos);
  const ajustes = normalizarAjustes(data.ajustes !== undefined ? data.ajustes : existing.ajustes);

  db.prepare(`
    UPDATE formatos SET
      productor = @productor,
      grua = @grua,
      fecha = @fecha,
      fecha_texto = @fecha_texto,
      producto_fsc = @producto_fsc,
      destino = @destino,
      generos_json = @generos_json,
      ajustes_json = @ajustes_json,
      iva_rate = @iva_rate,
      isr_rate = @isr_rate,
      observaciones = @observaciones,
      estado = @estado,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    productor: merged.productor,
    grua: merged.grua,
    fecha: merged.fecha,
    fecha_texto: merged.fecha_texto || null,
    producto_fsc: merged.producto_fsc || '',
    destino: merged.destino || '',
    generos_json: JSON.stringify(generos),
    ajustes_json: JSON.stringify(ajustes),
    iva_rate: num(merged.iva_rate),
    isr_rate: num(merged.isr_rate),
    observaciones: merged.observaciones || null,
    estado: merged.estado || 'guardado',
    updated_at: ts
  });

  return getFormato(id);
}

function deleteFormato(id) {
  const info = db.prepare('DELETE FROM formatos WHERE id = ?').run(id);
  return info.changes > 0;
}

function stats() {
  const totalFormatos = db.prepare('SELECT COUNT(*) c FROM formatos').get().c;
  const mesActual = new Date().toISOString().slice(0, 7);
  const esteMes = db.prepare('SELECT COUNT(*) c FROM formatos WHERE fecha LIKE ?').get(`${mesActual}%`).c;
  const gruas = db.prepare('SELECT DISTINCT grua FROM formatos').all().map(r => r.grua);
  return { totalFormatos, esteMes, gruas };
}

module.exports = {
  getSettings,
  updateSettings,
  listFormatos,
  getFormato,
  createFormato,
  updateFormato,
  deleteFormato,
  stats
};
