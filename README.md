# Extracción de Trocería en Rollo — Forestal Tezains

Aplicación para crear, guardar e imprimir los formatos de **Extracción de Trocería en Rollo**.
El formato impreso está diseñado para verse igual que el formato oficial 2026 (logo, cintillo
azul, cajas de productor/grúa/fecha, tabla de géneros, IVA, ISR y saldo a favor).

## Cómo abrir la aplicación (Windows)

1. Si no tienes Node.js instalado, descárgalo de https://nodejs.org (botón que dice "LTS") e
   instálalo (siguiente, siguiente, siguiente).
2. Dentro de esta carpeta, haz doble clic en **`start.bat`**.
   - La primera vez tardará uno o dos minutos porque instala lo necesario.
   - Se abrirá tu navegador en `http://localhost:3000` con la aplicación.
3. Para volver a usarla otro día, vuelve a hacer doble clic en `start.bat`. No cierres la
   ventana negra mientras estés usando la aplicación; ciérrala cuando termines.

No necesitas internet para usar la aplicación una vez instalada (solo para instalarla la
primera vez). Todo se guarda en tu computadora.

## Qué puedes hacer

- **Inicio**: lista de todos los formatos guardados, con buscador y filtros por grúa, fecha y
  estado (guardado / pagado). Desde ahí puedes imprimir, editar o eliminar cualquiera.
- **Nuevo formato**: llena productor, grúa, fecha, metros y precio de cada género, y el
  descuento de combustible. A la derecha ves la vista previa exactamente como se imprimirá.
- **Ajustes**: nombres de los géneros, precio por defecto, IVA/ISR por defecto, texto del
  producto FSC, y la lista de grúas que aparecen como sugerencia.
- **Imprimir**: abre el formato ya guardado y usa el botón "Imprimir" (o Ctrl+P). Puedes
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

Los formatos se guardan en un archivo de base de datos SQLite dentro de la carpeta
`data/extraccion.db` (se crea solo la primera vez que abres la aplicación). Es un solo
archivo: para respaldarlo, copia esa carpeta `data` a un USB o a tu nube (OneDrive, en tu
caso, ya lo respalda automáticamente porque el proyecto vive dentro de tu carpeta de
OneDrive).

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

## Estructura del proyecto

La aplicación ahora está hecha con **React + Tailwind CSS** (usando Vite como
herramienta de construcción) para la interfaz, y sigue usando **Express + SQLite**
para el servidor y los datos, igual que antes.

```
extraccion-app/
├── server.js                    servidor y rutas de la API (Express)
├── db/
│   ├── database.js              conexión y esquema de SQLite
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
│   │   └── PageLayout.jsx       encabezado + pie de página comunes
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
├── data/                        se crea sola; aquí vive la base de datos
├── index.html                   plantilla base de la aplicación (Vite)
├── start.bat                    doble clic para abrir la aplicación
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
