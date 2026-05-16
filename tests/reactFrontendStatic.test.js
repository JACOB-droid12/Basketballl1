import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("React frontend source stays offline and avoids unsupported approval workflow copy", () => {
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx", ".css"]);
  const combined = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assertNoUnsupportedApprovalWorkflow(combined);
});

test("built React app references only local bundled assets", () => {
  const appDir = path.join(projectRoot, "public", "app");
  const builtFiles = collectFiles(appDir, [".html", ".js", ".css", ".json"]);
  const combined = builtFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.match(combined, /\/assets\/|assets\//);
  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assertNoUnsupportedApprovalWorkflow(combined);
});

test("reservation detail drawer suspends Escape close while the status dialog is open", () => {
  const reservationsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationsPage.jsx"), "utf8");
  const drawer = readFileSync(path.join(projectRoot, "client", "src", "components", "ReservationDetailDrawer.jsx"), "utf8");

  assert.match(reservationsPage, /suspendEscape=\{Boolean\(dialog\)\}/);
  assert.match(drawer, /suspendEscape\s*=\s*false/);
  assert.match(drawer, /suspendEscapeRef = useRef\(suspendEscape\)/);
  assert.match(drawer, /suspendEscapeRef\.current = suspendEscape/);
  assert.match(drawer, /event\.key === "Escape" && !suspendEscapeRef\.current/);
});

test("attention surface is backend-backed and uses only supported reservation statuses", () => {
  const reservationsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationsPage.jsx"), "utf8");

  assert.match(reservationsPage, /apiRequest\("\/api\/reservations"\)/);
  assert.match(reservationsPage, /const STATUS_OPTIONS = \["all", "attention", "RESERVED", "MISSED", "CANCELLED", "COMPLETED"\]/);
  assert.match(reservationsPage, /reservation\.statusCode === "MISSED" \|\| reservation\.statusCode === "CANCELLED"/);
  assert.match(reservationsPage, /reservation\.statusCode === "RESERVED" && reservation\.reservationDate === todayKey/);
  assert.doesNotMatch(reservationsPage, /\bPENDING\b|\bAPPROVED\b|\bDECLINED\b/);
  assert.doesNotMatch(reservationsPage, /active overlap|conflict state|pending approval/i);
});

test("attention date key uses Manila calendar date and refreshes after reloads", () => {
  const reservationsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationsPage.jsx"), "utf8");

  assert.match(reservationsPage, /useState\(getManilaDateKey\)/);
  assert.match(reservationsPage, /new Intl\.DateTimeFormat\("en-CA", \{\s*timeZone: "Asia\/Manila"/s);
  assert.match(reservationsPage, /formatToParts\(date\)/);
  assert.match(reservationsPage, /setTodayKey\(getManilaDateKey\(\)\)/);
  assert.doesNotMatch(reservationsPage, /date\.getFullYear\(\)|date\.getMonth\(\)|date\.getDate\(\)/);
});

test("reports logs and accounts replacement surfaces use backend APIs without mock workflows", () => {
  const reportsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReportsPage.jsx"), "utf8");
  const logsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ActivityLogsPage.jsx"), "utf8");
  const accountsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "AccountsPage.jsx"), "utf8");
  const combined = [reportsPage, logsPage, accountsPage].join("\n");

  assert.match(reportsPage, /apiRequest\("\/api\/reports"\)/);
  assert.match(reportsPage, /courtHoursBooked/);
  assert.match(reportsPage, /topRequesters/);
  assert.match(reportsPage, /code: "RESERVED"/);
  assert.match(reportsPage, /code: "MISSED"/);
  assert.match(reportsPage, /code: "COMPLETED"/);
  assert.match(reportsPage, /code: "CANCELLED"/);
  assert.match(reportsPage, /getSummaryCount\(summary, status\.code\)/);
  assert.match(reportsPage, /\$\{statusCode\.toLowerCase\(\)\}Count/);

  assert.match(logsPage, /apiRequest\(buildLogsPath\(appliedFilters\)\)/);
  assert.match(logsPage, /new URLSearchParams/);
  assert.match(logsPage, /<select value=\{filters\.action\}/);
  assert.match(logsPage, /"CREATE_RESERVATION"/);
  assert.match(logsPage, /"UPDATE_RESERVATION"/);
  assert.match(logsPage, /"MARK_MISSED"/);
  assert.match(logsPage, /"MARK_CANCELLED"/);
  assert.match(logsPage, /"MARK_COMPLETED"/);
  assert.doesNotMatch(logsPage, /\bCANCEL_RESERVATION\b/);
  assert.doesNotMatch(logsPage, /\bCOMPLETE_RESERVATION\b/);
  assert.doesNotMatch(logsPage, /\bCREATE_ACCOUNT\b/);
  assert.doesNotMatch(logsPage, /\bUPDATE_ACCOUNT_STATUS\b/);

  assert.match(accountsPage, /apiRequest\("\/api\/accounts"\)/);
  assert.match(accountsPage, /apiRequest\(`\/api\/accounts\/\$\{account\.userId\}\/status`/);
  assert.match(accountsPage, /Current account/);
  assert.match(accountsPage, /isAdmin/);

  assert.doesNotMatch(combined, /\bPENDING\b|\bAPPROVED\b|\bDECLINED\b/);
  assert.doesNotMatch(combined, /mock trend|sample chart|pending approval/i);
});

function assertNoUnsupportedApprovalWorkflow(source) {
  assert.doesNotMatch(source, /\bPENDING\b/);
  assert.doesNotMatch(source, /\b(?:APPROVED|DECLINED)\b/);
  assert.doesNotMatch(source, /pending approval/i);
  assert.doesNotMatch(source, /\bApprove\b/);
  assert.doesNotMatch(source, /\bDecline\b/);
}

function collectFiles(root, extensions) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(fullPath, extensions);
    }

    return extensions.includes(path.extname(entry.name)) ? [fullPath] : [];
  });
}
