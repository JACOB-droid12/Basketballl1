@echo off
rem Shared Windows runtime loader. It prefers bundled runtime folders so staff
rem do not need to edit the global PATH on the barangay office computer.

set "PROJECT_ROOT=%~dp0.."
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fI"

set "BUNDLED_NODE_DIR="
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
  set "BUNDLED_NODE_DIR=%PROJECT_ROOT%\runtime\node"
  set "PATH=%PROJECT_ROOT%\runtime\node;%PATH%"
) else if exist "%PROJECT_ROOT%\runtime\nodejs\node.exe" (
  set "BUNDLED_NODE_DIR=%PROJECT_ROOT%\runtime\nodejs"
  set "PATH=%PROJECT_ROOT%\runtime\nodejs;%PATH%"
)

set "MYSQL_RUNTIME_BIN="
if exist "%PROJECT_ROOT%\runtime\mariadb\bin\mysql.exe" (
  set "MYSQL_RUNTIME_BIN=%PROJECT_ROOT%\runtime\mariadb\bin"
  set "BUNDLED_MARIADB_EXE=%PROJECT_ROOT%\runtime\mariadb\bin\mariadbd.exe"
) else if exist "%PROJECT_ROOT%\runtime\mysql\bin\mysql.exe" (
  set "MYSQL_RUNTIME_BIN=%PROJECT_ROOT%\runtime\mysql\bin"
)

if defined MYSQL_RUNTIME_BIN (
  set "PATH=%MYSQL_RUNTIME_BIN%;%PATH%"
)
