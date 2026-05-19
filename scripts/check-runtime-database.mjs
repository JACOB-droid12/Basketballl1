import { pathToFileURL } from "node:url";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const DEFAULT_DATABASE = "barangay_court_scheduler";

export function buildRuntimeDatabaseConfig(env = process.env) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || DEFAULT_DATABASE
  };
}

export async function assertRuntimeDatabaseReady(connection) {
  await connection.execute("SELECT 1 AS ok");

  const [[statusCount]] = await connection.execute(`
    SELECT COUNT(*) AS count_value
    FROM reservation_statuses
  `);
  if (Number(statusCount?.count_value || 0) < 5) {
    throw new Error("Local database check failed: reservation statuses are missing. Run START-HERE.bat first-time setup first.");
  }

  const [[slotCount]] = await connection.execute(`
    SELECT COUNT(*) AS count_value
    FROM time_slots
  `);
  if (Number(slotCount?.count_value || 0) < 1) {
    throw new Error("Local database check failed: time slots are missing. Run START-HERE.bat first-time setup first.");
  }

  const [[adminCount]] = await connection.execute(`
    SELECT COUNT(*) AS count_value
    FROM users
    WHERE role = 'ADMIN'
      AND account_status = 'ACTIVE'
  `);
  if (Number(adminCount?.count_value || 0) < 1) {
    throw new Error("Local database check failed: no active Admin account was found. Create or reactivate an Admin account, or run START-HERE.bat first-time setup first.");
  }
}

export async function checkRuntimeDatabase(options = {}) {
  const env = options.env || process.env;
  const mysqlClient = options.mysqlClient || mysql;
  const output = options.output || console;
  const config = buildRuntimeDatabaseConfig(env);
  let connection;

  try {
    connection = await mysqlClient.createConnection({
      ...config,
      namedPlaceholders: true
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to the local MySQL/MariaDB database at ${config.host}:${config.port}/${config.database}. Start local MySQL/MariaDB or run START-HERE.bat first-time setup, then try again.`,
      { cause: error }
    );
  }

  try {
    await assertRuntimeDatabaseReady(connection);
  } finally {
    await connection.end();
  }

  output.log(`Local database check passed for '${config.database}'.`);
  return { database: config.database };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkRuntimeDatabase().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
