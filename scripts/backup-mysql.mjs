import { mkdir as defaultMkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

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

export function buildMysqldumpArgs(config, backupFilePath) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
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
  const config = buildBackupConfig(env, cwd);
  const backupFilePath = createBackupFilePath({
    backupDir: config.backupDir,
    database: config.database,
    now,
    timezone: config.timezone
  });

  await mkdir(config.backupDir, { recursive: true });

  await runMysqldumpWithCompatibilityFallback({
    args: buildMysqldumpArgs(config, backupFilePath),
    env: buildMysqldumpEnv(config, env),
    spawnCommand
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
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}_${values.hour}${values.minute}`;
}

function runMysqldump({ args, env, spawnCommand }) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand("mysqldump", args, {
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

async function runMysqldumpWithCompatibilityFallback({ args, env, spawnCommand }) {
  try {
    await runMysqldump({ args, env, spawnCommand });
  } catch (error) {
    if (!String(error?.message || "").match(/(unknown variable|unknown option).*set-gtid-purged/i)) {
      throw error;
    }

    await runMysqldump({
      args: args.filter((arg) => arg !== "--set-gtid-purged=OFF"),
      env,
      spawnCommand
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMysqlBackup().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
