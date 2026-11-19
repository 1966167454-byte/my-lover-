@echo off
cd /d "%~dp0"
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:3000'"
node server.js
pause
