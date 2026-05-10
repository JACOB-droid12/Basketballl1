$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectRoot ".env"
$SchemaPath = Join-Path $ProjectRoot "database\schema.sql"
$SeedPath = Join-Path $ProjectRoot "database\seed.sql"
$DiagnosticsPath = Join-Path $ProjectRoot "database\diagnostics.sql"

function Test-CommandAvailable {
  param([string] $CommandName)

  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Invoke-CheckedCommand {
  param(
    [string] $Label,
    [scriptblock] $Command
  )

  Write-Host ""
  Write-Host "== $Label =="
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
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
      $Values[$Parts[0].Trim()] = Convert-FromEnvFileValue $Parts[1]
    }
  }

  return $Values
}

function Convert-FromEnvFileValue {
  param([string] $Value)

  $Text = $Value.Trim()

  if ($Text.Length -ge 2 -and $Text.StartsWith('"') -and $Text.EndsWith('"')) {
    $Inner = $Text.Substring(1, $Text.Length - 2)
    return $Inner.Replace('\"', '"').Replace('\\', '\')
  }

  return $Text
}

function Convert-ToEnvFileValue {
  param([string] $Value)

  if ($null -eq $Value) {
    return ""
  }

  $Text = [string] $Value
  if ($Text -match '^[A-Za-z0-9_./:@-]*$') {
    return $Text
  }

  $Escaped = $Text.Replace('\', '\\').Replace('"', '\"')
  return '"' + $Escaped + '"'
}

function Set-EnvValue {
  param(
    [string] $Path,
    [string] $Key,
    [string] $Value
  )

  $EncodedValue = Convert-ToEnvFileValue $Value

  $Lines = @()
  if (Test-Path -LiteralPath $Path) {
    $Lines = @(Get-Content -LiteralPath $Path)
  }

  $Found = $false
  $NewLines = foreach ($Line in $Lines) {
    if ($Line -match "^\s*$([regex]::Escape($Key))\s*=") {
      $Found = $true
      "$Key=$EncodedValue"
    } else {
      $Line
    }
  }

  if (-not $Found) {
    $NewLines += "$Key=$EncodedValue"
  }

  Set-Content -LiteralPath $Path -Value $NewLines -Encoding UTF8
}

function Convert-SecureStringToPlainText {
  param([securestring] $SecureValue)

  $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
  }
}

function Invoke-MysqlFile {
  param(
    [string] $Label,
    [string] $DatabaseName,
    [string] $FilePath,
    [hashtable] $Settings
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "$Label failed because $FilePath was not found."
  }

  $MysqlArgs = @(
    "-h", $Settings["DB_HOST"],
    "-P", $Settings["DB_PORT"],
    "-u", $Settings["DB_USER"]
  )

  if ($DatabaseName -ne "") {
    $MysqlArgs += $DatabaseName
  }

  Invoke-CheckedCommand $Label {
    Get-Content -LiteralPath $FilePath -Raw | mysql @MysqlArgs
  }
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Local office setup"
Write-Host ""

Set-Location -LiteralPath $ProjectRoot

if (-not (Test-CommandAvailable "node")) {
  throw "Node.js was not found. Install Node.js 20 or newer before running this setup."
}

if (-not (Test-CommandAvailable "npm")) {
  throw "npm was not found. Install Node.js 20 or newer before running this setup."
}

if (-not (Test-CommandAvailable "mysql")) {
  throw "mysql was not found. Install MySQL 8 and add the MySQL bin folder to PATH before running this setup."
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
  Invoke-CheckedCommand "Create .env" {
    npm run setup:env
  }
}

$Settings = Read-EnvFile $EnvPath

if (-not $Settings.ContainsKey("DB_HOST") -or $Settings["DB_HOST"] -eq "") {
  Set-EnvValue $EnvPath "DB_HOST" "localhost"
}

if (-not $Settings.ContainsKey("DB_PORT") -or $Settings["DB_PORT"] -eq "") {
  Set-EnvValue $EnvPath "DB_PORT" "3306"
}

if (-not $Settings.ContainsKey("DB_NAME") -or $Settings["DB_NAME"] -eq "") {
  Set-EnvValue $EnvPath "DB_NAME" "barangay_court_scheduler"
}

if (-not $Settings.ContainsKey("DB_USER") -or $Settings["DB_USER"] -eq "") {
  Set-EnvValue $EnvPath "DB_USER" "root"
}

$Settings = Read-EnvFile $EnvPath

if (-not $Settings.ContainsKey("DB_PASSWORD") -or $Settings["DB_PASSWORD"] -eq "" -or $Settings["DB_PASSWORD"] -eq "your-local-mysql-password") {
  $SecurePassword = Read-Host "Enter the local MySQL password for user '$($Settings["DB_USER"])'" -AsSecureString
  $PlainPassword = Convert-SecureStringToPlainText $SecurePassword
  Set-EnvValue $EnvPath "DB_PASSWORD" $PlainPassword
  $Settings = Read-EnvFile $EnvPath
}

if (-not $Settings.ContainsKey("DB_PASSWORD")) {
  $Settings["DB_PASSWORD"] = ""
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "node_modules"))) {
  throw "node_modules was not found. For purely offline barangay setup, copy a prepared project folder that already includes node_modules. Prepare it on a setup computer before bringing it to the barangay office."
}

Write-Host "node_modules found. Setup will use local files only."

Invoke-CheckedCommand "Check SQL files" {
  npm run verify:sql
}

$PreviousMysqlPassword = $env:MYSQL_PWD
$env:MYSQL_PWD = $Settings["DB_PASSWORD"]

try {
  Invoke-MysqlFile "Create database schema" "" $SchemaPath $Settings
  Invoke-MysqlFile "Seed reference data" $Settings["DB_NAME"] $SeedPath $Settings
  Invoke-MysqlFile "Run database diagnostics" $Settings["DB_NAME"] $DiagnosticsPath $Settings
} finally {
  $env:MYSQL_PWD = $PreviousMysqlPassword
}

Invoke-CheckedCommand "Verify live MySQL setup" {
  npm run verify:mysql
}

Write-Host ""
Write-Host "Setup completed."
Write-Host "Start the system with start-barangay-office.bat."
Write-Host "Default login after setup: admin / admin123"
