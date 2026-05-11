import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("database README reflects current live-verification status", () => {
  const readme = readFileSync("database/README.md", "utf8");

  assert.doesNotMatch(readme, /SQL files were prepared and statically checked but not applied/i);
  assert.match(readme, /live-verified against disposable local Oracle MySQL and MariaDB servers/i);
  assert.match(readme, /rerun .* on the barangay office's target local MySQL\/MariaDB installation/i);
});

test("deployment docs present MariaDB as a verified local database option", () => {
  const databaseReadme = readFileSync("database/README.md", "utf8");
  const deploymentGuide = readFileSync("docs/DEPLOYMENT_GUIDE.md", "utf8");
  const offlineChecklist = readFileSync("docs/OFFLINE_INSTALL_CHECKLIST.md", "utf8");
  const mainReadme = readFileSync("README.md", "utf8");

  assert.match(databaseReadme, /local MySQL\/MariaDB database/);
  assert.match(databaseReadme, /MySQL 8\.0 or newer \(default\)/);
  assert.match(databaseReadme, /local MariaDB server that passes `npm run verify:mysql`/);
  assert.match(deploymentGuide, /MySQL 8 or newer \(default\), or a local MariaDB server that passes `npm run verify:mysql`/);
  assert.match(deploymentGuide, /After Node\.js 20\+ and local MySQL\/MariaDB are installed/);
  assert.match(offlineChecklist, /database is local MySQL\/MariaDB/);
  assert.match(offlineChecklist, /MySQL 8\+ or MariaDB Windows installer/);
  assert.match(mainReadme, /Install Node\.js 20\+ and local MySQL 8\+ \(or verified MariaDB\)/);
});
