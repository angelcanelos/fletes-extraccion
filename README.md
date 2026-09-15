# Forestal Tezains — Extracción y Fletes

Aplicación para crear, guardar e imprimir dos comprobantes:

- **Extracción de Trocería en Rollo** (`/extraccion`): logo, cintillo azul, cajas de
  productor/grúa/fecha, tabla de géneros, IVA, ISR y saldo a favor.
- **Flete de Madera en Rollo** (`/fletes`): recreación fiel del comprobante de flete en
  hoja completa (título, fletero, fecha, tabla de viajes por folio/paraje/grúa/metros, IVA,
  retención e ISR).

Ambos comprobantes impresos están congelados en su diseño — no se deben modificar salvo que
de verdad cambie el formato oficial.

## Cómo abrir la aplicación (para la secretaria)

Ahora la app es un programa normal de Windows, no hay que abrir el navegador ni usar
`start.bat`:

1. Se instala una sola vez con el instalador (`Extraccion.de.Troceria.Setup.x.x.x.exe`),
   que se descarga desde la página de **Releases** del repositorio de GitHub. Doble clic,
   "Siguiente", "Siguiente", "Instalar".
2. Después de instalada, se abre desde el acceso directo que queda en el Escritorio o en
   el menú de Inicio, como cualquier otro programa (Word, Excel, etc.).
3. Cada vez que abre, aparece un momento una pantalla de carga (con el logo) que revisa si
   hay una versión nueva; si la hay, la descarga e instala sola, y la app se reabre ya
   actualizada. Si no hay internet en ese momento, simplemente abre con la versión que ya
   tenía instalada — nunca se queda atorada esperando.

No hace falta instalar Node.js para usarla (eso ya solo es necesario para programar/
modificar la app). Ver la sección **App de escritorio (Electron) y actualizaciones
automáticas** más abajo para el detalle técnico y cómo publicar una actualización nueva.

### Modo anterior (navegador), para desarrollo

`start.bat` (y `npm start`) siguen funcionando igual que antes: compilan la interfaz y
levantan el servidor en `http://localhost:3000` para abrir desde el navegador. Es el modo
útil para desarrollar/probar rápido; la secretaria no lo necesita.

## Qué puedes hacer

- **Extracción**: las grúas se muestran como carpetas (con su productor fijo); al abrir una
  se ve la lista de sus formatos. El buscador y los filtros (grúa, fecha, estado) siguen
  disponibles arriba y, al usarlos, cambian a una lista plana con los resultados. Al crear un
  formato solo eliges grúa (el productor se llena solo) y destino de una lista; los géneros y
  ajustes (descuentos o cargos, opcionales) se llenan libremente. IVA fijo, ISR opcional.
- **Fletes**: al crear un flete eliges el fletero de una lista, agregas los viajes (fecha,
  folio, paraje, grúa, metros — tantas filas como haga falta) y el precio de flete se sugiere
  solo según la grúa del primer viaje. IVA, retención e ISR son todos opcionales por flete.
- **Ajustes**: datos generales de la empresa e impuestos por defecto (Extracción y Fletes),
  y la sección **Catálogos** — géneros, grúas (con productor y precio de flete), destinos y
  fleteros — cada uno con su propio botón de guardar, sin mezclar todo en un solo formulario.
- **Imprimir**: abre el comprobante ya guardado y usa el botón "Imprimir" (o Ctrl+P). Puedes
  indicarle a tu impresora cuántas copias quieres.

## El logo

Por ahora se está usando un logo recortado de la imagen que enviaste, como referencia. Para
poner el logo oficial en buena calidad:

1. Consigue el archivo del logo (idealmente PNG, cuadrado o circular, fondo transparente o
   blanco).
2. Cópialo dentro de la carpeta `public/images` de este proyecto.
3. Ponle de nombre exactamente `logo.png` (reemplazando el que ya existe).
4. Recarga la página del navegador — se actualiza automáticamente en toda la app y en el
   formato impreso.

## Dónde se guardan los datos

- **App de escritorio (la que usa la secretaria):** los formatos viven en un archivo SQLite
  dentro de la carpeta de datos de Windows del usuario:
  `%APPDATA%\Extraccion de Troceria\data\extraccion.db` (típicamente
  `C:\Users\<usuario>\AppData\Roaming\Extraccion de Troceria\data\extraccion.db`). Esa
  carpeta está **fuera** de donde se instala el programa, así que las actualizaciones
  automáticas nunca la tocan ni la borran — se actualiza el programa, los datos se quedan
  intactos. Para respaldarla, copia esa carpeta a un USB o a la nube.
- **Modo navegador / desarrollo:** se guarda en `data/extraccion.db` dentro de esta misma
  carpeta del proyecto, como antes.

## El formato impreso no se debe modificar

Los estilos que definen cómo se ve e imprime el formato están en
`src/styles/formato.css` (es el mismo archivo `formato.css` de siempre, sin cambios).
La estructura HTML del comprobante vive en `src/components/ReciboFormato.jsx` y se
usa tanto en la vista previa (al crear/editar) como en la pantalla de impresión, así
que siempre se ve exactamente igual. Evita modificar esos dos archivos salvo que de
verdad quieras cambiar el diseño del comprobante (por ejemplo, el próximo año, si
cambia el formato oficial).

## Migrar a Supabase más adelante

Hoy la app usa SQLite local (`db/database.js` y `db/formatos.js`) para que puedas usarla ya
mismo sin depender de internet. Cuando quieras pasar a Supabase (por ejemplo, para que varias
personas capturen desde distintas computadoras y todo se vea en un solo lugar), lo que hay que
hacer es:

1. Crear un proyecto en Supabase y una tabla `formatos` con las mismas columnas que ves en
   `db/database.js`.
2. Reescribir las funciones de `db/formatos.js` (`listFormatos`, `getFormato`, `createFormato`,
   `updateFormato`, `deleteFormato`, `getSettings`, `updateSettings`) para que usen el cliente
   de Supabase (`@supabase/supabase-js`) en lugar de `better-sqlite3`.
3. El resto de la aplicación (el servidor `server.js` y todas las páginas web) no necesita
   cambios, porque solo hablan con esas funciones, nunca directamente con la base de datos.

Cuando llegue el momento, se puede pedir ayuda para hacer esa migración sin perder los
formatos ya capturados (se exportan de SQLite y se importan a Supabase).

## App de escritorio (Electron) y actualizaciones automáticas

La app se empaqueta como un programa de escritorio de Windows con
[Electron](https://www.electronjs.org/) y se actualiza sola usando
[`electron-updater`](https://www.electron.build/auto-update) contra los **Releases** del
repositorio de GitHub (`angelcanelos/fletes-extraccion`). Así, cuando se le agregan
funciones nuevas a la app, la secretaria solo tiene que volver a abrirla para recibirlas —
no hay que reinstalar nada a mano.

### Requisito: el repositorio debe ser público

`electron-updater` revisa actualizaciones consultando la API pública de GitHub, sin ningún
token. Eso solo funciona si el repositorio es **público** (si es privado, la revisión de
actualizaciones falla). Para cambiarlo una sola vez:

1. Entra a https://github.com/angelcanelos/fletes-extraccion/settings
2. Baja hasta "Danger Zone" → **Change visibility** → **Change to public** → confirma
   escribiendo el nombre del repositorio.

No hay ningún dato sensible en el repositorio (la base de datos con los formatos reales
nunca se sube, está en `.gitignore`), así que hacerlo público no expone información de la
empresa ni de los formatos capturados — solo el código.

### Cómo funciona al abrir la app

1. `electron/main.js` arranca y muestra `electron/splash.html`: una pantalla de carga con
   el logo (estilo Discord) mientras revisa actualizaciones.
2. Si hay una versión nueva publicada en GitHub Releases, la descarga mostrando el
   progreso en esa misma pantalla, la instala y reinicia la app sola.
3. Si no hay actualización (o no hay internet), pasa directo a la ventana principal, que
   carga la misma interfaz React de siempre servida por un Express local en un puerto
   libre — la secretaria no nota ninguna diferencia con "la app".
4. Los datos (`db/database.js`) se guardan en la carpeta de datos del usuario de Windows,
   no dentro de la carpeta donde se instala el programa — por diseño, para que sobrevivan
   sin problema a cada actualización (ver "Dónde se guardan los datos" arriba).

### Publicar una actualización nueva

Cada vez que se le agregan funciones o se corrige algo:

1. Sube el cambio de versión: edita el campo `"version"` en `package.json` (por ejemplo
   de `"2.0.0"` a `"2.1.0"`) — `electron-updater` compara este número para saber si hay
   algo más nuevo que lo instalado, así que **si no cambia, no hay actualización**.
2. Confirma (`git commit`) y sube (`git push`) a la rama `main`, como siempre.
3. Eso dispara automáticamente el flujo de GitHub Actions en
   `.github/workflows/release.yml`, que compila el instalador de Windows y lo publica como
   un nuevo Release en GitHub (usando `npm run electron:publish`, con
   `electron-builder`). Se puede ver el progreso en la pestaña **Actions** del
   repositorio.
4. La próxima vez que la secretaria abra la app, la pantalla de carga detecta ese Release
   nuevo, lo descarga e instala sola.

También se puede compilar y publicar manualmente desde esta computadora (por ejemplo si
GitHub Actions no está disponible), con un token de GitHub con permiso de escribir
Releases:

```bash
GH_TOKEN=tu_token_de_github npm run electron:publish
```

Y para solo compilar el instalador sin publicarlo (probarlo localmente antes de subirlo):

```bash
npm run electron:build
```

El instalador queda en la carpeta `release/` (no se sube al repositorio).

## Estructura del proyecto

La aplicación ahora está hecha con **React + Tailwind CSS** (usando Vite como
herramienta de construcción) para la interfaz, y sigue usando **Express + SQLite**
para el servidor y los datos, igual que antes.

```
extraccion-app/
├── electron/                    app de escritorio (Electron)
│   ├── main.js                  proceso principal: splash, auto-updater, ventana
│   ├── preload.js               puente seguro para el splash
│   ├── splash.html              pantalla de carga / actualizando (estilo Discord)
│   └── assets/                  logo.png e icon.ico del instalador
├── .github/workflows/
│   └── release.yml              compila y publica un Release al hacer push a main
├── server.js                    servidor y rutas de la API (Express)
├── db/
│   ├── database.js              conexión y esquema de SQLite (respeta EXTRACCION_DATA_DIR)
│   └── formatos.js              funciones para leer/guardar formatos y ajustes
├── src/                         código fuente de la interfaz (React)
│   ├── main.jsx                 punto de entrada
│   ├── App.jsx                  rutas de la aplicación
│   ├── pages/
│   │   ├── Dashboard.jsx        pantalla de inicio (lista de formatos)
│   │   ├── FormatoForm.jsx      crear / editar formato con vista previa
│   │   ├── Imprimir.jsx         formato listo para imprimir
│   │   └── Ajustes.jsx          configuración
│   ├── components/
│   │   ├── ReciboFormato.jsx    estructura del comprobante (no mover)
│   │   ├── NavBar.jsx           barra superior
│   │   ├── PageLayout.jsx       encabezado + pie de página comunes
│   │   ├── Panel.jsx / Campo.jsx  bloques de formulario reutilizables
│   │   ├── Toast.jsx            notificaciones (éxito/error)
│   │   └── ConfirmDialog.jsx    diálogo de confirmación (reemplaza confirm())
│   ├── lib/
│   │   ├── calc.js              cálculo de totales, IVA, ISR
│   │   └── api.js               llamadas a la API del servidor
│   └── styles/
│       ├── index.css            estilos base + Tailwind
│       └── formato.css          diseño oficial del formato impreso (no tocar)
├── public/
│   └── images/
│       └── logo.png             logo (reemplazar por el oficial)
├── dist/                        interfaz ya compilada (se genera sola, no editar)
├── release/                     instaladores compilados (se genera sola, no se sube)
├── data/                        se crea sola; aquí vive la base de datos (modo navegador)
├── index.html                   plantilla base de la aplicación (Vite)
├── start.bat                    doble clic para abrir la aplicación en modo navegador
└── package.json
```

### Cómo funciona `start.bat` ahora

`start.bat` sigue haciendo lo mismo de siempre (doble clic y listo), pero por dentro
`npm start` ahora primero "compila" la interfaz de React (`vite build`, tarda unos
segundos) y luego arranca el servidor (`node server.js`), que sirve esa interfaz ya
compilada desde la carpeta `dist/`. Todo pasa automáticamente, no hay que hacer nada
distinto a antes.

Si quieres modificar la interfaz y ver los cambios al instante mientras programas
(en vez de recompilar cada vez), usa `npm run dev` — abre un servidor de desarrollo
en `http://localhost:5173` que redirige las llamadas a la API hacia el servidor de
Express (que debe estar corriendo aparte con `npm run dev:server`).
