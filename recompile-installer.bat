@echo off
setlocal enabledelayedexpansion
title Catalyst ERP - Recompile Installer

echo ================================================
echo   Recompiling Catalyst Setup (Offline Installer)
echo ================================================
echo.

set ROOT=%~dp0
set INSTALLER=%ROOT%installer

echo Building C# Installer...
cd /d "%INSTALLER%"

:: Run the dotnet publish command for building the single-file setup executable
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "%INSTALLER%\publish"

if errorlevel 1 (
    echo.
    echo ERROR: Installer recompilation failed!
    pause
    exit /b 1
)

echo.
echo ================================================
echo   RECOMPILE COMPLETE!
echo ================================================
echo Output created at: %INSTALLER%\publish\CatalystSetup.exe
echo.
pause
