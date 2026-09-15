const express = require('express');
const path = require('path');
const repo = require('./db/formatos');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

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
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/formatos/:id', (req, res) => {
  const ok = repo.deleteFormato(req.params.id);
  if (!ok) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

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

// ---------------- SPA fallback (React Router) ----------------
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('=========================================================');
  console.log(' Extraccion de Troceria en Rollo - Forestal Tezains');
  console.log(` Servidor corriendo en: http://localhost:${PORT}`);
  console.log('=========================================================');
});
