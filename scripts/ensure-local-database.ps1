param(
  [switch] $Quiet
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectRoot ".env"
$RuntimeMariaDbRoot = Join-Path $ProjectRoot "runtime\mariadb"
$RuntimeMariaDbBin = Join-Path $RuntimeMariaDbRoot "bin"
$ServerExe = Join-Path $RuntimeMariaDbBin "mariadbd.exe"
$InstallDbExe = Join-Path $RuntimeMariaDbBin "mariadb-install-db.exe"
$DataDir = Join-Path $ProjectRoot "data\mariadb-data"
$LogDir = Join-Path $ProjectRoot "data\logs"

function Write-Step {
  param([string] $Message)

  if (-not $Quiet) {
    Write-Host $Message
  }
}

function Read-EnvFile {
  param([string] $Path)

  $Values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $Values
  }

  foreach ($Line in Get-Content -LiteralPath $Path) {
    if ($Line -match "^\s*#" -or $Line.Trim() -eq "") {
      continue
    }

    $Parts = $Line -split "=", 2
    if ($Parts.Count -eq 2) {
      $Values[$Parts[0].Trim()] = $Parts[1].Trim().Trim('"')
    }
  }

  return $Values
}

function Test-TcpPort {
  param(
    [string] $HostName,
    [int] $Port,
    [int] $TimeoutMilliseconds = 1000
  )

  $Client = [Net.Sockets.TcpClient]::new()
  try {
    $ConnectTask = $Client.ConnectAsync($HostName, $Port)
    if (-not $ConnectTask.Wait($TimeoutMilliseconds)) {
      return $false
    }

    return $Client.Connected
  } catch {
    return $false
  } finally {
    $Client.Dispose()
  }
}

function Assert-LocalDatabaseTarget {
  param([string] $HostName)

  if ($HostName -notin @("localhost", "127.0.0.1", "::1")) {
    throw "Database service is not reachable and DB_HOST is not local. Start the configured MySQL/MariaDB server, then try again."
  }
}

function Remove-MariaDbPlaceholderFile {
  $PlaceholderPath = Join-Path $DataDir ".gitkeep"

  if (Test-Path -LiteralPath $PlaceholderPath) {
    Remove-Item -LiteralPath $PlaceholderPath -Force
  }
}

function Initialize-MariaDbDataDirectory {
  param([string] $Password)

  if (Test-Path -LiteralPath (Join-Path $DataDir "mysql")) {
    return
  }

  if (-not (Test-Path -LiteralPath $InstallDbExe)) {
    throw "No bundled MariaDB runtime was found for initialization. The deployment package must include runtime\mariadb\bin\mariadb-install-db.exe."
  }

  if ($Password -eq "") {
    throw "The local database password is blank. Run START-HERE.bat first-time setup and enter a local database password before starting bundled MariaDB."
  }

  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
  Remove-MariaDbPlaceholderFile
  Write-Step "Initializing bundled MariaDB data folder..."
  & $InstallDbExe "--datadir=$DataDir" "--password=$Password" | Out-Host

  if ($LASTEXITCODE -ne 0) {
    throw "Bundled MariaDB initialization failed. Check data\logs or rerun START-HERE.bat as an administrator if Windows blocks the database runtime."
  }
}

function Start-BundledMariaDb {
  param(
    [string] $HostName,
    [int] $Port
  )

  if (-not (Test-Path -LiteralPath $ServerExe)) {
    throw "Database service is not reachable. No bundled MariaDB runtime was found at runtime\mariadb\bin\mariadbd.exe, and no installed local service answered on ${HostName}:$Port."
  }

  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
  $ErrLog = Join-Path $LogDir "mariadb.err.log"
  $Arguments = @(
    "--no-defaults",
    "--datadir=`"$DataDir`"",
    "--bind-address=$HostName",
    "--port=$Port",
    "--log-error=`"$ErrLog`""
  )

  Write-Step "Starting bundled MariaDB from runtime\mariadb..."
  Start-Process -FilePath $ServerExe `
    -ArgumentList $Arguments `
    -WindowStyle Hidden `
    -PassThru | Out-Null

  for ($Attempt = 0; $Attempt -lt 30; $Attempt += 1) {
    if (Test-TcpPort $HostName $Port 1000) {
      Write-Step "Bundled MariaDB is listening on ${HostName}:$Port."
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "Database service is not reachable after starting bundled MariaDB. Check data\logs\mariadb.err.log, then try again."
}

Set-Location -LiteralPath $ProjectRoot

$Settings = Read-EnvFile $EnvPath
$DbHost = $Settings["DB_HOST"]
if ($null -eq $DbHost -or $DbHost -eq "") {
  $DbHost = "127.0.0.1"
}

$DbPort = 3306
if ($Settings["DB_PORT"]) {
  $DbPort = [int] $Settings["DB_PORT"]
}

$DbPassword = $Settings["DB_PASSWORD"]
if ($null -eq $DbPassword) {
  $DbPassword = ""
}

if (Test-TcpPort $DbHost $DbPort 1000) {
  Write-Step "Local database service is already reachable on ${DbHost}:$DbPort."
  exit 0
}

Assert-LocalDatabaseTarget $DbHost

if (-not (Test-Path -LiteralPath $ServerExe)) {
  Write-Step "No bundled MariaDB runtime was found. The installed local MySQL/MariaDB service must be started separately."
  exit 0
}

Initialize-MariaDbDataDirectory $DbPassword
Start-BundledMariaDb $DbHost $DbPort
