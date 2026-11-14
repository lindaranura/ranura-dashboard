@echo off
title Ranura Services - Start
echo ========================================================
echo   MENJALANKAN SERVER DASBOR & BOT TELEGRAM (24/7 PM2)
echo ========================================================
cd /d "%~dp0"
call npx pm2 start ecosystem.config.cjs
call npx pm2 save
echo.
echo Menampilkan Status Layanan:
call npx pm2 status
echo.
echo ========================================================
echo   Layanan berhasil diaktifkan!
echo   - Dasbor: http://localhost:3000
echo   - Bot & Gateway: http://localhost:3001
echo ========================================================
pause
