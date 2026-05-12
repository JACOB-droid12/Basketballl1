import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("database README reflects current live-verification status", () => {
  const readme = readFileSync("database/README.md", "utf8");

  assert.doesNotMatch(readme, /SQL files were prepared and statically checked but not applied/i);
  assert.match(readme, /live-verified against disposable local Oracle MySQL and MariaDB servers/i);
  assert.match(readme, /rerun .* on the barangay office's target local MySQL\/MariaDB installation/i);
});

test("deployment docs present MariaDB as a verified local database option", () => {
  const databaseReadme = readFileSync("database/README.md", "utf8");
  const deploymentGuide = readFileSync("docs/DEPLOYMENT_GUIDE.md", "utf8");
  const offlineChecklist = readFileSync("docs/OFFLINE_INSTALL_CHECKLIST.md", "utf8");
  const mainReadme = readFileSync("README.md", "utf8");

  assert.match(databaseReadme, /local MySQL\/MariaDB database/);
  assert.match(databaseReadme, /MySQL 8\.0 or newer \(default\)/);
  assert.match(databaseReadme, /local MariaDB server that passes `npm run verify:mysql`/);
  assert.match(deploymentGuide, /Bundled `runtime\\mariadb` preferred/);
  assert.match(deploymentGuide, /installed local MySQL 8\+\/MariaDB that passes `npm run verify:mysql`/);
  assert.match(deploymentGuide, /If the deployment package includes bundled runtime folders/);
  assert.match(offlineChecklist, /database is local MySQL\/MariaDB/);
  assert.match(offlineChecklist, /runtime\\mariadb/);
  assert.match(offlineChecklist, /offline Node\.js and MySQL\/MariaDB installers/);
  assert.match(mainReadme, /Preferred portable\/bundled runtime layout/);
  assert.match(mainReadme, /runtime\\node/);
  assert.match(mainReadme, /runtime\\mariadb/);
});

test("Windows beginner docs separate daily use from maintenance tools", () => {
  const firstRunGuide = readFileSync("README-FIRST-WINDOWS.txt", "utf8");
  const staffGuide = readFileSync("STAFF-DAILY-USE.txt", "utf8");
  const troubleshooting = readFileSync("TROUBLESHOOT-WINDOWS.txt", "utf8");
  const mainReadme = readFileSync("README.md", "utf8");

  assert.match(firstRunGuide, /For first-time setup, double-click START-HERE\.bat/i);
  assert.match(firstRunGuide, /For daily use, double-click Barangay Court Scheduler/i);
  assert.match(firstRunGuide, /Maintenance\/admin tools/i);
  assert.match(firstRunGuide, /maintenance-tools/i);
  assert.match(firstRunGuide, /bundled runtime/i);
  assert.match(firstRunGuide, /runtime\\node/i);
  assert.match(firstRunGuide, /runtime\\mariadb/i);
  assert.doesNotMatch(firstRunGuide, /Make sure the MySQL bin folder is available in PATH/i);
  assert.doesNotMatch(firstRunGuide, /Double-click check-office-readiness\.bat/i);
  assert.doesNotMatch(firstRunGuide, /Double-click setup-barangay-office\.bat/i);
  assert.doesNotMatch(firstRunGuide, /Double-click run-office-signoff\.bat/i);

  assert.match(staffGuide, /Do not open maintenance-tools/i);
  assert.match(troubleshooting, /START-HERE\.bat/i);
  assert.match(troubleshooting, /Maintenance\/admin tools/i);
  assert.match(troubleshooting, /runtime\\node/i);
  assert.match(troubleshooting, /runtime\\mariadb/i);
  assert.match(mainReadme, /maintenance-tools/i);
  assert.match(mainReadme, /portable\/bundled runtime/i);
});

test("Windows docs explain deployment candidate and true one-stop package modes", () => {
  const firstRunGuide = readFileSync("README-FIRST-WINDOWS.txt", "utf8");
  const troubleshooting = readFileSync("TROUBLESHOOT-WINDOWS.txt", "utf8");
  const mainReadme = readFileSync("README.md", "utf8");
  const deploymentGuide = readFileSync("docs/DEPLOYMENT_GUIDE.md", "utf8");
  const offlineChecklist = readFileSync("docs/OFFLINE_INSTALL_CHECKLIST.md", "utf8");

  for (const content of [firstRunGuide, troubleshooting, mainReadme, deploymentGuide, offlineChecklist]) {
    assert.match(content, /deployment candidate mode/i);
    assert.match(content, /true one-stop offline package mode/i);
    assert.match(content, /runtime\\node\\node\.exe/i);
    assert.match(content, /runtime\\node\\npm\.cmd/i);
    assert.match(content, /runtime\\mariadb\\bin\\mariadbd\.exe/i);
    assert.match(content, /runtime\\mariadb\\bin\\mariadb-install-db\.exe/i);
    assert.match(content, /runtime\\mariadb\\bin\\mariadb\.exe or runtime\\mariadb\\bin\\mysql\.exe/i);
    assert.match(content, /runtime\\mariadb\\bin\\mysqldump\.exe/i);
  }

  assert.match(firstRunGuide, /No internet is required if the package is complete/i);
  assert.match(firstRunGuide, /staff should only use the daily launcher after setup/i);
  assert.match(troubleshooting, /Runtime package verification failed/i);
  assert.match(troubleshooting, /Windows blocks executables/i);
  assert.match(troubleshooting, /port conflict/i);
  assert.match(troubleshooting, /database fails to start/i);
  assert.match(deploymentGuide, /npm run verify:runtime-package/i);
  assert.match(deploymentGuide, /npm run verify:bundle:strict/i);
  assert.match(offlineChecklist, /strict one-stop mode/i);
});
