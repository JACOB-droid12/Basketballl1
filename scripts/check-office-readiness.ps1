$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Failures = 0
$Warnings = 0

function Write-Check {
  param(
    [string] $Status,
    [string] $Name,
    [string] $Detail
  )

  Write-Host "[$Status] $Name - $Detail"

  if ($Status -eq "FAIL") {
    $script:Failures += 1
  }

  if ($Status -eq "WARN") {
    $script:Warnings += 1
  }
}

function Test-CommandAvailable {
  param([string] $CommandName)

  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Get-CommandOutput {
  param(
    [string] $CommandName,
    [string[]] $Arguments
  )

  try {
    $Output = & $CommandName @Arguments 2>&1
    return [string]::Join(" ", @($Output)).Trim()
  } catch {
    return $_.Exception.Message
  }
}

function Test-NodeVersion {
  if (-not (Test-CommandAvailable "node")) {
    Write-Check "FAIL" "Node.js 20+" "node was not found. Install Node.js 20 or newer from an offline installer."
    return
  }

  $VersionText = Get-CommandOutput "node" @("--version")
  $Match = [regex]::Match($VersionText, "(\d+)")

  if ($Match.Success -and [int] $Match.Groups[1].Value -ge 20) {
    Write-Check "OK" "Node.js 20+" "found $VersionText"
  } else {
    Write-Check "FAIL" "Node.js 20+" "found $VersionText, but version 20 or newer is required."
  }
}

function Test-RequiredCommand {
  param(
    [string] $CommandName,
    [string] $InstallHint
  )

  if (Test-CommandAvailable $CommandName) {
    $VersionText = Get-CommandOutput $CommandName @("--version")
    Write-Check "OK" $CommandName "found $VersionText"
  } else {
    Write-Check "FAIL" $CommandName "$CommandName was not found. $InstallHint"
  }
}

function Test-RequiredPath {
  param(
    [string] $RelativePath,
    [string] $Type,
    [string] $Detail
  )

  $FullPath = Join-Path $ProjectRoot $RelativePath
  $Exists = Test-Path -LiteralPath $FullPath

  if ($Exists) {
    if ($Type -eq "directory" -and -not (Get-Item -LiteralPath $FullPath).PSIsContainer) {
      Write-Check "FAIL" $RelativePath "expected a folder. $Detail"
      return
    }

    if ($Type -eq "file" -and (Get-Item -LiteralPath $FullPath).PSIsContainer) {
      Write-Check "FAIL" $RelativePath "expected a file. $Detail"
      return
    }

    Write-Check "OK" $RelativePath $Detail
  } else {
    Write-Check "FAIL" $RelativePath "missing. $Detail"
  }
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Office readiness check"
Write-Host ""

Set-Location -LiteralPath $ProjectRoot

Test-NodeVersion
Test-RequiredCommand "npm" "Install Node.js 20 or newer from an offline installer."
Test-RequiredCommand "mysql" "Install local MySQL or MariaDB and add its bin folder to PATH."
Test-RequiredCommand "mysqldump" "Install local MySQL or MariaDB and add its bin folder to PATH."

Test-RequiredPath "node_modules" "directory" "required for fully offline setup"
Test-RequiredPath "package.json" "file" "required project manifest"
Test-RequiredPath ".env.example" "file" "template used by setup-barangay-office.bat"
Test-RequiredPath "database\schema.sql" "file" "creates the local MySQL database and tables"
Test-RequiredPath "database\seed.sql" "file" "adds starter admin, statuses, settings, and time slots"
Test-RequiredPath "database\diagnostics.sql" "file" "checks the installed local database"
Test-RequiredPath "setup-barangay-office.bat" "file" "main one-click setup"
Test-RequiredPath "setup-database-only.bat" "file" "SQL-only fallback setup"
Test-RequiredPath "start-barangay-office.bat" "file" "starts the local app"
Test-RequiredPath "run-office-signoff.bat" "file" "runs final local sign-off checks"
Test-RequiredPath "scripts\setup-barangay-office.ps1" "file" "setup implementation"
Test-RequiredPath "scripts\verify-mysql.mjs" "file" "live MySQL verification"

if (Test-Path -LiteralPath (Join-Path $ProjectRoot ".env")) {
  Write-Check "OK" ".env" "local configuration already exists"
} else {
  Write-Check "WARN" ".env" "not created yet. setup-barangay-office.bat will create it from .env.example."
}

Write-Host ""

if ($Failures -gt 0) {
  Write-Host "Readiness check failed with $Failures issue(s). Fix the failed items before running setup-barangay-office.bat."
  exit 1
}

if ($Warnings -gt 0) {
  Write-Host "Readiness check passed with $Warnings warning(s). You can run setup-barangay-office.bat next."
} else {
  Write-Host "Readiness check passed. You can run setup-barangay-office.bat next."
}
