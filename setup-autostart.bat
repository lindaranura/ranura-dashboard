@echo off
title Setup Autostart - Ranura Services
echo ========================================================
echo   MEMASANG AUTOSTART WINDOWS UNTUK RANURA SERVICES
echo ========================================================
cd /d "%~dp0"
call npx pm2 save

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%STARTUP_DIR%\ranura-services-autostart.vbs"

echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo WshShell.Run "cmd.exe /c cd /d ""%~dp0"" && npx pm2 resurrect", 0, False >> "%VBS_FILE%"

echo.
echo [SUKSES] Script autostart telah dibuat di:
echo %VBS_FILE%
echo.
echo Setiap kali komputer/laptop menyala, Server Dasbor dan Bot Telegram
echo akan otomatis berjalan di latar belakang secara 24/7!
echo ========================================================
pause
