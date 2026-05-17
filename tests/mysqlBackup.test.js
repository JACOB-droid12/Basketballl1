import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import test from "node:test";

import {
  buildBackupConfig,
  buildMysqldumpArgs,
  buildMysqldumpEnv,
  createBackupFilePath,
  createUniqueBackupFilePath,
  resolveMysqlDumpCommand,
  runMysqlBackup
} from "../scripts/backup-mysql.mjs";

test("builds backup config from environment with local defaults", () => {
  const config = buildBackupConfig({
    DB_HOST: "localhost",
    DB_PORT: "3307",
    DB_USER: "barangay_user",
    DB_PASSWORD: "secret",
    DB_NAME: "barangay_test",
    BACKUP_DIR: "office-backups"
  }, "C:\\BarangayCourtScheduler");

  assert.deepEqual(config, {
    host: "localhost",
    port: 3307,
    user: "barangay_user",
    password: "secret",
    database: "barangay_test",
    backupDir: path.resolve("C:\\BarangayCourtScheduler", "office-backups"),
    timezone: "Asia/Manila"
  });
});

test("creates deterministic backup file paths with sanitized database names", () => {
  const filePath = createBackupFilePath({
    backupDir: "C:\\backups",
    database: "barangay-test data",
    now: new Date("2026-05-08T06:30:00.000Z"),
    timezone: "Asia/Manila"
  });

  assert.equal(filePath, path.join("C:\\backups", "barangay_test_data_2026-05-08_143000.sql"));
});

test("adds a numeric suffix instead of overwriting an existing backup file", async () => {
  const existing = new Set([
    path.join("C:\\backups", "barangay_court_scheduler_2026-05-08_143000.sql"),
    path.join("C:\\backups", "barangay_court_scheduler_2026-05-08_143000_2.sql")
  ]);

  const filePath = await createUniqueBackupFilePath({
    backupDir: "C:\\backups",
    database: "barangay_court_scheduler",
    now: new Date("2026-05-08T06:30:00.000Z"),
    timezone: "Asia/Manila",
    fileExists: async (candidate) => existing.has(candidate)
  });

  assert.equal(filePath, path.join("C:\\backups", "barangay_court_scheduler_2026-05-08_143000_3.sql"));
});

test("prefers bundled mysqldump when the offline runtime is present", async () => {
  const command = await resolveMysqlDumpCommand("C:\\BarangayCourtScheduler", {
    fileExists: async (candidate) => candidate.endsWith(path.join("runtime", "mariadb", "bin", "mysqldump.exe"))
  });

  assert.equal(command, path.join("C:\\BarangayCourtScheduler", "runtime", "mariadb", "bin", "mysqldump.exe"));
});

test("builds mysqldump args without exposing the password", () => {
  const args = buildMysqldumpArgs({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "secret",
    database: "barangay_court_scheduler"
  }, "C:\\backups\\backup.sql");

  assert.deepEqual(args, [
    "--host=localhost",
    "--port=3306",
    "--user=root",
    "--protocol=TCP",
    "--ssl=0",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--set-gtid-purged=OFF",
    "--databases",
    "barangay_court_scheduler",
    "--result-file=C:\\backups\\backup.sql"
  ]);
  assert.equal(args.some((arg) => arg.includes("secret")), false);
});

test("passes the MySQL password through child process environment", () => {
  const env = buildMysqldumpEnv({ password: "secret" }, { PATH: "C:\\Windows" });

  assert.equal(env.PATH, "C:\\Windows");
  assert.equal(env.MYSQL_PWD, "secret");
});

test("runs mysqldump, creates the backup directory, and returns the file path", async () => {
  const mkdirCalls = [];
  const spawnCommand = createFakeSpawn(0);
  const output = [];

  const result = await runMysqlBackup({
    cwd: "C:\\BarangayCourtScheduler",
    env: {
      DB_HOST: "localhost",
      DB_PORT: "3306",
      DB_USER: "root",
      DB_PASSWORD: "secret",
      DB_NAME: "barangay_court_scheduler",
      BACKUP_DIR: "backups"
    },
    mkdir: async (...args) => mkdirCalls.push(args),
    now: new Date("2026-05-08T06:30:00.000Z"),
    output: { log: (message) => output.push(message) },
    writeMaintenanceActivityLog: async () => {},
    spawnCommand
  });

  assert.equal(result.backupFilePath, path.resolve("C:\\BarangayCourtScheduler", "backups", "barangay_court_scheduler_2026-05-08_143000.sql"));
  assert.deepEqual(mkdirCalls, [[path.resolve("C:\\BarangayCourtScheduler", "backups"), { recursive: true }]]);
  assert.equal(spawnCommand.calls[0].command, "mysqldump");
  assert.equal(spawnCommand.calls[0].options.env.MYSQL_PWD, "secret");
  assert.ok(output[0].includes("MySQL backup created:"));
});

test("retries backup without GTID purge option for clients that do not support it", async () => {
  const spawnCommand = createFakeSpawnWithFirstFailure("unknown variable 'set-gtid-purged=OFF'");

  await runMysqlBackup({
    cwd: "C:\\BarangayCourtScheduler",
    env: {
      DB_HOST: "localhost",
      DB_PORT: "3306",
      DB_USER: "root",
      DB_PASSWORD: "secret",
      DB_NAME: "barangay_court_scheduler",
      BACKUP_DIR: "backups"
    },
    mkdir: async () => {},
    now: new Date("2026-05-08T06:30:00.000Z"),
    output: { log: () => {} },
    writeMaintenanceActivityLog: async () => {},
    spawnCommand
  });

  assert.equal(spawnCommand.calls.length, 2);
  assert.ok(spawnCommand.calls[0].args.includes("--set-gtid-purged=OFF"));
  assert.equal(spawnCommand.calls[1].args.includes("--set-gtid-purged=OFF"), false);
});

function createFakeSpawn(exitCode) {
  const calls = [];
  const spawnCommand = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setTimeout(() => child.emit("close", exitCode), 0);
    return child;
  };

  spawnCommand.calls = calls;
  return spawnCommand;
}

function createFakeSpawnWithFirstFailure(stderrMessage) {
  const calls = [];
  const spawnCommand = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setTimeout(() => {
      if (calls.length === 1) {
        child.stderr.emit("data", Buffer.from(stderrMessage));
        child.emit("close", 2);
        return;
      }

      child.emit("close", 0);
    }, 0);
    return child;
  };

  spawnCommand.calls = calls;
  return spawnCommand;
}
