@echo off
setlocal
cd /d "%~dp0"

echo Barangay Basketball Court Scheduling System
echo Creating desktop shortcuts...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"
if errorlevel 1 (
  echo.
echo Desktop shortcut creation failed. You can still start the system by double-clicking START-HERE.bat.
  pause
  exit /b 1
)

echo.
echo Desktop shortcuts are ready.
pause
endlocal
