@echo off
title Restart BillFlow

echo ========================================
echo    RESTARTING BILLFLOW
echo ========================================
echo.

echo [1/2] Stopping all BillFlow processes...
taskkill /F /IM node.exe > nul 2>&1
timeout /t 2 > nul
echo     Done!
echo.

echo [2/2] Starting BillFlow...
cd /d "%~dp0"
start "" "BillFlow.vbs"
echo     BillFlow is starting...
echo.

echo ========================================
echo BillFlow has been restarted!
echo Please wait a few seconds for it to load.
echo ========================================
echo.
timeout /t 3
