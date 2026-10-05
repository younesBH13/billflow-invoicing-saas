@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%billflow-backend" || exit /b 1
if not exist node_modules (
  echo Installing backend dependencies...
  npm install
  if errorlevel 1 exit /b 1
)
echo Starting backend...
npm run dev
endlocal
