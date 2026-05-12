@echo off
setlocal
cd /d "%~dp0"
call "%~dp0maintenance-tools\load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Starting local office app...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo The launcher checked bundled runtime\node and installed Node.js.
  echo The deployment package is missing bundled Node, or Node.js must be installed by the installer/admin.
  echo See TROUBLESHOOT-WINDOWS.txt for the offline Windows setup steps.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.
  echo The launcher checked bundled runtime\node and installed Node.js.
  echo The deployment package is missing npm, or Node.js must be installed by the installer/admin.
  echo See TROUBLESHOOT-WINDOWS.txt for the offline Windows setup steps.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules was not found.
  echo Copy the prepared offline bundle folder, or create it first with npm run bundle:offline on the setup computer.
  pause
  exit /b 1
)

if not exist ".env" (
  echo .env was not found.
  echo Open START-HERE.bat and choose first-time setup, then start the system again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\ensure-local-database.ps1" -Quiet
if errorlevel 1 (
  echo.
  echo Could not start or find the local database service.
  echo Open START-HERE.bat and choose first-time setup, or ask IT support to check runtime\mariadb.
  pause
  exit /b 1
)

npm run check:database
if errorlevel 1 (
  echo.
  echo Local database check failed. Start MySQL/MariaDB or open START-HERE.bat and choose first-time setup, then try again.
  pause
  exit /b 1
)

set "OFFICE_URL=http://localhost:3000/prototype"
for /f "usebackq delims=" %%U in (`node scripts\print-office-url.mjs 2^>nul`) do set "OFFICE_URL=%%U"

echo Keep this window open while the system is being used.
echo The browser will open after the local app is ready.
echo.
echo If the browser does not open automatically, open this address:
echo %OFFICE_URL%
echo.

set "OPEN_BROWSER=1"
npm start

echo.
pause
