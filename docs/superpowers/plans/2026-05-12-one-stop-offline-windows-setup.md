# One-Stop Offline Windows Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployment package prove when it is a true one-stop offline Windows package: copy/extract the folder, click `START-HERE.bat`, and run without internet, global Node.js, global MySQL/MariaDB, or manual PATH edits.

**Architecture:** Keep the current Node/Express + local MySQL/MariaDB application. Add verification and packaging gates around the already-supported `runtime\node` and `runtime\mariadb` folders instead of changing the app into an installer-driven or online system. Ordinary staff continue using the Desktop shortcut; installer/admin users get a stricter deployment-preparation path.

**Tech Stack:** Windows batch, PowerShell, Node.js ES modules, `node:test`, local MySQL/MariaDB, existing offline bundle scripts.

---

## Current Feasibility Notes

- The app already supports local backend startup through `start-barangay-office.bat`.
- `maintenance-tools\load-runtime-env.bat` already prefers `runtime\node` and `runtime\mariadb\bin` before global PATH tools.
- `scripts\ensure-local-database.ps1` already knows how to initialize and start bundled MariaDB from `runtime\mariadb`.
- `node_modules` is required for offline use and is copied into `dist\barangay-court-scheduler-offline`.
- The current blocker is packaging certainty: `runtime\` and `installers\` are optional, absent in the current workspace, and not enforced by `npm run verify:bundle`.

## File Structure

- Create `scripts/verify-runtime-package.mjs`
  - Verifies that the prepared folder includes portable Node and MariaDB files required for true one-stop setup.
  - Exports `analyzeRuntimePackage()` and `formatRuntimePackageReport()` for tests.
- Create `tests/runtimePackage.test.js`
  - Unit tests for runtime package analysis and report formatting.
- Modify `package.json`
  - Add `verify:runtime-package`.
- Modify `scripts/create-offline-bundle.ps1`
  - Add `-RequireBundledRuntime` switch.
  - In strict mode, fail if `runtime\node` or `runtime\mariadb` is missing before copying.
- Modify `scripts/verify-offline-bundle.mjs`
  - Add optional strict runtime verification flag, or document that `verify:runtime-package` is the strict runtime gate.
- Modify `README-FIRST-WINDOWS.txt`, `TROUBLESHOOT-WINDOWS.txt`, `docs/DEPLOYMENT_GUIDE.md`, and `docs/OFFLINE_INSTALL_CHECKLIST.md`
  - Clearly separate "deployment candidate" from "true one-stop offline package."
- Create optional `PREPARE-DEPLOYMENT-PACKAGE.bat`
  - Admin/setup-computer launcher for strict runtime verification, bundle creation, and bundle verification.
  - This must be clearly marked for installer/admin use, not daily staff use.
- Modify `docs/CODEX_HANDOFF.md`
  - Record implementation status, tests, and remaining clean-PC validation requirement.

## Task 1: Add Runtime Package Verifier

**Files:**
- Create: `scripts/verify-runtime-package.mjs`
- Create: `tests/runtimePackage.test.js`
- Modify: `package.json`

- [x] **Step 1: Write the failing tests**

Create `tests/runtimePackage.test.js`:

```js
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeRuntimePackage,
  formatRuntimePackageReport
} from "../scripts/verify-runtime-package.mjs";

test("runtime package verifier accepts bundled Node and MariaDB runtime files", () => {
  const root = createRuntimeRoot([
    "runtime/node/node.exe",
    "runtime/node/npm.cmd",
    "runtime/mariadb/bin/mariadbd.exe",
    "runtime/mariadb/bin/mariadb-install-db.exe",
    "runtime/mariadb/bin/mysql.exe",
    "runtime/mariadb/bin/mysqldump.exe"
  ]);

  try {
    const report = analyzeRuntimePackage(root);
    assert.equal(report.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime package verifier reports missing files for a non one-stop package", () => {
  const root = createRuntimeRoot([
    "runtime/node/node.exe",
    "runtime/mariadb/bin/mysql.exe"
  ]);

  try {
    const report = analyzeRuntimePackage(root);
    const formatted = formatRuntimePackageReport(report);

    assert.equal(report.ok, false);
    assert.match(formatted, /runtime\/node\/npm\.cmd/);
    assert.match(formatted, /runtime\/mariadb\/bin\/mariadbd\.exe/);
    assert.match(formatted, /runtime\/mariadb\/bin\/mysqldump\.exe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function createRuntimeRoot(files) {
  const root = mkdtempSync(path.join(tmpdir(), "barangay-runtime-package-"));

  for (const file of files) {
    const fullPath = path.join(root, file);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, "test");
  }

  return root;
}
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests\runtimePackage.test.js
```

Expected: FAIL because `scripts/verify-runtime-package.mjs` does not exist yet.

- [x] **Step 3: Implement the minimal verifier**

Create `scripts/verify-runtime-package.mjs`:

```js
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REQUIRED_RUNTIME_ITEMS = [
  { path: "runtime/node/node.exe", type: "file", detail: "portable Node.js executable" },
  { path: "runtime/node/npm.cmd", type: "file", detail: "portable npm command" },
  { path: "runtime/mariadb/bin/mariadbd.exe", type: "file", detail: "portable MariaDB server" },
  { path: "runtime/mariadb/bin/mariadb-install-db.exe", type: "file", detail: "portable MariaDB initialization tool" },
  { path: "runtime/mariadb/bin/mysql.exe", type: "file", detail: "portable MySQL/MariaDB client" },
  { path: "runtime/mariadb/bin/mysqldump.exe", type: "file", detail: "portable backup tool" }
];

export function analyzeRuntimePackage(projectRoot = PROJECT_ROOT) {
  const checks = REQUIRED_RUNTIME_ITEMS.map((item) => {
    const fullPath = path.join(projectRoot, item.path);
    return {
      name: item.path,
      ok: item.type === "directory" ? isDirectory(fullPath) : isFile(fullPath),
      detail: item.detail
    };
  });

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}

export function formatRuntimePackageReport(report) {
  return report.checks
    .map((check) => `[${check.ok ? "OK" : "FAIL"}] ${check.name} - ${check.detail}`)
    .join("\n");
}

export async function verifyRuntimePackage(options = {}) {
  const output = options.output || console;
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const report = analyzeRuntimePackage(projectRoot);

  output.log(formatRuntimePackageReport(report));

  if (!report.ok) {
    throw new Error("Runtime package verification failed. Add runtime\\node and runtime\\mariadb before creating a true one-stop offline package.");
  }

  return report;
}

function isFile(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isFile();
}

function isDirectory(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isDirectory();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyRuntimePackage().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
```

- [x] **Step 4: Add package script**

Modify `package.json` scripts:

```json
"verify:runtime-package": "node scripts/verify-runtime-package.mjs"
```

- [x] **Step 5: Verify green**

Run:

```powershell
npm test -- tests\runtimePackage.test.js
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add package.json scripts/verify-runtime-package.mjs tests/runtimePackage.test.js
git commit -m "test: add offline runtime package verifier"
```

## Task 2: Add Strict Bundle Mode

**Files:**
- Modify: `scripts/create-offline-bundle.ps1`
- Modify: `tests/offlineBundle.test.js`

**Status note:** The later user request narrowed this checkpoint to strict
validation in `scripts/verify-offline-bundle.mjs`, not strict creation in
`scripts/create-offline-bundle.ps1`. Candidate and strict verification modes
are now implemented; a creation-time `-RequireBundledRuntime` switch remains
optional future hardening.

- [ ] **Step 1: Write the failing test**

Append to `tests/offlineBundle.test.js`:

```js
test("offline bundle script has a strict runtime mode for true one-stop packages", () => {
  const script = readFileSync("scripts/create-offline-bundle.ps1", "utf8");

  assert.match(script, /param\(/);
  assert.match(script, /\[switch\] \$RequireBundledRuntime/);
  assert.match(script, /runtime\\node\\node\.exe/);
  assert.match(script, /runtime\\node\\npm\.cmd/);
  assert.match(script, /runtime\\mariadb\\bin\\mariadbd\.exe/);
  assert.match(script, /runtime\\mariadb\\bin\\mariadb-install-db\.exe/);
  assert.match(script, /runtime\\mariadb\\bin\\mysql\.exe/);
  assert.match(script, /runtime\\mariadb\\bin\\mysqldump\.exe/);
  assert.match(script, /true one-stop offline package/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests\offlineBundle.test.js
```

Expected: FAIL because `-RequireBundledRuntime` is not implemented.

- [ ] **Step 3: Implement strict runtime gate**

Modify the top of `scripts/create-offline-bundle.ps1`:

```powershell
param(
  [switch] $RequireBundledRuntime
)
```

Add helper before copy logic:

```powershell
function Assert-RequiredRuntimeFile {
  param([string] $RelativePath)

  $FullPath = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath)) {
    throw "Cannot create a true one-stop offline package. Missing required bundled runtime file: $RelativePath"
  }
}

if ($RequireBundledRuntime) {
  Assert-RequiredRuntimeFile "runtime\node\node.exe"
  Assert-RequiredRuntimeFile "runtime\node\npm.cmd"
  Assert-RequiredRuntimeFile "runtime\mariadb\bin\mariadbd.exe"
  Assert-RequiredRuntimeFile "runtime\mariadb\bin\mariadb-install-db.exe"
  Assert-RequiredRuntimeFile "runtime\mariadb\bin\mysql.exe"
  Assert-RequiredRuntimeFile "runtime\mariadb\bin\mysqldump.exe"
}
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm test -- tests\offlineBundle.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts/create-offline-bundle.ps1 tests/offlineBundle.test.js
git commit -m "feat: add strict offline runtime bundle gate"
```

## Task 3: Add Installer/Admin Preparation Wrapper

**Files:**
- Create: `PREPARE-DEPLOYMENT-PACKAGE.bat`
- Modify: `tests/oneClickSetup.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/oneClickSetup.test.js`:

```js
test("deployment preparation wrapper is clearly admin-only and verifies bundled runtime", () => {
  const script = readFileSync("PREPARE-DEPLOYMENT-PACKAGE.bat", "utf8");

  assert.match(script, /installer\/admin/i);
  assert.match(script, /verify:runtime-package/i);
  assert.match(script, /create-offline-bundle\.ps1/i);
  assert.match(script, /-RequireBundledRuntime/i);
  assert.match(script, /verify:bundle/i);
  assert.match(script, /This is not the daily staff launcher/i);
  assert.doesNotMatch(script, /npm install/i);
  assert.doesNotMatch(script, /npm ci/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests\oneClickSetup.test.js
```

Expected: FAIL because `PREPARE-DEPLOYMENT-PACKAGE.bat` does not exist.

- [ ] **Step 3: Create wrapper**

Create `PREPARE-DEPLOYMENT-PACKAGE.bat`:

```bat
@echo off
setlocal
cd /d "%~dp0"
call "%~dp0maintenance-tools\load-runtime-env.bat"

echo Barangay Basketball Court Scheduling System
echo Installer/admin deployment package preparation
echo.
echo This is not the daily staff launcher.
echo Use this only on the setup computer before copying the final folder.
echo.

npm run verify:runtime-package
if errorlevel 1 goto failed

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-offline-bundle.ps1" -RequireBundledRuntime
if errorlevel 1 goto failed

npm run verify:bundle
if errorlevel 1 goto failed

echo.
echo Deployment package is ready for test installation:
echo dist\barangay-court-scheduler-offline
pause
exit /b 0

:failed
echo.
echo Deployment package preparation failed.
echo Add the required bundled runtime folders or open TROUBLESHOOT-WINDOWS.txt.
pause
exit /b 1
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm test -- tests\oneClickSetup.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add PREPARE-DEPLOYMENT-PACKAGE.bat tests/oneClickSetup.test.js
git commit -m "feat: add one-stop package preparation wrapper"
```

## Task 4: Update Beginner and Deployment Documentation

**Files:**
- Modify: `README-FIRST-WINDOWS.txt`
- Modify: `TROUBLESHOOT-WINDOWS.txt`
- Modify: `docs/DEPLOYMENT_GUIDE.md`
- Modify: `docs/OFFLINE_INSTALL_CHECKLIST.md`
- Modify: `docs/CODEX_HANDOFF.md`

- [ ] **Step 1: Write failing documentation tests**

Add assertions to `tests/documentation.test.js`:

```js
test("documentation distinguishes deployment candidate from true one-stop package", () => {
  const firstRun = readFileSync("README-FIRST-WINDOWS.txt", "utf8");
  const troubleshoot = readFileSync("TROUBLESHOOT-WINDOWS.txt", "utf8");
  const guide = readFileSync("docs/DEPLOYMENT_GUIDE.md", "utf8");
  const checklist = readFileSync("docs/OFFLINE_INSTALL_CHECKLIST.md", "utf8");

  for (const content of [firstRun, troubleshoot, guide, checklist]) {
    assert.match(content, /true one-stop offline package/i);
    assert.match(content, /deployment candidate/i);
    assert.match(content, /runtime\\node/i);
    assert.match(content, /runtime\\mariadb/i);
  }

  assert.match(guide, /PREPARE-DEPLOYMENT-PACKAGE\.bat/);
  assert.match(checklist, /npm run verify:runtime-package/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests\documentation.test.js
```

Expected: FAIL until docs are updated.

- [ ] **Step 3: Update docs**

Add these concepts to the docs:

```text
Deployment candidate:
Works offline when the computer has the required local runtime available either through bundled runtime folders or already installed Node.js and MySQL/MariaDB.

True one-stop offline package:
Includes runtime\node, runtime\mariadb, node_modules, database setup files, START-HERE.bat, maintenance tools, and documentation. It should pass npm run verify:runtime-package and npm run verify:bundle before being copied to another Windows PC.
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm test -- tests\documentation.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add README-FIRST-WINDOWS.txt TROUBLESHOOT-WINDOWS.txt docs/DEPLOYMENT_GUIDE.md docs/OFFLINE_INSTALL_CHECKLIST.md docs/CODEX_HANDOFF.md tests/documentation.test.js
git commit -m "docs: clarify one-stop offline package requirements"
```

## Task 5: Final Verification Pass

**Files:**
- No implementation files unless verification reveals a bug.

- [ ] **Step 1: Run focused tests**

```powershell
npm test -- tests\runtimePackage.test.js tests\offlineBundle.test.js tests\oneClickSetup.test.js tests\documentation.test.js
```

Expected: PASS.

- [ ] **Step 2: Run full automated tests**

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 3: Run SQL and bundle verification**

```powershell
npm run verify:sql
npm run verify:foundation
npm run bundle:offline
npm run verify:bundle
```

Expected: PASS.

- [ ] **Step 4: Run strict runtime verifier**

```powershell
npm run verify:runtime-package
```

Expected in current workspace: FAIL if `runtime\` is still absent. This is acceptable evidence that the current workspace is not yet a true one-stop offline package.

Expected after adding portable runtimes: PASS.

- [ ] **Step 5: Commit verification documentation if needed**

If only docs/handoff changed:

```powershell
git add docs/CODEX_HANDOFF.md
git commit -m "docs: record one-stop package verification status"
```

## Do Not Change In This Plan

- Do not modify the supplied prototype UI.
- Do not add resident online booking.
- Do not use cloud hosting or cloud databases.
- Do not silently install Node.js or MariaDB.
- Do not store database data inside a folder that staff may replace during app updates without a backup/update procedure.
- Do not mark final barangay-office deployment complete until tested on the actual office PC.

## Self-Review

- The plan covers the explicit feasibility gap: proving whether a copied folder is a true one-stop offline package.
- It keeps the current backend and frontend architecture intact.
- It uses TDD for every behavior change.
- It creates a hard gate for bundled runtime files without forcing the current deployment-candidate mode to fail.
- It does not require internet during barangay-office setup.
- It leaves clean-PC and actual barangay-office testing as required external validation.
