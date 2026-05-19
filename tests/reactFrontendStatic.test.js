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
  assert.match(styles, /@media \(max-width:\s*820px\)[\s\S]*\.sidebar\s*\{[^}]*overflow-x:\s*visible/s);
  assert.match(styles, /@media \(max-width:\s*820px\)[\s\S]*\.nav-group\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
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

  // The reservations page still passes suspendEscape while a confirm
  // dialog is open on top of the drawer.
  assert.match(reservationsPage, /suspendEscape=\{Boolean\(dialog\)\}/);

  // The drawer now renders through the shared ModalShell and forwards
  // suspendEscape to the shell via the `busy` prop semantics (Req. 3.7,
  // 3.10). When `suspendEscape` is true the shell suppresses Escape
  // close and backdrop dismissal, preserving the original behavior
  // without the local focus-trap copy.
  assert.match(drawer, /import\s*\{[^}]*ModalShell[^}]*\}\s*from\s*["']\.\/ModalShell\.jsx["']/);
  assert.match(drawer, /suspendEscape\s*=\s*false/);
  assert.match(drawer, /shellBusy\s*=\s*Boolean\(suspendEscape\)/);
  assert.match(drawer, /<ModalShell[\s\S]*?busy=\{shellBusy\}/);
});

test("attention surface is backend-backed and uses only supported reservation statuses", () => {
  const reservationsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationsPage.jsx"), "utf8");

  assert.match(reservationsPage, /apiRequest\("\/api\/reservations"\)/);
  assert.match(reservationsPage, /const SCOPE_OPTIONS = \["all", "attention", "past"\]/);
  assert.match(reservationsPage, /value: "RESERVED"/);
  assert.match(reservationsPage, /value: "MISSED"/);
  assert.match(reservationsPage, /value: "CANCELLED"/);
  assert.match(reservationsPage, /value: "COMPLETED"/);
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

  assert.match(reportsPage, /apiRequest\(buildReportsPath\(range, customRange\)\)/);
  assert.match(reportsPage, /courtHoursBooked/);
  assert.match(reportsPage, /topRequesters/);
  assert.match(reportsPage, /code: "RESERVED"/);
  assert.match(reportsPage, /code: "MISSED"/);
  assert.match(reportsPage, /code: "COMPLETED"/);
  assert.match(reportsPage, /code: "CANCELLED"/);
  assert.match(reportsPage, /statusCounts/);

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

test("print routes expose recovery actions when print payloads fail to load", () => {
  const slipPage = readSourceFile("client/src/pages/ReservationSlipPrintPage.jsx");
  const dailyPrintPage = readSourceFile("client/src/pages/DailySchedulePrintPage.jsx");

  for (const source of [slipPage, dailyPrintPage]) {
    assert.match(source, /PrintErrorState/);
    assert.match(source, /Try again/);
    assert.match(source, /Back to/);
  }
});
test("account status changes require a confirmation dialog", () => {
  const accountsPage = readSourceFile("client/src/pages/AccountsPage.jsx");

  assert.match(accountsPage, /ConfirmDialog/);
  assert.match(accountsPage, /pendingStatusAccount/);
  assert.match(accountsPage, /Deactivate account\?/);
});

test("activity log presets send real Manila-local date ranges", () => {
  const activityLogs = readSourceFile("client/src/pages/ActivityLogsPage.jsx");

  assert.match(activityLogs, /getManilaDateRange\("week"\)/);
  assert.match(activityLogs, /from:\s*range\.from/);
  assert.match(activityLogs, /to:\s*range\.to/);
  assert.doesNotMatch(activityLogs, /toISOString\(\)\.slice\(0,\s*10\)/);
});

test("reports presets use shared Manila-local date ranges", () => {
  const reportsPage = readSourceFile("client/src/pages/ReportsPage.jsx");

  assert.match(reportsPage, /getManilaDateRange/);
  assert.doesNotMatch(reportsPage, /getUTCDay\(/);
  assert.doesNotMatch(reportsPage, /toISOString\(\)\.slice\(0,\s*10\)/);
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

test("reservation contact-number browser pattern is valid in current Chromium", () => {
  const formPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationFormPage.jsx"), "utf8");
  const match = formPage.match(/const CONTACT_NUMBER_PATTERN = String\.raw`([^`]+)`;/);

  assert.ok(match, "ReservationFormPage should keep the phone pattern in a named constant");

  const contactNumberPattern = new RegExp(`^(?:${match[1]})$`, "v");

  assert.match("09171234567", contactNumberPattern);
  assert.match("+63 917-123-4567", contactNumberPattern);
  assert.doesNotMatch("<script>alert(1)</script>", contactNumberPattern);
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


// ---------------------------------------------------------------------------
// Post-deployment frontend feature: static-source assertions.
//
// These tests pin the new source files under `client/src/` (helpers,
// components, pages) and the built bundle under `public/app/` to the
// contract defined by the `post-deployment-frontend` spec.
//
// Requirements covered: 1.1, 6.1-6.7, 10.1, 13.9, 13.11, 14.1-14.4,
// 15.1-15.3, 19.1-19.3, 20.1.1, 20.1.6, 20.1.9, 20.1.16, 20.1.17,
// 20.2, 20.3.
// ---------------------------------------------------------------------------

const STATUS_CODES = [
  "AVAILABLE",
  "RESERVED",
  "MISSED",
  "CANCELLED",
  "COMPLETED",
  "MAINTENANCE",
  "BARANGAY_EVENT",
  "CLEARED_PUBLIC_USE"
];

const CSV_ENDPOINTS = [
  "daily-schedule",
  "weekly-schedule",
  "monthly-reservations",
  "activity-logs",
  "missed-reservations",
  "cancelled-reservations",
  "reports"
];

test("post-deployment helper modules expose the required exports, endpoints, and status codes", () => {
  const referenceNo = readSourceFile("client/src/api/referenceNo.js");
  const statusDisplay = readSourceFile("client/src/api/statusDisplay.js");
  const csvExport = readSourceFile("client/src/api/csvExport.js");

  // referenceNo helper: both exported functions plus the documented
  // placeholder for missing values (Req. 1.1, 1.4, 20.1.1).
  assert.match(referenceNo, /export function formatReferenceNo\s*\(/);
  assert.match(referenceNo, /export function matchesReferenceNo\s*\(/);
  assert.match(referenceNo, /No reference number/);

  // statusDisplay helper: every backend status code listed in Req. 10.1
  // is present so the calendar mapping never falls back to "unknown"
  // for a known status (Req. 10.1, 10.2, 20.1.6).
  assert.match(statusDisplay, /export function getStatusDisplay\s*\(/);
  for (const code of STATUS_CODES) {
    const pattern = new RegExp(`\\b${code}\\b`);
    assert.match(statusDisplay, pattern);
  }

  // csvExport helper: every CSV endpoint in Req. 6.1 is listed and the
  // builder returns `/api/exports/{endpoint}.csv` paths (Req. 6.1, 15.1,
  // 20.1.9). PDF/XLSX/JSON variants are intentionally absent.
  assert.match(csvExport, /export function buildCsvExportUrl\s*\(/);
  assert.match(csvExport, /\/api\/exports\/\$\{endpoint\}\.csv/);
  for (const endpoint of CSV_ENDPOINTS) {
    const pattern = new RegExp(`"${endpoint.replace(/-/g, "\\-")}"`);
    assert.match(csvExport, pattern);
  }
  assert.doesNotMatch(csvExport, /\.pdf|\.xlsx|\.json/i);
});

test("referenceNo is surfaced on every reservation rendering surface", () => {
  const surfaces = [
    "client/src/pages/ReservationsPage.jsx",
    "client/src/components/calendar/CalendarDayColumn.jsx",
    "client/src/components/calendar/CalendarDayDrawer.jsx",
    "client/src/components/ReservationDetailDrawer.jsx",
    "client/src/pages/ReservationFormPage.jsx",
    "client/src/pages/ActivityLogsPage.jsx",
    "client/src/components/ReservationSlipPrintView.jsx",
    "client/src/components/DailySchedulePrintView.jsx"
  ];

  for (const relativePath of surfaces) {
    const source = readSourceFile(relativePath);
    assert.match(
      source,
      /import\s*\{[^}]*formatReferenceNo[^}]*\}\s*from\s*["'][^"']*referenceNo\.js["']/,
      `${relativePath} should import formatReferenceNo from the referenceNo helper`
    );
    assert.match(
      source,
      /formatReferenceNo\s*\(/,
      `${relativePath} should render referenceNo through formatReferenceNo`
    );
  }

  // The reservation list filter must also accept a referenceNo substring
  // (Req. 1.3) so the search box matches the backend identifier.
  const reservationsPage = readSourceFile("client/src/pages/ReservationsPage.jsx");
  assert.match(reservationsPage, /matchesReferenceNo\s*\(/);

  // Saved-confirmation surface, slip print view, daily schedule view,
  // and reservation drawer surface a labelled reference number line so
  // staff can read it back to the resident verbatim (Req. 1.1, 20.1.1).
  const slipView = readSourceFile("client/src/components/ReservationSlipPrintView.jsx");
  assert.match(slipView, /Reference number/);
  assert.match(slipView, /slip\.referenceNo/);

  const drawer = readSourceFile("client/src/components/ReservationDetailDrawer.jsx");
  assert.match(drawer, /Reference number/);
  assert.match(drawer, /reservation\.referenceNo/);

  const formPage = readSourceFile("client/src/pages/ReservationFormPage.jsx");
  assert.match(formPage, /Reference number/);
  assert.match(formPage, /reservation\s*&&\s*reservation\.referenceNo/);

  const dailyPrint = readSourceFile("client/src/components/DailySchedulePrintView.jsx");
  assert.match(dailyPrint, /reservation\.referenceNo/);

  const calendarDayColumn = readSourceFile("client/src/components/calendar/CalendarDayColumn.jsx");
  const calendarDayDrawer = readSourceFile("client/src/components/calendar/CalendarDayDrawer.jsx");
  assert.match(calendarDayColumn, /reservation\.referenceNo/);
  assert.match(calendarDayDrawer, /reservation\.referenceNo/);

  // Activity log details surface the linked reservation's reference (Req. 1.1).
  const activityLogs = readSourceFile("client/src/pages/ActivityLogsPage.jsx");
  assert.match(activityLogs, /Reservation reference:\s*\$\{?formatReferenceNo|Reservation reference:\s*\{?\s*formatReferenceNo|Reservation reference:/);
  assert.match(activityLogs, /log\.referenceNo/);
});

test("calendar status mapping renders every backend status code with a text label", () => {
  const dayColumn = readSourceFile("client/src/components/calendar/CalendarDayColumn.jsx");
  const dayDrawer = readSourceFile("client/src/components/calendar/CalendarDayDrawer.jsx");
  const legend = readSourceFile("client/src/components/calendar/CalendarLegend.jsx");
  const statusDisplay = readSourceFile("client/src/api/statusDisplay.js");

  // Every status code must appear in the helper map (Req. 10.1, 20.1.6).
  for (const code of STATUS_CODES) {
    assert.match(
      statusDisplay,
      new RegExp(`\\b${code}\\b`),
      `statusDisplay.js must list ${code}`
    );
  }

  // The calendar page must consume `getStatusDisplay` for both cell
  // rendering and the legend so status is conveyed by both label and
  // class (Req. 10.2, 10.4, 10.5).
  assert.match(
    dayColumn,
    /import\s*\{[^}]*getStatusDisplay[^}]*\}\s*from\s*["'][^"']*statusDisplay\.js["']/
  );
  assert.match(dayColumn, /getStatusDisplay\s*\(/);
  assert.match(dayDrawer, /getStatusDisplay\s*\(/);

  // The legend lists every status the backend may return for the
  // current week, including the new MAINTENANCE, BARANGAY_EVENT, and
  // CLEARED_PUBLIC_USE codes (Req. 10.4).
  for (const code of STATUS_CODES) {
    assert.match(
      legend,
      new RegExp(`code:\\s*"${code}"`),
      `Calendar legend must include ${code}`
    );
  }
});

test("CsvExportButton consumers reference the correct CSV endpoint and avoid PDF/XLSX/JSON exports", () => {
  const reportsPage = readSourceFile("client/src/pages/ReportsPage.jsx");
  const activityLogs = readSourceFile("client/src/pages/ActivityLogsPage.jsx");
  const csvButton = readSourceFile("client/src/components/CsvExportButton.jsx");
  const csvExport = readSourceFile("client/src/api/csvExport.js");

  // Each consumer wires the button to the correct CSV endpoint name
  // (Req. 6.1, 6.2, 15.1, 15.2, 20.1.9).
  assert.match(reportsPage, /import\s*\{\s*CsvExportButton\s*\}\s*from\s*["'][^"']*CsvExportButton\.jsx["']/);
  assert.match(reportsPage, /<CsvExportButton[^>]*endpoint=["']reports["']/);
  assert.match(reportsPage, /label=["']Export CSV["']/);

  assert.match(activityLogs, /import\s*\{\s*CsvExportButton\s*\}\s*from\s*["'][^"']*CsvExportButton\.jsx["']/);
  assert.match(activityLogs, /<CsvExportButton[\s\S]*?endpoint=["']activity-logs["']/);
  assert.match(activityLogs, /label=["']Export CSV["']/);

  // Activity logs CSV exports include `action`, `date`, and `search`
  // filters when set (Req. 6.7).
  assert.match(activityLogs, /action:\s*appliedFilters\.action/);
  assert.match(activityLogs, /date:\s*appliedFilters\.date/);
  assert.match(activityLogs, /search:\s*appliedFilters\.search/);

  // The button itself surfaces a CSV-only label and never references
  // PDF, XLSX, or JSON variants (Req. 6.3, 15.1, 15.2, 15.3,
  // 20.1.17).
  assert.match(csvButton, /label\s*=\s*["']Export CSV["']/);
  assertNoNonCsvExportFormats(csvButton);
  assertNoNonCsvExportFormats(csvExport);
  assertNoNonCsvExportFormats(reportsPage);
  assertNoNonCsvExportFormats(activityLogs);

  // All seven CSV endpoints appear in the helper so an unknown endpoint
  // throws rather than silently building a bad URL (Req. 6.1, 15.1).
  for (const endpoint of CSV_ENDPOINTS) {
    assert.match(
      csvExport,
      new RegExp(`"${endpoint.replace(/-/g, "\\-")}"`),
      `csvExport.js must list the ${endpoint} endpoint`
    );
  }
});

test("no active recurring-reservation control is rendered under client/src/", () => {
  const reservationFormPage = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The recurring note was removed from the form UI because it
  // surfaced an unimplemented feature to staff (deployment polish).
  // Verify it is absent (Req. 14.2, 20.1.16 — hidden per deploy pass).
  assert.doesNotMatch(reservationFormPage, /Recurring reservations: not yet available/);

  // No recurring/recurrence form control, state hook, or recurring
  // backend route is wired anywhere (Req. 14.1, 14.3, 14.4, 20.1.16).
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx"]);

  for (const file of sourceFiles) {
    const raw = readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);

    // Form-input names tied to recurring-style controls.
    assert.doesNotMatch(
      raw,
      /name=["'](?:recurring|recurrence|repeat|series)[A-Za-z]*["']/i,
      `${relative} must not declare a recurring-reservation form control`
    );

    // Backend routes the spec defers (`/recurring`, `/recurrences`, etc.).
    assert.doesNotMatch(
      raw,
      /apiRequest\(\s*["`'][^"`']*\/(?:recurring|recurrence)/i,
      `${relative} must not call any recurring-reservation backend route`
    );

    // Identifier-level state hooks or props referencing a recurrence
    // schedule on the executable code (comments and the deferral note
    // are excluded by the strip helper).
    const codeOnly = stripJsCommentsAndStripStringContents(raw);
    assert.doesNotMatch(
      codeOnly,
      /\b(?:isRecurring|recurrenceRule|recurringSeries|recurrenceSchedule)\b/,
      `${relative} must not declare recurring-reservation identifiers`
    );
  }
});

test("no clearedDays / promptClearDay / clearDay state behavior is referenced in source", () => {
  // `clearedDays`, `promptClearDay`, and `clearDay` are deprecated
  // frontend-only helpers (Req. 13.9, 13.11, 20.1.16). The new
  // backend-driven Clear for Public Use modal must never reintroduce
  // them. Comments that explain the deprecation are stripped before the
  // check so the modal's own JSDoc documenting the avoidance does not
  // count as a code reference.
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx"]);
  for (const file of sourceFiles) {
    const codeOnly = stripJsCommentsAndStripStringContents(readFileSync(file, "utf8"));
    assert.doesNotMatch(
      codeOnly,
      /\bclearedDays\b/,
      `${path.relative(projectRoot, file)} must not reference the deprecated clearedDays state`
    );
    assert.doesNotMatch(
      codeOnly,
      /\bpromptClearDay\b/,
      `${path.relative(projectRoot, file)} must not call the deprecated promptClearDay helper`
    );
    assert.doesNotMatch(
      codeOnly,
      /\bclearDay\b/,
      `${path.relative(projectRoot, file)} must not call the deprecated clearDay helper`
    );
  }
});

test("post-deployment surfaces reference only locally bundled resources", () => {
  // Source files should never mount external CDNs, fonts, or hosts at
  // runtime (Req. 19.1, 19.2, 19.3). The strict `(?:src|href|url\()=`
  // pattern catches loaders without flagging legitimate font copyright
  // notices or SVG namespaces in data URIs.
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx", ".css"]);
  const sourceCombined = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(sourceCombined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(sourceCombined, /\bfetch\(["']https?:\/\//i);
  assert.doesNotMatch(sourceCombined, /import\s+[^;]+from\s+["']https?:\/\//i);
  assert.doesNotMatch(sourceCombined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com|jsdelivr\.net/i);

  // The built bundle under `public/app/` must reference only locally
  // bundled assets (Req. 19.2). Font copyright `.txt` files are
  // licence notices, not loaded by the app, so they're excluded.
  const builtFiles = collectFiles(path.join(projectRoot, "public", "app"), [".html", ".js", ".css", ".json"]);
  const builtCombined = builtFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(builtCombined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(builtCombined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com|jsdelivr\.net/i);
});

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

function assertNoNonCsvExportFormats(source) {
  // PDF, XLSX, and JSON export formats are intentionally absent from
  // every export-bearing surface (Req. 6.3, 15.1, 15.2, 15.3, 20.1.17).
  // String literals like `application/json` in `client.js` are
  // unrelated to export controls and live outside these surfaces.
  assert.doesNotMatch(source, /export[\s\S]{0,40}\bPDF\b/i);
  assert.doesNotMatch(source, /export[\s\S]{0,40}\bXLSX\b/i);
  assert.doesNotMatch(source, /export[\s\S]{0,40}\bExcel\b/i);
  assert.doesNotMatch(source, /\.pdf\b/i);
  assert.doesNotMatch(source, /\.xlsx\b/i);
  assert.doesNotMatch(source, /export\s*JSON|JSON\s*export/i);
}

function stripJsCommentsAndStripStringContents(source) {
  // Best-effort scrub of JS/JSX line comments, block comments, and
  // string/template literal contents so identifier-token assertions
  // run only against executable code. Strings are replaced with empty
  // quotes (rather than dropped entirely) so token boundaries around
  // them are preserved.
  let result = "";
  let index = 0;
  const length = source.length;

  while (index < length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      const newline = source.indexOf("\n", index);
      if (newline === -1) break;
      index = newline;
      continue;
    }

    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2);
      if (close === -1) break;
      index = close + 2;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let cursor = index + 1;
      while (cursor < length) {
        const inner = source[cursor];
        if (inner === "\\") {
          cursor += 2;
          continue;
        }
        if (inner === quote) {
          cursor += 1;
          break;
        }
        if (inner === "\n") {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      result += quote + quote;
      index = cursor;
      continue;
    }

    if (char === "`") {
      let cursor = index + 1;
      while (cursor < length) {
        const inner = source[cursor];
        if (inner === "\\") {
          cursor += 2;
          continue;
        }
        if (inner === "`") {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      result += "``";
      index = cursor;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}


// ---------------------------------------------------------------------------
// UI Audit Remediation feature: helper-module contracts.
//
// Pins the small shared helpers under `client/src/api/` that every
// audit-touched surface imports. The four assertions below match the
// task's behavioral contract: `formatBackendDateTime` preserves the
// Manila wall-clock the backend stored regardless of the test
// process's local timezone, `STATUS_LABELS.COMPLETED` reads as the
// single canonical "Completed" string, `formatTimeRangeFriendly`
// joins the bounds with the literal " to " separator the office
// prefers on non-print surfaces, and `OFFICIAL_HEADER.barangayName`
// carries the Barangay name every header-bearing surface reads from
// one place. No outbound network call is made.
//
// Requirements covered: 2.5, 16.1, 10.1, 18.1.
// ---------------------------------------------------------------------------

test("ui-audit helper modules expose the formatBackendDateTime, COMPLETED label, friendly time range, and official header contracts", async () => {
  // Force the test process to a non-Manila timezone before importing
  // the helpers so the formatter's Manila wall-clock guarantee is
  // exercised regardless of the developer's local environment
  // (Req. 2.5: "with the test environment configured to a non-Manila
  // timezone (for example UTC or America/Los_Angeles) to confirm no
  // offset is applied").
  process.env.TZ = "UTC";

  const mappersUrl = new URL("../client/src/api/mappers.js", import.meta.url);
  const officialHeaderUrl = new URL("../client/src/api/officialHeader.js", import.meta.url);
  const mappers = await import(mappersUrl);
  const officialHeader = await import(officialHeaderUrl);

  // Req. 2.5 (and Req. 2.1–2.3): a representative Manila value renders
  // the same wall-clock the backend stored, with no offset re-applied.
  // The literal `2026-05-18T17:31:00` value is the fixture named in
  // the requirements; the test passes when the rendered string
  // contains either the 12-hour `5:31 PM` form (used by the activity
  // logs page, accounts page, and slip print view) or the 24-hour
  // `17:31` form a future surface might adopt.
  assert.equal(
    typeof mappers.formatBackendDateTime,
    "function",
    "formatBackendDateTime must be exported from client/src/api/mappers.js"
  );
  const renderedTimestamp = mappers.formatBackendDateTime("2026-05-18T17:31:00");
  assert.equal(
    typeof renderedTimestamp,
    "string",
    `formatBackendDateTime should return a string; got ${typeof renderedTimestamp}`
  );
  assert.ok(
    renderedTimestamp.includes("5:31 PM") || renderedTimestamp.includes("17:31"),
    `formatBackendDateTime should preserve the Manila wall-clock 17:31 (5:31 PM) under TZ=UTC; got ${JSON.stringify(renderedTimestamp)}`
  );

  // Req. 16.1: every consumer that surfaces the COMPLETED status code
  // reads the single canonical "Completed" label so the UI never
  // shows two different words ("Done" vs "Completed") for the same
  // backend status.
  assert.equal(mappers.STATUS_LABELS.COMPLETED, "Completed");

  // Req. 10.1: the friendly time-range helper joins an `HH:MM` /
  // `HH:MM` backend pair with the literal " to " separator and the
  // 12-hour `AM`/`PM` suffix the office prefers on Reports tiles and
  // the "most-used time slot" surface.
  assert.equal(
    mappers.formatTimeRangeFriendly("09:00", "11:00"),
    "9:00 AM to 11:00 AM"
  );

  // Req. 18.1: the official header constant carries the Barangay name
  // every header-bearing surface (topbar, slip print, daily print)
  // reads from one place.
  assert.equal(officialHeader.OFFICIAL_HEADER.barangayName, "Barangay Sto. Niño");
});


// ---------------------------------------------------------------------------
// UI Audit Remediation feature (UI-AUD-017): override copy rewrite.
//
// Asserts that no source file under `client/src/` contains the
// case-insensitive string "save anyway". The audit replaced the
// legacy override label with "Save with policy override" plus a
// supporting description that names the policy being overridden and
// notes the action is recorded for administrator review (task 15.1).
// This static assertion locks the rewrite in place so the legacy
// wording cannot be reintroduced by accident in a later edit.
//
// Requirements covered: 15.4.
// ---------------------------------------------------------------------------

test("no source file under client/src/ contains the legacy 'save anyway' override copy", () => {
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx"]);

  for (const file of sourceFiles) {
    const raw = readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);
    assert.doesNotMatch(
      raw,
      /save anyway/i,
      `${relative} must not contain the legacy override label "save anyway" (Req. 15.4)`
    );
  }
});

// ---------------------------------------------------------------------------
// UI Audit Remediation feature: tab/menu role removal contract.
//
// Pins three pages — Reports, Reservation History, and Calendar — to
// a literal-string contract: none of `role="tab"`, `role="tablist"`,
// `role="menu"`, or `role="menuitem"` appears anywhere in the source.
// The audited surfaces are reachable by Tab/Shift+Tab over plain
// `<button>` elements, with `aria-pressed` for selected-state where
// needed. ARIA composite-widget roles imply roving-tabindex semantics
// that we do not implement, so removing the roles aligns the rendered
// markup with the keyboard behavior staff actually experiences.
//
// Requirements covered: 8.7, 8.8.
// ---------------------------------------------------------------------------

test("Reports / Reservation History / Calendar pages render no ARIA tab or menu roles", () => {
  const ARIA_ROLE_LITERALS = [
    'role="tab"',
    'role="tablist"',
    'role="menu"',
    'role="menuitem"'
  ];

  const auditedPages = [
    "client/src/pages/ReportsPage.jsx",
    "client/src/pages/ReservationHistoryPage.jsx",
    "client/src/pages/CalendarPage.jsx"
  ];

  for (const relativePath of auditedPages) {
    const source = readSourceFile(relativePath);
    for (const literal of ARIA_ROLE_LITERALS) {
      assert.ok(
        !source.includes(literal),
        `${relativePath} must not contain the literal string ${literal}`
      );
    }
  }
});


// ---------------------------------------------------------------------------
// UI Audit Remediation feature (UI-AUD-018): Done/Completed normalization.
//
// Pins the canonical COMPLETED label to a single string ("Completed") and
// asserts that the legacy `"Done"` token never reappears as the visible
// label for the COMPLETED status anywhere under `client/src/`. The audit
// found two competing labels — `"Done"` and `"Completed"` — for the same
// backend status code, which made the reservation list, detail drawer,
// calendar legend, reports, and history surfaces read inconsistently.
// Task 1.2 set `STATUS_LABELS.COMPLETED` to `"Completed"`; task 16.1 swept
// the remaining hardcoded `"Done"` strings; this static assertion locks
// the contract so a later edit cannot reintroduce the legacy wording by
// accident.
//
// Three checks run together:
//   1. `STATUS_LABELS.COMPLETED` resolves to the literal string `"Completed"`
//      so every consumer that reads the canonical map gets one value.
//   2. The JSX text-node form `">Done<"` (case-sensitive, exactly as it
//      would appear in a `<button>Done</button>` or `<span>Done</span>`
//      render) is absent from every source file under `client/src/`. The
//      `>...<` framing avoids false positives from English commentary or
//      from the `MARK_COMPLETED: "Marked the booking done"` past-tense
//      activity-log copy, which is unrelated to the status label.
//   3. No obvious `STATUS_LABELS.COMPLETED === "Done"` equality check, no
//      `{ value: "COMPLETED", label: "Done" }` filter-option entry, and
//      no `{ code: "COMPLETED", label: "Done" }` reports/calendar entry
//      survives in any source file. These three patterns are the exact
//      shapes the audit sweep replaced; pinning them prevents a regression
//      slipping in via copy-paste.
//
// Requirements covered: 16.1, 16.2, 16.4.
// ---------------------------------------------------------------------------

test("STATUS_LABELS.COMPLETED is 'Completed' and no source file under client/src/ exposes a legacy 'Done' label for the COMPLETED status", async () => {
  const mappersUrl = new URL("../client/src/api/mappers.js", import.meta.url);
  const { STATUS_LABELS } = await import(mappersUrl);

  // Req. 16.1 / 16.4: the canonical COMPLETED label resolves to a
  // single "Completed" string, the same value `statusDisplay.js` falls
  // back to when the backend does not return a `statusName` of its own.
  assert.equal(
    STATUS_LABELS.COMPLETED,
    "Completed",
    "STATUS_LABELS.COMPLETED must read 'Completed' so every consumer renders one canonical label for the COMPLETED status (Req. 16.1, 16.4)"
  );

  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx"]);

  for (const file of sourceFiles) {
    const raw = readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);

    // Req. 16.2 / tasks.md 16.2: the JSX text-node form `>Done<` (the
    // shape of a rendered status label like `<span>Done</span>`) must
    // not appear in any source file. The strict `>...<` framing avoids
    // false positives from comments such as
    // `// shows two different words ("Done" vs "Completed")` and from
    // unrelated past-tense copy.
    assert.ok(
      !raw.includes(">Done<"),
      `${relative} must not render the JSX text node ">Done<" for the COMPLETED status (Req. 16.2)`
    );

    // Req. 16.1 / 16.2: the three concrete shapes the audit sweep
    // replaced. Each one would assign or compare the COMPLETED status
    // to the legacy `"Done"` label; none of them is acceptable.
    assert.doesNotMatch(
      raw,
      /STATUS_LABELS\s*\.\s*COMPLETED\s*===?\s*["']Done["']/,
      `${relative} must not compare STATUS_LABELS.COMPLETED to the legacy "Done" string (Req. 16.1)`
    );
    assert.doesNotMatch(
      raw,
      /value\s*:\s*["']COMPLETED["'][^}]{0,160}label\s*:\s*["']Done["']/s,
      `${relative} must not pair { value: "COMPLETED", label: "Done" } in a STATUS_FILTER_OPTIONS-style entry (Req. 16.1)`
    );
    assert.doesNotMatch(
      raw,
      /code\s*:\s*["']COMPLETED["'][^}]{0,160}(?:label|name)\s*:\s*["']Done["']/s,
      `${relative} must not pair { code: "COMPLETED", label/name: "Done" } in a reports/calendar entry (Req. 16.1)`
    );
  }
});

// ---------------------------------------------------------------------------
// UI Audit Remediation feature: official header single-source assertion.
//
// Pins task 18.3 of the ui-audit-remediation spec: the three official
// header strings — `Barangay Sto. Niño`, `Basketball Court`, and
// `Office Computer` — appear in exactly one source file under
// `client/src/`, namely `client/src/api/officialHeader.js`. Every
// header-bearing surface (the topbar in `AppShell`, the
// `ReservationSlipPrintView`, the `DailySchedulePrintView`, the
// `ReportsPage` print header, and the `LoginPage` mark) reads the
// strings through the shared `OFFICIAL_HEADER` constant rather than
// hard-coding them locally, so the office never sees a mismatched
// permit header.
//
// Requirements covered: 18.1, 18.3, 18.4.
// ---------------------------------------------------------------------------

test("official header strings are sourced only from client/src/api/officialHeader.js", () => {
  const FORBIDDEN_LITERALS = ["Barangay Sto. Niño", "Basketball Court", "Office Computer"];
  const allowedRelativePath = path.join("client", "src", "api", "officialHeader.js");
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx"]);

  for (const file of sourceFiles) {
    const relative = path.relative(projectRoot, file);
    if (relative === allowedRelativePath) continue;
    const raw = readFileSync(file, "utf8");
    for (const literal of FORBIDDEN_LITERALS) {
      assert.equal(
        raw.includes(literal),
        false,
        `${relative} must not contain the literal "${literal}" — read it from OFFICIAL_HEADER instead`
      );
    }
  }
});


// ---------------------------------------------------------------------------
// UI Audit Remediation feature: deterministic correctness-property checks.
//
// Adds the property-validating assertions from the design's
// "Correctness Properties" section that are deterministic
// input/output checks on existing helpers. No `fast-check` /
// Hypothesis-style generators are used; the design intentionally
// rejects generative property-based tests for this feature because
// the surface is layout, copy, accessibility, and a few helpers with
// no meaningful generative-input space (mirroring the
// post-deployment-frontend feature's static-source approach).
//
// Properties covered (verbatim from `design.md` § Correctness Properties):
//   - Property  1 — Manila timestamp invariance under host timezone.
//   - Property 11 — Block-type fallback totality (the seven humanized
//                   block labels in `DailySchedulePrintView`).
//   - Property 13 — Status label uniqueness for COMPLETED.
//   - Property 14 — Header byte-for-byte consistency
//                   (`OFFICIAL_HEADER.barangayName`, `courtName`,
//                   `subtitle`).
//   - Property  9 — Reports / History / Calendar role discipline (the
//                   absence of any `role="tab"`, `role="tablist"`,
//                   `role="menu"`, or `role="menuitem"` literal on the
//                   three audited surfaces). Asserted again here for
//                   the property-linkage record; the prior block in
//                   this file already pins the same contract and the
//                   duplicate-but-passing assertion is acceptable per
//                   the task's overlap note.
//
// **Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7,
//              23.1, 23.2**
// ---------------------------------------------------------------------------

test("ui-audit correctness properties: deterministic input/output checks on existing helpers and audited surfaces", async () => {
  // Force the test process to a non-Manila timezone before importing
  // the helpers so Property 1 (Manila timestamp invariance under host
  // timezone) is exercised regardless of the developer's local
  // environment. The design pins the invariant: for every backend
  // Manila wall-clock value `v` and every host timezone `Z`,
  // `formatBackendDateTime(v)` produces the same wall-clock hour and
  // minute (Req. 2.1, 2.2, 2.5).
  process.env.TZ = "UTC";

  const mappersUrl = new URL("../client/src/api/mappers.js", import.meta.url);
  const officialHeaderUrl = new URL("../client/src/api/officialHeader.js", import.meta.url);
  const mappers = await import(mappersUrl);
  const officialHeader = await import(officialHeaderUrl);

  // -------------------------------------------------------------------
  // Property 1 — Manila timestamp invariance under host timezone.
  //
  // Assertion 1: `formatBackendDateTime("2026-05-18T17:31:00")` (the
  // local SQL/ISO form returned by the backend for a 17:31 Manila
  // wall-clock value) renders a string containing either the 12-hour
  // `5:31 PM` form (the form used by the activity logs page, accounts
  // page, and slip print view) or the matching 24-hour `17:31` form.
  // Under TZ=UTC the value must not be re-shifted by 8 hours; if the
  // helper called `new Date(value).toLocaleString()` the rendered
  // string would carry the UTC-shifted wall-clock instead.
  //
  // **Validates: Requirements 2.1, 2.2, 2.5**
  // -------------------------------------------------------------------
  assert.equal(
    typeof mappers.formatBackendDateTime,
    "function",
    "formatBackendDateTime must be exported from client/src/api/mappers.js"
  );
  const renderedTimestamp = mappers.formatBackendDateTime("2026-05-18T17:31:00");
  assert.equal(
    typeof renderedTimestamp,
    "string",
    `formatBackendDateTime should return a string; got ${typeof renderedTimestamp}`
  );
  assert.ok(
    renderedTimestamp.includes("5:31 PM") || renderedTimestamp.includes("17:31"),
    `formatBackendDateTime should preserve the Manila wall-clock 17:31 (5:31 PM) under TZ=UTC; got ${JSON.stringify(renderedTimestamp)}`
  );

  // Local-SQL form (`YYYY-MM-DD HH:MM:SS`) the backend emits for the
  // same Manila wall-clock value renders identically.
  const renderedSqlForm = mappers.formatBackendDateTime("2026-05-18 17:31:00");
  assert.equal(
    typeof renderedSqlForm,
    "string",
    `formatBackendDateTime should accept the local SQL form; got ${typeof renderedSqlForm}`
  );
  assert.ok(
    renderedSqlForm.includes("5:31 PM") || renderedSqlForm.includes("17:31"),
    `formatBackendDateTime should preserve 17:31 for the local SQL form under TZ=UTC; got ${JSON.stringify(renderedSqlForm)}`
  );

  // Missing or unparseable values render as the placeholder "—" instead
  // of throwing (Req. 2.4). Empty string, `null`, and `undefined` all
  // reduce to the same single-character placeholder so the table cell
  // never carries the literal text `"undefined"` or a thrown error.
  assert.equal(mappers.formatBackendDateTime(""), "—");
  assert.equal(mappers.formatBackendDateTime(null), "—");
  assert.equal(mappers.formatBackendDateTime(undefined), "—");

  // -------------------------------------------------------------------
  // Property 13 — Status label uniqueness for COMPLETED.
  //
  // The single canonical display label for `statusCode === "COMPLETED"`
  // is `"Completed"`. The helper module is the only place this string
  // is defined; reservation list, drawer, calendar legend, reports,
  // history, slip, daily print, and activity logs all read from this
  // constant. Pinning the constant here locks the canonical label.
  //
  // **Validates: Requirements 16.1, 16.2**
  // -------------------------------------------------------------------
  assert.equal(mappers.STATUS_LABELS.COMPLETED, "Completed");

  // -------------------------------------------------------------------
  // `formatTimeRangeFriendly` deterministic check (Req. 10.1).
  //
  // The Reports tile and any other non-print surface that emits a
  // friendly time range joins the `HH:MM` / `HH:MM` backend pair with
  // the literal " to " separator and the 12-hour `AM`/`PM` suffix the
  // office prefers. The slip print view continues to use the
  // en-dash-bearing `formatTimeRange`; this helper is the
  // friendly-on-screen variant.
  //
  // **Validates: Requirements 10.1**
  // -------------------------------------------------------------------
  assert.equal(
    mappers.formatTimeRangeFriendly("09:00", "11:00"),
    "9:00 AM to 11:00 AM"
  );

  // -------------------------------------------------------------------
  // Property 14 — Header byte-for-byte consistency.
  //
  // For each of `barangayName`, `courtName`, `subtitle`, the rendered
  // string in the staff console header (`AppShell`), the slip print
  // (`ReservationSlipPrintView`), and the daily print
  // (`DailySchedulePrintView`) is byte-for-byte equal to
  // `OFFICIAL_HEADER[<field>]`. Pinning the three constant values
  // here locks the source-of-truth strings.
  //
  // **Validates: Requirements 18.1, 18.2, 18.3**
  // -------------------------------------------------------------------
  assert.equal(officialHeader.OFFICIAL_HEADER.barangayName, "Barangay Sto. Niño");
  assert.equal(officialHeader.OFFICIAL_HEADER.courtName, "Basketball Court");
  assert.equal(officialHeader.OFFICIAL_HEADER.subtitle, "Office Computer");
  // The frozen constant cannot be mutated at runtime so a later edit
  // cannot silently swap in different official copy.
  assert.equal(Object.isFrozen(officialHeader.OFFICIAL_HEADER), true);

  // -------------------------------------------------------------------
  // Property 11 — Block-type fallback totality.
  //
  // The seven humanized block labels in `DailySchedulePrintView` are
  // the canonical Barangay vocabulary the printed daily schedule uses.
  // The map is a frozen module-local const (not exported) inside a
  // .jsx file, so the assertion reads the source text and pins each
  // entry verbatim. The `humanizeBlockType` fallback rules ("Blocked"
  // for empty, "Other" for unknown, never the raw uppercase enum)
  // are pinned by the source-text assertions below so the printed
  // schedule cannot regress to rendering `BARANGAY_EVENT` or
  // `undefined`.
  //
  // **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  // -------------------------------------------------------------------
  const dailyPrintSource = readSourceFile("client/src/components/DailySchedulePrintView.jsx");
  assert.match(dailyPrintSource, /const\s+BLOCK_TYPE_LABEL\s*=\s*Object\.freeze\(/);
  assert.match(dailyPrintSource, /CLEANING:\s*"Cleaning"/);
  assert.match(dailyPrintSource, /BARANGAY_EVENT:\s*"Barangay event"/);
  assert.match(dailyPrintSource, /REPAIRS:\s*"Repairs"/);
  assert.match(dailyPrintSource, /TOURNAMENT:\s*"Tournament"/);
  assert.match(dailyPrintSource, /MEETING:\s*"Meeting"/);
  assert.match(dailyPrintSource, /EMERGENCY_USE:\s*"Emergency use"/);
  assert.match(dailyPrintSource, /MAINTENANCE:\s*"Maintenance"/);
  // Empty-resolved value renders as "Blocked" (Req. 9.2).
  assert.match(dailyPrintSource, /return\s+"Blocked"/);
  // Unknown resolved value renders as "Other" (Req. 9.4).
  assert.match(dailyPrintSource, /return\s+label\s*\|\|\s*"Other"/);
  // The `resolveBlockType` helper reads `block.type` first and falls
  // back to `block.blockType` only when the primary is null/undefined/
  // empty (Req. 9.1).
  assert.match(dailyPrintSource, /function\s+resolveBlockType\s*\(\s*block\s*\)/);
  assert.match(dailyPrintSource, /const\s+primary\s*=\s*block\.type/);
  assert.match(dailyPrintSource, /const\s+fallback\s*=\s*block\.blockType/);

  // -------------------------------------------------------------------
  // Property 9 — Reports / History / Calendar role discipline.
  //
  // None of `role="tab"`, `role="tablist"`, `role="menu"`, or
  // `role="menuitem"` appears on the three audited surfaces. The
  // surfaces are reachable by Tab/Shift+Tab over plain `<button>`
  // elements with `aria-pressed` for selected-state. The literal
  // contract is also pinned by the prior tab/menu-role test in this
  // file; the duplicate assertion here records the property-linkage
  // explicitly and is intentionally redundant.
  //
  // **Validates: Requirements 8.7, 8.8**
  // -------------------------------------------------------------------
  const ARIA_ROLE_LITERALS = [
    'role="tab"',
    'role="tablist"',
    'role="menu"',
    'role="menuitem"'
  ];
  const auditedPages = [
    "client/src/pages/ReportsPage.jsx",
    "client/src/pages/ReservationHistoryPage.jsx",
    "client/src/pages/CalendarPage.jsx"
  ];
  for (const relativePath of auditedPages) {
    const source = readSourceFile(relativePath);
    for (const literal of ARIA_ROLE_LITERALS) {
      assert.ok(
        !source.includes(literal),
        `${relativePath} must not contain the literal string ${literal}`
      );
    }
  }
});
