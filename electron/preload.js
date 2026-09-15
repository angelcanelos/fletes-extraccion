const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('actualizador', {
  onEstado: (callback) => {
    ipcRenderer.on('estado-actualizacion', (_event, datos) => callback(datos));
  },
  onProgreso: (callback) => {
    ipcRenderer.on('progreso-actualizacion', (_event, porcentaje) => callback(porcentaje));
  },
  listo: () => ipcRenderer.send('splash-listo')
});
