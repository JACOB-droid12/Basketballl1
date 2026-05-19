import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import test from "node:test";

import {
  buildMysqlRestoreArgs,
  buildMysqlRestoreConfig,
  buildMysqlRestoreEnv,
  resolveBackupFile,
  resolveMysqlCommand,
  runMysqlRestore
} from "../scripts/restore-mysql.mjs";

test("builds restore config from environment with local defaults", () => {
  const config = buildMysqlRestoreConfig({
    DB_HOST: "localhost",
    DB_PORT: "3307",
    DB_USER: "barangay_user",
    DB_PASSWORD: "secret",
    DB_NAME: "barangay_test"
  }, "C:\\BarangayCourtScheduler");

  assert.deepEqual(config, {
    host: "localhost",
    port: 3307,
    user: "barangay_user",
    password: "secret",
    database: "barangay_test",
    cwd: "C:\\BarangayCourtScheduler"
  });
});

test("requires an explicit .sql backup file", async () => {
  await assert.rejects(
    resolveBackupFile([], {
      cwd: "C:\\BarangayCourtScheduler",
      fileExists: async () => false
    }),
    /Usage: npm run restore:mysql -- <path-to-backup.sql>/
  );

  await assert.rejects(
    resolveBackupFile(["backups\\notes.txt"], {
      cwd: "C:\\BarangayCourtScheduler",
      fileExists: async () => true
    }),
    /Restore file must be a .sql file/
  );
});

test("resolves relative backup file paths and checks file existence", async () => {
  const backupFile = await resolveBackupFile(["backups\\backup.sql"], {
    cwd: "C:\\BarangayCourtScheduler",
    fileExists: async (filePath) => filePath.endsWith(path.join("backups", "backup.sql"))
  });

  assert.equal(backupFile, path.resolve("C:\\BarangayCourtScheduler", "backups\\backup.sql"));
});

test("builds mysql restore args without exposing the password", () => {
  const args = buildMysqlRestoreArgs({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "secret",
    database: "barangay_court_scheduler"
  });

  assert.deepEqual(args, [
    "--host=localhost",
    "--port=3306",
    "--user=root",
    "--protocol=TCP",
    "--ssl=0"
  ]);
  assert.equal(args.some((arg) => arg.includes("secret")), false);
});

test("prefers bundled mysql client when the offline runtime is present", async () => {
  const command = await resolveMysqlCommand("C:\\BarangayCourtScheduler", {
    fileExists: async (candidate) => candidate.endsWith(path.join("runtime", "mariadb", "bin", "mysql.exe"))
  });

  assert.equal(command, path.join("C:\\BarangayCourtScheduler", "runtime", "mariadb", "bin", "mysql.exe"));
});

test("passes the MySQL password through child process environment", () => {
  const env = buildMysqlRestoreEnv({ password: "secret" }, { PATH: "C:\\Windows" });

  assert.equal(env.PATH, "C:\\Windows");
  assert.equal(env.MYSQL_PWD, "secret");
});

test("runs mysql restore using the backup file as stdin", async () => {
  const spawnCommand = createFakeSpawn(0);
  const output = [];
  const backupFile = path.resolve("C:\\BarangayCourtScheduler", "backups\\backup.sql");

  const result = await runMysqlRestore({
    cwd: "C:\\BarangayCourtScheduler",
    env: {
      DB_HOST: "localhost",
      DB_PORT: "3306",
      DB_USER: "root",
      DB_PASSWORD: "secret",
      DB_NAME: "barangay_court_scheduler"
    },
    createReadStream: createFakeReadStream,
    fileExists: async () => true,
    output: { log: (message) => output.push(message) },
    processArgs: ["node", "restore-mysql.mjs", backupFile],
    writeMaintenanceActivityLog: async () => {},
    spawnCommand
  });

  assert.equal(result.backupFile, backupFile);
  assert.equal(spawnCommand.calls[0].command, path.join("C:\\BarangayCourtScheduler", "runtime", "mariadb", "bin", "mysql.exe"));
  assert.deepEqual(spawnCommand.calls[0].args, [
    "--host=localhost",
    "--port=3306",
    "--user=root",
    "--protocol=TCP",
    "--ssl=0"
  ]);
  assert.equal(spawnCommand.calls[0].options.stdio[0], "pipe");
  assert.equal(spawnCommand.calls[0].options.env.MYSQL_PWD, "secret");
  assert.ok(output[0].includes("MySQL restore completed from:"));
});

function createFakeSpawn(exitCode) {
  const calls = [];
  const spawnCommand = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdin = new EventEmitter();
    child.stdin.end = () => {};
    child.stderr = new EventEmitter();
    setTimeout(() => child.emit("close", exitCode), 0);
    return child;
  };

  spawnCommand.calls = calls;
  return spawnCommand;
}

function createFakeReadStream() {
  return {
    on() {
      return this;
    },
    pipe(destination) {
      destination.end?.();
      return destination;
    }
  };
}
