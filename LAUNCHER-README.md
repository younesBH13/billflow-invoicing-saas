# BillFlow Launcher

This folder contains launcher scripts for the BillFlow application.

## Quick Start

**Double-click `BillFlow.vbs`** to start the application without any command windows.

The application will:
1. Start the backend server
2. Start the frontend server  
3. Automatically open your browser to http://localhost:5173
4. Show a brief notification while starting

## Files

- **BillFlow.vbs** - Main launcher (double-click this!)
- **start-billflow.bat** - Backend script (called by VBS)
- **stop-billflow.bat** - Stops all running servers

## Manual Control

If you need to stop the application manually:
- Double-click `stop-billflow.bat`
- Or open Task Manager and end `node.exe` processes

## Troubleshooting

If the application doesn't start:
1. Make sure you've run `npm install` in both `billflow-backend` and `billflow-client-scribe`
2. Check that ports 3000 and 5173 are available
3. Try running `start-billflow.bat` directly to see error messages
