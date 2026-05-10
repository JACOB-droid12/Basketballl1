import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrereqReport,
  commandResult,
  formatPrereqReport,
  parseMajorVersion,
  verifyPrerequisites
} from "../scripts/verify-prereqs.mjs";

test("parses major versions from common version strings", () => {
  assert.equal(parseMajorVersion("v20.19.0"), 20);
  assert.equal(parseMajorVersion("10.9.2"), 10);
  assert.equal(parseMajorVersion("mysql  Ver 8.0.36 for Win64"), 8);
  assert.equal(parseMajorVersion("not installed"), null);
});

test("builds prereq report with missing MySQL tools and env warnings", async () => {
  const report = await buildPrereqReport({
    cwd: "C:\\BarangayCourtScheduler",
    env: {
      DB_HOST: "127.0.0.1",
      DB_NAME: "barangay_court_scheduler",
      DB_USER: "root",
      DB_PASSWORD: "secret"
    },
    fileExists: async (filePath) => filePath.endsWith("package.json"),
    runCommand: async (command) => {
      if (command === "node") return commandResult({ ok: true, stdout: "v20.19.0" });
      if (command === "npm") return commandResult({ ok: true, stdout: "10.9.2" });
      return commandResult({ ok: false, error: `${command} missing` });
    }
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.map((check) => [check.name, check.ok]), [
    ["Node.js 20+", true],
    ["npm", true],
    ["mysql client", false],
    ["mysqldump", false],
    ["package.json", true],
    [".env", false],
    ["DB_NAME", true],
    ["DB_USER", true],
    ["APP_SESSION_SECRET", false]
  ]);
});

test("formats prereq report without leaking database password", () => {
  const formatted = formatPrereqReport({
    ok: false,
    checks: [
      { name: "Node.js 20+", ok: true, detail: "v20.19.0" },
      { name: "mysql client", ok: false, detail: "mysql missing" }
    ]
  });

  assert.match(formatted, /\[OK\] Node\.js 20\+ - v20\.19\.0/);
  assert.match(formatted, /\[FAIL\] mysql client - mysql missing/);
  assert.doesNotMatch(formatted, /secret|DB_PASSWORD/i);
});

test("verifyPrerequisites exits with failure when required checks fail", async () => {
  const output = [];

  await assert.rejects(
    verifyPrerequisites({
      output: { log: (message) => output.push(message) },
      buildReport: async () => ({
        ok: false,
        checks: [{ name: "mysql client", ok: false, detail: "mysql missing" }]
      })
    }),
    /Prerequisite verification failed/
  );

  assert.match(output.join("\n"), /\[FAIL\] mysql client/);
});
