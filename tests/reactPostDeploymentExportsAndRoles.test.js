import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildCsvExportUrl, CSV_EXPORT_ENDPOINTS } from "../client/src/api/csvExport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for CSV exports, role gating, and error/empty states
// across the post-deployment frontend surfaces.
//
// Static-source assertion style per the project's testing strategy
// (Req. 20.3) — JSX cannot be loaded under `node --test` without a JSX
// runtime, so we verify wiring via source-level regex assertions and
// exercise the pure `buildCsvExportUrl` helper directly for URL
// correctness.
//
// Requirements covered: 6.1, 6.2, 6.3, 6.8, 6.9, 15.1, 15.2, 16.1,
// 17.1, 17.2, 17.4, 17.5, 17.6, 18.1, 20.3.
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

// ===========================================================================
// CSV EXPORT URL CORRECTNESS
// ===========================================================================

test("CsvExportButton produces the correct CSV endpoint URL for daily-schedule with date param", () => {
  const url = buildCsvExportUrl("daily-schedule", { date: "2026-05-18" });
  assert.equal(url, "/api/exports/daily-schedule.csv?date=2026-05-18");
});

test("CsvExportButton produces the correct CSV endpoint URL for weekly-schedule with week-anchor dates", () => {
  const url = buildCsvExportUrl("weekly-schedule", { from: "2026-05-12", to: "2026-05-18" });
  assert.equal(url, "/api/exports/weekly-schedule.csv?from=2026-05-12&to=2026-05-18");
});

test("CsvExportButton produces the correct CSV endpoint URL for monthly-reservations with month param", () => {
  const url = buildCsvExportUrl("monthly-reservations", { month: "2026-05" });
  assert.equal(url, "/api/exports/monthly-reservations.csv?month=2026-05");
});

test("CsvExportButton produces the correct CSV endpoint URL for activity-logs with action, date, and search params", () => {
  const url = buildCsvExportUrl("activity-logs", {
    action: "CREATE_RESERVATION",
    date: "2026-05-18",
    search: "Juan"
  });
  assert.equal(
    url,
    "/api/exports/activity-logs.csv?action=CREATE_RESERVATION&date=2026-05-18&search=Juan"
  );
});

test("CsvExportButton produces the correct CSV endpoint URL for activity-logs with from/to range instead of date", () => {
  const url = buildCsvExportUrl("activity-logs", {
    action: "",
    date: "",
    from: "2026-05-12",
    to: "2026-05-18",
    search: ""
  });
  // Empty values are omitted by buildCsvExportUrl
  assert.equal(url, "/api/exports/activity-logs.csv?from=2026-05-12&to=2026-05-18");
});

test("CsvExportButton produces the correct CSV endpoint URL for reports with from/to params", () => {
  const url = buildCsvExportUrl("reports", { from: "2026-05-01", to: "2026-05-31" });
  assert.equal(url, "/api/exports/reports.csv?from=2026-05-01&to=2026-05-31");
});

test("CsvExportButton produces the correct CSV endpoint URL for missed-reservations with date range", () => {
  const url = buildCsvExportUrl("missed-reservations", { from: "2026-05-01", to: "2026-05-31" });
  assert.equal(url, "/api/exports/missed-reservations.csv?from=2026-05-01&to=2026-05-31");
});

test("CsvExportButton produces the correct CSV endpoint URL for cancelled-reservations with date range", () => {
  const url = buildCsvExportUrl("cancelled-reservations", { from: "2026-05-01", to: "2026-05-31" });
  assert.equal(url, "/api/exports/cancelled-reservations.csv?from=2026-05-01&to=2026-05-31");
});

test("CsvExportButton omits null, undefined, and empty-string filter params from the URL", () => {
  const url = buildCsvExportUrl("activity-logs", {
    action: "MARK_MISSED",
    date: null,
    search: undefined,
    from: ""
  });
  assert.equal(url, "/api/exports/activity-logs.csv?action=MARK_MISSED");
});

test("CsvExportButton throws on unknown or non-CSV endpoint names", () => {
  assert.throws(() => buildCsvExportUrl("unknown-endpoint", {}), /Unknown CSV export endpoint/);
  assert.throws(() => buildCsvExportUrl("daily-schedule.pdf", {}), /Unknown CSV export endpoint/);
  assert.throws(() => buildCsvExportUrl("reports.xlsx", {}), /Unknown CSV export endpoint/);
});

// ---------------------------------------------------------------------------
// Verify that page components wire CsvExportButton with the correct
// endpoint and filter parameters from their current view state.
// ---------------------------------------------------------------------------

test("ReportsPage wires CsvExportButton with endpoint='reports' and the current from/to filter params", () => {
  const reports = readSourceFile("client/src/pages/ReportsPage.jsx");

  // Imports CsvExportButton
  assert.match(
    reports,
    /import\s*\{\s*CsvExportButton\s*\}\s*from\s*["'][^"']*CsvExportButton\.jsx["']/
  );

  // Mounts with endpoint="reports" and params={exportParams}
  assert.match(reports, /<CsvExportButton\s+endpoint="reports"\s+params=\{exportParams\}/);

  // exportParams is derived from the same range/customRange state that
  // drives the JSON fetch, so the CSV covers the same window
  assert.match(reports, /const exportParams = useMemo\(/);
  assert.match(reports, /buildReportsParams\(range, customRange\)/);
});

test("ActivityLogsPage wires CsvExportButton with endpoint='activity-logs' and the current action/date/search filter params", () => {
  const logs = readSourceFile("client/src/pages/ActivityLogsPage.jsx");

  // Imports CsvExportButton
  assert.match(
    logs,
    /import\s*\{\s*CsvExportButton\s*\}\s*from\s*["'][^"']*CsvExportButton\.jsx["']/
  );

  // Mounts with endpoint="activity-logs" and params={exportParams}
  assert.match(logs, /<CsvExportButton[\s\S]*?endpoint="activity-logs"[\s\S]*?params=\{exportParams\}/);

  // exportParams mirrors the applied filters: action, date, from, to, search
  assert.match(logs, /const exportParams = useMemo\(\(\) => \(\{/);
  assert.match(logs, /action:\s*appliedFilters\.action/);
  assert.match(logs, /date:\s*appliedFilters\.date/);
  assert.match(logs, /from:\s*appliedFilters\.from/);
  assert.match(logs, /to:\s*appliedFilters\.to/);
  assert.match(logs, /search:\s*appliedFilters\.search/);
});

// ===========================================================================
// ROLE GATING — ADMIN-ONLY ACTIONS HIDDEN FOR STAFF USERS
// ===========================================================================

test("CalendarPage admin-only actions (maintenance block, deactivate block, Clear for Public Use) are gated behind user.role === 'ADMIN'", () => {
  const calendar = readSourceFile("client/src/pages/CalendarPage.jsx");
  const toolbar = readSourceFile("client/src/components/calendar/CalendarWeekToolbar.jsx");
  const overflowMenu = readSourceFile("client/src/components/calendar/CalendarOverflowMenu.jsx");
  const dayColumn = readSourceFile("client/src/components/calendar/CalendarDayColumn.jsx");

  // The isAdmin flag is derived from the user role
  assert.match(calendar, /const isAdmin = Boolean\(user && user\.role === "ADMIN"\)/);

  // MaintenanceBlockModal and ClearPublicUseModal are rendered only when isAdmin
  assert.match(calendar, /\{isAdmin && \([\s\S]*?<MaintenanceBlockModal/);
  assert.match(calendar, /\{isAdmin && \([\s\S]*?<ClearPublicUseModal/);

  // The overflow menu passes isAdmin to gate the admin menu items
  assert.match(calendar, /<CalendarWeekToolbar[\s\S]*?isAdmin=\{isAdmin\}/);
  assert.match(toolbar, /<CalendarOverflowMenu[\s\S]*?isAdmin=\{isAdmin\}/);

  // Inside CalendarOverflowMenu, admin items are conditionally rendered
  assert.match(overflowMenu, /\{isAdmin && \([\s\S]*?Add maintenance block/);
  assert.match(overflowMenu, /\{isAdmin && \([\s\S]*?Clear for public use/);

  // The "Deactivate block" button inside ScheduleBlockEntry is gated by isAdmin
  assert.match(dayColumn, /const adminAction = isAdmin[\s\S]*?Deactivate block/);
});

test("CourtPolicyPage court policy editor save action is gated behind user.role === 'ADMIN'", () => {
  const form = readSourceFile("client/src/components/CourtPolicyForm.jsx");

  // isAdmin derived from user.role
  assert.match(form, /const isAdmin = user\?\.role === "ADMIN"/);

  // Save button only rendered for admin
  assert.match(form, /\{isAdmin && \(/);
  assert.match(form, /Save policy/);

  // Inputs are readOnly for non-admin
  assert.match(form, /readOnly=\{!isAdmin\}/);

  // Checkboxes are disabled for non-admin
  assert.match(form, /disabled=\{!isAdmin\}/);

  // Submit handler bails out for non-admin
  assert.match(form, /if \(!isAdmin \|\| saving\) return/);
});

test("AccountsPage is fully gated behind user.role === 'ADMIN' — staff see the access-denied message", () => {
  const accounts = readSourceFile("client/src/pages/AccountsPage.jsx");

  // isAdmin derived from user.role
  assert.match(accounts, /const isAdmin = user\?\.role === "ADMIN"/);

  // Non-admin early return renders the access-denied surface
  assert.match(accounts, /if \(!isAdmin\) \{[\s\S]*?return \(/);
  assert.match(accounts, /Admin access required/);
  assert.match(accounts, /Only administrator accounts can create staff users or change account status/);

  // The account creation form and account list are only rendered in the admin branch
  assert.match(accounts, /Create local login/);
  assert.match(accounts, /handleCreateAccount/);

  // The non-admin JSX return block (the one inside the component body,
  // not the useEffect) renders only the access-denied message — it does
  // NOT render the create form or account table. We extract the JSX
  // return specifically by matching the `if (!isAdmin) { return (<section`
  // pattern that gates the rendered output.
  const nonAdminJsx = accounts.match(/if \(!isAdmin\) \{\s*return \(\s*<section[\s\S]*?<\/section>\s*\);\s*\}/);
  assert.ok(nonAdminJsx, "Non-admin JSX return block must exist");
  assert.doesNotMatch(nonAdminJsx[0], /Create local login/);
  assert.doesNotMatch(nonAdminJsx[0], /<form/);
});

// ===========================================================================
// ERROR / EMPTY / OFFLINE STATES
// ===========================================================================

test("CsvExportButton renders the standard offline copy on network failure", () => {
  const button = readSourceFile("client/src/components/CsvExportButton.jsx");

  // Offline message matches Req. 17.1 standard copy
  assert.match(
    button,
    /The system is offline or the office network is down\. Try again once the network is back\./
  );

  // Network error detection
  assert.match(button, /isNetworkError\(requestError\)/);
  assert.match(button, /setError\(OFFLINE_MESSAGE\)/);

  // Error is rendered in an alert element with role="alert"
  assert.match(button, /role="alert".*\{error\}|<div className="alert error" role="alert">\{error\}/);
});

test("CsvExportButton renders backend error messages on 4xx/5xx without fabricated fallback data", () => {
  const button = readSourceFile("client/src/components/CsvExportButton.jsx");

  // Pre-flight check: on non-ok response, reads backend error message
  assert.match(button, /if \(!response\.ok\)/);
  assert.match(button, /readBackendErrorMessage\(response\)/);

  // Surfaces the server error prefix with the backend message
  assert.match(button, /CSV export could not be downloaded\./);
  assert.match(button, /suffixFromMessage\(backendMessage\)/);

  // Reads both `error` string and first `errors[]` entry from backend JSON
  assert.match(button, /data\.error/);
  assert.match(button, /firstValidationError\(data\.errors\)/);

  // No fabricated fallback data — the component only renders a button and
  // an error alert, never any CSV content or mock download
  assert.doesNotMatch(button, /fallback|mock|placeholder.*data|sample.*csv/i);
});

test("CalendarPage renders the standard offline copy on network failure and backend error on 4xx/5xx", () => {
  const calendar = readSourceFile("client/src/pages/CalendarPage.jsx");

  // Offline message constant
  assert.match(
    calendar,
    /const OFFLINE_MESSAGE =[\s\S]*?"The system is offline or the office network is down\. Try again once the network is back\."/
  );

  // Schedule error state renders in an alert
  assert.match(calendar, /state\.error \? \([\s\S]*?<div className="alert error" role="alert">\{state\.error\}/);

  // EmptyState for missing schedule data (no rows)
  assert.match(calendar, /rows\.length === 0 \? \([\s\S]*?<EmptyState/);
  assert.match(calendar, /No schedule slots found/);

  // No fabricated fallback data when backend errors
  assert.doesNotMatch(calendar, /fallbackSchedule|mockData|sampleReservation/i);
});

test("CalendarPage renders EmptyState for missing/malformed 2xx payloads without throwing", () => {
  const calendar = readSourceFile("client/src/pages/CalendarPage.jsx");

  // When data arrives but rows is empty, EmptyState is shown
  assert.match(calendar, /<EmptyState[\s\S]*?title="No schedule slots found"/);
  assert.match(calendar, /body="The calendar could not find active court hours for this week\."/);

  // Safe array extraction — never throws on malformed payload
  assert.match(calendar, /const rawDays = Array\.isArray\(state\.data\?\.days\) \? state\.data\.days : \[\]/);
  assert.match(calendar, /const rows = Array\.isArray\(state\.data\?\.rows\) \? state\.data\.rows : \[\]/);
});

test("CourtPolicyPage renders the standard offline copy on network failure", () => {
  const courtPolicy = readSourceFile("client/src/pages/CourtPolicyPage.jsx");

  // Offline message constant
  assert.match(
    courtPolicy,
    /const OFFLINE_MESSAGE =[\s\S]*?"The system is offline or the office network is down\. Try again once the network is back\."/
  );

  // Network error detection
  assert.match(courtPolicy, /isNetworkError\(error\)/);
  assert.match(courtPolicy, /OFFLINE_MESSAGE/);
});

test("CourtPolicyPage renders backend error messages on 4xx/5xx and EmptyState for missing policy", () => {
  const courtPolicy = readSourceFile("client/src/pages/CourtPolicyPage.jsx");

  // Error state renders the backend message in an alert
  assert.match(courtPolicy, /state\.error \? \([\s\S]*?<div className="alert error" role="alert">\{state\.error\}/);

  // EmptyState for null policy (malformed 2xx)
  assert.match(courtPolicy, /!state\.policy \? \([\s\S]*?<EmptyState/);
  assert.match(courtPolicy, /title="Data unavailable"/);
  assert.match(courtPolicy, /body="The court policy data could not be loaded\."/);

  // No fabricated fallback policy data
  assert.doesNotMatch(courtPolicy, /fallbackPolicy|mockPolicy|defaultPolicy\s*=/i);
});

test("AccountsPage renders backend error messages on 4xx/5xx and EmptyState for empty accounts", () => {
  const accounts = readSourceFile("client/src/pages/AccountsPage.jsx");

  // Error state renders the backend message in an alert
  assert.match(accounts, /state\.error && <div className="alert error" role="alert">\{state\.error\}/);

  // EmptyState for zero accounts
  assert.match(accounts, /<EmptyState\s+title="No accounts found"/);
  assert.match(accounts, /body="Create the first staff account for this local system\."/);

  // Safe array extraction — never throws on malformed payload
  assert.match(accounts, /Array\.isArray\(data\.accounts\) \? data\.accounts : \[\]/);

  // No fabricated fallback account data
  assert.doesNotMatch(accounts, /fallbackAccounts|mockAccounts|sampleAccount/i);
});

test("ActivityLogsPage renders backend error on 4xx/5xx and EmptyState for empty logs", () => {
  const logs = readSourceFile("client/src/pages/ActivityLogsPage.jsx");

  // Error state renders the backend message
  assert.match(logs, /state\.error && \([\s\S]*?<.*?role="alert"[\s\S]*?\{state\.error\}/);

  // EmptyState for zero logs (with and without filters)
  assert.match(logs, /<EmptyState[\s\S]*?title=\{hasFilters \? "No matching logs" : "No activity logs yet"\}/);

  // Safe array extraction — never throws on malformed payload
  assert.match(logs, /Array\.isArray\(data\.logs\) \? data\.logs : \[\]/);

  // No fabricated fallback log data
  assert.doesNotMatch(logs, /fallbackLogs|mockLogs|sampleLog/i);
});

test("ReportsPage renders backend error on 4xx/5xx and EmptyState for empty report sections", () => {
  const reports = readSourceFile("client/src/pages/ReportsPage.jsx");

  // Error state renders the backend message
  assert.match(reports, /state\.error/);

  // Safe extraction for every report section — never throws on malformed payload
  assert.match(reports, /Array\.isArray\(state\.report\?\.topRequesters\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.mostUsedDays\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.mostUsedTimeSlots\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.monthlyReservationCount\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.missedReservations\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.cancelledReservations\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.reservationsByPurpose\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.reservationsEncodedByStaff\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.clearedPublicUseRanges\)/);
  assert.match(reports, /Array\.isArray\(state\.report\?\.maintenanceBlocks\)/);

  // No fabricated fallback report data
  assert.doesNotMatch(reports, /fallbackReport|mockReport|sampleReport/i);
});

// ===========================================================================
// CROSS-CUTTING: NO FABRICATED FALLBACK DATA ON ERROR
// ===========================================================================

test("No surface renders fabricated fallback data when the backend errors — only error alerts and EmptyState", () => {
  const surfaces = [
    "client/src/pages/CalendarPage.jsx",
    "client/src/pages/CourtPolicyPage.jsx",
    "client/src/pages/AccountsPage.jsx",
    "client/src/pages/ActivityLogsPage.jsx",
    "client/src/pages/ReportsPage.jsx",
    "client/src/components/CsvExportButton.jsx"
  ];

  for (const filePath of surfaces) {
    const source = readSourceFile(filePath);

    // No surface invents data when the backend is unreachable or errors
    assert.doesNotMatch(
      source,
      /fallback(?:Data|Schedule|Policy|Accounts|Logs|Report)|mock(?:Data|Schedule|Policy|Accounts|Logs|Report)/i,
      `${filePath} must not contain fabricated fallback data patterns`
    );
  }
});

test("Every surface that fetches data uses the standard error/empty/offline pattern", () => {
  // Each page must import EmptyState for missing-data rendering
  const pagesWithEmptyState = [
    "client/src/pages/CalendarPage.jsx",
    "client/src/pages/CourtPolicyPage.jsx",
    "client/src/pages/AccountsPage.jsx",
    "client/src/pages/ActivityLogsPage.jsx",
    "client/src/pages/ReportsPage.jsx"
  ];

  for (const filePath of pagesWithEmptyState) {
    const source = readSourceFile(filePath);
    assert.match(
      source,
      /import\s*\{[^}]*EmptyState[^}]*\}\s*from/,
      `${filePath} must import EmptyState`
    );
  }

  // CsvExportButton handles errors inline (no EmptyState needed for a button)
  const button = readSourceFile("client/src/components/CsvExportButton.jsx");
  assert.match(button, /role="alert"/);
});
