import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REQUIRED_BUNDLE_ITEMS = [
  { path: "node_modules", type: "directory" },
  { path: "package.json", type: "file" },
  { path: "package-lock.json", type: "file" },
  { path: ".env.example", type: "file" },
  { path: "START-HERE.bat", type: "file" },
  { path: "README.md", type: "file" },
  { path: "README-FIRST-WINDOWS.txt", type: "file" },
  { path: "TROUBLESHOOT-WINDOWS.txt", type: "file" },
  { path: "backup-database.bat", type: "file" },
  { path: "create-desktop-shortcut.bat", type: "file" },
  { path: "setup-database-only.bat", type: "file" },
  { path: "check-office-readiness.bat", type: "file" },
  { path: "run-office-signoff.bat", type: "file" },
  { path: "setup-barangay-office.bat", type: "file" },
  { path: "start-barangay-office.bat", type: "file" },
  { path: "src/server.js", type: "file" },
  { path: "src/app.js", type: "file" },
  { path: "src/features/prototype/prototypeRoutes.js", type: "file" },
  { path: "src/features/prototype/prototypeApiRoutes.js", type: "file" },
  { path: "views/login.ejs", type: "file" },
  { path: "views/account/password.ejs", type: "file" },
  { path: "public/css/styles.css", type: "file" },
  { path: "public/js/prototype-backend.js", type: "file" },
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
  { path: "scripts/check-office-readiness.ps1", type: "file" },
  { path: "scripts/create-desktop-shortcut.ps1", type: "file" },
  { path: "scripts/run-office-signoff.ps1", type: "file" },
  { path: "scripts/setup-barangay-office.ps1", type: "file" },
  { path: "scripts/verify-mysql.mjs", type: "file" }
];

const FORBIDDEN_BUNDLE_ITEMS = [
  ".env",
  "backups",
  "reports"
];

export function analyzeOfflineBundle(bundleRoot) {
  const checks = [];

  checks.push({
    name: "bundle folder exists",
    ok: isDirectory(bundleRoot),
    detail: bundleRoot
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

  return {
    ok: checks.every((check) => check.ok),
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
  const report = analyzeOfflineBundle(bundleRoot);

  output.log(formatOfflineBundleReport(report));

  if (!report.ok) {
    throw new Error("Offline bundle verification failed. Run npm run bundle:offline, then retry.");
  }

  return report;
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
