const express = require('express');
const path = require('path');
const repo = require('./db/formatos');
const repoFletes = require('./db/fletes');
const supabaseSync = require('./db/supabaseSync');

const INTERVALO_SYNC_MS = 10 * 60 * 1000;

// Dispara el respaldo a Supabase sin bloquear ni romper la respuesta HTTP
// que ya se envió al usuario. Cualquier falla (sin internet, credenciales
// mal puestas, etc.) se queda registrada en supabaseSync.estado() para la
// pantalla de Ajustes, y se reintenta en el próximo guardado o intervalo.
function dispararSync() {
  supabaseSync.sincronizar().catch(() => { /* ver supabaseSync.estado() */ });
}

const DIST_DIR = path.join(__dirname, 'dist');

function crearApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(DIST_DIR));

  // ---------------- API: settings ----------------

  app.get('/api/settings', (req, res) => {
    res.json(repo.getSettings());
  });

  app.put('/api/settings', (req, res) => {
    const updated = repo.updateSettings(req.body || {});
    res.json(updated);
  });

  // ---------------- API: formatos ----------------

  app.get('/api/formatos', (req, res) => {
    const { q, grua, desde, hasta, estado } = req.query;
    res.json(repo.listFormatos({ q, grua, desde, hasta, estado }));
  });

  app.get('/api/formatos/stats', (req, res) => {
    res.json(repo.stats());
  });

  app.get('/api/formatos/:id', (req, res) => {
    const f = repo.getFormato(req.params.id);
    if (!f) return res.status(404).json({ error: 'No encontrado' });
    res.json(f);
  });

  app.post('/api/formatos', (req, res) => {
    try {
      validarFormato(req.body);
      const creado = repo.createFormato(req.body);
      res.status(201).json(creado);
      dispararSync();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/formatos/:id', (req, res) => {
    try {
      validarFormato(req.body, true);
      const actualizado = repo.updateFormato(req.params.id, req.body);
      if (!actualizado) return res.status(404).json({ error: 'No encontrado' });
      res.json(actualizado);
      dispararSync();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/formatos/:id', (req, res) => {
    const ok = repo.deleteFormato(req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  });

  // ---------------- API: fletes ----------------

  app.get('/api/fletes', (req, res) => {
    const { q, grua, fletero, desde, hasta, estado } = req.query;
    res.json(repoFletes.listFletes({ q, grua, fletero, desde, hasta, estado }));
  });

  app.get('/api/fletes/stats', (req, res) => {
    res.json(repoFletes.stats());
  });

  app.get('/api/fletes/:id', (req, res) => {
    const f = repoFletes.getFlete(req.params.id);
    if (!f) return res.status(404).json({ error: 'No encontrado' });
    res.json(f);
  });

  app.post('/api/fletes', (req, res) => {
    try {
      validarFlete(req.body);
      const creado = repoFletes.createFlete(req.body);
      res.status(201).json(creado);
      dispararSync();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/fletes/:id', (req, res) => {
    try {
      validarFlete(req.body, true);
      const actualizado = repoFletes.updateFlete(req.params.id, req.body);
      if (!actualizado) return res.status(404).json({ error: 'No encontrado' });
      res.json(actualizado);
      dispararSync();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/fletes/:id', (req, res) => {
    const ok = repoFletes.deleteFlete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  });

  // ---------------- API: respaldo en la nube (Supabase) ----------------

  app.get('/api/sync/status', (req, res) => {
    res.json(supabaseSync.estado());
  });

  app.post('/api/sync/ahora', async (req, res) => {
    const resultado = await supabaseSync.sincronizar();
    res.json(resultado);
  });

  app.post('/api/sync/probar', async (req, res) => {
    const { url, key } = req.body || {};
    const resultado = await supabaseSync.probarConexion(url, key);
    res.json(resultado);
  });

  // ---------------- SPA fallback (React Router) ----------------
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });

  return app;
}

function validarFormato(body, esEdicion) {
  if (!body) throw new Error('Datos vacíos');
  if (!esEdicion || body.productor !== undefined) {
    if (!body.productor || !String(body.productor).trim()) {
      throw new Error('El nombre del productor es obligatorio');
    }
  }
  if (!esEdicion || body.grua !== undefined) {
    if (!body.grua || !String(body.grua).trim()) {
      throw new Error('La grúa es obligatoria');
    }
  }
  if (!esEdicion || body.fecha !== undefined) {
    if (!body.fecha) throw new Error('La fecha es obligatoria');
  }
}

function validarFlete(body, esEdicion) {
  if (!body) throw new Error('Datos vacíos');
  if (!esEdicion || body.fletero !== undefined) {
    if (!body.fletero || !String(body.fletero).trim()) {
      throw new Error('El fletero es obligatorio');
    }
  }
  if (!esEdicion || body.fecha !== undefined) {
    if (!body.fecha) throw new Error('La fecha es obligatoria');
  }
}

// Arranca el servidor y resuelve con el puerto real en el que quedó
// escuchando (útil para Electron, que pide un puerto libre con 0).
function startServer(port = process.env.PORT || 3000) {
  return new Promise((resolve, reject) => {
    const app = crearApp();
    const server = app.listen(port, '127.0.0.1', () => {
      // Al abrir la app: si hay internet y el respaldo está configurado,
      // sube de una vez lo que haya quedado pendiente de la sesión
      // anterior. Y por si se abrió sin internet, reintenta cada rato para
      // no depender de que la secretaria vuelva a guardar algo.
      dispararSync();
      const intervalo = setInterval(dispararSync, INTERVALO_SYNC_MS);
      server.on('close', () => clearInterval(intervalo));
      resolve({ server, port: server.address().port });
    });
    server.on('error', reject);
  });
}

module.exports = { crearApp, startServer };

// Si se ejecuta directamente (node server.js / npm start), arranca solo.
if (require.main === module) {
  startServer().then(({ port }) => {
    console.log('=========================================================');
    console.log(' Extraccion de Troceria en Rollo - Forestal Tezains');
    console.log(` Servidor corriendo en: http://localhost:${port}`);
    console.log('=========================================================');
  });
}
