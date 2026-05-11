param(
  [switch] $WhatIf,
  [string] $DesktopPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DailyLauncherPath = Join-Path $ProjectRoot "start-barangay-office.bat"
$MaintenanceLauncherPath = Join-Path $ProjectRoot "START-HERE.bat"
$ResolvedDesktopPath = if ($DesktopPath) { $DesktopPath } else { [Environment]::GetFolderPath("Desktop") }
$DailyShortcutPath = Join-Path $ResolvedDesktopPath "Barangay Court Scheduler.lnk"
$MaintenanceShortcutPath = Join-Path $ResolvedDesktopPath "Barangay Court Scheduler - Maintenance.lnk"

function New-OfficeShortcut {
  param(
    [object] $Shell,
    [string] $ShortcutPath,
    [string] $TargetPath,
    [string] $Description
  )

  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $TargetPath
  $Shortcut.WorkingDirectory = $ProjectRoot
  $Shortcut.Description = $Description
  $Shortcut.WindowStyle = 1
  $Shortcut.Save()
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Desktop shortcut setup"
Write-Host ""

if (-not (Test-Path -LiteralPath $DailyLauncherPath)) {
  throw "start-barangay-office.bat was not found in $ProjectRoot."
}

if (-not (Test-Path -LiteralPath $MaintenanceLauncherPath)) {
  throw "START-HERE.bat was not found in $ProjectRoot."
}

if (-not $ResolvedDesktopPath) {
  throw "Unable to locate the current user's Desktop folder."
}

if ($WhatIf) {
  Write-Host "Would create daily-use shortcut:"
  Write-Host $DailyShortcutPath
  Write-Host "Target:"
  Write-Host $DailyLauncherPath
  Write-Host ""
  Write-Host "Would create maintenance shortcut:"
  Write-Host $MaintenanceShortcutPath
  Write-Host "Target:"
  Write-Host $MaintenanceLauncherPath
  exit 0
}

$Shell = New-Object -ComObject WScript.Shell

New-OfficeShortcut `
  -Shell $Shell `
  -ShortcutPath $DailyShortcutPath `
  -TargetPath $DailyLauncherPath `
  -Description "Open the offline Barangay Court Scheduling System for daily use"

New-OfficeShortcut `
  -Shell $Shell `
  -ShortcutPath $MaintenanceShortcutPath `
  -TargetPath $MaintenanceLauncherPath `
  -Description "Open setup, backup, database checks, and maintenance tools"

Write-Host "Desktop shortcuts created:"
Write-Host $DailyShortcutPath
Write-Host $MaintenanceShortcutPath
