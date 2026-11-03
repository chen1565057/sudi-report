@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Checking dependencies...
if not exist node_modules (
  echo First run: installing dependencies (needs internet, please wait)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install dependencies.
    echo Please install Node.js LTS from https://nodejs.org first, then ensure internet access.
    pause
    exit /b 1
  )
)
echo Starting server... (close this window to stop)
node server.js
pause
