@echo off
echo Starting IDFlow Development Servers...
echo.
echo Make sure MongoDB is running before starting!
echo.

start "IDFlow Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul
start "IDFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
