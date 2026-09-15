const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Nombre fijo de la app: de él depende la carpeta de datos del usuario
// (%APPDATA%\Extraccion de Troceria). Debe fijarse ANTES de leer
// app.getPath('userData') y nunca debe cambiar entre versiones, o cada
// actualización futura empezaría a leer/escribir en una carpeta distinta
// y la secretaria "perdería" sus formatos ya guardados.
app.setName('Extraccion de Troceria');

// La base de datos vive en la carpeta de datos del usuario (fuera de la
// carpeta de instalación de la app), para que sobreviva intacta a cada
// actualización automática. Esto se debe fijar ANTES de requerir server.js
// (que a su vez requiere db/database.js y crea el archivo si hace falta).
process.env.EXTRACCION_DATA_DIR = path.join(app.getPath('userData'), 'data');

const { startServer } = require('../server');

const ES_DEV = !app.isPackaged;
const TIEMPO_MAX_ACTUALIZACION_MS = 15000;

let splashWindow = null;
let mainWindow = null;
let avanzoAVentanaPrincipal = false;

function enviarEstado(texto, detalle) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('estado-actualizacion', { texto, detalle });
  }
}

function crearVentanaSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 460,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    show: false,
    backgroundColor: '#0e2841',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splashWindow.setMenuBarVisibility(false);
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
  splashWindow.on('closed', () => { splashWindow = null; });
}

async function crearVentanaPrincipal(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#f4f8f1',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  Menu.setApplicationMenu(null);
  mainWindow.maximize();
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.show();
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function avanzarAVentanaPrincipal() {
  if (avanzoAVentanaPrincipal) return;
  avanzoAVentanaPrincipal = true;
  enviarEstado('Iniciando la aplicación…');
  const { port } = await startServer(0);
  await crearVentanaPrincipal(port);
}

function configurarAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    enviarEstado('Buscando actualizaciones…');
  });

  autoUpdater.on('update-not-available', () => {
    avanzarAVentanaPrincipal();
  });

  autoUpdater.on('update-available', (info) => {
    enviarEstado('Descargando actualización…', `Versión ${info.version}`);
    autoUpdater.downloadUpdate().catch(() => avanzarAVentanaPrincipal());
  });

  autoUpdater.on('download-progress', (progreso) => {
    enviarEstado(
      'Descargando actualización…',
      `${Math.round(progreso.percent)}%`
    );
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('progreso-actualizacion', progreso.percent);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    enviarEstado('Actualización lista. Reiniciando…');
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 1200);
  });

  autoUpdater.on('error', () => {
    // Sin internet, sin conexión al repositorio, etc: seguimos con la
    // versión que ya está instalada en vez de dejar a la secretaria
    // atorada en la pantalla de carga.
    avanzarAVentanaPrincipal();
  });
}

app.whenReady().then(() => {
  crearVentanaSplash();

  if (!ES_DEV) {
    configurarAutoUpdater();
    // Si la revisión de actualizaciones tarda demasiado (sin internet,
    // GitHub lento, etc.), no dejamos a la secretaria esperando.
    setTimeout(avanzarAVentanaPrincipal, TIEMPO_MAX_ACTUALIZACION_MS);
    autoUpdater.checkForUpdates().catch(() => avanzarAVentanaPrincipal());
  } else {
    // En desarrollo no hay feed de actualizaciones publicado: se entra
    // directo a la app.
    avanzarAVentanaPrincipal();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) avanzarAVentanaPrincipal();
});

ipcMain.on('splash-listo', () => {
  // El renderer del splash ya cargó y está escuchando eventos.
});
