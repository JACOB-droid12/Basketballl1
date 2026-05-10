@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Office sign-off verification
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-office-signoff.ps1"

echo.
pause
