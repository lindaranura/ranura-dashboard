@echo off
title Ranura Services - Restart
echo ========================================================
echo   MERESTART SERVER DASBOR & BOT TELEGRAM
echo ========================================================
cd /d "%~dp0"
call npx pm2 restart ecosystem.config.cjs
call npx pm2 save
echo.
call npx pm2 status
echo.
echo ========================================================
echo   Layanan berhasil direstart!
echo ========================================================
pause
