@echo off
title FloodGuard Frontend Dashboard
cls
echo =======================================================
echo          FLOODGUARD REACT TELEMETRY DASHBOARD
echo =======================================================
echo.
echo Starting Vite development server...
echo Local Dashboard:    http://localhost:5173
echo Network Dashboard:  http://10.73.209.8:5173
echo.
cd "%~dp0frontend"
npm run dev
pause
