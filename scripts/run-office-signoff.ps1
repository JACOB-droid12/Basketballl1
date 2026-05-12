param(
  [string] $ReportsRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ReportsRoot)) {
  $ReportsRoot = Join-Path $ProjectRoot "reports\office-signoff"
} elseif (-not [System.IO.Path]::IsPathRooted($ReportsRoot)) {
  $ReportsRoot = Join-Path $ProjectRoot $ReportsRoot
}
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

function Get-OfficeUrl {
  $DefaultOfficeUrl = "http://localhost:3000/prototype"
  $UrlScript = Join-Path $ProjectRoot "scripts\print-office-url.mjs"

  try {
    $Output = & node $UrlScript 2>$null
    if ($LASTEXITCODE -eq 0) {
      foreach ($Line in @($Output)) {
        $Candidate = ([string] $Line).Trim()
        if (-not [string]::IsNullOrWhiteSpace($Candidate)) {
          return $Candidate
        }
      }
    }
  } catch {
    return $DefaultOfficeUrl
  }

  return $DefaultOfficeUrl
}

function Write-ManualChecklist {
  $OfficeUrl = Get-OfficeUrl

  Write-ReportLine ""
  Write-ReportLine "== Manual verification checklist =="
  Write-ReportLine "[ ] Record the local MySQL/MariaDB service version used for office records: ______________________________"
  Write-ReportLine "[ ] Record the MySQL client tools on PATH by running mysql --version and mysqldump --version."
  Write-ReportLine "[ ] Open $OfficeUrl from the barangay office browser."
  Write-ReportLine "[ ] Record the browser used for sign-off: ______________________________"
  Write-ReportLine "[ ] Log in with the starter admin account, then change the starter password, or log in with the active Admin account configured in .env."
  Write-ReportLine "[ ] If the seeded admin account was retired, confirm the sign-off checks used VERIFY_LOGIN_USERNAME and VERIFY_LOGIN_PASSWORD for the active Admin account."
  Write-ReportLine "[ ] Create a staff account, then confirm duplicate usernames are rejected."
  Write-ReportLine "[ ] Add a reservation with representative name, contact number, address, purpose, date, and time."
  Write-ReportLine "[ ] Try adding an overlapping reservation and confirm the system blocks it."
  Write-ReportLine "[ ] Edit a reservation and confirm the schedule/list details update."
  Write-ReportLine "[ ] Mark reservations as missed, completed, and cancelled."
  Write-ReportLine "[ ] View activity logs and confirm the actions were recorded."
  Write-ReportLine "[ ] Export reservation records to CSV."
  Write-ReportLine "[ ] Print the schedule or records using the actual office browser and printer."
  Write-ReportLine "[ ] Record the printer used for sign-off: ______________________________"
  Write-ReportLine "[ ] Confirm printed schedule/records are readable and not cut off."
  Write-ReportLine "[ ] Barangay personnel sign-off name/date: ______________________________"
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
Invoke-SignoffCommand "Verify offline prototype runtime" "npm run verify:offline-runtime"
Invoke-SignoffCommand "Create local MySQL backup" "npm run backup:mysql"

Write-ManualChecklist

Write-ReportLine ""
Write-ReportLine "Report saved to: $ReportPath"

if ($Failures -gt 0) {
  Write-ReportLine "Automated sign-off checks finished with $Failures failed step(s). Fix failed items, then rerun START-HERE.bat > Create final office sign-off report."
  Write-ReportLine "Do not use this report as final deployment sign-off until failed automated checks pass."
  exit 1
}

Write-ReportLine "Automated sign-off checks passed. Complete the manual verification checklist before final deployment sign-off."
