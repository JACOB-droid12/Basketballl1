import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

import { runMysqlBackup } from "./backup-mysql.mjs";
import { runMysqlRestore } from "./restore-mysql.mjs";
import {
  buildMysqlConnectionConfig,
  prepareSqlScriptForDatabase,
  splitMysqlScript
} from "./verify-mysql.mjs";
import {
  createReservation,
  listReservations,
  reserveNextReservationReference,
  ReservationConflictError,
  updateReservation
} from "../src/features/reservations/reservationRepository.js";
import { validateReservationInput } from "../src/features/reservations/reservationValidation.js";
import { validateCreateUserInput } from "../src/features/users/userValidation.js";

dotenv.config();

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_DATABASE = "barangay_court_scheduler";
const STRESS_DAYS = Number(process.env.STRESS_DAYS || 120);
const CONCURRENT_ATTEMPTS = Number(process.env.STRESS_CONCURRENT_ATTEMPTS || 25);

export async function runDeploymentStressVerification(options = {}) {
  const env = options.env || process.env;
  const output = options.output || console;
  const baseConfig = buildMysqlConnectionConfig(env);
  const stressDatabase = buildStressDatabaseName(env.STRESS_DB_NAME || `${baseConfig.database}_stress_${Date.now()}`);
  const adminConnection = await mysql.createConnection({
    host: baseConfig.host,
    port: baseConfig.port,
    user: baseConfig.user,
    password: baseConfig.password,
    multipleStatements: false,
    namedPlaceholders: true
  });
  let pool = null;
  const result = {
    database: stressDatabase,
    disposableDatabase: true,
    concurrentAttempts: CONCURRENT_ATTEMPTS,
    seededReservations: 0,
    scenarios: [],
    performance: {},
    audit: {},
    backupFile: "",
    finalJudgment: "PASS"
  };

  try {
    await createStressDatabase(adminConnection, stressDatabase);
    pool = createPoolForDatabase(baseConfig, stressDatabase);

    await runOverlapTorture(pool, result);
    await runBadInputChecks(pool, result);
    await runHighVolumeChecks(pool, result);
    await runBackupRestoreChecks({ poolRef: () => pool, setPool: (nextPool) => { pool = nextPool; }, baseConfig, stressDatabase, result, output });
    await runRestartSmoke({ baseConfig, stressDatabase, result });
    result.audit = await auditStressDatabase(pool);

    assertEqual(result.audit.overlappingBlockingReservations, 0, "Stress audit found overlapping active reservations.");
    assertEqual(result.audit.invalidRequiredReservationFields, 0, "Stress audit found reservations with missing required fields.");
    assertEqual(result.audit.invalidUserRoles, 0, "Stress audit found invalid account roles.");

    output.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    await pool?.end?.().catch(() => {});

    if (env.KEEP_STRESS_DB !== "1") {
      await adminConnection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(stressDatabase)}`).catch(() => {});
    }

    await adminConnection.end();
  }
}

async function createStressDatabase(connection, databaseName) {
  const schemaSql = prepareSqlScriptForDatabase(
    await readFile(path.join(PROJECT_ROOT, "database", "schema.sql"), "utf8"),
    databaseName
  );
  const seedSql = prepareSqlScriptForDatabase(
    await readFile(path.join(PROJECT_ROOT, "database", "seed.sql"), "utf8"),
    databaseName
  );

  await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);

  for (const statement of splitMysqlScript(schemaSql)) {
    await connection.query(statement);
  }

  for (const statement of splitMysqlScript(seedSql)) {
    await connection.query(statement);
  }
}

async function runOverlapTorture(pool, result) {
  const concurrentReservation = buildReservation({
    reservationDate: "2099-06-01",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Concurrent Attempt"
  });
  const attempts = await Promise.allSettled(
    Array.from({ length: CONCURRENT_ATTEMPTS }, (_item, index) => (
      createReservation(pool, {
        ...concurrentReservation,
        representativeName: `Concurrent Attempt ${index + 1}`,
        contactNo: `0917000${String(index + 1).padStart(4, "0")}`
      }, { createdByUserId: 1 })
    ))
  );
  const successCount = attempts.filter((entry) => entry.status === "fulfilled").length;
  const rejectedAsConflict = attempts.filter((entry) => (
    entry.status === "rejected" && isReservationConflict(entry.reason)
  )).length;

  assertEqual(successCount, 1, "Concurrent duplicate booking attempts did not result in exactly one success.");
  assertEqual(rejectedAsConflict, CONCURRENT_ATTEMPTS - 1, "Concurrent duplicate booking attempts were not rejected as conflicts.");

  await createReservation(pool, buildReservation({
    reservationDate: "2099-06-02",
    startTime: "09:00",
    endTime: "10:00",
    representativeName: "Back To Back One"
  }), { createdByUserId: 1 });
  await createReservation(pool, buildReservation({
    reservationDate: "2099-06-02",
    startTime: "10:00",
    endTime: "11:00",
    representativeName: "Back To Back Two"
  }), { createdByUserId: 1 });
  await assertRejectsConflict(() => createReservation(pool, buildReservation({
    reservationDate: "2099-06-02",
    startTime: "09:59",
    endTime: "10:30",
    representativeName: "One Minute Overlap"
  }), { createdByUserId: 1 }));

  await createReservation(pool, buildReservation({
    reservationDate: "2099-06-03",
    startTime: "11:30",
    endTime: "12:30",
    representativeName: "AM PM Boundary"
  }), { createdByUserId: 1 });

  const first = await createReservation(pool, buildReservation({
    reservationDate: "2099-06-04",
    startTime: "13:00",
    endTime: "14:00",
    representativeName: "Edit Conflict One"
  }), { createdByUserId: 1 });
  const second = await createReservation(pool, buildReservation({
    reservationDate: "2099-06-04",
    startTime: "14:00",
    endTime: "15:00",
    representativeName: "Edit Conflict Two"
  }), { createdByUserId: 1 });
  assertEqual(Boolean(first && second), true, "Setup reservations for edit-conflict test were not created.");
  await assertRejectsConflict(() => updateReservation(pool, second, buildReservation({
    reservationDate: "2099-06-04",
    startTime: "13:30",
    endTime: "14:30",
    representativeName: "Edit Conflict Two"
  }), { userId: 1 }));

  result.scenarios.push({
    name: "Reservation overlap torture",
    status: "PASS",
    details: `${CONCURRENT_ATTEMPTS} concurrent duplicate attempts produced 1 success and ${CONCURRENT_ATTEMPTS - 1} conflicts; adjacent bookings were allowed; 1-minute and edit overlaps were blocked.`
  });
}

async function runBadInputChecks(pool, result) {
  const invalidReservations = [
    {},
    buildReservation({ endTime: "07:00" }),
    buildReservation({ startTime: "09:00", endTime: "09:00" }),
    buildReservation({ reservationDate: "not-a-date" }),
    buildReservation({ startTime: "7am" }),
    buildReservation({ contactNo: "<script>alert(1)</script>" }),
    buildReservation({ representativeName: "A".repeat(141) }),
    buildReservation({ address: "B".repeat(256) }),
    buildReservation({ purpose: "C".repeat(121) }),
    buildReservation({ statusCode: "PENDING" })
  ];
  const invalidAccounts = [
    {},
    { fullName: "Staff", username: "x", password: "secret123", role: "STAFF" },
    { fullName: "Staff", username: "bad<script>", password: "secret123", role: "STAFF" },
    { fullName: "Staff", username: "staff", password: "short", role: "STAFF" },
    { fullName: "Staff", username: "staff", password: "A".repeat(73), role: "STAFF" },
    { fullName: "Staff", username: "staff", password: "secret123", role: "RESIDENT" }
  ];

  assertEqual(invalidReservations.every((input) => !validateReservationInput(input).valid), true, "At least one malformed reservation input was not rejected.");
  assertEqual(invalidAccounts.every((input) => !validateCreateUserInput(input).valid), true, "At least one malformed account input was not rejected.");

  const hostileTextReservation = buildReservation({
    reservationDate: "2099-06-05",
    representativeName: "Robert'); DROP TABLE reservations; --",
    address: "<b>Purok 3</b>",
    purpose: "<script>alert(1)</script> practice"
  });
  const hostileValidation = validateReservationInput(hostileTextReservation);
  assertEqual(hostileValidation.valid, true, "Safe text fields should accept special characters and rely on parameterized storage.");
  await createReservation(pool, hostileValidation.value, { createdByUserId: 1 });

  result.scenarios.push({
    name: "Bad input and hostile strings",
    status: "PASS",
    details: `${invalidReservations.length} malformed reservation cases and ${invalidAccounts.length} malformed account cases were rejected; SQL-like/script-like text was stored through parameterized queries without schema damage.`
  });
}

async function runHighVolumeChecks(pool, result) {
  const slots = await getTimeSlots(pool);
  const startDate = "2100-01-01";
  let inserted = 0;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let day = 0; day < STRESS_DAYS; day += 1) {
      const reservationDate = addDays(startDate, day);

      for (const slot of slots) {
        inserted += 1;
        const [resident] = await connection.execute(
          `
            INSERT INTO residents (full_name, contact_no, address)
            VALUES (:fullName, :contactNo, :address)
          `,
          {
            fullName: `Stress Resident ${inserted}`,
            contactNo: `0928${String(inserted).padStart(7, "0")}`.slice(0, 11),
            address: `Stress Purok ${day % 7}`
          }
        );
        const referenceNo = await reserveNextReservationReference(connection, reservationDate);
        await connection.execute(
          `
            INSERT INTO reservations
              (reference_no, resident_id, status_id, approved_by_user_id, created_by_user_id, reservation_date, start_time, end_time, purpose, remarks)
            VALUES
              (:referenceNo, :residentId, 2, 1, 1, :reservationDate, :startTime, :endTime, :purpose, :remarks)
          `,
          {
            referenceNo,
            residentId: resident.insertId,
            reservationDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            purpose: "Stress volume seed",
            remarks: "Disposable high-volume stress record."
          }
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  result.seededReservations = inserted;
  const oneDayStart = performance.now();
  const oneDayReservations = await listReservations(pool, { reservationDate: addDays(startDate, 30) });
  const oneDayMs = Math.round(performance.now() - oneDayStart);
  const allStart = performance.now();
  const allReservations = await listReservations(pool, {});
  const allMs = Math.round(performance.now() - allStart);

  assertEqual(oneDayReservations.length, slots.length, "High-volume day lookup returned an unexpected reservation count.");
  assertEqual(allReservations.length >= inserted, true, "High-volume all-record lookup lost seeded reservations.");

  result.performance = {
    oneDayLookupMs: oneDayMs,
    allReservationsLookupMs: allMs,
    allReservationsReturned: allReservations.length
  };
  result.scenarios.push({
    name: "High-volume reservation dataset",
    status: "PASS",
    details: `Seeded ${inserted} non-overlapping reservations across ${STRESS_DAYS} days; one-day lookup ${oneDayMs} ms; full reservation list ${allMs} ms.`
  });
}

async function runBackupRestoreChecks({ poolRef, setPool, baseConfig, stressDatabase, result, output }) {
  const pool = poolRef();
  const [[beforeRow]] = await pool.execute("SELECT COUNT(*) AS count_value FROM reservations");
  const backupEnv = {
    ...process.env,
    DB_HOST: baseConfig.host,
    DB_PORT: String(baseConfig.port),
    DB_USER: baseConfig.user,
    DB_PASSWORD: baseConfig.password,
    DB_NAME: stressDatabase,
    BACKUP_DIR: path.join("tmp", "stress-backups")
  };
  const quietOutput = {
    log: (message) => output.log(`[stress] ${message}`),
    warn: (message) => output.warn?.(`[stress] ${message}`)
  };
  const backup = await runMysqlBackup({
    cwd: PROJECT_ROOT,
    env: backupEnv,
    output: quietOutput
  });

  await pool.execute("DELETE FROM activity_logs");
  await pool.execute("DELETE FROM reservations");
  await pool.execute("DELETE FROM residents");
  const [[deletedRow]] = await pool.execute("SELECT COUNT(*) AS count_value FROM reservations");
  assertEqual(Number(deletedRow.count_value), 0, "Stress restore setup could not clear disposable reservations.");
  await pool.end();
  setPool(null);

  await runMysqlRestore({
    cwd: PROJECT_ROOT,
    env: backupEnv,
    output: quietOutput,
    processArgs: ["node", "restore-mysql.mjs", backup.backupFilePath]
  });

  const restoredPool = createPoolForDatabase(baseConfig, stressDatabase);
  setPool(restoredPool);
  const [[afterRow]] = await restoredPool.execute("SELECT COUNT(*) AS count_value FROM reservations");
  assertEqual(Number(afterRow.count_value), Number(beforeRow.count_value), "Restored reservation count did not match the pre-backup count.");

  result.backupFile = backup.backupFilePath;
  result.scenarios.push({
    name: "Backup and restore survival",
    status: "PASS",
    details: `Backed up ${beforeRow.count_value} reservations, deleted disposable data, restored from ${path.basename(backup.backupFilePath)}, and verified the reservation count.`
  });
}

async function runRestartSmoke({ baseConfig, stressDatabase, result }) {
  const firstPool = createPoolForDatabase(baseConfig, stressDatabase);
  await firstPool.execute("SELECT 1 AS ok");
  await firstPool.end();

  const secondPool = createPoolForDatabase(baseConfig, stressDatabase);
  const [[row]] = await secondPool.execute("SELECT COUNT(*) AS count_value FROM reservations");
  await secondPool.end();

  assertEqual(Number(row.count_value) > 0, true, "Database restart/reconnect smoke could not read restored data.");
  result.scenarios.push({
    name: "Database reconnect recovery",
    status: "PASS",
    details: "Closed and reopened database connections after restore, then verified reservation data remained readable."
  });
}

async function auditStressDatabase(pool) {
  const [[overlapRow]] = await pool.execute(`
    SELECT COUNT(*) AS count_value
    FROM reservations a
    INNER JOIN reservation_statuses a_status
      ON a_status.status_id = a.status_id
    INNER JOIN reservations b
      ON a.reservation_id < b.reservation_id
      AND a.reservation_date = b.reservation_date
      AND a.start_time < b.end_time
      AND a.end_time > b.start_time
    INNER JOIN reservation_statuses b_status
      ON b_status.status_id = b.status_id
    WHERE a_status.is_blocking = 1
      AND b_status.is_blocking = 1
  `);
  const [[invalidReservationRow]] = await pool.execute(`
    SELECT COUNT(*) AS count_value
    FROM reservations
    WHERE resident_id IS NULL
      OR status_id IS NULL
      OR created_by_user_id IS NULL
      OR reservation_date IS NULL
      OR start_time IS NULL
      OR end_time IS NULL
      OR purpose IS NULL
      OR end_time <= start_time
  `);
  const [[invalidRoleRow]] = await pool.execute(`
    SELECT COUNT(*) AS count_value
    FROM users
    WHERE role NOT IN ('ADMIN', 'STAFF')
      OR account_status NOT IN ('ACTIVE', 'INACTIVE')
  `);
  const [[logRow]] = await pool.execute("SELECT COUNT(*) AS count_value FROM activity_logs");

  return {
    overlappingBlockingReservations: Number(overlapRow.count_value),
    invalidRequiredReservationFields: Number(invalidReservationRow.count_value),
    invalidUserRoles: Number(invalidRoleRow.count_value),
    activityLogRows: Number(logRow.count_value)
  };
}

async function getTimeSlots(pool) {
  const [rows] = await pool.execute(`
    SELECT
      TIME_FORMAT(start_time, '%H:%i') AS start_time,
      TIME_FORMAT(end_time, '%H:%i') AS end_time
    FROM time_slots
    WHERE is_active = 1
    ORDER BY display_order, start_time
  `);

  return rows.map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time
  }));
}

function createPoolForDatabase(baseConfig, database) {
  return mysql.createPool({
    ...baseConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });
}

function buildReservation(overrides = {}) {
  return {
    reservationDate: "2099-06-01",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Stress Resident",
    contactNo: "09171234567",
    address: "Stress Test Address",
    purpose: "Stress test reservation",
    remarks: "Disposable stress test record.",
    statusCode: "RESERVED",
    ...overrides
  };
}

async function assertRejectsConflict(callback) {
  try {
    await callback();
  } catch (error) {
    if (isReservationConflict(error)) {
      return;
    }

    throw error;
  }

  throw new Error("Expected reservation conflict, but the operation succeeded.");
}

function isReservationConflict(error) {
  return error instanceof ReservationConflictError ||
    Number(error?.errno) === 1644 ||
    String(error?.message || "").includes("overlaps an existing active reservation");
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function buildStressDatabaseName(value) {
  const sanitized = String(value || "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

  if (!sanitized) {
    return `${DEFAULT_DATABASE}_stress`;
  }

  if (!/^[A-Za-z0-9_]+$/.test(sanitized)) {
    throw new Error("Stress database name may only contain letters, numbers, and underscores.");
  }

  return sanitized;
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error("Unsafe database identifier.");
  }

  return `\`${value}\``;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDeploymentStressVerification().catch((error) => {
    console.error(error.message);

    if (error.cause?.message) {
      console.error(error.cause.message);
    }

    process.exitCode = 1;
  });
}
