import { access, mkdir as defaultMkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function buildBackupConfig(env = process.env, cwd = PROJECT_ROOT) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "barangay_court_scheduler",
    backupDir: path.resolve(cwd, env.BACKUP_DIR || "backups"),
    timezone: env.BACKUP_TIMEZONE || "Asia/Manila"
  };
}

export function createBackupFilePath({ backupDir, database, now = new Date(), timezone = "Asia/Manila" }) {
  const safeDatabaseName = String(database || "database")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "database";
  const timestamp = formatTimestamp(now, timezone);

  return path.join(backupDir, `${safeDatabaseName}_${timestamp}.sql`);
}

export async function createUniqueBackupFilePath({
  backupDir,
  database,
  now = new Date(),
  timezone = "Asia/Manila",
  fileExists = exists
}) {
  const firstCandidate = createBackupFilePath({ backupDir, database, now, timezone });

  if (!await fileExists(firstCandidate)) {
    return firstCandidate;
  }

  const extension = path.extname(firstCandidate);
  const baseName = firstCandidate.slice(0, -extension.length);

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseName}_${suffix}${extension}`;

    if (!await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to create a unique backup filename.");
}

export async function resolveMysqlDumpCommand(cwd = PROJECT_ROOT, options = {}) {
  const fileExists = options.fileExists || exists;
  const candidates = [
    path.join(cwd, "runtime", "mariadb", "bin", "mysqldump.exe"),
    path.join(cwd, "runtime", "mariadb", "bin", "mariadb-dump.exe"),
    path.join(cwd, "runtime", "mysql", "bin", "mysqldump.exe")
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return "mysqldump";
}

export function buildMysqldumpArgs(config, backupFilePath) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    "--protocol=TCP",
    "--ssl=0",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--set-gtid-purged=OFF",
    "--databases",
    config.database,
    `--result-file=${backupFilePath}`
  ];
}

export function buildMysqldumpEnv(config, baseEnv = process.env) {
  const childEnv = { ...baseEnv };

  if (config.password) {
    childEnv.MYSQL_PWD = config.password;
  }

  return childEnv;
}

export async function runMysqlBackup(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const env = options.env || process.env;
  const mkdir = options.mkdir || defaultMkdir;
  const now = options.now || new Date();
  const output = options.output || console;
  const spawnCommand = options.spawnCommand || spawn;
  const fileExists = options.fileExists || exists;
  const config = buildBackupConfig(env, cwd);
  const backupFilePath = await createUniqueBackupFilePath({
    backupDir: config.backupDir,
    database: config.database,
    now,
    timezone: config.timezone,
    fileExists
  });
  const command = options.command || await resolveMysqlDumpCommand(cwd, { fileExists });

  await mkdir(config.backupDir, { recursive: true });

  await runMysqldumpWithCompatibilityFallback({
    command,
    args: buildMysqldumpArgs(config, backupFilePath),
    env: buildMysqldumpEnv(config, env),
    spawnCommand
  });

  await logMaintenanceAction({
    config,
    action: "BACKUP_DATABASE",
    details: `Created database backup ${path.basename(backupFilePath)}.`,
    output,
    writeMaintenanceActivityLog: options.writeMaintenanceActivityLog
  });

  output.log(`MySQL backup created: ${backupFilePath}`);

  return {
    backupFilePath,
    database: config.database
  };
}

function formatTimestamp(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}_${values.hour}${values.minute}${values.second}`;
}

function runMysqldump({ command, args, env, spawnCommand }) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      env,
      windowsHide: true
    });
    let stderr = "";

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(
        `Unable to run mysqldump. Use START-HERE.bat so bundled runtime\\mariadb\\bin is loaded, or have the installer/admin provide local MySQL/MariaDB client tools. ${error.message}`
      ));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`mysqldump failed with exit code ${code}.${stderr ? ` ${stderr.trim()}` : ""}`));
    });
  });
}

async function runMysqldumpWithCompatibilityFallback({ command, args, env, spawnCommand }) {
  try {
    await runMysqldump({ command, args, env, spawnCommand });
  } catch (error) {
    if (!String(error?.message || "").match(/(unknown variable|unknown option).*set-gtid-purged/i)) {
      throw error;
    }

    await runMysqldump({
      command,
      args: args.filter((arg) => arg !== "--set-gtid-purged=OFF"),
      env,
      spawnCommand
    });
  }
}

export async function writeMaintenanceActivityLog(config, entry, options = {}) {
  const mysqlClient = options.mysqlClient || mysql;
  const connection = await mysqlClient.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    namedPlaceholders: true
  });

  try {
    await connection.execute(
      `
        INSERT INTO activity_logs (reservation_id, user_id, action, details)
        VALUES (NULL, NULL, :action, :details)
      `,
      {
        action: entry.action,
        details: entry.details
      }
    );
  } finally {
    await connection.end();
  }
}

async function logMaintenanceAction({ config, action, details, output, writeMaintenanceActivityLog: writer = writeMaintenanceActivityLog }) {
  try {
    await writer(config, { action, details });
  } catch (error) {
    const message = `Backup was created, but the activity log could not be updated: ${error.message}`;
    if (typeof output.warn === "function") {
      output.warn(message);
    } else {
      output.log(message);
    }
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMysqlBackup().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
