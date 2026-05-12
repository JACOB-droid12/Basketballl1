@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Office readiness check
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\check-office-readiness.ps1"

echo.
pause
