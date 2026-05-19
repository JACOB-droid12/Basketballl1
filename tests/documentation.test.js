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

test("STAFF-DAILY-USE.txt covers post-deployment frontend surfaces", () => {
  const staffGuide = readFileSync("STAFF-DAILY-USE.txt", "utf8");

  // Print slip on a reservation row / drawer.
  assert.match(staffGuide, /Print slip/i);
  assert.match(staffGuide, /printable slip/i);

  // Print daily schedule from the schedule page.
  assert.match(staffGuide, /Daily print/i);
  assert.match(staffGuide, /maintenance ranges, and cleared-for-public-use ranges/i);

  // Resident reservation history lookup.
  assert.match(staffGuide, /Reservation History/i);
  assert.match(staffGuide, /reservation history by contact number or by\s+name/i);

  // Resident directory.
  assert.match(staffGuide, /Resident Directory/i);
  assert.match(staffGuide, /Search saved residents by name, contact number/i);

  // Dashboard alerts (system alerts + today notices on Home).
  assert.match(staffGuide, /Home \(Dashboard\)/i);
  assert.match(staffGuide, /system alerts/i);
  assert.match(staffGuide, /Cleared for public use today/i);
  assert.match(staffGuide, /Maintenance active\s+today/i);

  // Backup reminder card.
  assert.match(staffGuide, /backup reminder\s+card/i);
  assert.match(staffGuide, /Run a backup from the maintenance launcher option/i);

  // Reports surface.
  assert.match(staffGuide, /\r?\nReports\r?\n/);
  assert.match(staffGuide, /cleared-for-public-use ranges, and maintenance blocks/i);

  // CSV export labelled "CSV" across the listed surfaces.
  assert.match(staffGuide, /CSV Export/);
  assert.match(staffGuide, /button labeled "CSV"/);
  assert.match(staffGuide, /downloads a\s+spreadsheet/i);

  // Admin-only Clear for Public Use, maintenance block, and court policy entries.
  assert.match(staffGuide, /ADMIN-ONLY TASKS/);
  assert.match(staffGuide, /only visible to Admin accounts/i);
  assert.match(staffGuide, /Maintenance \/ Unavailable Blocks/);
  assert.match(staffGuide, /Add maintenance block/);
  assert.match(staffGuide, /Clear for Public Use/);
  assert.match(staffGuide, /overlapping active reservations will be cancelled/i);
  assert.match(staffGuide, /Court Policy Settings/);
  assert.match(staffGuide, /opening time, closing time/i);
});

test("TROUBLESHOOT-WINDOWS.txt mentions the standard offline error on the new surfaces", () => {
  const troubleshooting = readFileSync("TROUBLESHOOT-WINDOWS.txt", "utf8");

  // The standard offline error wording, exact copy from Requirement 17.1.
  // The doc wraps long lines, so allow any whitespace between words.
  assert.match(
    troubleshooting,
    /The system is offline or the office network is down\.\s+Try again once the\s+network is back\./,
  );

  // The new frontend surfaces that may show the offline message.
  // Lines are hard-wrapped in the doc, so allow whitespace between words.
  assert.match(troubleshooting, /reservation slip print view/i);
  assert.match(troubleshooting, /daily schedule print view/i);
  assert.match(troubleshooting, /resident directory page/i);
  assert.match(troubleshooting, /resident\s+reservation history page/i);
  assert.match(troubleshooting, /reports page/i);
  assert.match(troubleshooting, /CSV export button/i);
  assert.match(troubleshooting, /dashboard\s+alerts card/i);
  assert.match(troubleshooting, /backup reminder card/i);
  assert.match(troubleshooting, /court policy settings page/i);
  assert.match(troubleshooting, /schedule block \(maintenance\) modal/i);
  assert.match(troubleshooting, /Clear for Public Use modal/i);

  // The rest of the screen stays usable while the message is shown.
  assert.match(troubleshooting, /rest of the screen stays usable/i);
});

test("DEPLOYMENT_READINESS_REPORT.md records post-deployment frontend coverage", () => {
  const readinessReport = readFileSync("DEPLOYMENT_READINESS_REPORT.md", "utf8");

  // Coverage section anchor.
  assert.match(readinessReport, /## Post-Deployment Frontend Coverage/);

  // Implemented frontend features list.
  assert.match(readinessReport, /### Implemented frontend features/);
  assert.match(readinessReport, /Reservation reference numbers \(`referenceNo`\)/);
  assert.match(readinessReport, /Printable reservation slip route/i);
  assert.match(readinessReport, /Daily schedule printout route/i);
  assert.match(readinessReport, /Court policy settings page/i);
  assert.match(readinessReport, /Maintenance and unavailable schedule block management/i);
  assert.match(readinessReport, /Expanded reports page/i);
  assert.match(readinessReport, /Reservation history lookup page/i);
  assert.match(readinessReport, /Resident directory page/i);
  assert.match(readinessReport, /Calendar status and block indicators/i);
  assert.match(readinessReport, /Dashboard alerts card/i);
  assert.match(readinessReport, /Non-disruptive backup reminder card/i);
  assert.match(
    readinessReport,
    /Standard offline error wording on every new surface/i,
  );

  // Deferred recurring-reservation UI.
  assert.match(readinessReport, /### Deferred: recurring-reservation UI/);
  assert.match(
    readinessReport,
    /Recurring reservations are intentionally deferred/i,
  );
  assert.match(
    readinessReport,
    /Recurring reservations: not yet available/,
  );

  // CSV-only export decision.
  assert.match(readinessReport, /### CSV-only export decision/);
  assert.match(
    readinessReport,
    /labeled with the word "CSV"/,
  );
  assert.match(
    readinessReport,
    /does not render any other export format option/i,
  );

  // Backend-backed Clear for Public Use replaces the legacy clearedDays behavior.
  assert.match(
    readinessReport,
    /### Backend-backed Clear for Public Use replaces legacy `clearedDays`/,
  );
  assert.match(
    readinessReport,
    /two-step admin-only `ClearPublicUseModal`/,
  );
  assert.match(
    readinessReport,
    /deprecated frontend-only `clearedDays` \/ `promptClearDay` \/ `clearDay` behavior is not recreated/i,
  );
  assert.match(
    readinessReport,
    /does not store cleared-day state in React state or in `localStorage`/i,
  );
});

test("post-deployment frontend docs do not reference out-of-scope channels", () => {
  const staffGuide = readFileSync("STAFF-DAILY-USE.txt", "utf8");
  const troubleshooting = readFileSync("TROUBLESHOOT-WINDOWS.txt", "utf8");
  const readinessReport = readFileSync("DEPLOYMENT_READINESS_REPORT.md", "utf8");

  for (const [name, content] of [
    ["STAFF-DAILY-USE.txt", staffGuide],
    ["TROUBLESHOOT-WINDOWS.txt", troubleshooting],
    ["DEPLOYMENT_READINESS_REPORT.md", readinessReport],
  ]) {
    assert.doesNotMatch(content, /\bPDF\b/i, `${name} should not reference PDF exports`);
    assert.doesNotMatch(content, /\bXLSX\b/i, `${name} should not reference XLSX exports`);
    assert.doesNotMatch(content, /online booking/i, `${name} should not reference online booking`);
    assert.doesNotMatch(content, /\bSMS\b/i, `${name} should not reference SMS`);
    assert.doesNotMatch(content, /\bpayments?\b/i, `${name} should not reference payments`);
    assert.doesNotMatch(content, /\bmemberships?\b/i, `${name} should not reference memberships`);
    assert.doesNotMatch(
      content,
      /public resident accounts?/i,
      `${name} should not reference public resident accounts`,
    );
    assert.doesNotMatch(content, /cloud sync/i, `${name} should not reference cloud sync`);
  }
});
