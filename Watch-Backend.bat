@echo off
title Catalyst Backend Monitor
color 0A

:check
cls
echo ========================================
echo    Catalyst Backend Monitor
echo ========================================
echo.

:: Check if backend is running on port 5227
netstat -ano | findstr "LISTENING" | findstr ":5227 " >nul
if errorlevel 1 (
    color 0C
    echo  Status: OFFLINE
    echo.
    echo  The backend is NOT running.
    echo  It should start automatically on Windows login.
    echo.
    echo  Press R to refresh, S to start manually, or Q to quit...
    choice /C RSQ /N
    if errorlevel 3 exit
    if errorlevel 2 goto start
    if errorlevel 1 goto check
) else (
    color 0A
    echo  Status: ONLINE
    echo.
    echo  Backend is running on http://localhost:5227
    echo.
    
    :: Get the PID
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5227 " ^| findstr "LISTENING"') do (
        echo  Process ID: %%a
    )
    echo.
    echo ========================================
    echo.
    echo  Press R to refresh, L to view logs, or Q to quit...
    choice /C RLQ /N
    if errorlevel 3 exit
    if errorlevel 2 goto logs
    if errorlevel 1 goto check
)
goto check

:start
echo.
echo Starting backend...
cd /d "%~dp0backend"
start "Catalyst Backend" cmd /k "set ASPNETCORE_ENVIRONMENT=Local && dotnet run"
timeout /t 5 >nul
goto check

:logs
cls
echo ========================================
echo    Catalyst Backend Live Logs
echo ========================================
echo.
echo  Connecting to backend logs...
echo  (Press Ctrl+C to return to monitor)
echo.
echo ========================================
echo.

cd /d "%~dp0backend"
set ASPNETCORE_ENVIRONMENT=Local
dotnet run

goto check
