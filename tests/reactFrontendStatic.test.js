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

test("responsive CSS includes narrow-width safeguards for the staff React shell", () => {
  const styles = readFileSync(path.join(projectRoot, "client", "src", "styles.css"), "utf8");

  assert.match(styles, /\.btn\s*\{[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.button-row \.btn,[\s\S]*\.button-row a\.btn\s*\{[^}]*min-width:\s*0/s);
  assert.match(styles, /\.topbar-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /@media \(max-width:\s*820px\)[\s\S]*\.sidebar\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /\.calendar-toolbar\s*\{[^}]*min-width:\s*0/s);
  assert.match(styles, /@media \(max-width:\s*1240px\)[\s\S]*\.staff-week-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /@media \(max-width:\s*560px\)[\s\S]*\.staff-week-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(styles, /\.filter-tab\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /@media \(max-width:\s*560px\)[\s\S]*\.data-table,[\s\S]*\.admin-table,[\s\S]*\.logs-table\s*\{[^}]*min-width:\s*680px/s);
  assert.match(styles, /@media \(max-width:\s*560px\)[\s\S]*\.reservation-drawer,[\s\S]*\.dialog\s*\{[^}]*max-height:\s*calc\(100vh - 20px\)/s);
});

test("UI smoke verification targets the React staff surface and preserves prototype reference checks", () => {
  const smokeScript = readFileSync(path.join(projectRoot, "scripts", "verify-ui-smoke.mjs"), "utf8");

  assert.match(smokeScript, /path:\s*"\/prototype",\s*expectedText:\s*"\/js\/prototype-backend\.js"/);
  assert.match(smokeScript, /path:\s*"\/api\/prototype\/session"/);
  assert.doesNotMatch(smokeScript, /path:\s*"\/account\/create"/);
  assert.doesNotMatch(smokeScript, /expectedText:\s*"Create Account"/);
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
  assert.match(logsPage, /<select[^>]+value=\{filters\.action\}/);
  assert.match(logsPage, /"CREATE_RESERVATION"/);
  assert.match(logsPage, /"UPDATE_RESERVATION"/);
  assert.match(logsPage, /"MARK_MISSED"/);
  assert.match(logsPage, /"MARK_CANCELLED"/);
  assert.match(logsPage, /"MARK_COMPLETED"/);
  assert.match(logsPage, /"CREATE_ACCOUNT"/);
  assert.match(logsPage, /"ACTIVATE_ACCOUNT"/);
  assert.match(logsPage, /"DEACTIVATE_ACCOUNT"/);
  assert.match(logsPage, /"CHANGE_PASSWORD"/);
  assert.doesNotMatch(logsPage, /\bCANCEL_RESERVATION\b/);
  assert.doesNotMatch(logsPage, /\bCOMPLETE_RESERVATION\b/);
  assert.doesNotMatch(logsPage, /\bUPDATE_ACCOUNT_STATUS\b/);

  assert.match(accountsPage, /apiRequest\("\/api\/accounts"\)/);
  assert.match(accountsPage, /apiRequest\(`\/api\/accounts\/\$\{account\.userId\}\/status`/);
  assert.match(accountsPage, /Current account/);
  assert.match(accountsPage, /isAdmin/);

  assert.doesNotMatch(combined, /\bPENDING\b|\bAPPROVED\b|\bDECLINED\b/);
  assert.doesNotMatch(combined, /mock trend|sample chart|pending approval/i);
});

test("account password route uses a dedicated React page and JSON account API", () => {
  const app = readFileSync(path.join(projectRoot, "client", "src", "App.jsx"), "utf8");
  const shell = readFileSync(path.join(projectRoot, "client", "src", "components", "AppShell.jsx"), "utf8");
  const icon = readFileSync(path.join(projectRoot, "client", "src", "components", "Icon.jsx"), "utf8");
  const passwordPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "AccountPasswordPage.jsx"), "utf8");

  assert.match(app, /import \{ AccountPasswordPage \} from "\.\/pages\/AccountPasswordPage\.jsx"/);
  assert.match(app, /if \(path === "\/account\/password"\) return <AccountPasswordPage user=\{user\} \/>;/);
  assert.match(app, /if \(path\.startsWith\("\/account"\)\) return <AccountsPage user=\{user\} \/>;/);
  assert.ok(app.indexOf('path === "/account/password"') < app.indexOf('path.startsWith("/account")'));

  assert.match(shell, /\{ path: "\/account\/password", label: "Password", helper: "Change login", icon: "lock" \}/);
  assert.match(icon, /lock:\s*\(/);

  assert.match(passwordPage, /apiRequest\("\/api\/account\/password"/);
  assert.match(passwordPage, /currentPassword/);
  assert.match(passwordPage, /newPassword/);
  assert.match(passwordPage, /confirmPassword/);
  assert.match(passwordPage, /Password updated/);
  assert.match(passwordPage, /fieldErrors\.currentPassword/);
  assert.match(passwordPage, /fieldErrors\.newPassword/);
  assert.match(passwordPage, /fieldErrors\.confirmPassword/);
  assert.doesNotMatch(passwordPage, /apiRequest\("\/api\/accounts"\)/);
  assert.doesNotMatch(passwordPage, /\bPENDING\b|\bAPPROVED\b|\bDECLINED\b/);
});

test("reservation form fields declare autocomplete behavior for browser form checks", () => {
  const formPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationFormPage.jsx"), "utf8");

  assert.match(formPage, /autoComplete="name"/);
  assert.match(formPage, /autoComplete="tel"/);
  assert.match(formPage, /autoComplete="street-address"/);
  assert.match(formPage, /autoComplete="off"/);
});

test("account creation fields declare autocomplete behavior for browser form checks", () => {
  const accountsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "AccountsPage.jsx"), "utf8");

  assert.match(accountsPage, /name="fullName"[\s\S]*autoComplete="name"/);
  assert.match(accountsPage, /name="username"[\s\S]*autoComplete="username"/);
  assert.match(accountsPage, /name="password"[\s\S]*autoComplete="new-password"/);
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
