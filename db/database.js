// Conexión y esquema de la base de datos (SQLite local).
//
// Todo el acceso a datos pasa por este archivo y por db/formatos.js.
// El día que se quiera migrar a Supabase, solo hay que reescribir
// db/formatos.js (y este archivo) para hablar con Postgres/Supabase;
// el resto de la app (server.js, frontend) no tiene que cambiar porque
// usa las funciones de db/formatos.js, no SQL directo.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'extraccion.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE IF NOT EXISTS formatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT,
  productor TEXT NOT NULL,
  grua TEXT NOT NULL,
  fecha TEXT NOT NULL,
  fecha_texto TEXT,
  producto_fsc TEXT,

  generos_json TEXT NOT NULL DEFAULT '[]',
  ajustes_json TEXT NOT NULL DEFAULT '[]',

  iva_rate REAL NOT NULL DEFAULT 0.16,
  isr_rate REAL NOT NULL DEFAULT 0.0125,

  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'guardado',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_formatos_fecha ON formatos(fecha);
CREATE INDEX IF NOT EXISTS idx_formatos_grua ON formatos(grua);
CREATE INDEX IF NOT EXISTS idx_formatos_productor ON formatos(productor);
`);

// Migración: versiones anteriores guardaban 3 géneros fijos (genero1/2/3)
// y un "descuento_combustible" fijo en columnas propias. Si la base de
// datos todavía tiene esas columnas, se migran los formatos existentes a
// las listas variables (generos_json / ajustes_json) antes de borrarlas,
// para no perder los formatos ya guardados.
const columnas = db.prepare('PRAGMA table_info(formatos)').all().map((c) => c.name);
if (columnas.includes('genero1_nombre')) {
  if (!columnas.includes('generos_json')) {
    db.exec(`ALTER TABLE formatos ADD COLUMN generos_json TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!columnas.includes('ajustes_json')) {
    db.exec(`ALTER TABLE formatos ADD COLUMN ajustes_json TEXT NOT NULL DEFAULT '[]'`);
  }

  const filas = db.prepare('SELECT * FROM formatos').all();
  const migrarFila = db.prepare('UPDATE formatos SET generos_json = ?, ajustes_json = ? WHERE id = ?');
  const tx = db.transaction((rows) => {
    for (const f of rows) {
      const generos = [1, 2, 3]
        .map((n) => ({
          nombre: f[`genero${n}_nombre`],
          metros: f[`genero${n}_metros`],
          precio: f[`genero${n}_precio`]
        }))
        .filter((g) => g.nombre);
      const ajustes = f.descuento_combustible
        ? [{ etiqueta: 'Descuento combustible', monto: -Math.abs(f.descuento_combustible) }]
        : [];
      migrarFila.run(JSON.stringify(generos), JSON.stringify(ajustes), f.id);
    }
  });
  tx(filas);

  for (const col of [
    'genero1_nombre', 'genero1_metros', 'genero1_precio',
    'genero2_nombre', 'genero2_metros', 'genero2_precio',
    'genero3_nombre', 'genero3_metros', 'genero3_precio',
    'descuento_combustible'
  ]) {
    db.exec(`ALTER TABLE formatos DROP COLUMN ${col}`);
  }
}

// Valores por defecto de configuracion (solo se insertan la primera vez)
const defaults = {
  empresa_nombre: 'Forestal Tezains',
  fsc_texto: 'PRODUCTO FSC 100% NC-FM/COC/000156',
  etiqueta_extra: 'madymsa',
  iva_rate: '0.16',
  isr_rate: '0.0125',
  generos_default_json: JSON.stringify([
    { nombre: 'PINO', precio: 280 },
    { nombre: 'DOBLE ARRASTRE', precio: 150 },
    { nombre: 'TASCATE', precio: 280 }
  ]),
  gruas_lista: 'GRUA # 1,GRUA # 2,GRUA # 3,GRUA # 4,GRUA # 5,GRUA # 6,GRUA # 7,GRUA # 8,GRUA # 9,GRUA # 10',
  logo_path: 'images/logo.png'
};

const insertDefault = db.prepare('INSERT OR IGNORE INTO settings (clave, valor) VALUES (?, ?)');
const insertManyDefaults = db.transaction((obj) => {
  for (const [clave, valor] of Object.entries(obj)) insertDefault.run(clave, valor);
});
insertManyDefaults(defaults);

// Limpieza de ajustes viejos de una versión anterior (géneros/descuento fijos)
// que ya no se usan, para no dejar configuración huérfana en Ajustes.
db.prepare(
  `DELETE FROM settings WHERE clave IN ('genero1_nombre','genero2_nombre','genero3_nombre','precio_default')`
).run();

module.exports = db;
