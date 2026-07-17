@echo off
setlocal

cd /d "%~dp0"
title Repositorio OA - Frontend

if not exist "frontend\package.json" (
  echo No se encontro la carpeta frontend en %cd%.
  pause
  exit /b 1
)

echo Iniciando frontend en http://localhost:3000
cd /d "%~dp0frontend"
npm.cmd run dev

echo.
echo Frontend detenido.
pause
