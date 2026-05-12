import { access, createReadStream as defaultCreateReadStream } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

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
    config.database
  ];
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
  const backupFile = await resolveBackupFile(processArgs.slice(2), {
    cwd,
    fileExists: options.fileExists
  });
  const config = buildMysqlRestoreConfig(env, cwd);

  await runMysql({
    args: buildMysqlRestoreArgs(config),
    backupFile,
    createReadStream,
    env: buildMysqlRestoreEnv(config, env),
    spawnCommand
  });

  output.log(`MySQL restore completed from: ${backupFile}`);

  return {
    backupFile,
    database: config.database
  };
}

function runMysql({ args, backupFile, createReadStream, env, spawnCommand }) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand("mysql", args, {
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
