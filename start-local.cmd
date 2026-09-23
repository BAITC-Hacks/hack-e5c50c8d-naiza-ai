@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS was not found in PATH.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%node_modules" (
  echo First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "%PROJECT_DIR%.env" if exist "%PROJECT_DIR%.env.example" (
  copy /Y "%PROJECT_DIR%.env.example" "%PROJECT_DIR%.env" >nul
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  start "" "http://localhost:3000"
  exit /b 0
)

start "Akim na 5 chasov - server" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

exit /b 0
