$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistRoot = Join-Path $ProjectRoot "dist"
$BundleRoot = Join-Path $DistRoot "barangay-court-scheduler-offline"
$NodeModulesPath = Join-Path $ProjectRoot "node_modules"
$ReactManifestPath = Join-Path $ProjectRoot "public\app\.vite\manifest.json"

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

if (-not (Test-Path -LiteralPath $ReactManifestPath)) {
  throw "React staff console build was not found. Run npm run frontend:build before npm run bundle:offline."
}

if (-not (Test-Path -LiteralPath $DistRoot)) {
  New-Item -ItemType Directory -Path $DistRoot | Out-Null
}

if (Test-Path -LiteralPath $BundleRoot) {
  Assert-ChildPath $DistRoot $BundleRoot
  foreach ($ExistingItem in Get-ChildItem -LiteralPath $BundleRoot -Force) {
    Remove-Item -LiteralPath $ExistingItem.FullName -Recurse -Force
  }
}

New-Item -ItemType Directory -Path $BundleRoot -Force | Out-Null

$ItemsToCopy = @(
  ".env.example",
  "package.json",
  "package-lock.json",
  "START-HERE.bat",
  "STAFF-DAILY-USE.txt",
  "README.md",
  "README-FIRST-WINDOWS.txt",
  "TROUBLESHOOT-WINDOWS.txt",
  "maintenance-tools",
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

$OptionalItemsToCopy = @(
  "runtime",
  "installers"
)

foreach ($Item in $OptionalItemsToCopy) {
  $Source = Join-Path $ProjectRoot $Item

  if (Test-Path -LiteralPath $Source) {
    Copy-Item -LiteralPath $Source -Destination $BundleRoot -Recurse -Force
  } else {
    Write-Host "Optional deployment folder not found: $Item"
  }
}

$BundleDataDir = Join-Path $BundleRoot "data\mariadb-data"
New-Item -ItemType Directory -Path $BundleDataDir -Force | Out-Null
Write-Host "Prepared empty portable database data folder: data\mariadb-data"

Write-Host ""
Write-Host "Offline bundle created:"
Write-Host $BundleRoot
Write-Host ""
Write-Host "Copy this folder to the barangay office computer, then double-click START-HERE.bat. If an error appears, open TROUBLESHOOT-WINDOWS.txt."
