import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { analyzeRuntimePackage } from "./verify-runtime-package.mjs";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REQUIRED_BUNDLE_ITEMS = [
  { path: "node_modules", type: "directory" },
  { path: "package.json", type: "file" },
  { path: "package-lock.json", type: "file" },
  { path: ".env.example", type: "file" },
  { path: "START-HERE.bat", type: "file" },
  { path: "STAFF-DAILY-USE.txt", type: "file" },
  { path: "DEPLOYMENT_READINESS_REPORT.md", type: "file" },
  { path: "README.md", type: "file" },
  { path: "README-FIRST-WINDOWS.txt", type: "file" },
  { path: "TROUBLESHOOT-WINDOWS.txt", type: "file" },
  { path: "maintenance-tools/backup-database.bat", type: "file" },
  { path: "maintenance-tools/restore-database.bat", type: "file" },
  { path: "maintenance-tools/create-desktop-shortcut.bat", type: "file" },
  { path: "maintenance-tools/setup-database-only.bat", type: "file" },
  { path: "maintenance-tools/check-office-readiness.bat", type: "file" },
  { path: "maintenance-tools/load-runtime-env.bat", type: "file" },
  { path: "maintenance-tools/run-office-signoff.bat", type: "file" },
  { path: "maintenance-tools/setup-barangay-office.bat", type: "file" },
  { path: "start-barangay-office.bat", type: "file" },
  { path: "src/server.js", type: "file" },
  { path: "src/serverStartup.js", type: "file" },
  { path: "src/app.js", type: "file" },
  { path: "src/features/prototype/prototypeRoutes.js", type: "file" },
  { path: "src/features/prototype/prototypeApiRoutes.js", type: "file" },
  { path: "views/login.ejs", type: "file" },
  { path: "views/account/password.ejs", type: "file" },
  { path: "public/css/styles.css", type: "file" },
  { path: "public/js/prototype-backend.js", type: "file" },
  { path: "public/app", type: "directory" },
  { path: "public/app/.vite/manifest.json", type: "file" },
  { path: "public/prototype/sto-nino-court-reservation-system-prototype.html", type: "file" },
  { path: "public/vendor/html2canvas.min.js", type: "file" },
  { path: "public/vendor/jspdf.umd.min.js", type: "file" },
  { path: "database/schema.sql", type: "file" },
  { path: "database/seed.sql", type: "file" },
  { path: "database/diagnostics.sql", type: "file" },
  { path: "database/setup.sql", type: "file" },
  { path: "database/SQL_ONLY_SETUP.md", type: "file" },
  { path: "docs/USER_GUIDE.md", type: "file" },
  { path: "docs/DEPLOYMENT_GUIDE.md", type: "file" },
  { path: "docs/OFFLINE_INSTALL_CHECKLIST.md", type: "file" },
  { path: "scripts/check-runtime-database.mjs", type: "file" },
  { path: "scripts/ensure-local-database.ps1", type: "file" },
  { path: "scripts/print-office-url.mjs", type: "file" },
  { path: "scripts/verify-offline-runtime.mjs", type: "file" },
  { path: "scripts/check-office-readiness.ps1", type: "file" },
  { path: "scripts/create-desktop-shortcut.ps1", type: "file" },
  { path: "scripts/run-office-signoff.ps1", type: "file" },
  { path: "scripts/setup-barangay-office.ps1", type: "file" },
  { path: "scripts/verify-runtime-package.mjs", type: "file" },
  { path: "scripts/verify-mysql.mjs", type: "file" }
];

const FORBIDDEN_BUNDLE_ITEMS = [
  ".env",
  "backups",
  "reports"
];

export function analyzeOfflineBundle(bundleRoot, options = {}) {
  const mode = options.mode === "strict" ? "strict" : "candidate";
  const checks = [];

  checks.push({
    name: "bundle folder exists",
    ok: isDirectory(bundleRoot),
    detail: bundleRoot
  });

  checks.push({
    name: "bundle verification mode",
    ok: true,
    detail: mode === "strict"
      ? "strict one-stop offline package"
      : "deployment candidate"
  });

  for (const item of REQUIRED_BUNDLE_ITEMS) {
    const fullPath = path.join(bundleRoot, item.path);
    checks.push({
      name: `required ${item.type}: ${item.path}`,
      ok: item.type === "directory" ? isDirectory(fullPath) : isFile(fullPath),
      detail: item.type === "directory" ? "required offline folder" : "required offline file"
    });
  }

  for (const itemPath of FORBIDDEN_BUNDLE_ITEMS) {
    const fullPath = path.join(bundleRoot, itemPath);
    checks.push({
      name: `excluded local-only item: ${itemPath}`,
      ok: !existsSync(fullPath),
      detail: "offline bundle must not include local secrets, backup data, or sign-off reports"
    });
  }

  if (mode === "strict") {
    const runtimeReport = analyzeRuntimePackage(bundleRoot);
    for (const check of runtimeReport.checks) {
      checks.push({
        name: `strict one-stop runtime: ${check.name}`,
        ok: check.ok,
        detail: check.detail
      });
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    mode,
    checks
  };
}

export function formatOfflineBundleReport(report) {
  return report.checks
    .map((check) => `[${check.ok ? "OK" : "FAIL"}] ${check.name} - ${check.detail}`)
    .join("\n");
}

export async function verifyOfflineBundle(options = {}) {
  const output = options.output || console;
  const bundleRoot = options.bundleRoot ||
    path.join(PROJECT_ROOT, "dist", "barangay-court-scheduler-offline");
  const mode = options.mode || getModeFromArgv(process.argv.slice(2));
  const report = analyzeOfflineBundle(bundleRoot, { mode });

  output.log(formatOfflineBundleReport(report));

  if (!report.ok) {
    const message = mode === "strict"
      ? "Strict one-stop offline bundle verification failed. Add bundled runtime files and data\\mariadb-data, rerun npm run bundle:offline, then retry."
      : "Offline bundle verification failed. Run npm run bundle:offline, then retry.";
    throw new Error(message);
  }

  return report;
}

function getModeFromArgv(args) {
  return args.includes("--strict") || args.includes("--mode=strict") ? "strict" : "candidate";
}

function isDirectory(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isDirectory();
}

function isFile(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isFile();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyOfflineBundle().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
