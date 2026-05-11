import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("staff launcher provides one menu for setup, startup, checks, and sign-off", () => {
  const script = readFileSync("START-HERE.bat", "utf8");

  assert.match(script, /Windows Offline Office Launcher/i);
  assert.match(script, /Start the system for daily use/i);
  assert.match(script, /First-time setup on this computer/i);
  assert.match(script, /Back up the database now/i);
  assert.match(script, /Create desktop shortcut/i);
  assert.match(script, /Check this computer before setup/i);
  assert.match(script, /Create final office sign-off report/i);
  assert.match(script, /Database-only setup\/checks for IT support/i);
  assert.match(script, /STAFF-DAILY-USE\.txt/i);
  assert.match(script, /call "%~dp0start-barangay-office\.bat"/i);
  assert.match(script, /call "%~dp0setup-barangay-office\.bat"/i);
  assert.match(script, /call "%~dp0backup-database\.bat"/i);
  assert.match(script, /call "%~dp0create-desktop-shortcut\.bat"/i);
  assert.match(script, /call "%~dp0check-office-readiness\.bat"/i);
  assert.match(script, /call "%~dp0run-office-signoff\.bat"/i);
  assert.match(script, /call "%~dp0setup-database-only\.bat"/i);
  assert.match(script, /notepad "%~dp0STAFF-DAILY-USE\.txt"/i);
  assert.match(script, /notepad "%~dp0README-FIRST-WINDOWS\.txt"/i);
  assert.doesNotMatch(script, /npm install/i);
  assert.doesNotMatch(script, /npm ci/i);
});

test("daily staff guide keeps ordinary use separate from maintenance", () => {
  const guide = readFileSync("STAFF-DAILY-USE.txt", "utf8");

  assert.match(guide, /Double-click this Desktop shortcut:/i);
  assert.match(guide, /Barangay Court Scheduler/);
  assert.match(guide, /Keep the black startup window open/i);
  assert.match(guide, /Barangay Court Scheduler - Maintenance/);
  assert.match(guide, /setup, backups, database checks, sign-off, or support/i);
  assert.match(guide, /localhost/i);
  assert.match(guide, /not an online public booking site/i);
  assert.doesNotMatch(guide, /npm install/i);
  assert.doesNotMatch(guide, /npm ci/i);
});

test("desktop shortcut batch creates daily-use and maintenance shortcuts without downloading", () => {
  const batchScript = readFileSync("create-desktop-shortcut.bat", "utf8");
  const powerShellScript = readFileSync("scripts/create-desktop-shortcut.ps1", "utf8");

  assert.match(batchScript, /scripts\\create-desktop-shortcut\.ps1/i);
  assert.match(batchScript, /ExecutionPolicy Bypass/i);
  assert.match(powerShellScript, /start-barangay-office\.bat/);
  assert.match(powerShellScript, /START-HERE\.bat/);
  assert.match(powerShellScript, /GetFolderPath\("Desktop"\)/);
  assert.match(powerShellScript, /Barangay Court Scheduler\.lnk/);
  assert.match(powerShellScript, /Barangay Court Scheduler - Maintenance\.lnk/);
  assert.match(powerShellScript, /New-Object -ComObject WScript\.Shell/);
  assert.match(powerShellScript, /CreateShortcut\(\$ShortcutPath\)/);
  assert.match(powerShellScript, /\$Shortcut\.TargetPath = \$TargetPath/);
  assert.match(powerShellScript, /\[switch\] \$WhatIf/);
  assert.doesNotMatch(batchScript, /npm install/i);
  assert.doesNotMatch(batchScript, /npm ci/i);
  assert.doesNotMatch(powerShellScript, /npm install/i);
  assert.doesNotMatch(powerShellScript, /npm ci/i);
});

test("desktop shortcut WhatIf reports both targets without creating shortcuts", () => {
  const desktopDir = mkdtempSync(join(tmpdir(), "barangay-shortcut-"));

  try {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/create-desktop-shortcut.ps1",
        "-WhatIf",
        "-DesktopPath",
        desktopDir
      ],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Would create daily-use shortcut/i);
    assert.match(result.stdout, /Barangay Court Scheduler\.lnk/i);
    assert.match(result.stdout, /start-barangay-office\.bat/i);
    assert.match(result.stdout, /Would create maintenance shortcut/i);
    assert.match(result.stdout, /Barangay Court Scheduler - Maintenance\.lnk/i);
    assert.match(result.stdout, /START-HERE\.bat/i);
    assert.equal(existsSync(join(desktopDir, "Barangay Court Scheduler.lnk")), false);
    assert.equal(existsSync(join(desktopDir, "Barangay Court Scheduler - Maintenance.lnk")), false);
  } finally {
    rmSync(desktopDir, { recursive: true, force: true });
  }
});

test("backup batch file runs the local backup command with Windows preflight checks", () => {
  const script = readFileSync("backup-database.bat", "utf8");

  assert.match(script, /where node >nul 2>nul/i);
  assert.match(script, /where npm >nul 2>nul/i);
  assert.match(script, /where mysqldump >nul 2>nul/i);
  assert.match(script, /if not exist "node_modules"/i);
  assert.match(script, /if not exist "\.env"/i);
  assert.match(script, /npm run backup:mysql/i);
  assert.match(script, /Backup completed/i);
  assert.match(script, /protected local or barangay-controlled external drive/i);
  assert.doesNotMatch(script, /npm install/i);
  assert.doesNotMatch(script, /npm ci/i);
});

test("one-click setup batch file invokes the PowerShell setup script", () => {
  const script = readFileSync("setup-barangay-office.bat", "utf8");

  assert.match(script, /scripts\\setup-barangay-office\.ps1/i);
  assert.match(script, /ExecutionPolicy Bypass/i);
});

test("database-only setup batch file applies the SQL setup runner locally", () => {
  const script = readFileSync("setup-database-only.bat", "utf8");

  assert.match(script, /database\\schema\.sql/i);
  assert.match(script, /database\\seed\.sql/i);
  assert.match(script, /database\\diagnostics\.sql/i);
  assert.match(script, /127\.0\.0\.1/);
  assert.match(script, /3306/);
  assert.match(script, /barangay_court_scheduler/);
  assert.match(script, /set \/p MYSQL_PASSWORD=/i);
  assert.match(script, /set "MYSQL_PWD=%MYSQL_PASSWORD%"/i);
  assert.match(script, /mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" < database\\schema\.sql/i);
  assert.match(script, /mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\\seed\.sql/i);
  assert.match(script, /mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\\diagnostics\.sql/i);
  assert.doesNotMatch(script, /-p\s*<\s*database\\setup\.sql/i);
  assert.doesNotMatch(script, /--password/i);
  assert.doesNotMatch(script, /npm install/i);
  assert.doesNotMatch(script, /npm ci/i);
});

test("office readiness checker batch file invokes prerequisite checks without downloading", () => {
  const batchScript = readFileSync("check-office-readiness.bat", "utf8");
  const powerShellScript = readFileSync("scripts/check-office-readiness.ps1", "utf8");

  assert.match(batchScript, /scripts\\check-office-readiness\.ps1/i);
  assert.match(batchScript, /ExecutionPolicy Bypass/i);
  assert.match(powerShellScript, /Test-CommandAvailable "node"/);
  assert.match(powerShellScript, /Test-RequiredCommand "npm"/);
  assert.match(powerShellScript, /Test-RequiredCommand "mysql"/);
  assert.match(powerShellScript, /Test-RequiredCommand "mysqldump"/);
  assert.match(powerShellScript, /node_modules/);
  assert.match(powerShellScript, /database\\schema\.sql/);
  assert.match(powerShellScript, /database\\seed\.sql/);
  assert.match(powerShellScript, /START-HERE\.bat/);
  assert.match(powerShellScript, /backup-database\.bat/);
  assert.match(powerShellScript, /create-desktop-shortcut\.bat/);
  assert.match(powerShellScript, /setup-barangay-office\.bat/);
  assert.match(powerShellScript, /start-barangay-office\.bat/);
  assert.match(powerShellScript, /run-office-signoff\.bat/);
  assert.doesNotMatch(powerShellScript, /npm install/i);
  assert.doesNotMatch(powerShellScript, /npm ci/i);
});

test("one-click PowerShell setup applies schema, seed, diagnostics, and live verification", () => {
  const script = readFileSync("scripts/setup-barangay-office.ps1", "utf8");

  assert.match(script, /database\\schema\.sql/);
  assert.match(script, /database\\seed\.sql/);
  assert.match(script, /database\\diagnostics\.sql/);
  assert.match(script, /npm run verify:sql/);
  assert.match(script, /npm run verify:mysql/);
  assert.match(script, /MYSQL_PWD/);
  assert.match(script, /node_modules was not found/);
  assert.match(script, /function Convert-ToEnvFileValue/);
  assert.match(script, /function Convert-FromEnvFileValue/);
  assert.match(script, /Convert-ToEnvFileValue \$Value/);
  assert.match(script, /Convert-FromEnvFileValue \$Parts\[1\]/);
  assert.doesNotMatch(script, /"\$Key=\$Value"/);
  assert.doesNotMatch(script, /--password/);
  assert.doesNotMatch(script, /npm install/);
  assert.doesNotMatch(script, /npm ci/);
});

test("one-click start batch opens the local prototype URL and starts npm", () => {
  const script = readFileSync("start-barangay-office.bat", "utf8");

  assert.match(script, /where node >nul 2>nul/i);
  assert.match(script, /if not exist "node_modules"/i);
  assert.match(script, /if not exist "\.env"/i);
  assert.match(script, /npm run check:database/i);
  assert.match(script, /Local database check failed/i);
  assert.match(script, /setup-barangay-office\.bat/i);
  assert.match(script, /exit \/b 1/i);
  assert.match(script, /The browser will open after the local app is ready/i);
  assert.match(script, /set "OFFICE_URL=http:\/\/localhost:3000\/prototype"/);
  assert.match(script, /node scripts\\print-office-url\.mjs/);
  assert.match(script, /echo %OFFICE_URL%/);
  assert.match(script, /set "OPEN_BROWSER=1"/i);
  assert.match(script, /npm start/);
  assert.doesNotMatch(script, /start "" http:\/\/localhost:3000\/prototype/i);
});

test("office sign-off batch file runs only local verification commands", () => {
  const batchScript = readFileSync("run-office-signoff.bat", "utf8");
  const powerShellScript = readFileSync("scripts/run-office-signoff.ps1", "utf8");

  assert.match(batchScript, /scripts\\run-office-signoff\.ps1/i);
  assert.match(batchScript, /ExecutionPolicy Bypass/i);
  assert.match(powerShellScript, /reports\\office-signoff/i);
  assert.match(powerShellScript, /npm run verify:prereqs/i);
  assert.match(powerShellScript, /npm run check:database/i);
  assert.match(powerShellScript, /npm run verify:mysql/i);
  assert.match(powerShellScript, /npm run verify:ui/i);
  assert.match(powerShellScript, /npm run verify:offline-runtime/i);
  assert.match(powerShellScript, /npm run backup:mysql/i);
  assert.match(powerShellScript, /Manual verification checklist/i);
  assert.match(powerShellScript, /Record the local MySQL\/MariaDB service version/);
  assert.match(powerShellScript, /Record the browser used for sign-off/);
  assert.match(powerShellScript, /Record the printer used for sign-off/);
  assert.match(powerShellScript, /Confirm printed schedule\/records are readable and not cut off/);
  assert.match(powerShellScript, /Barangay personnel sign-off name\/date/);
  assert.doesNotMatch(powerShellScript, /npm install/i);
  assert.doesNotMatch(powerShellScript, /npm ci/i);
  assert.doesNotMatch(powerShellScript, /npm audit/i);
});

test("office sign-off script can write a report to a supplied reports folder", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "barangay-signoff-"));
  const binDir = join(tempRoot, "bin");
  const reportsDir = join(tempRoot, "reports");
  const commandLog = join(tempRoot, "npm-commands.txt");

  try {
    mkdirSync(binDir);
    writeFileSync(
      join(binDir, "npm.cmd"),
      [
        "@echo off",
        `echo %*>>"${commandLog}"`,
        "echo fake npm %*",
        "exit /b 0"
      ].join("\r\n")
    );

    const env = {
      ...process.env,
      PATH: `${binDir};${process.env.PATH || ""}`
    };

    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/run-office-signoff.ps1",
        "-ReportsRoot",
        reportsDir
      ],
      { encoding: "utf8", env }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commandOutput = readFileSync(commandLog, "utf8");
    assert.match(commandOutput, /run verify:prereqs/);
    assert.match(commandOutput, /run check:database/);
    assert.match(commandOutput, /run verify:mysql/);
    assert.match(commandOutput, /run verify:ui/);
    assert.match(commandOutput, /run verify:offline-runtime/);
    assert.match(commandOutput, /run backup:mysql/);

    const reportFiles = readdirSync(reportsDir).filter((file) => file.startsWith("office-signoff-"));
    assert.equal(reportFiles.length, 1);
    const report = readFileSync(join(reportsDir, reportFiles[0]), "utf8");
    assert.match(report, /Verify offline prototype runtime/);
    assert.match(report, /Command: npm run verify:offline-runtime/);
    assert.match(report, /Automated sign-off checks passed/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
