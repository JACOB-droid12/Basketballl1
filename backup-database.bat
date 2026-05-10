@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Creating local MySQL/MariaDB database backup...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer before creating a backup.
  echo See README-FIRST-WINDOWS.txt for the offline Windows setup steps.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js 20 or newer before creating a backup.
  echo See README-FIRST-WINDOWS.txt for the offline Windows setup steps.
  pause
  exit /b 1
)

where mysqldump >nul 2>nul
if errorlevel 1 (
  echo mysqldump was not found. Install MySQL/MariaDB client tools and add the bin folder to PATH.
  echo See TROUBLESHOOT-WINDOWS.txt if you need help.
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
  echo Run setup-barangay-office.bat first, then create the backup again.
  pause
  exit /b 1
)

npm run backup:mysql
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
