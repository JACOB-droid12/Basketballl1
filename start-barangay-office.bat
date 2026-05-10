@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Starting local office app...
echo.
echo Open this address in the browser if it does not open automatically:
echo http://localhost:3000/login
echo.

start http://localhost:3000/login
npm start

echo.
pause
