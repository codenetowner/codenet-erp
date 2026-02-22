@echo off
set ROOT=%~dp0

:: Start backend if not already running
netstat -ano | findstr ":5227" >nul
if errorlevel 1 (
    echo Starting Backend...
    start "Catalyst Backend" /min cmd /k "cd /d %ROOT%backend && set ASPNETCORE_ENVIRONMENT=Local && dotnet run"
    echo Waiting for backend to start...
    timeout /t 8 /nobreak >nul
)

:: Start Company Portal
echo Starting Company Portal...
start "Catalyst Company" cmd /k "cd /d %ROOT%company && npx vite --port 3000"
timeout /t 3 /nobreak >nul
start http://localhost:3000
