@echo off
title Stopping BillFlow

echo Stopping BillFlow application...
taskkill /F /IM node.exe > nul 2>&1

echo BillFlow has been stopped.
timeout /t 2 > nul
