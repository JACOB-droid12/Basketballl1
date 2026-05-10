@echo off
setlocal

cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo SQL-only local MySQL setup
echo.

where mysql >nul 2>nul
if errorlevel 1 (
  echo mysql was not found. Install MySQL 8 and add the MySQL bin folder to PATH.
  echo This setup only works with a local MySQL installation.
  pause
  exit /b 1
)

if not exist "database\schema.sql" (
  echo database\schema.sql was not found. Run this file from the project folder.
  pause
  exit /b 1
)

if not exist "database\seed.sql" (
  echo database\seed.sql was not found. Run this file from the project folder.
  pause
  exit /b 1
)

if not exist "database\diagnostics.sql" (
  echo database\diagnostics.sql was not found. Run this file from the project folder.
  pause
  exit /b 1
)

set "MYSQL_HOST=127.0.0.1"
set "MYSQL_PORT=3306"
set "MYSQL_USER=root"
set "MYSQL_DATABASE=barangay_court_scheduler"

set /p MYSQL_HOST_INPUT=MySQL host [127.0.0.1]: 
if not "%MYSQL_HOST_INPUT%"=="" set "MYSQL_HOST=%MYSQL_HOST_INPUT%"

set /p MYSQL_PORT_INPUT=MySQL port [3306]: 
if not "%MYSQL_PORT_INPUT%"=="" set "MYSQL_PORT=%MYSQL_PORT_INPUT%"

set /p MYSQL_USER_INPUT=MySQL username [root]: 
if not "%MYSQL_USER_INPUT%"=="" set "MYSQL_USER=%MYSQL_USER_INPUT%"

set /p MYSQL_DATABASE_INPUT=Database name [barangay_court_scheduler]: 
if not "%MYSQL_DATABASE_INPUT%"=="" set "MYSQL_DATABASE=%MYSQL_DATABASE_INPUT%"

set /p MYSQL_PASSWORD=MySQL password for %MYSQL_USER% [leave blank if none]: 

echo.
echo This will apply database\schema.sql, database\seed.sql, and database\diagnostics.sql.
echo Database: %MYSQL_DATABASE%
echo Target MySQL: %MYSQL_HOST%:%MYSQL_PORT%
echo.

set "MYSQL_PWD=%MYSQL_PASSWORD%"

echo Creating database schema...
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" < database\schema.sql
set "SQL_EXIT=%ERRORLEVEL%"
if not "%SQL_EXIT%"=="0" goto sql_failed

echo Seeding reference data...
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\seed.sql
set "SQL_EXIT=%ERRORLEVEL%"
if not "%SQL_EXIT%"=="0" goto sql_failed

echo Running database diagnostics...
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\diagnostics.sql
set "SQL_EXIT=%ERRORLEVEL%"
if not "%SQL_EXIT%"=="0" goto sql_failed

set "MYSQL_PASSWORD="
set "MYSQL_PWD="

echo.
echo SQL setup completed.
echo Start the system with start-barangay-office.bat after the app is configured.
pause
exit /b 0

:sql_failed
set "MYSQL_PASSWORD="
set "MYSQL_PWD="
echo.
echo SQL setup failed. Check the MySQL password, server status, database name, and PATH.
pause
exit /b %SQL_EXIT%
