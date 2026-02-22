@echo off
setlocal enabledelayedexpansion
title Catalyst ERP - Build Installer
color 0A

echo ================================================
echo   Catalyst ERP - Master Build Script
echo ================================================
echo.

set ROOT=%~dp0
set COMPANY=%ROOT%company
set BACKEND=%ROOT%backend
set ELECTRON=%ROOT%electron-app
set INSTALLER=%ROOT%installer

:: Step 1: Build Frontend
echo [1/5] Building frontend...
cd /d "%COMPANY%"

:: Create local API env
echo VITE_API_URL=http://localhost:5227/api> .env.production.local

call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo      Frontend built successfully!

:: Step 2: Build Backend
echo.
echo [2/5] Publishing backend...
cd /d "%BACKEND%"
dotnet publish -c Release -r win-x64 --self-contained false -o "%BACKEND%\publish"
if errorlevel 1 (
    echo ERROR: Backend publish failed
    pause
    exit /b 1
)
echo      Backend published successfully!

:: Step 3: Copy frontend to Electron renderer
echo.
echo [3/5] Copying frontend to Electron...
cd /d "%ELECTRON%"
if exist renderer rmdir /s /q renderer
xcopy /e /i /y "%COMPANY%\dist" "%ELECTRON%\renderer"
echo      Frontend copied to Electron!

:: Step 4: Install Electron dependencies
echo.
echo [4/5] Installing Electron dependencies...
cd /d "%ELECTRON%"
call npm install
if errorlevel 1 (
    echo ERROR: Electron npm install failed
    pause
    exit /b 1
)
echo      Electron dependencies installed!

:: Step 5: Build C# Installer
echo.
echo [5/5] Building C# Installer...
cd /d "%INSTALLER%"
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "%ROOT%output"
if errorlevel 1 (
    echo ERROR: Installer build failed
    pause
    exit /b 1
)

:: Copy Electron app to output
echo.
echo Copying Electron app to output...
if not exist "%ROOT%output\electron-app" mkdir "%ROOT%output\electron-app"
xcopy /e /i /y "%ELECTRON%\main.js" "%ROOT%output\electron-app\"
xcopy /e /i /y "%ELECTRON%\preload.js" "%ROOT%output\electron-app\"
xcopy /e /i /y "%ELECTRON%\package.json" "%ROOT%output\electron-app\"
xcopy /e /i /y "%ELECTRON%\renderer" "%ROOT%output\electron-app\renderer\"
xcopy /e /i /y "%ELECTRON%\node_modules" "%ROOT%output\electron-app\node_modules\"

:: Copy backend to output
echo Copying backend to output...
xcopy /e /i /y "%BACKEND%\publish" "%ROOT%output\backend\"

echo.
echo ================================================
echo   BUILD COMPLETE!
echo ================================================
echo.
echo Output: %ROOT%output\
echo   - CatalystInstaller.exe (single-file installer)
echo   - electron-app\ (Electron files)
echo   - backend\ (Backend files)
echo.
echo The installer will download and set up everything.
echo.
pause
