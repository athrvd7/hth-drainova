@echo off
title FloodGuard Backend Server
cls
echo =======================================================
echo          FLOODGUARD FASTAPI BACKEND SERVER
echo =======================================================
echo.
echo Checking IP Configuration...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0    0.0.0.0"') do (
    set LOCAL_IP=%%a
)
echo Server is binding to all network interfaces (0.0.0.0:8000)
echo Accessible locally at : http://127.0.0.1:8000
echo Accessible by ESP32 at : http://192.168.1.8:8000
echo API Docs at            : http://127.0.0.1:8000/docs
echo.
echo Starting Uvicorn server...
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
