@echo off
title BillFlow Application

REM Start backend server
echo Starting backend server...
cd /d "%~dp0billflow-backend"
start /B cmd /c "npm run dev > nul 2>&1"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend server
echo Starting frontend...
cd /d "%~dp0billflow-client-scribe"
start /B cmd /c "npm run dev > nul 2>&1"

REM Wait for frontend to start
timeout /t 5 /nobreak > nul

REM Open browser
echo Opening application in browser...
start http://localhost:5173

echo.
echo BillFlow is now running!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop the application...
pause > nul

REM Cleanup: kill all node processes (you may want to be more selective)
taskkill /F /IM node.exe > nul 2>&1
