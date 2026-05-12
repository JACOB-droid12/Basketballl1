import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildEnvFile,
  createLocalEnvFile,
  getNextStepMessage
} from "../scripts/setup-env.mjs";

const ENV_EXAMPLE = [
  'APP_NAME="Barangay Sto. Niño Court Scheduler"',
  "APP_PORT=3000",
  'APP_SESSION_SECRET="replace-with-a-long-random-local-secret"',
  "",
  "DB_HOST=127.0.0.1",
  "DB_PORT=3306",
  "DB_NAME=barangay_court_scheduler",
  "DB_USER=root",
  "DB_PASSWORD=",
  "BACKUP_DIR=backups",
  "BACKUP_TIMEZONE=Asia/Manila",
  "",
  "BCRYPT_ROUNDS=12",
  "DEFAULT_CREATED_BY_USER_ID=1",
  ""
].join("\n");

test("builds a local env file with a generated session secret", () => {
  const content = buildEnvFile(ENV_EXAMPLE, {
    sessionSecret: "local-secret-12345678901234567890"
  });

  assert.match(content, /APP_SESSION_SECRET=local-secret-12345678901234567890/);
  assert.doesNotMatch(content, /replace-with-a-long-random-local-secret/);
  assert.match(content, /DB_NAME=barangay_court_scheduler/);
  assert.match(content, /BACKUP_TIMEZONE=Asia\/Manila/);
  assert.equal(content.endsWith("\n"), true);
});

test("creates .env from .env.example without overwriting an existing .env", async () => {
  const writes = [];
  const cwd = "C:\\BarangayCourtScheduler";

  const result = await createLocalEnvFile({
    cwd,
    fileExists: async (filePath) => filePath.endsWith(".env.example"),
    readFile: async () => ENV_EXAMPLE,
    writeFile: async (filePath, content) => writes.push({ filePath, content }),
    generateSecret: () => "generated-secret-abcdefghijklmnopqrstuvwxyz",
    output: { log() {} }
  });

  assert.equal(result.envFilePath, path.join(cwd, ".env"));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].filePath, path.join(cwd, ".env"));
  assert.match(writes[0].content, /APP_SESSION_SECRET=generated-secret-abcdefghijklmnopqrstuvwxyz/);

  await assert.rejects(
    createLocalEnvFile({
      cwd,
      fileExists: async (filePath) => filePath.endsWith(".env"),
      readFile: async () => ENV_EXAMPLE,
      writeFile: async () => {
        throw new Error("should not write");
      },
      output: { log() {} }
    }),
    /\.env already exists/
  );
});

test("setup-env explains automatic password handling during one-stop setup", () => {
  assert.match(
    getNextStepMessage({
      env: { BARANGAY_OFFICE_ONE_STOP_SETUP: "1" }
    }),
    /START-HERE\.bat will finish the local database password automatically/i
  );

  assert.match(
    getNextStepMessage({ env: {} }),
    /Update DB_PASSWORD in \.env/
  );
});
