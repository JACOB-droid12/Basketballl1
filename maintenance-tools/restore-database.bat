@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Restore local MySQL/MariaDB database backup
echo.
echo WARNING: Restoring a backup can replace current reservation records.
echo Use this only with IT support or an authorized barangay administrator.
echo.
set "CONFIRM="
set /p CONFIRM=Type RESTORE to continue, or press Enter to cancel:
if /i not "%CONFIRM%"=="RESTORE" (
  echo Restore cancelled.
  pause
  exit /b 1
)

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

where mysql >nul 2>nul
if errorlevel 1 (
  echo mysql was not found.
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
  echo Open START-HERE.bat and choose first-time setup, then restore the backup again.
  pause
  exit /b 1
)

set "BACKUP_FILE="
set /p BACKUP_FILE=Enter the path to the .sql backup file:
if "%BACKUP_FILE%"=="" (
  echo Restore cancelled. No backup file was entered.
  pause
  exit /b 1
)

if not exist "%BACKUP_FILE%" (
  echo Backup file was not found:
  echo %BACKUP_FILE%
  pause
  exit /b 1
)

call npm run restore:mysql -- "%BACKUP_FILE%"
if errorlevel 1 (
  echo.
  echo Restore failed. Check the backup file, local database settings, and MySQL/MariaDB service, then try again.
  pause
  exit /b 1
)

echo.
echo Restore completed. Open START-HERE.bat and choose Create final office sign-off report, or start the system and check records before regular use.
pause
endlocal
