@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. https://nodejs.org/
  pause
  exit /b 1
)
echo Open http://localhost:3000 in your browser.
echo To connect a phone, use http://YOUR-PC-IP:3000 on the same Wi-Fi.
node server.js
pause
