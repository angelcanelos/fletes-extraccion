// Helper para hablar con la API del servidor (Express + SQLite hoy;
// mañana Supabase, sin que el resto de la app tenga que cambiar).

export const Api = {
  async listarFormatos(params) {
    const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v));
    const res = await fetch('/api/formatos?' + qs.toString());
    return res.json();
  },
  async obtenerFormato(id) {
    const res = await fetch(`/api/formatos/${id}`);
    if (!res.ok) throw new Error('No se encontró el formato');
    return res.json();
  },
  async crearFormato(data) {
    const res = await fetch('/api/formatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al guardar');
    return body;
  },
  async actualizarFormato(id, data) {
    const res = await fetch(`/api/formatos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al guardar');
    return body;
  },
  async eliminarFormato(id) {
    const res = await fetch(`/api/formatos/${id}`, { method: 'DELETE' });
    return res.ok;
  },
  async stats() {
    const res = await fetch('/api/formatos/stats');
    return res.json();
  },
  async obtenerSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  },
  async actualizarSettings(data) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ---------------- Fletes ----------------
  async listarFletes(params) {
    const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v));
    const res = await fetch('/api/fletes?' + qs.toString());
    return res.json();
  },
  async obtenerFlete(id) {
    const res = await fetch(`/api/fletes/${id}`);
    if (!res.ok) throw new Error('No se encontró el flete');
    return res.json();
  },
  async crearFlete(data) {
    const res = await fetch('/api/fletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al guardar');
    return body;
  },
  async actualizarFlete(id, data) {
    const res = await fetch(`/api/fletes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al guardar');
    return body;
  },
  async eliminarFlete(id) {
    const res = await fetch(`/api/fletes/${id}`, { method: 'DELETE' });
    return res.ok;
  },
  async statsFletes() {
    const res = await fetch('/api/fletes/stats');
    return res.json();
  }
};
