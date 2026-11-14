@echo off
title Ranura Services - Status & Logs
echo ========================================================
echo   STATUS DAN LOG TERBARU SERVER DASBOR & BOT TELEGRAM
echo ========================================================
cd /d "%~dp0"
call npx pm2 status
echo.
echo Log 20 baris terakhir:
call npx pm2 logs --lines 20 --nostream
echo.
pause
