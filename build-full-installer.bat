@echo off
setlocal enabledelayedexpansion
title Catalyst ERP - Build Installer Package

echo ================================================
echo   Building Catalyst ERP Installer
echo   (Backend + Frontend in one package)
echo ================================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set COMPANY=%ROOT%company
set INSTALLER=%ROOT%installer
set OUTPUT=%INSTALLER%\publish

:: Clean old builds
echo Cleaning old build artifacts...
if exist "%OUTPUT%" rmdir /s /q "%OUTPUT%"
if exist "%BACKEND%\bin\Release\publish" rmdir /s /q "%BACKEND%\bin\Release\publish"
echo Done.
echo.

echo [1/4] Building Frontend...
cd /d "%COMPANY%"
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
echo Frontend built successfully.

echo.
echo [2/4] Copying Frontend into Backend wwwroot...
:: Copy built frontend into backend/wwwroot so ASP.NET serves it
if exist "%BACKEND%\wwwroot" rmdir /s /q "%BACKEND%\wwwroot"
xcopy "%COMPANY%\dist" "%BACKEND%\wwwroot\" /E /I /Y
if errorlevel 1 (
    echo ERROR: Frontend copy to wwwroot failed
    pause
    exit /b 1
)
echo Frontend copied to backend/wwwroot.

echo.
echo [3/4] Publishing Backend (self-contained, includes frontend)...
cd /d "%BACKEND%"
dotnet publish -c Release -r win-x64 --self-contained true -o bin\Release\publish
if errorlevel 1 (
    echo ERROR: Backend publish failed
    pause
    exit /b 1
)
echo Backend published (self-contained + frontend included).

echo.
echo [4/4] Building Installer...
cd /d "%INSTALLER%"
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "%OUTPUT%"
if errorlevel 1 (
    echo ERROR: Installer build failed
    pause
    exit /b 1
)

:: Copy backend published files into installer output
if exist "%OUTPUT%\backend" rmdir /s /q "%OUTPUT%\backend"
robocopy "%BACKEND%\bin\Release\publish" "%OUTPUT%\backend" /E /NFL /NDL /NJH /NJS /nc /ns /np
echo Backend files copied to installer package.

:: Copy schema
if exist "%ROOT%cashvan_schema.sql" copy "%ROOT%cashvan_schema.sql" "%OUTPUT%\" /Y >nul

echo.
echo ================================================
echo   BUILD COMPLETE!
echo ================================================
echo.
echo Package: %OUTPUT%\
echo.
echo Architecture: Backend serves API + Frontend
echo No WebView2, no desktop app needed!
echo User opens browser to http://localhost:5227
echo.
pause
