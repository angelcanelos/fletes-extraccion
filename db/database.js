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

// En la app de escritorio (Electron), main.js fija EXTRACCION_DATA_DIR a la
// carpeta de datos del usuario (userData) antes de requerir este archivo,
// para que la base de datos viva fuera de la carpeta de instalación y no se
// pierda ni se sobreescriba con cada actualización. Fuera de Electron (web,
// desarrollo), se usa la carpeta ../data de siempre.
const DATA_DIR = process.env.EXTRACCION_DATA_DIR || path.join(__dirname, '..', 'data');
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

CREATE TABLE IF NOT EXISTS fletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT,
  fletero TEXT NOT NULL,
  fecha TEXT NOT NULL,
  fecha_texto TEXT,

  lineas_json TEXT NOT NULL DEFAULT '[]',
  precio_flete REAL NOT NULL DEFAULT 0,
  ajustes_json TEXT NOT NULL DEFAULT '[]',

  iva_rate REAL NOT NULL DEFAULT 0.16,
  retencion_rate REAL NOT NULL DEFAULT 0.04,
  isr_rate REAL NOT NULL DEFAULT 0.0125,

  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'guardado',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fletes_fecha ON fletes(fecha);
CREATE INDEX IF NOT EXISTS idx_fletes_fletero ON fletes(fletero);
`);

// Migración: agrega la columna "destino" a formatos ya existentes (antes
// se mostraba un texto fijo de Ajustes; ahora se elige por formato de un
// catálogo). Los formatos viejos se quedan con el texto que ya usaban.
{
  const cols = db.prepare('PRAGMA table_info(formatos)').all().map((c) => c.name);
  if (!cols.includes('destino')) {
    db.exec(`ALTER TABLE formatos ADD COLUMN destino TEXT NOT NULL DEFAULT ''`);
    const previo = db.prepare(`SELECT valor FROM settings WHERE clave = 'etiqueta_extra'`).get();
    db.prepare('UPDATE formatos SET destino = ? WHERE destino = \'\'').run(previo ? previo.valor : 'FORESTAL TEZAINS');
  }
}

// Migración: agrega la columna "ajustes_json" a fletes ya existentes
// (descuentos o cargos adicionales, igual que en formatos). Los fletes
// viejos quedan sin ajustes (equivalente a "[]").
{
  const cols = db.prepare('PRAGMA table_info(fletes)').all().map((c) => c.name);
  if (!cols.includes('ajustes_json')) {
    db.exec(`ALTER TABLE fletes ADD COLUMN ajustes_json TEXT NOT NULL DEFAULT '[]'`);
  }
}

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
  gruas_json: JSON.stringify([
    { grua: 'GRUA 1', productor: 'JOSE ANGEL RODRIGUEZ', precio_flete: 290.76 },
    { grua: 'GRUA 2', productor: 'FIDENCIO NUÑEZ RAMIREZ', precio_flete: 234.71 },
    { grua: 'GRUA 3', productor: 'FRANCISCO ESPINOZA REYES', precio_flete: 291.00 },
    { grua: 'GRUA 4', productor: 'RAMON NUÑEZ NUÑEZ', precio_flete: 198.66 },
    { grua: 'GRUA 5', productor: 'MARTIN RODRIGUEZ M.', precio_flete: 273.52 },
    { grua: 'GRUA 6', productor: 'MARCO ANTONIO REYES', precio_flete: 222.35 },
    { grua: 'GRUA 7', productor: 'X', precio_flete: 0 },
    { grua: 'GRUA 8', productor: 'JOSE ANTONIO VIRREY', precio_flete: 226.38 },
    { grua: 'GRUA 9', productor: 'COSME RODRIGUEZ CORRAL', precio_flete: 278.40 },
    { grua: 'GRUA 10', productor: 'OCTAVIO VIRREY REYES', precio_flete: 270.80 }
  ]),
  destinos_json: JSON.stringify([
    { nombre: 'FORESTAL TEZAINS' }
  ]),
  fleteros_json: JSON.stringify([
    { nombre: 'FIDENCIO NUÑEZ RAMIREZ', retencion: true, isr: false },
    { nombre: 'LEONEL RIVERA RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'RAMON NUÑEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'EMILIO RIVERA RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'MARCO ANTONIO REYES QUINTERO', retencion: true, isr: true },
    { nombre: 'SEVERIANO REYES ACOSTA', retencion: true, isr: false },
    { nombre: 'MARTIN RODRIGUEZ RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'NOE DE LA CRUZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'ADAN DE LA CRUZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'MARIO RODRIGUEZ MONTENEGRO', retencion: true, isr: true },
    { nombre: 'GABRIEL NUÑEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'JANETH ESTRADA BLANCO', retencion: true, isr: false },
    { nombre: 'CARLOS RODRIGUEZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'OCTAVIO VIRREY REYES', retencion: true, isr: true },
    { nombre: 'SIMON REYES ACOSTA', retencion: true, isr: false },
    { nombre: 'COSME RODRIGUEZ CORRAL', retencion: true, isr: true },
    { nombre: 'JOSE ANGEL RODRIGUEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'JESUS OMAR RODRIGUEZ VIRREY', retencion: true, isr: true },
    { nombre: 'PEDRO REYES ROJO', retencion: true, isr: true },
    { nombre: 'ELEAZAR BARRAZA NEVAREZ', retencion: true, isr: true },
    { nombre: 'BALDOMERO SANCHEZ VIRREY', retencion: true, isr: false },
    { nombre: 'ELIAS MEZA MARTINEZ', retencion: true, isr: true }
  ]),
  parajes_json: JSON.stringify([
    { nombre: 'RANCHO QUEMADO' }
  ]),
  fletes_iva_rate: '0.16',
  fletes_retencion_rate: '0.04',
  fletes_isr_rate: '0.0125',
  logo_path: 'images/logo.png'
};

const insertDefault = db.prepare('INSERT OR IGNORE INTO settings (clave, valor) VALUES (?, ?)');
const insertManyDefaults = db.transaction((obj) => {
  for (const [clave, valor] of Object.entries(obj)) insertDefault.run(clave, valor);
});
insertManyDefaults(defaults);

// Migración: si ya existía un catálogo de grúas de una versión anterior
// (sin precio_flete por grúa), se completa con 0 en vez de perder las
// grúas/productores ya capturados.
{
  const fila = db.prepare(`SELECT valor FROM settings WHERE clave = 'gruas_json'`).get();
  if (fila) {
    try {
      const lista = JSON.parse(fila.valor || '[]');
      if (Array.isArray(lista) && lista.some((g) => g && g.precio_flete === undefined)) {
        const completa = lista.map((g) => ({ ...g, precio_flete: g.precio_flete != null ? g.precio_flete : 0 }));
        db.prepare(`UPDATE settings SET valor = ? WHERE clave = 'gruas_json'`).run(JSON.stringify(completa));
      }
    } catch { /* ignora json corrupto */ }
  }
}

// Migración: agrega al catálogo de fleteros ya guardado los nombres nuevos
// que no estaban capturados todavía, sin duplicar ni perder los que la
// secretaria ya haya agregado a mano desde Ajustes.
{
  const fila = db.prepare(`SELECT valor FROM settings WHERE clave = 'fleteros_json'`).get();
  if (fila) {
    try {
      const actual = JSON.parse(fila.valor || '[]');
      const nuevos = JSON.parse(defaults.fleteros_json);
      if (Array.isArray(actual)) {
        const mapaNuevos = {};
        nuevos.forEach((f) => { mapaNuevos[f.nombre.trim().toUpperCase()] = f; });
        const yaExiste = new Set(actual.map((f) => (f && f.nombre || '').trim().toUpperCase()));
        const faltantes = nuevos.filter((f) => !yaExiste.has(f.nombre.trim().toUpperCase()));
        // Migrar formato viejo (retencion_rate/isr_rate) a nuevo (retencion/isr boolean)
        const completa = actual.map((f) => {
          if (!f) return f;
          // Si ya tiene el formato nuevo (retencion/isr como boolean), dejarlo
          if (typeof f.retencion === 'boolean' && typeof f.isr === 'boolean') return f;
          // Convertir de formato viejo
          const def = mapaNuevos[(f.nombre || '').trim().toUpperCase()];
          return {
            nombre: f.nombre,
            retencion: f.retencion_rate != null ? f.retencion_rate > 0 : (def ? def.retencion : true),
            isr: f.isr_rate != null ? f.isr_rate > 0 : (def ? def.isr : false)
          };
        });
        if (faltantes.length || completa.some((f, i) => f !== actual[i])) {
          db.prepare(`UPDATE settings SET valor = ? WHERE clave = 'fleteros_json'`)
            .run(JSON.stringify([...completa, ...faltantes]));
        }
      }
    } catch { /* ignora json corrupto */ }
  }
}

// Limpieza de ajustes viejos de una versión anterior (géneros/descuento fijos,
// lista de grúas en texto plano) que ya no se usan, para no dejar
// configuración huérfana en Ajustes.
db.prepare(
  `DELETE FROM settings WHERE clave IN ('genero1_nombre','genero2_nombre','genero3_nombre','precio_default','gruas_lista')`
).run();

module.exports = db;
