@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Office sign-off verification
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\run-office-signoff.ps1"

echo.
pause
