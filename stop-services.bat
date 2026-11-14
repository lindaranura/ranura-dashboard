@echo off
title Ranura Services - Stop
echo ========================================================
echo   MENGHENTIKAN SERVER DASBOR & BOT TELEGRAM
echo ========================================================
cd /d "%~dp0"
call npx pm2 stop ecosystem.config.cjs
call npx pm2 save
echo.
call npx pm2 status
echo.
echo ========================================================
echo   Layanan berhasil dihentikan.
echo ========================================================
pause
