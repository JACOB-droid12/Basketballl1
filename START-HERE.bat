@echo off
setlocal
cd /d "%~dp0"

:menu
cls
echo Barangay Sto. Nino Basketball Court Scheduling System
echo Windows Offline Office Launcher
echo.
echo Choose what you need:
echo.
echo   1. Start the system for daily use
echo   2. First-time setup on this computer
echo   3. Check this computer before setup
echo   4. Create final office sign-off report
echo   5. Database-only setup/checks for IT support
echo   6. Open quick instructions
echo   7. Exit
echo.
set "CHOICE="
set /p CHOICE=Enter 1, 2, 3, 4, 5, 6, or 7: 

if "%CHOICE%"=="1" goto start_system
if "%CHOICE%"=="2" goto first_setup
if "%CHOICE%"=="3" goto check_computer
if "%CHOICE%"=="4" goto signoff
if "%CHOICE%"=="5" goto database_only
if "%CHOICE%"=="6" goto open_instructions
if "%CHOICE%"=="7" goto end

echo.
echo Please enter a number from 1 to 7.
pause
goto menu

:start_system
cls
echo Starting the barangay office system...
echo Keep this window open while the system is being used.
echo.
call "%~dp0start-barangay-office.bat"
goto after_action

:first_setup
cls
echo Running first-time setup...
echo Use this after Node.js and local MySQL/MariaDB are installed.
echo.
call "%~dp0setup-barangay-office.bat"
goto after_action

:check_computer
cls
echo Checking this computer...
echo.
call "%~dp0check-office-readiness.bat"
goto after_action

:signoff
cls
echo Creating the office sign-off report...
echo.
call "%~dp0run-office-signoff.bat"
goto after_action

:database_only
cls
echo Running database-only setup/checks...
echo This is mainly for IT support or database troubleshooting.
echo.
call "%~dp0setup-database-only.bat"
goto after_action

:open_instructions
cls
if exist "%~dp0README-FIRST-WINDOWS.txt" (
  start "" notepad "%~dp0README-FIRST-WINDOWS.txt"
) else (
  echo README-FIRST-WINDOWS.txt was not found.
)
goto after_action

:after_action
echo.
echo Press any key to return to the launcher menu.
pause >nul
goto menu

:end
endlocal
