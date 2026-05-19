@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo One-click local setup
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\setup-barangay-office.ps1"

echo.
pause
