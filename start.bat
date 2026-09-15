@echo off
setlocal
title Extraccion de Troceria - Forestal Tezains
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ============================================================
  echo  No se encontro Node.js en esta computadora.
  echo  Descargalo e instalalo desde: https://nodejs.org/
  echo  (elige la version "LTS"). Luego vuelve a abrir este archivo.
  echo ============================================================
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando la aplicacion por primera vez, espera un momento...
  call npm install
  if errorlevel 1 (
    echo.
    echo Hubo un problema instalando dependencias. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando la aplicacion...
echo Cuando veas "Servidor corriendo en http://localhost:3000",
echo abre esa direccion en tu navegador (Chrome, Edge, etc).
echo No cierres esta ventana mientras uses la aplicacion.
echo.

start "" http://localhost:3000
call npm start

pause
