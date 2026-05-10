@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo One-click local setup
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-barangay-office.ps1"

echo.
pause
