import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

import { createApp as defaultCreateApp } from "../src/app.js";
import * as defaultRepository from "../src/features/reservations/reservationRepository.js";

dotenv.config();

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_DATABASE = "barangay_court_scheduler";

export function buildMysqlConnectionConfig(env = process.env) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || DEFAULT_DATABASE
  };
}

export function buildMysqlVerificationConfig(env = process.env) {
  return {
    loginUsername: env.VERIFY_LOGIN_USERNAME || "admin",
    loginPassword: env.VERIFY_LOGIN_PASSWORD || "admin123"
  };
}

export function prepareSqlScriptForDatabase(sql, databaseName) {
  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error("DB_NAME may only contain letters, numbers, and underscores.");
  }

  return String(sql).replaceAll(DEFAULT_DATABASE, databaseName);
}

export function splitMysqlScript(sql) {
  const statements = [];
  let delimiter = ";";
  let buffer = "";

  for (const rawLine of String(sql).split(/\r?\n/)) {
    const line = rawLine.trim();
    const delimiterMatch = line.match(/^DELIMITER\s+(.+)$/i);

    if (delimiterMatch) {
      pushStatement(statements, buffer);
      buffer = "";
      delimiter = delimiterMatch[1];
      continue;
    }

    buffer += `${rawLine}\n`;

    if (buffer.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trim().slice(0, -delimiter.length).trim();
      pushStatement(statements, statement);
      buffer = "";
    }
  }

  pushStatement(statements, buffer);
  return statements;
}

export function buildVerificationReservation(marker, reservationDate) {
  return {
    reservationDate,
    startTime: "07:00",
    endTime: "08:00",
    representativeName: `MySQL Verification ${marker}`,
    contactNo: "09999999999",
    address: "Barangay Office Verification",
    purpose: "System verification",
    remarks: "Temporary record created by npm run verify:mysql.",
    statusCode: "RESERVED"
  };
}

export function isOverlapRejection(error) {
  return Number(error?.errno) === 1644 ||
    String(error?.message || "").includes("Reservation overlaps an existing active reservation.");
}

export async function assertSeedData(connection, options = {}) {
  const comparePassword = options.comparePassword || bcrypt.compare;
  const loginUsername = options.loginUsername || "admin";
  const loginPassword = options.loginPassword || options.adminPassword || "admin123";
  const [[activeAdminCount]] = await connection.execute(`
    SELECT COUNT(*) AS count_value
    FROM users
    WHERE role = 'ADMIN'
      AND account_status = 'ACTIVE'
  `);

  if (Number(activeAdminCount?.count_value || 0) < 1) {
    throw new Error("Seed verification failed: at least one active ADMIN account is required.");
  }

  const [[loginUser]] = await connection.execute(
    `
      SELECT username, password_hash, role, account_status
      FROM users
      WHERE username = :loginUsername
      LIMIT 1
    `,
    { loginUsername }
  );

  if (!loginUser) {
    throw new Error("Seed verification failed: configured verification Admin login was not found.");
  }

  if (loginUser.role !== "ADMIN") {
    throw new Error("Seed verification failed: configured verification login must be an ADMIN account.");
  }

  if (loginUser.account_status !== "ACTIVE") {
    throw new Error("Seed verification failed: configured verification Admin login is inactive.");
  }

  assertBcryptPasswordHash(
    loginUser.password_hash,
    "configured verification Admin login must use a bcrypt password hash"
  );

  if (!await comparePassword(loginPassword, loginUser.password_hash)) {
    throw new Error("Seed verification failed: configured verification Admin password hash does not match VERIFY_LOGIN_PASSWORD.");
  }

  const [[admin]] = await connection.execute(`
    SELECT username, password_hash, role, account_status
    FROM users
    WHERE username = 'admin'
    LIMIT 1
  `);

  if (admin) {
    if (admin.role !== "ADMIN") {
      throw new Error("Seed verification failed: starter admin must remain an ADMIN account when present.");
    }

    assertBcryptPasswordHash(
      admin.password_hash,
      "starter admin must use a bcrypt password hash"
    );
  }

  await assertMinimumTableCount(connection, "reservation_statuses", 5);
  await assertMinimumTableCount(connection, "time_slots", 1);
}

export async function verifyRepositoryRoundTrip(pool, options = {}) {
  const marker = options.marker || `VERIFY_${Date.now()}`;
  const reservationDate = options.reservationDate || "2099-05-08";
  const repository = options.repository || defaultRepository;
  const reservation = buildVerificationReservation(marker, reservationDate);
  let reservationId = null;

  try {
    reservationId = await repository.createReservation(pool, reservation, { createdByUserId: 1 });
    const storedReservation = await repository.getReservationById(pool, reservationId);

    if (!storedReservation || storedReservation.representativeName !== reservation.representativeName) {
      throw new Error("Repository verification failed: reservation was not stored and readable.");
    }

    await repository.updateReservationStatus(pool, reservationId, "COMPLETED", { userId: 1 });

    const [[logCount]] = await pool.execute(
      `
        SELECT COUNT(*) AS count_value
        FROM activity_logs
        WHERE reservation_id = :reservationId
          AND action = 'MARK_COMPLETED'
      `,
      { reservationId }
    );

    if (Number(logCount?.count_value || 0) < 1) {
      throw new Error("Repository verification failed: status update activity log was not written.");
    }
  } finally {
    if (reservationId) {
      await cleanupVerificationRows(pool, reservationId, reservation.representativeName);
    }
  }
}

export async function verifyOverlapTrigger(pool, options = {}) {
  const marker = options.marker || `VERIFY_TRIGGER_${Date.now()}`;
  const reservationDate = options.reservationDate || "2099-05-09";
  const connection = await pool.getConnection();
  let rolledBack = false;

  try {
    await connection.beginTransaction();

    const [residentOne] = await connection.execute(
      `
        INSERT INTO residents (full_name, contact_no, address)
        VALUES (:fullName, :contactNo, :address)
      `,
      {
        fullName: `Trigger Verification One ${marker}`,
        contactNo: "09999999991",
        address: "Barangay Office Verification"
      }
    );
    const [residentTwo] = await connection.execute(
      `
        INSERT INTO residents (full_name, contact_no, address)
        VALUES (:fullName, :contactNo, :address)
      `,
      {
        fullName: `Trigger Verification Two ${marker}`,
        contactNo: "09999999992",
        address: "Barangay Office Verification"
      }
    );

    await insertDirectReservation(connection, {
      residentId: residentOne.insertId,
      reservationDate,
      startTime: "10:00",
      endTime: "11:00",
      purpose: "Trigger verification one"
    });

    try {
      await insertDirectReservation(connection, {
        residentId: residentTwo.insertId,
        reservationDate,
        startTime: "10:30",
        endTime: "11:30",
        purpose: "Trigger verification overlap"
      });
    } catch (error) {
      if (!isOverlapRejection(error)) {
        throw error;
      }

      await connection.rollback();
      rolledBack = true;
      return;
    }

    throw new Error("MySQL trigger verification failed: overlapping direct insert was not rejected.");
  } finally {
    if (!rolledBack) {
      await connection.rollback().catch(() => {});
    }
    connection.release();
  }
}

export async function verifyLiveAppHttpSmoke(options = {}) {
  const createApp = options.createApp || defaultCreateApp;
  const fetchFn = options.fetch || fetch;
  const loginUsername = options.loginUsername || "admin";
  const loginPassword = options.loginPassword || "admin123";
  const app = createApp();
  const server = app.listen(0);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const loginResponse = await fetchFn(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        username: loginUsername,
        password: loginPassword
      }),
      redirect: "manual"
    });

    if (loginResponse.status !== 302 || loginResponse.headers.get("location") !== "/dashboard") {
      throw new Error("Live app HTTP smoke failed: expected login redirect to /dashboard.");
    }

    const sessionCookie = String(loginResponse.headers.get("set-cookie") || "").split(";")[0];

    if (!sessionCookie) {
      throw new Error("Live app HTTP smoke failed: login did not return a session cookie.");
    }

    return await fetchAuthenticatedSmokePages(baseUrl, sessionCookie, fetchFn);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals?.db?.end?.();
  }
}

export async function runMysqlVerification(options = {}) {
  const env = options.env || process.env;
  const mysqlClient = options.mysqlClient || mysql;
  const output = options.output || console;
  const config = buildMysqlConnectionConfig(env);
  const verificationConfig = buildMysqlVerificationConfig(env);
  const schemaPath = options.schemaPath || path.join(PROJECT_ROOT, "database", "schema.sql");
  const seedPath = options.seedPath || path.join(PROJECT_ROOT, "database", "seed.sql");
  const verificationDate = env.VERIFY_MYSQL_DATE || "2099-05-08";
  const marker = `VERIFY_${Date.now()}`;

  let setupConnection;
  let pool;

  try {
    setupConnection = await mysqlClient.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: false,
      namedPlaceholders: true
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to MySQL at ${config.host}:${config.port}. Install/start local MySQL, then rerun npm run verify:mysql.`,
      { cause: error }
    );
  }

  try {
    const schemaSql = prepareSqlScriptForDatabase(await readFile(schemaPath, "utf8"), config.database);
    const seedSql = prepareSqlScriptForDatabase(await readFile(seedPath, "utf8"), config.database);
    const schemaCount = await applyMysqlScript(setupConnection, schemaSql);
    const seedCount = await applyMysqlScript(setupConnection, seedSql);
    output.log(`Applied MySQL schema (${schemaCount} statements) and seed data (${seedCount} statements).`);
  } finally {
    await setupConnection.end();
  }

  pool = mysqlClient.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: true
  });

  try {
    await assertSeedData(pool, verificationConfig);
    await verifyRepositoryRoundTrip(pool, { marker, reservationDate: verificationDate });
    await verifyOverlapTrigger(pool, { marker: `${marker}_TRIGGER`, reservationDate: "2099-05-09" });
  } finally {
    await pool.end();
  }

  const httpSmokeResults = await verifyLiveAppHttpSmoke({
    createApp: options.createApp,
    loginUsername: verificationConfig.loginUsername,
    loginPassword: verificationConfig.loginPassword
  });

  output.log(`Live app HTTP smoke passed for ${httpSmokeResults.length} authenticated office pages.`);
  output.log(`MySQL verification passed for database '${config.database}'.`);

  return {
    database: config.database,
    reservationDate: verificationDate,
    marker
  };
}

async function fetchAuthenticatedSmokePages(baseUrl, sessionCookie, fetchFn) {
  const pages = [
    { path: "/dashboard", expectedText: "id=\"root\"" },
    { path: "/schedule", expectedText: "id=\"root\"" },
    { path: "/reservations", expectedText: "id=\"root\"" },
    { path: "/activity-logs", expectedText: "id=\"root\"" },
    { path: "/reports", expectedText: "id=\"root\"" }
  ];
  const results = [];

  for (const page of pages) {
    const response = await fetchFn(`${baseUrl}${page.path}`, {
      headers: {
        cookie: sessionCookie
      }
    });
    const body = await response.text();

    if (response.status !== 200) {
      throw new Error(`Live app HTTP smoke failed for ${page.path}: expected HTTP 200, got ${response.status}.`);
    }

    if (!body.includes(page.expectedText)) {
      throw new Error(`Live app HTTP smoke failed for ${page.path}: expected page text "${page.expectedText}".`);
    }

    results.push({ path: page.path, status: response.status });
  }

  return results;
}

async function applyMysqlScript(connection, sql) {
  const statements = splitMysqlScript(sql);

  for (const statement of statements) {
    await connection.query(statement);
  }

  return statements.length;
}

function pushStatement(statements, value) {
  const statement = String(value || "").trim();

  if (statement) {
    statements.push(statement);
  }
}

async function assertMinimumTableCount(connection, tableName, minimum) {
  const [[row]] = await connection.execute(`SELECT COUNT(*) AS count_value FROM ${tableName}`);

  if (Number(row?.count_value || 0) < minimum) {
    throw new Error(`Seed verification failed: expected at least ${minimum} rows in ${tableName}.`);
  }
}

function assertBcryptPasswordHash(passwordHash, message) {
  const value = String(passwordHash || "");

  if (!/^\$2[aby]\$\d{2}\$/.test(value) || value.includes("admin123")) {
    throw new Error(`Seed verification failed: ${message}.`);
  }
}

async function cleanupVerificationRows(pool, reservationId, representativeName) {
  await pool.execute(
    "DELETE FROM activity_logs WHERE reservation_id = :reservationId",
    { reservationId }
  );
  await pool.execute(
    "DELETE FROM reservations WHERE reservation_id = :reservationId",
    { reservationId }
  );
  await pool.execute(
    "DELETE FROM residents WHERE full_name = :representativeName AND contact_no = '09999999999'",
    { representativeName }
  );
}

async function insertDirectReservation(connection, reservation) {
  const referenceNo = await defaultRepository.reserveNextReservationReference(connection, reservation.reservationDate);

  await connection.execute(
    `
      INSERT INTO reservations
        (reference_no, resident_id, status_id, approved_by_user_id, created_by_user_id, reservation_date, start_time, end_time, purpose, remarks)
      VALUES
        (:referenceNo, :residentId, 2, 1, 1, :reservationDate, :startTime, :endTime, :purpose, 'Temporary trigger verification record.')
    `,
    { ...reservation, referenceNo }
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMysqlVerification().catch((error) => {
    console.error(error.message);

    if (error.cause?.message) {
      console.error(error.cause.message);
    }

    process.exitCode = 1;
  });
}
