$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistRoot = Join-Path $ProjectRoot "dist"
$BundleRoot = Join-Path $DistRoot "barangay-court-scheduler-offline"
$NodeModulesPath = Join-Path $ProjectRoot "node_modules"

function Assert-ChildPath {
  param(
    [string] $ParentPath,
    [string] $ChildPath
  )

  $ResolvedParent = (Resolve-Path -LiteralPath $ParentPath).Path
  $ResolvedChild = (Resolve-Path -LiteralPath $ChildPath).Path

  if (-not $ResolvedChild.StartsWith($ResolvedParent, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside $ResolvedParent."
  }
}

Write-Host "Barangay Basketball Court Scheduling System"
Write-Host "Creating pure offline bundle"
Write-Host ""

Set-Location -LiteralPath $ProjectRoot

if (-not (Test-Path -LiteralPath $NodeModulesPath)) {
  throw "node_modules was not found. Run npm install on this setup computer before creating the offline bundle."
}

if (-not (Test-Path -LiteralPath $DistRoot)) {
  New-Item -ItemType Directory -Path $DistRoot | Out-Null
}

if (Test-Path -LiteralPath $BundleRoot) {
  Assert-ChildPath $DistRoot $BundleRoot
  Remove-Item -LiteralPath $BundleRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $BundleRoot | Out-Null

$ItemsToCopy = @(
  ".env.example",
  "package.json",
  "package-lock.json",
  "README.md",
  "setup-database-only.bat",
  "check-office-readiness.bat",
  "setup-barangay-office.bat",
  "start-barangay-office.bat",
  "src",
  "views",
  "public",
  "database",
  "docs",
  "scripts",
  "tests",
  "node_modules"
)

foreach ($Item in $ItemsToCopy) {
  $Source = Join-Path $ProjectRoot $Item

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Bundle source item was not found: $Item"
  }

  Copy-Item -LiteralPath $Source -Destination $BundleRoot -Recurse -Force
}

Write-Host ""
Write-Host "Offline bundle created:"
Write-Host $BundleRoot
Write-Host ""
Write-Host "Copy this folder to the barangay office computer, run check-office-readiness.bat, then run setup-barangay-office.bat."
