import { access, createReadStream as defaultCreateReadStream } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function buildMysqlRestoreConfig(env = process.env, cwd = PROJECT_ROOT) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "barangay_court_scheduler",
    cwd
  };
}

export async function resolveBackupFile(args = process.argv.slice(2), options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const fileExists = options.fileExists || exists;
  const inputPath = String(args[0] || "").trim();

  if (!inputPath) {
    throw new Error("Usage: npm run restore:mysql -- <path-to-backup.sql>");
  }

  if (path.extname(inputPath).toLowerCase() !== ".sql") {
    throw new Error("Restore file must be a .sql file.");
  }

  const backupFile = path.resolve(cwd, inputPath);

  if (!await fileExists(backupFile)) {
    throw new Error(`Restore file was not found: ${backupFile}`);
  }

  return backupFile;
}

export function buildMysqlRestoreArgs(config) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    "--protocol=TCP",
    "--ssl=0"
  ];
}

export async function resolveMysqlCommand(cwd = PROJECT_ROOT, options = {}) {
  const fileExists = options.fileExists || exists;
  const candidates = [
    path.join(cwd, "runtime", "mariadb", "bin", "mysql.exe"),
    path.join(cwd, "runtime", "mariadb", "bin", "mariadb.exe"),
    path.join(cwd, "runtime", "mysql", "bin", "mysql.exe")
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return "mysql";
}

export function buildMysqlRestoreEnv(config, baseEnv = process.env) {
  const childEnv = { ...baseEnv };

  if (config.password) {
    childEnv.MYSQL_PWD = config.password;
  }

  return childEnv;
}

export async function runMysqlRestore(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const env = options.env || process.env;
  const output = options.output || console;
  const processArgs = options.processArgs || process.argv;
  const spawnCommand = options.spawnCommand || spawn;
  const createReadStream = options.createReadStream || defaultCreateReadStream;
  const fileExists = options.fileExists || exists;
  const backupFile = await resolveBackupFile(processArgs.slice(2), {
    cwd,
    fileExists
  });
  const config = buildMysqlRestoreConfig(env, cwd);
  const command = options.command || await resolveMysqlCommand(cwd, { fileExists });

  await runMysql({
    command,
    args: buildMysqlRestoreArgs(config),
    backupFile,
    createReadStream,
    env: buildMysqlRestoreEnv(config, env),
    spawnCommand
  });

  await logMaintenanceAction({
    config,
    action: "RESTORE_DATABASE",
    details: `Restored database backup ${path.basename(backupFile)}.`,
    output,
    writeMaintenanceActivityLog: options.writeMaintenanceActivityLog
  });

  output.log(`MySQL restore completed from: ${backupFile}`);

  return {
    backupFile,
    database: config.database
  };
}

function runMysql({ command, args, backupFile, createReadStream, env, spawnCommand }) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      env,
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true
    });
    let stderr = "";

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(
        `Unable to run mysql. Use START-HERE.bat so bundled runtime\\mariadb\\bin is loaded, or have the installer/admin provide local MySQL/MariaDB client tools. ${error.message}`
      ));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`mysql restore failed with exit code ${code}.${stderr ? ` ${stderr.trim()}` : ""}`));
    });

    createReadStream(backupFile).on("error", reject).pipe(child.stdin);
  });
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
    const message = `Restore completed, but the activity log could not be updated: ${error.message}`;
    if (typeof output.warn === "function") {
      output.warn(message);
    } else {
      output.log(message);
    }
  }
}

function exists(filePath) {
  return new Promise((resolve) => {
    access(filePath, (error) => resolve(!error));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMysqlRestore().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
