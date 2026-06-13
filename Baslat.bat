@echo off
chcp 65001 >nul
title Bambu Filament Kontrol
cd /d "%~dp0"
echo Bambu Filament Kontrol baslatiliyor...
call npm start
if errorlevel 1 (
  echo.
  echo Hata olustu. Node.js kurulu mu kontrol edin.
  pause
)
