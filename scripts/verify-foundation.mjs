import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  "package.json",
  ".env.example",
  "README.md",
  "database/schema.sql",
  "database/seed.sql",
  "database/README.md",
  "docs/ARCHITECTURE.md",
  "docs/REFERENCE_REVIEW.md",
  "docs/CODEX_HANDOFF.md",
  "docs/superpowers/plans/2026-05-07-basketball-court-scheduling-system.md",
  "src/app.js",
  "src/server.js",
  "src/config/database.js",
  "views/login.ejs",
  "public/css/styles.css"
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
