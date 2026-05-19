import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  "package.json",
  ".env.example",
  "START-HERE.bat",
  "STAFF-DAILY-USE.txt",
  "README.md",
  "README-FIRST-WINDOWS.txt",
  "TROUBLESHOOT-WINDOWS.txt",
  "maintenance-tools/backup-database.bat",
  "maintenance-tools/restore-database.bat",
  "maintenance-tools/create-desktop-shortcut.bat",
  "maintenance-tools/check-office-readiness.bat",
  "maintenance-tools/load-runtime-env.bat",
  "maintenance-tools/run-office-signoff.bat",
  "maintenance-tools/setup-database-only.bat",
  "maintenance-tools/setup-barangay-office.bat",
  "create-offline-bundle.bat",
  "start-barangay-office.bat",
  "database/schema.sql",
  "database/seed.sql",
  "database/diagnostics.sql",
  "database/setup.sql",
  "database/README.md",
  "database/SQL_ONLY_SETUP.md",
  "database/migrations/README.md",
  "docs/ARCHITECTURE.md",
  "docs/REFERENCE_REVIEW.md",
  "docs/CODEX_HANDOFF.md",
  "docs/superpowers/plans/2026-05-07-basketball-court-scheduling-system.md",
  "src/app.js",
  "src/server.js",
  "src/serverStartup.js",
  "src/config/database.js",
  "src/features/prototype/prototypeRoutes.js",
  "src/features/prototype/prototypeApiRoutes.js",
  "scripts/create-offline-bundle.ps1",
  "scripts/check-office-readiness.ps1",
  "scripts/create-desktop-shortcut.ps1",
  "scripts/check-runtime-database.mjs",
  "scripts/ensure-local-database.ps1",
  "scripts/print-office-url.mjs",
  "scripts/run-office-signoff.ps1",
  "scripts/verify-offline-bundle.mjs",
  "scripts/verify-offline-runtime.mjs",
  "scripts/setup-barangay-office.ps1",
  "views/login.ejs",
  "views/account/password.ejs",
  "public/css/styles.css",
  "public/js/prototype-backend.js",
  "public/prototype/sto-nino-court-reservation-system-prototype.html",
  "public/vendor/html2canvas.min.js",
  "public/vendor/jspdf.umd.min.js"
];

const schemaChecks = [
  "CREATE TABLE IF NOT EXISTS users",
  "CREATE TABLE IF NOT EXISTS residents",
  "CREATE TABLE IF NOT EXISTS reservation_statuses",
  "CREATE TABLE IF NOT EXISTS time_slots",
  "CREATE TABLE IF NOT EXISTS reservations",
  "CREATE TABLE IF NOT EXISTS activity_logs",
  "CREATE TABLE IF NOT EXISTS court_settings",
  "prevent_reservation_overlap_before_insert",
  "prevent_reservation_overlap_before_update",
  "password_hash"
];

let failures = 0;

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${file}`);
    failures += 1;
  }
}

const schemaPath = path.join(root, "database", "schema.sql");
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf8");
  for (const expected of schemaChecks) {
    if (!schema.includes(expected)) {
      console.error(`schema.sql is missing: ${expected}`);
      failures += 1;
    }
  }

  if (/password\s+varchar/i.test(schema)) {
    console.error("schema.sql appears to define a plaintext password column.");
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`Foundation verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Foundation verification passed.");
