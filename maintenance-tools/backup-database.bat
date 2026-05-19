@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Creating local MySQL/MariaDB database backup...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo The launcher checked bundled runtime\node and installed Node.js.
  echo The deployment package is missing bundled Node, or Node.js must be installed by the installer/admin.
  echo See TROUBLESHOOT-WINDOWS.txt for help.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.
  echo The launcher checked bundled runtime\node and installed Node.js.
  echo The deployment package is missing npm, or Node.js must be installed by the installer/admin.
  echo See TROUBLESHOOT-WINDOWS.txt for help.
  pause
  exit /b 1
)

where mysqldump >nul 2>nul
if errorlevel 1 (
  echo mysqldump was not found.
  echo The launcher checked bundled runtime\mariadb\bin and installed MySQL/MariaDB tools.
  echo The deployment package is missing database client tools, or they must be installed by the installer/admin.
  echo See TROUBLESHOOT-WINDOWS.txt for help.
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
  echo Open START-HERE.bat and choose first-time setup, then create the backup again.
  pause
  exit /b 1
)

call npm run backup:mysql
if errorlevel 1 (
  echo.
  echo Backup failed. Start MySQL/MariaDB, check the local database settings, then try again.
  pause
  exit /b 1
)

echo.
echo Backup completed. Keep the backups folder on a protected local or barangay-controlled external drive.
pause
endlocal
