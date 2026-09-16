// Respaldo de solo-subida (local -> Supabase) de formatos y fletes.
//
// SQLite (db/database.js) sigue siendo la fuente de verdad de la app; este
// módulo solo intenta mantener una copia de seguridad al día en Supabase.
// Nunca debe afectar el guardado local: cualquier error de red o de
// credenciales se atrapa aquí y simplemente se reintenta en el siguiente
// intento (al crear/editar algo, al abrir la app, o en el intervalo
// periódico que arma server.js).

const { createClient } = require('@supabase/supabase-js');
const db = require('./database');
const { getSettings } = require('./formatos');

const TIMEOUT_PRUEBA_MS = 8000;
const TIMEOUT_SYNC_MS = 20000;

// Columnas que se copian tal cual de SQLite a Supabase. La identidad que
// une ambos lados es "uuid" (generado localmente al crear la fila), no el
// id autoincremental de SQLite, que solo tiene sentido en esta computadora.
const TABLAS = [
  {
    tabla: 'formatos',
    columnas: [
      'folio', 'productor', 'grua', 'fecha', 'fecha_texto', 'producto_fsc',
      'destino', 'generos_json', 'ajustes_json', 'iva_rate', 'isr_rate',
      'observaciones', 'estado', 'created_at', 'updated_at'
    ]
  },
  {
    tabla: 'fletes',
    columnas: [
      'folio', 'fletero', 'fecha', 'fecha_texto', 'lineas_json', 'precio_flete',
      'ajustes_json', 'iva_rate', 'retencion_rate', 'isr_rate', 'observaciones',
      'estado', 'created_at', 'updated_at'
    ]
  }
];

const estadoMemoria = {
  sincronizando: false,
  ultimoIntento: null,
  ultimoExito: null,
  ultimoError: null
};

function abortSignalConTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, limpiar: () => clearTimeout(timer) };
}

// Traduce errores técnicos de red (fetch/undici) a algo que la secretaria
// pueda entender sin tener que leer un stack trace.
function mensajeError(err) {
  if (err && err.name === 'AbortError') return 'Tiempo de espera agotado (revisa tu internet).';
  const texto = (err && err.message) || String(err || '');
  if (/fetch failed/i.test(texto)) return 'No se pudo conectar (revisa tu internet o la URL del proyecto).';
  return texto || 'No se pudo conectar.';
}

function getClient(url, key) {
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

function clienteConfigurado() {
  const settings = getSettings();
  if (settings.supabase_enabled !== 'true') return null;
  return getClient(settings.supabase_url, settings.supabase_key);
}

// Prueba una URL/clave sin necesidad de haberlas guardado todavía (para el
// botón "Probar conexión" de Ajustes).
async function probarConexion(url, key) {
  const client = getClient(url, key);
  if (!client) return { ok: false, error: 'Falta la URL o la clave del proyecto.' };

  const { signal, limpiar } = abortSignalConTimeout(TIMEOUT_PRUEBA_MS);
  try {
    const { error } = await client
      .from('formatos')
      .select('uuid', { head: true, count: 'exact' })
      .abortSignal(signal);
    if (error) return { ok: false, error: mensajeError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mensajeError(err) };
  } finally {
    limpiar();
  }
}

function contarPendientes() {
  const resultado = {};
  for (const { tabla } of TABLAS) {
    const fila = db.prepare(
      `SELECT COUNT(*) c FROM ${tabla} WHERE synced_at IS NULL OR synced_at < updated_at`
    ).get();
    resultado[tabla] = fila.c;
  }
  return resultado;
}

function estado() {
  const settings = getSettings();
  return {
    habilitado: settings.supabase_enabled === 'true',
    configurado: !!(settings.supabase_url && settings.supabase_key),
    sincronizando: estadoMemoria.sincronizando,
    ultimoIntento: estadoMemoria.ultimoIntento,
    ultimoExito: estadoMemoria.ultimoExito,
    ultimoError: estadoMemoria.ultimoError,
    pendientes: contarPendientes()
  };
}

async function subirTabla(client, tabla, columnas) {
  const filas = db.prepare(
    `SELECT * FROM ${tabla} WHERE synced_at IS NULL OR synced_at < updated_at`
  ).all();
  if (!filas.length) return;

  const registros = filas.map((fila) => {
    const registro = { uuid: fila.uuid, local_id: fila.id };
    for (const col of columnas) registro[col] = fila[col];
    return registro;
  });

  const { signal, limpiar } = abortSignalConTimeout(TIMEOUT_SYNC_MS);
  try {
    const { error } = await client
      .from(tabla)
      .upsert(registros, { onConflict: 'uuid' })
      .abortSignal(signal);
    if (error) throw new Error(mensajeError(error));
  } catch (err) {
    throw new Error(mensajeError(err));
  } finally {
    limpiar();
  }

  const marcar = db.prepare(`UPDATE ${tabla} SET synced_at = ? WHERE id = ?`);
  const tx = db.transaction((rows) => {
    for (const fila of rows) marcar.run(fila.updated_at, fila.id);
  });
  tx(filas);
}

// Sube a Supabase todo lo que quedó pendiente en SQLite. Se puede llamar
// tantas veces como se quiera (al guardar algo, al iniciar, en el
// intervalo periódico): si ya hay una sincronización en curso, no arranca
// otra encima, y si no hay nada pendiente no hace ninguna llamada de red.
async function sincronizar() {
  if (estadoMemoria.sincronizando) return estado();
  const client = clienteConfigurado();
  if (!client) return estado();

  estadoMemoria.sincronizando = true;
  estadoMemoria.ultimoIntento = new Date().toISOString();
  let huboError = false;

  for (const { tabla, columnas } of TABLAS) {
    try {
      await subirTabla(client, tabla, columnas);
    } catch (err) {
      huboError = true;
      estadoMemoria.ultimoError = `${tabla}: ${mensajeError(err)}`;
    }
  }

  if (!huboError) {
    estadoMemoria.ultimoExito = estadoMemoria.ultimoIntento;
    estadoMemoria.ultimoError = null;
  }
  estadoMemoria.sincronizando = false;
  return estado();
}

module.exports = {
  probarConexion,
  sincronizar,
  estado
};
