@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Creating pure offline bundle
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-offline-bundle.ps1"

echo.
pause
