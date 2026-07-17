@echo off
setlocal

cd /d "%~dp0"
title Repositorio OA - Backend

if not exist "backend\package.json" (
  echo No se encontro la carpeta backend en %cd%.
  pause
  exit /b 1
)

echo Iniciando backend en http://localhost:3001
cd /d "%~dp0backend"
npm.cmd run start:dev

echo.
echo Backend detenido.
pause
