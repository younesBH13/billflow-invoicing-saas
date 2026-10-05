@echo off
setlocal
set ROOT=%~dp0
start "Billflow Backend" cmd /k "cd /d %ROOT%billflow-backend && if not exist node_modules (npm install) && npm run dev"
start "Billflow Frontend" cmd /k "cd /d %ROOT%billflow-client-scribe && if not exist node_modules (npm install) && npm run dev"
endlocal
