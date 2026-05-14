import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REQUIRED_RUNTIME_ITEMS = [
  { path: "runtime/node/node.exe", type: "file", detail: "portable Node.js executable" },
  { path: "runtime/node/npm.cmd", type: "file", detail: "portable npm command" },
  { path: "runtime/mariadb/bin/mariadbd.exe", type: "file", detail: "portable MariaDB server" },
  { path: "runtime/mariadb/bin/mariadb-install-db.exe", type: "file", detail: "portable MariaDB initialization tool" },
  { path: "runtime/mariadb/bin/mysqldump.exe", type: "file", detail: "portable backup tool" }
];

const REQUIRED_APP_ITEMS = [
  { path: "package.json", type: "file", detail: "app manifest" },
  { path: "START-HERE.bat", type: "file", detail: "app file: START-HERE.bat first-time setup and Maintenance Tools launcher" },
  { path: "start-barangay-office.bat", type: "file", detail: "Barangay Court Scheduler daily launcher" },
  { path: "maintenance-tools/load-runtime-env.bat", type: "file", detail: "bundled runtime path loader" },
  { path: "maintenance-tools/create-desktop-shortcut.bat", type: "file", detail: "creates Barangay Court Scheduler and Maintenance Tools shortcuts" },
  { path: "database/schema.sql", type: "file", detail: "database schema file" },
  { path: "database/seed.sql", type: "file", detail: "database seed file" },
  { path: "database/diagnostics.sql", type: "file", detail: "database verification file" },
  { path: "src/server.js", type: "file", detail: "backend server entry point" },
  { path: "src/app.js", type: "file", detail: "backend app entry point" },
  { path: "public/app", type: "directory", detail: "built React staff console assets" },
  { path: "public/app/.vite/manifest.json", type: "file", detail: "React asset manifest" },
  { path: "public/prototype/sto-nino-court-reservation-system-prototype.html", type: "file", detail: "prototype frontend entry point" },
  { path: "data/mariadb-data", type: "directory", detail: "portable MariaDB data folder" }
];

export function analyzeRuntimePackage(projectRoot = PROJECT_ROOT) {
  const checks = [];

  for (const item of REQUIRED_RUNTIME_ITEMS) {
    checks.push(buildPathCheck(projectRoot, item));
  }

  checks.push(buildAlternativeCheck(projectRoot, {
    name: "runtime/mariadb/bin/mariadb.exe or runtime/mariadb/bin/mysql.exe",
    detail: "portable MariaDB-compatible client",
    alternatives: [
      { path: "runtime/mariadb/bin/mariadb.exe", type: "file" },
      { path: "runtime/mariadb/bin/mysql.exe", type: "file" }
    ]
  }));

  for (const item of REQUIRED_APP_ITEMS) {
    checks.push(buildPathCheck(projectRoot, item));
  }

  checks.push(buildAlternativeCheck(projectRoot, {
    name: "node_modules or built backend output",
    detail: "offline backend dependencies or compiled backend output",
    alternatives: [
      { path: "node_modules", type: "directory" },
      { path: "build/server.js", type: "file" },
      { path: "dist/server.js", type: "file" }
    ]
  }));

  return {
    ok: checks.every((check) => check.ok),
    mode: checks.every((check) => check.ok) ? "true one-stop offline package" : "deployment candidate only",
    checks
  };
}

export function formatRuntimePackageReport(report) {
  const checkLines = report.checks
    .map((check) => `[${check.ok ? "OK" : "FAIL"}] ${check.name} - ${check.detail}`)
    .join("\n");

  return `Package classification: ${report.mode}\n${checkLines}`;
}

export async function verifyRuntimePackage(options = {}) {
  const output = options.output || console;
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const report = analyzeRuntimePackage(projectRoot);

  output.log(formatRuntimePackageReport(report));

  if (!report.ok) {
    throw new Error("Runtime package verification failed. Add runtime\\node and runtime\\mariadb before creating a true one-stop offline package.");
  }

  return report;
}

function buildPathCheck(projectRoot, item) {
  const fullPath = path.join(projectRoot, item.path);

  return {
    name: item.path,
    ok: item.type === "directory" ? isDirectory(fullPath) : isFile(fullPath),
    detail: item.detail
  };
}

function buildAlternativeCheck(projectRoot, item) {
  const ok = item.alternatives.some((alternative) => {
    const fullPath = path.join(projectRoot, alternative.path);

    return alternative.type === "directory" ? isDirectory(fullPath) : isFile(fullPath);
  });

  return {
    name: item.name,
    ok,
    detail: item.detail
  };
}

function isFile(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isFile();
}

function isDirectory(fullPath) {
  return existsSync(fullPath) && statSync(fullPath).isDirectory();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyRuntimePackage().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
