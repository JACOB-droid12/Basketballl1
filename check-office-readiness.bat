@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Office readiness check
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-office-readiness.ps1"

echo.
pause
