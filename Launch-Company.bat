@echo off
title Catalyst Launcher
set ROOT=%~dp0

echo ========================================
echo        Catalyst Company Portal
echo ========================================
echo.

:: Start backend
echo Starting Backend API...
start "Catalyst Backend" cmd /c "cd /d %ROOT%backend && set ASPNETCORE_ENVIRONMENT=Local && dotnet run"
echo Waiting for backend to start...
timeout /t 10 /nobreak >nul

:: Start Company Portal
echo Starting Company Portal...
start "Catalyst Company" cmd /c "cd /d %ROOT%company && npx vite --port 3000"
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:3000

echo.
echo ========================================
echo  Catalyst is running!
echo  
echo  Press any key to STOP all services...
echo ========================================
pause >nul

echo.
echo Stopping services...

:: Kill node processes (frontend)
taskkill /F /FI "WINDOWTITLE eq Catalyst Company*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: Kill dotnet processes (backend)
taskkill /F /FI "WINDOWTITLE eq Catalyst Backend*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5227" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo All services stopped.
timeout /t 2 >nul
