import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeOfflineBundle,
  formatOfflineBundleReport
} from "../scripts/verify-offline-bundle.mjs";

test("offline bundle batch file invokes the PowerShell bundler", () => {
  const script = readFileSync("create-offline-bundle.bat", "utf8");

  assert.match(script, /scripts\\create-offline-bundle\.ps1/i);
  assert.match(script, /ExecutionPolicy Bypass/i);
});

test("offline bundle script copies runtime files and node_modules", () => {
  const script = readFileSync("scripts/create-offline-bundle.ps1", "utf8");

  assert.match(script, /barangay-court-scheduler-offline/);
  assert.match(script, /node_modules was not found/);
  assert.match(script, /START-HERE\.bat/);
  assert.match(script, /STAFF-DAILY-USE\.txt/);
  assert.match(script, /README-FIRST-WINDOWS\.txt/);
  assert.match(script, /TROUBLESHOOT-WINDOWS\.txt/);
  assert.match(script, /"maintenance-tools"/);
  assert.match(script, /"runtime"/);
  assert.match(script, /"installers"/);
  assert.match(script, /start-barangay-office\.bat/);
  assert.match(script, /"node_modules"/);
  assert.match(script, /"database"/);
  assert.match(script, /"src"/);
  assert.match(script, /"views"/);
  assert.match(script, /"public"/);
  assert.doesNotMatch(script, /\.env"/);
});

test("offline bundle script guards recursive deletion inside dist", () => {
  const script = readFileSync("scripts/create-offline-bundle.ps1", "utf8");

  assert.match(script, /Assert-ChildPath/);
  assert.match(script, /Remove-Item -LiteralPath \$BundleRoot -Recurse -Force/);
});

test("offline bundle verifier accepts a complete prepared bundle", () => {
  const bundleRoot = createTemporaryBundle();

  try {
    const report = analyzeOfflineBundle(bundleRoot);

    assert.equal(report.ok, true);
    assert.equal(report.mode, "candidate");
  } finally {
    rmSync(bundleRoot, { recursive: true, force: true });
  }
});

test("offline bundle verifier rejects strict one-stop mode when bundled runtime is missing", () => {
  const bundleRoot = createTemporaryBundle();

  try {
    const report = analyzeOfflineBundle(bundleRoot, { mode: "strict" });
    const formatted = formatOfflineBundleReport(report);

    assert.equal(report.ok, false);
    assert.equal(report.mode, "strict");
    assert.match(formatted, /bundle verification mode - strict one-stop offline package/);
    assert.match(formatted, /strict one-stop runtime: runtime\/node\/node\.exe/);
    assert.match(formatted, /strict one-stop runtime: runtime\/mariadb\/bin\/mariadbd\.exe/);
  } finally {
    rmSync(bundleRoot, { recursive: true, force: true });
  }
});

test("offline bundle verifier accepts strict one-stop mode with bundled runtime", () => {
  const bundleRoot = createTemporaryBundle({
    includeRuntime: true
  });

  try {
    const report = analyzeOfflineBundle(bundleRoot, { mode: "strict" });

    assert.equal(report.ok, true);
    assert.equal(report.mode, "strict");
  } finally {
    rmSync(bundleRoot, { recursive: true, force: true });
  }
});

test("offline bundle verifier rejects missing dependencies and copied local secrets", () => {
  const bundleRoot = createTemporaryBundle({
    omit: ["node_modules", "maintenance-tools/check-office-readiness.bat"],
    includeForbidden: [".env", "reports"]
  });

  try {
    const report = analyzeOfflineBundle(bundleRoot);
    const formatted = formatOfflineBundleReport(report);

    assert.equal(report.ok, false);
    assert.match(formatted, /\[FAIL\] required directory: node_modules/);
    assert.match(formatted, /\[FAIL\] required file: maintenance-tools[\\/]check-office-readiness\.bat/);
    assert.match(formatted, /\[FAIL\] excluded local-only item: \.env/);
    assert.match(formatted, /\[FAIL\] excluded local-only item: reports/);
  } finally {
    rmSync(bundleRoot, { recursive: true, force: true });
  }
});

function createTemporaryBundle(options = {}) {
  const bundleRoot = mkdtempSync(path.join(tmpdir(), "barangay-bundle-"));
  const omit = new Set(options.omit || []);
  const requiredItems = [
    "node_modules",
    "package.json",
    "package-lock.json",
    ".env.example",
    "START-HERE.bat",
    "STAFF-DAILY-USE.txt",
    "README.md",
    "README-FIRST-WINDOWS.txt",
    "TROUBLESHOOT-WINDOWS.txt",
    "maintenance-tools/backup-database.bat",
    "maintenance-tools/restore-database.bat",
    "maintenance-tools/create-desktop-shortcut.bat",
    "maintenance-tools/setup-database-only.bat",
    "maintenance-tools/check-office-readiness.bat",
    "maintenance-tools/run-office-signoff.bat",
    "maintenance-tools/setup-barangay-office.bat",
    "maintenance-tools/load-runtime-env.bat",
    "start-barangay-office.bat",
    "src/server.js",
    "src/serverStartup.js",
    "src/app.js",
    "src/features/prototype/prototypeRoutes.js",
    "src/features/prototype/prototypeApiRoutes.js",
    "views/login.ejs",
    "views/account/password.ejs",
    "public/css/styles.css",
    "public/js/prototype-backend.js",
    "public/prototype/sto-nino-court-reservation-system-prototype.html",
    "public/vendor/html2canvas.min.js",
    "public/vendor/jspdf.umd.min.js",
    "database/schema.sql",
    "database/seed.sql",
    "database/diagnostics.sql",
    "database/setup.sql",
    "database/SQL_ONLY_SETUP.md",
    "docs/USER_GUIDE.md",
    "docs/DEPLOYMENT_GUIDE.md",
    "docs/OFFLINE_INSTALL_CHECKLIST.md",
    "scripts/check-runtime-database.mjs",
    "scripts/ensure-local-database.ps1",
    "scripts/print-office-url.mjs",
    "scripts/verify-offline-runtime.mjs",
    "scripts/check-office-readiness.ps1",
    "scripts/create-desktop-shortcut.ps1",
    "scripts/run-office-signoff.ps1",
    "scripts/setup-barangay-office.ps1",
    "scripts/verify-runtime-package.mjs",
    "scripts/verify-mysql.mjs"
  ];

  if (options.includeRuntime) {
    requiredItems.push(
      "runtime/node/node.exe",
      "runtime/node/npm.cmd",
      "runtime/mariadb/bin/mariadbd.exe",
      "runtime/mariadb/bin/mariadb-install-db.exe",
      "runtime/mariadb/bin/mysql.exe",
      "runtime/mariadb/bin/mysqldump.exe",
      "data/mariadb-data/"
    );
  }

  for (const itemPath of requiredItems) {
    if (omit.has(itemPath)) {
      continue;
    }

    const fullPath = path.join(bundleRoot, itemPath);
    if (itemPath === "node_modules" || itemPath.endsWith("/")) {
      mkdirSync(fullPath, { recursive: true });
    } else {
      mkdirSync(path.dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, "test");
    }
  }

  for (const itemPath of options.includeForbidden || []) {
    const fullPath = path.join(bundleRoot, itemPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, "secret");
  }

  return bundleRoot;
}
