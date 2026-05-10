$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReportsRoot = Join-Path $ProjectRoot "reports\office-signoff"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsRoot "office-signoff-$Timestamp.txt"
$Failures = 0

function Write-ReportLine {
  param([string] $Message = "")

  Write-Host $Message
  Add-Content -LiteralPath $ReportPath -Value $Message -Encoding UTF8
}

function Invoke-SignoffCommand {
  param(
    [string] $Label,
    [string] $CommandLine
  )

  Write-ReportLine ""
  Write-ReportLine "== $Label =="
  Write-ReportLine "Command: $CommandLine"

  $Output = & cmd /c $CommandLine 2>&1
  $ExitCode = $LASTEXITCODE

  foreach ($Line in @($Output)) {
    Write-ReportLine ([string] $Line)
  }

  if ($ExitCode -eq 0) {
    Write-ReportLine "Result: PASS"
  } else {
    Write-ReportLine "Result: FAIL, exit code $ExitCode"
    $script:Failures += 1
  }
}

function Write-ManualChecklist {
  Write-ReportLine ""
  Write-ReportLine "== Manual verification checklist =="
  Write-ReportLine "[ ] Open http://localhost:3000/login from the barangay office browser."
  Write-ReportLine "[ ] Log in with the starter admin account, then change the starter password."
  Write-ReportLine "[ ] Create a staff account, then confirm duplicate usernames are rejected."
  Write-ReportLine "[ ] Add a reservation with representative name, contact number, address, purpose, date, and time."
  Write-ReportLine "[ ] Try adding an overlapping reservation and confirm the system blocks it."
  Write-ReportLine "[ ] Edit a reservation and confirm the schedule/list details update."
  Write-ReportLine "[ ] Mark reservations as missed, completed, and cancelled."
  Write-ReportLine "[ ] View activity logs and confirm the actions were recorded."
  Write-ReportLine "[ ] Export reservation records to CSV."
  Write-ReportLine "[ ] Print the schedule or records using the actual office browser and printer."
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Office sign-off verification"
Write-Host ""

Set-Location -LiteralPath $ProjectRoot

if (-not (Test-Path -LiteralPath $ReportsRoot)) {
  New-Item -ItemType Directory -Path $ReportsRoot -Force | Out-Null
}

Write-ReportLine "Barangay Basketball Court Scheduling System"
Write-ReportLine "Office sign-off verification"
Write-ReportLine "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-ReportLine "Computer: $env:COMPUTERNAME"
Write-ReportLine "Project folder: $ProjectRoot"

Invoke-SignoffCommand "Verify local prerequisites" "npm run verify:prereqs"
Invoke-SignoffCommand "Check configured local database" "npm run check:database"
Invoke-SignoffCommand "Verify live MySQL setup and app smoke" "npm run verify:mysql"
Invoke-SignoffCommand "Verify office UI screens" "npm run verify:ui"
Invoke-SignoffCommand "Create local MySQL backup" "npm run backup:mysql"

Write-ManualChecklist

Write-ReportLine ""
Write-ReportLine "Report saved to: $ReportPath"

if ($Failures -gt 0) {
  Write-ReportLine "Automated sign-off checks finished with $Failures failed step(s). Fix failed items, then rerun run-office-signoff.bat."
  exit 1
}

Write-ReportLine "Automated sign-off checks passed. Complete the manual verification checklist before final deployment sign-off."
