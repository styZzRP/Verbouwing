@echo off
title Project Ons Thuis
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is niet gevonden. Installeer het gratis via https://nodejs.org
  pause
  exit /b 1
)
node server.js
pause
