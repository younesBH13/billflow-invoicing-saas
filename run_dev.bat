@echo off
echo ======================================================
echo  BillFlow: Enterprise Invoicing & Billing System
echo ======================================================

echo.
echo [1/3] Starting Backend API (Port 5000)...
start "BillFlow Backend" cmd /k "cd billflow-backend && npm install && npm run seed && npm run dev"

echo.
echo [2/3] Starting Frontend Client (Port 5173)...
start "BillFlow Frontend" cmd /k "cd billflow-client-scribe && npm install && npm run dev"

echo.
echo ======================================================
echo  Both servers starting!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo  Default Demo Login: admin / admin123
echo ======================================================
pause
