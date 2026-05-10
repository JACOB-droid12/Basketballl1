import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testsDir = path.join(rootDir, "tests");
const requestedTestFiles = process.argv.slice(2);

const testFiles = requestedTestFiles.length > 0
  ? requestedTestFiles
  : (await readdir(testsDir))
    .filter((fileName) => fileName.endsWith(".test.js"))
    .sort()
    .map((fileName) => path.join("tests", fileName));

if (testFiles.length === 0) {
  console.error("No test files found in tests/.");
  process.exit(1);
}

const testProcess = spawn(
  process.execPath,
  ["--test", "--experimental-test-isolation=none", ...testFiles],
  {
    cwd: rootDir,
    stdio: "inherit",
  },
);

testProcess.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
