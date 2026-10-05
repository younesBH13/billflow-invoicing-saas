@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%billflow-client-scribe" || exit /b 1
if not exist node_modules (
  echo Installing frontend dependencies...
  npm install
  if errorlevel 1 exit /b 1
)
echo Starting frontend...
npm run dev
endlocal
