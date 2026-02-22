@echo off
echo ========================================
echo   Building Catalyst ERP Electron App
echo ========================================
echo.

set ROOT=%~dp0
set COMPANY_PATH=%ROOT%..\company
set BACKEND_PATH=%ROOT%..\backend
set RENDERER_PATH=%ROOT%renderer

echo [1/4] Building frontend...
cd /d "%COMPANY_PATH%"

:: Backup original .env.production and create local version
if exist .env.production.backup del .env.production.backup
if exist .env.production rename .env.production .env.production.backup
echo VITE_API_URL=http://localhost:5227/api> .env.production

:: Build the frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo [2/4] Copying frontend to Electron renderer...
if exist "%RENDERER_PATH%" rmdir /s /q "%RENDERER_PATH%"
xcopy /e /i /y "%COMPANY_PATH%\dist" "%RENDERER_PATH%"

echo [3/4] Publishing backend...
cd /d "%BACKEND_PATH%"
dotnet publish -c Release -r win-x64 --self-contained true -o "%ROOT%..\backend\bin\Release\net8.0\publish"
if errorlevel 1 (
    echo ERROR: Backend publish failed!
    pause
    exit /b 1
)

echo [4/4] Installing Electron dependencies...
cd /d "%ROOT%"
call npm install

:: Restore original .env.production
cd /d "%COMPANY_PATH%"
if exist .env.production del .env.production
if exist .env.production.backup rename .env.production.backup .env.production

echo.
echo ========================================
echo   Build complete!
echo   Run 'npm start' to test
echo   Run 'npm run build' to create installer
echo ========================================
pause
