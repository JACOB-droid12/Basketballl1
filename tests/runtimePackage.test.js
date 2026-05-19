import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeRuntimePackage,
  formatRuntimePackageReport
} from "../scripts/verify-runtime-package.mjs";

test("runtime package verifier accepts bundled Node and MariaDB runtime files", () => {
  const root = createRuntimeRoot([
    ...completeAppFiles(),
    "runtime/node/node.exe",
    "runtime/node/npm.cmd",
    "runtime/mariadb/bin/mariadbd.exe",
    "runtime/mariadb/bin/mariadb-install-db.exe",
    "runtime/mariadb/bin/mariadb.exe",
    "runtime/mariadb/bin/mysqldump.exe"
  ]);

  try {
    const report = analyzeRuntimePackage(root);
    const formatted = formatRuntimePackageReport(report);

    assert.equal(report.ok, true);
    assert.equal(report.mode, "true one-stop offline package");
    assert.match(formatted, /Package classification: true one-stop offline package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime package verifier reports missing files for a non one-stop package", () => {
  const root = createRuntimeRoot([
    "package.json",
    "runtime/node/node.exe",
    "runtime/mariadb/bin/mysql.exe"
  ]);

  try {
    const report = analyzeRuntimePackage(root);
    const formatted = formatRuntimePackageReport(report);

    assert.equal(report.ok, false);
    assert.equal(report.mode, "deployment candidate only");
    assert.match(formatted, /Package classification: deployment candidate only/);
    assert.match(formatted, /runtime\/node\/npm\.cmd/);
    assert.match(formatted, /runtime\/mariadb\/bin\/mariadbd\.exe/);
    assert.match(formatted, /runtime\/mariadb\/bin\/mysqldump\.exe/);
    assert.match(formatted, /app file: START-HERE\.bat/);
    assert.match(formatted, /Barangay Court Scheduler daily launcher/);
    assert.match(formatted, /Maintenance Tools launcher/);
    assert.match(formatted, /node_modules or built backend output/);
    assert.match(formatted, /built React staff console assets/);
    assert.match(formatted, /React asset manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime package verifier accepts mysql.exe as the MariaDB-compatible client", () => {
  const root = createRuntimeRoot([
    ...completeAppFiles(),
    "runtime/node/node.exe",
    "runtime/node/npm.cmd",
    "runtime/mariadb/bin/mariadbd.exe",
    "runtime/mariadb/bin/mariadb-install-db.exe",
    "runtime/mariadb/bin/mysql.exe",
    "runtime/mariadb/bin/mysqldump.exe"
  ]);

  try {
    const report = analyzeRuntimePackage(root);

    assert.equal(report.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function completeAppFiles() {
  return [
    "package.json",
    "START-HERE.bat",
    "start-barangay-office.bat",
    "maintenance-tools/load-runtime-env.bat",
    "maintenance-tools/create-desktop-shortcut.bat",
    "database/schema.sql",
    "database/seed.sql",
    "database/diagnostics.sql",
    "src/server.js",
    "src/app.js",
    "public/app/",
    "public/app/.vite/manifest.json",
    "public/prototype/sto-nino-court-reservation-system-prototype.html",
    "data/mariadb-data/",
    "node_modules"
  ];
}

function createRuntimeRoot(files) {
  const root = mkdtempSync(path.join(tmpdir(), "barangay-runtime-package-"));

  for (const file of files) {
    const fullPath = path.join(root, file);
    if (file === "node_modules" || file.endsWith("/")) {
      mkdirSync(fullPath, { recursive: true });
    } else {
      mkdirSync(path.dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, "test");
    }
  }

  return root;
}
