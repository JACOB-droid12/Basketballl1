import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

test("one-click start batch opens the local login URL and starts npm", () => {
  const script = readFileSync("start-barangay-office.bat", "utf8");

  assert.match(script, /where node >nul 2>nul/i);
  assert.match(script, /if not exist "node_modules"/i);
  assert.match(script, /if not exist "\.env"/i);
  assert.match(script, /npm run check:database/i);
  assert.match(script, /Local database check failed/i);
  assert.match(script, /setup-barangay-office\.bat/i);
  assert.match(script, /exit \/b 1/i);
  assert.match(script, /http:\/\/localhost:3000\/login/);
  assert.match(script, /npm start/);
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
  assert.match(powerShellScript, /npm run backup:mysql/i);
  assert.match(powerShellScript, /Manual verification checklist/i);
  assert.doesNotMatch(powerShellScript, /npm install/i);
  assert.doesNotMatch(powerShellScript, /npm ci/i);
  assert.doesNotMatch(powerShellScript, /npm audit/i);
});
