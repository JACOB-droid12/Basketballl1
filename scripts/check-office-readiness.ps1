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
    Write-Check "FAIL" "Node.js 20+" "node was not found. Include runtime\node in the deployment package, or install Node.js 20+ with installer/admin support."
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

function Test-OptionalPath {
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
    Write-Check "WARN" $RelativePath "not bundled. $Detail"
  }
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Office readiness check"
Write-Host ""

Set-Location -LiteralPath $ProjectRoot

Test-NodeVersion
Test-RequiredCommand "npm" "Include runtime\node in the deployment package, or install Node.js 20+ with installer/admin support."
Test-RequiredCommand "mysql" "Use a bundled runtime\mariadb\bin folder, or install local MySQL/MariaDB."
Test-RequiredCommand "mysqldump" "Use a bundled runtime\mariadb\bin folder, or install local MySQL/MariaDB."

Test-RequiredPath "node_modules" "directory" "required for fully offline setup"
Test-OptionalPath "runtime\node" "directory" "optional bundled Node runtime; avoids depending on global PATH"
Test-OptionalPath "runtime\mariadb\bin" "directory" "optional bundled MariaDB tools; avoids manually editing PATH"
Test-RequiredPath "package.json" "file" "required project manifest"
Test-RequiredPath ".env.example" "file" "template used by first-time setup"
Test-RequiredPath "START-HERE.bat" "file" "main staff-friendly launcher"
Test-RequiredPath "maintenance-tools\backup-database.bat" "file" "staff-friendly local database backup"
Test-RequiredPath "maintenance-tools\restore-database.bat" "file" "guarded IT-support database restore"
Test-RequiredPath "maintenance-tools\create-desktop-shortcut.bat" "file" "optional staff desktop shortcut helper"
Test-RequiredPath "database\schema.sql" "file" "creates the local MySQL database and tables"
Test-RequiredPath "database\seed.sql" "file" "adds starter admin, statuses, settings, and time slots"
Test-RequiredPath "database\diagnostics.sql" "file" "checks the installed local database"
Test-RequiredPath "maintenance-tools\setup-barangay-office.bat" "file" "main one-click setup implementation"
Test-RequiredPath "maintenance-tools\setup-database-only.bat" "file" "SQL-only fallback setup"
Test-RequiredPath "start-barangay-office.bat" "file" "starts the local app"
Test-RequiredPath "maintenance-tools\run-office-signoff.bat" "file" "runs final local sign-off checks"
Test-RequiredPath "maintenance-tools\load-runtime-env.bat" "file" "loads bundled runtime tools before checks"
Test-RequiredPath "scripts\setup-barangay-office.ps1" "file" "setup implementation"
Test-RequiredPath "scripts\ensure-local-database.ps1" "file" "starts bundled local MariaDB when available"
Test-RequiredPath "scripts\verify-mysql.mjs" "file" "live MySQL verification"

if (Test-Path -LiteralPath (Join-Path $ProjectRoot ".env")) {
  Write-Check "OK" ".env" "local configuration already exists"
} else {
  Write-Check "WARN" ".env" "not created yet. START-HERE.bat first-time setup will create it from .env.example."
}

Write-Host ""

if ($Failures -gt 0) {
  Write-Host "Readiness check failed with $Failures issue(s). Fix the failed items before using START-HERE.bat for first-time setup."
  exit 1
}

if ($Warnings -gt 0) {
  Write-Host "Readiness check passed with $Warnings warning(s). You can run START-HERE.bat first-time setup next."
} else {
  Write-Host "Readiness check passed. You can run START-HERE.bat first-time setup next."
}
