@echo off
title BillFlow Application - DEBUG MODE

REM Start backend server (showing output for debugging)
echo Starting backend server...
cd /d "%~dp0billflow-backend"
start "Backend" cmd /k "npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend server
echo Starting frontend...
cd /d "%~dp0billflow-client-scribe"
start "Frontend" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 5 /nobreak > nul

REM Open browser
echo Opening application in browser...
start http://localhost:5173

echo.
echo BillFlow is now running in DEBUG MODE!
echo Backend: http://localhost:3000 (check Backend window for errors)
echo Frontend: http://localhost:5173 (check Frontend window for errors)
echo.
echo Close the Backend and Frontend windows to stop the application.
echo Press any key to close this window...
pause > nul
