import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REQUIRED_TABLES = [
  "users",
  "residents",
  "reservation_statuses",
  "time_slots",
  "court_settings",
  "reservation_reference_sequences",
  "reservations",
  "schedule_blocks",
  "activity_logs"
];

const REQUIRED_STATUSES = [
  "AVAILABLE",
  "RESERVED",
  "MISSED",
  "CANCELLED",
  "COMPLETED"
];

const REQUIRED_TRIGGERS = [
  "prevent_reservation_overlap_before_insert",
  "prevent_reservation_overlap_before_update"
];

const REQUIRED_SEED_TABLES = [
  "users",
  "reservation_statuses",
  "time_slots",
  "court_settings"
];

export function analyzeSqlFiles({ schemaSql, seedSql, diagnosticsSql = "", setupSql = "", databaseOnlySetupScript = "" }) {
  const schema = normalize(schemaSql);
  const seed = normalize(seedSql);
  const diagnostics = normalize(diagnosticsSql);
  const setup = normalize(setupSql);
  const databaseOnlySetup = normalize(databaseOnlySetupScript);
  const tableDefinitions = getTableDefinitions(schemaSql);
  const checks = [];

  checks.push({
    name: "database charset enforcement",
    ok: /CREATE DATABASE IF NOT EXISTS barangay_court_scheduler\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci/i.test(schema) &&
      /ALTER DATABASE barangay_court_scheduler\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci/i.test(schema),
    detail: "database is created and altered to utf8mb4/utf8mb4_unicode_ci"
  });

  for (const tableName of REQUIRED_TABLES) {
    checks.push({
      name: `table exists: ${tableName}`,
      ok: tableDefinitions.has(tableName),
      detail: `CREATE TABLE IF NOT EXISTS ${tableName}`
    });
  }

  checks.push({
    name: "table charset enforcement",
    ok: REQUIRED_TABLES.every((tableName) => {
      const definition = tableDefinitions.get(tableName) || "";
      return /ENGINE=InnoDB\s+DEFAULT CHARSET=utf8mb4\s+COLLATE=utf8mb4_unicode_ci/i.test(definition);
    }),
    detail: "every required table explicitly uses InnoDB and utf8mb4"
  });

  checks.push({
    name: "existing-table charset conversion",
    ok: REQUIRED_TABLES.every((tableName) => (
      new RegExp(`ALTER TABLE ${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, "i")
        .test(schema)
    )),
    detail: "existing tables are converted when schema.sql is rerun after an older install"
  });

  checks.push({
    name: "reservation foreign keys",
    ok: [
      "fk_reservations_resident",
      "fk_reservations_time_slot",
      "fk_reservations_status",
      "fk_reservations_approved_by_user",
      "fk_reservations_created_by_user",
      "fk_schedule_blocks_created_by_user",
      "fk_schedule_blocks_deactivated_by_user",
      "fk_activity_logs_reservation",
      "fk_activity_logs_user"
    ].every((constraintName) => schema.includes(constraintName.toLowerCase())),
    detail: "reservations and logs keep foreign-key links"
  });

  checks.push({
    name: "reservation reference support",
    ok: schema.includes("reservation_reference_sequences") &&
      schema.includes("reference_no") &&
      schema.includes("uq_reservations_reference_no") &&
      schema.includes("row_number() over") &&
      schema.includes("bcs-"),
    detail: "reservations have unique BCS reference numbers with backfill and sequence support"
  });

  checks.push({
    name: "schedule block support",
    ok: tableDefinitions.has("schedule_blocks") &&
      schema.includes("chk_schedule_blocks_time_order") &&
      schema.includes("block_category in ('maintenance', 'public_use')") &&
      schema.includes("mode in ('whole_day', 'time_range', 'from_time_onward')"),
    detail: "schedule blocks persist maintenance and public-use unavailable ranges"
  });

  checks.push({
    name: "resident directory support",
    ok: tableDefinitions.has("residents") &&
      schema.includes("group_name") &&
      schema.includes("notes") &&
      schema.includes("add column if not exists group_name") &&
      schema.includes("add column if not exists notes"),
    detail: "residents table stores lightweight directory group and notes fields"
  });

  checks.push({
    name: "court policy settings support",
    ok: [
      "min_reservation_minutes",
      "max_reservation_minutes",
      "allowed_days",
      "blocked_days",
      "missed_grace_minutes",
      "slot_minutes"
    ].every((settingKey) => seed.includes(`'${settingKey}'`)),
    detail: "seed includes configurable court policy settings"
  });

  checks.push({
    name: "date/time integrity checks",
    ok: schema.includes("chk_time_slots_time_order") &&
      schema.includes("chk_reservations_time_order") &&
      schema.includes("chk_schedule_blocks_time_order") &&
      schema.includes("end_time > start_time"),
    detail: "slot and reservation end times must be after start times"
  });

  checks.push({
    name: "overlap triggers",
    ok: REQUIRED_TRIGGERS.every((triggerName) => schema.includes(triggerName)) &&
      schema.includes("Reservation overlaps an existing active reservation.".toLowerCase()),
    detail: "insert/update triggers block overlapping active reservations"
  });

  checks.push({
    name: "trigger rerun safety",
    ok: REQUIRED_TRIGGERS.every((triggerName) => schema.includes(`drop trigger if exists ${triggerName}`)),
    detail: "schema drops existing triggers before recreating them"
  });

  checks.push({
    name: "seed idempotency",
    ok: REQUIRED_SEED_TABLES.every((tableName) => hasIdempotentSeedStatement(seedSql, tableName)),
    detail: "reference seed inserts can be rerun with ON DUPLICATE KEY UPDATE"
  });

  checks.push({
    name: "seed statuses",
    ok: REQUIRED_STATUSES.every((statusCode) => seed.includes(`'${statusCode.toLowerCase()}'`)),
    detail: "seed includes available, reserved, missed, cancelled, and completed"
  });

  checks.push({
    name: "seed default slots",
    ok: seed.includes("'07:00:00'") && seed.includes("'21:00:00'") && seed.includes("INSERT INTO time_slots".toLowerCase()),
    detail: "seed includes default 7 AM to 9 PM schedule slots"
  });

  checks.push({
    name: "seed password safety",
    ok: seed.includes("password_hash") &&
      /\$2[aby]\$\d{2}\$/.test(seedSql) &&
      !/password_hash[^;]+admin123/i.test(seedSql),
    detail: "starter admin uses a bcrypt hash, not a plaintext password"
  });

  checks.push({
    name: "diagnostics script coverage",
    ok: diagnostics.includes("use barangay_court_scheduler") &&
      diagnostics.includes("information_schema.schemata") &&
      diagnostics.includes("information_schema.tables") &&
      diagnostics.includes("information_schema.referential_constraints") &&
      diagnostics.includes("information_schema.triggers") &&
      diagnostics.includes("reservation_statuses") &&
      diagnostics.includes("time_slots") &&
      diagnostics.includes("password_hash") &&
      diagnostics.includes("court_settings") &&
      diagnostics.includes("schedule_blocks") &&
      diagnostics.includes("resident directory columns") &&
      diagnostics.includes("reference_no"),
    detail: "database/diagnostics.sql reports schema, trigger, seed, slot, password, and settings checks"
  });

  checks.push({
    name: "diagnostics script read-only",
    ok: !/\b(insert|update|delete|drop|alter|create|truncate|replace|call)\b/i.test(diagnosticsSql),
    detail: "database/diagnostics.sql does not modify barangay office data"
  });

  checks.push({
    name: "sql-only setup runner",
    ok: ((setup.includes("source database/schema.sql") &&
      setup.includes("source database/seed.sql") &&
      setup.includes("source database/diagnostics.sql")) ||
      (databaseOnlySetup.includes("database\\schema.sql") &&
        databaseOnlySetup.includes("database\\seed.sql") &&
        databaseOnlySetup.includes("database\\diagnostics.sql") &&
        databaseOnlySetup.includes("mysql_database"))) &&
      !/\bdrop\s+database\b/i.test(setupSql),
    detail: "SQL-only setup applies schema, seed, and diagnostics without dropping the database"
  });

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}

export function formatSqlStaticReport(report) {
  return report.checks
    .map((check) => `[${check.ok ? "OK" : "FAIL"}] ${check.name} - ${check.detail}`)
    .join("\n");
}

export async function verifySqlStatic(options = {}) {
  const output = options.output || console;
  const schemaPath = options.schemaPath || path.join(PROJECT_ROOT, "database", "schema.sql");
  const seedPath = options.seedPath || path.join(PROJECT_ROOT, "database", "seed.sql");
  const diagnosticsPath = options.diagnosticsPath || path.join(PROJECT_ROOT, "database", "diagnostics.sql");
  const setupPath = options.setupPath || path.join(PROJECT_ROOT, "database", "setup.sql");
  const databaseOnlySetupPath = options.databaseOnlySetupPath ||
    path.join(PROJECT_ROOT, "maintenance-tools", "setup-database-only.bat");
  const schemaSql = await readFile(schemaPath, "utf8");
  const seedSql = await readFile(seedPath, "utf8");
  const diagnosticsSql = await readFile(diagnosticsPath, "utf8");
  const setupSql = await readFile(setupPath, "utf8");
  const databaseOnlySetupScript = await readFile(databaseOnlySetupPath, "utf8");
  const report = analyzeSqlFiles({ schemaSql, seedSql, diagnosticsSql, setupSql, databaseOnlySetupScript });

  output.log(formatSqlStaticReport(report));

  if (!report.ok) {
    throw new Error("SQL static verification failed. Fix failed database checks before live MySQL verification.");
  }

  return report;
}

function getTableDefinitions(sql) {
  const definitions = new Map();
  const pattern = /CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*ENGINE=InnoDB[^;]*;/gi;
  let match;

  while ((match = pattern.exec(sql))) {
    definitions.set(match[1].toLowerCase(), match[0]);
  }

  return definitions;
}

function hasIdempotentSeedStatement(sql, tableName) {
  return String(sql || "")
    .split(";")
    .some((statement) => {
      const normalized = normalize(statement);
      return normalized.includes(`insert into ${tableName}`) &&
        normalized.includes("on duplicate key update");
    });
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifySqlStatic().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
