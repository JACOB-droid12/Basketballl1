import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getStatusDisplay } from "../client/src/api/statusDisplay.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for the post-deployment dashboard + calendar surfaces.
//
// Why static-source assertions instead of mounting the real components:
// JSX cannot be loaded directly under `node --test` (no JSX runtime is
// configured for the test runner), and the design's testing strategy
// (Req. 20.3) explicitly mandates the static-source assertion style of
// `tests/reactFrontendStatic.test.js`. The implementation note for this
// task authorizes the same fallback. To keep the assertions meaningful,
// the calendar's "correct label and palette class per status code"
// contract is verified by importing the pure `getStatusDisplay` helper
// directly and exercising it against every required status code; the
// JSX wiring that consumes that helper is then pinned by source-level
// regex assertions.
//
// Requirements covered: 10.1, 10.2, 10.3, 10.5, 11.1-11.5, 12.1, 12.2,
// 12.3, 12.6, 20.1.4, 20.1.5, 20.1.6, 20.2, 20.3.
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

// ---------------------------------------------------------------------------
// DashboardAlertsCard + DashboardPage + TodaySnapshotCard (Req. 11.1-11.5).
// ---------------------------------------------------------------------------

test("DashboardAlertsCard renders today's count, next reservation, missed-pending count, public-use and maintenance notices, and the calm empty-state when no alerts are present", () => {
  const card = readSourceFile("client/src/components/DashboardAlertsCard.jsx");

  // Every payload field listed in Req. 11.1 is read from the dashboard
  // alerts response so the card never invents data the backend did not
  // return (Req. 11.1, 20.1.4).
  assert.match(card, /payload\?\.alerts/);
  assert.match(card, /metrics\.todayReservationCount/);
  assert.match(card, /metrics\.missedPendingCount/);
  assert.match(card, /metrics\.nextReservation/);
  assert.match(card, /metrics\.publicUseActiveToday/);
  assert.match(card, /metrics\.maintenanceActiveToday/);

  // Today's snapshot stat-cards render labelled counts so staff read a
  // word, not a bare number (Req. 11.1, 18.1).
  assert.match(card, /Reservations today/);
  assert.match(card, /Missed,\s*still pending/);

  // Next reservation block surfaces the start time and representative
  // name when `metrics.nextReservation` is non-null (Req. 11.2).
  assert.match(card, /Next reservation:/);
  assert.match(card, /nextReservation\.startTime/);
  assert.match(card, /nextReservation\.representativeName/);

  // Public-use-today notice rendered only when the flag is true and
  // labelled with the literal copy from Req. 11.3.
  assert.match(card, /publicUseActiveToday\s*===\s*true/);
  assert.match(card, /Cleared for public use today/);

  // Maintenance-today notice rendered only when the flag is true and
  // labelled with the literal copy from Req. 11.4.
  assert.match(card, /maintenanceActiveToday\s*===\s*true/);
  assert.match(card, /Maintenance active today/);

  // Calm empty-state (Req. 11.5): when the alerts array is empty AND
  // every metric is zero, false, or null the card renders the
  // "Nothing needs attention today" `EmptyState` instead of zeroed
  // warning cards. The `isCalm` derivation is the gate that turns the
  // calm path on.
  assert.match(card, /Nothing needs attention today/);
  assert.match(card, /const isCalm =/);
  assert.match(card, /!hasAlerts/);
  assert.match(card, /!hasReservationToday/);
  assert.match(card, /!hasMissedPending/);
  assert.match(card, /!hasNextReservation/);
  assert.match(card, /!publicUseActiveToday/);
  assert.match(card, /!maintenanceActiveToday/);

  // Only existing soft-color alert tokens are used; no new gradients,
  // neon colors, or wide colored stripes are introduced (Req. 18.2).
  assert.doesNotMatch(card, /linear-gradient|backdrop-filter|neon|gradient-/i);
});

test("CourtPolicyPage mounts the alerts card and backup reminder while DashboardPage stays focused", () => {
  const courtPolicy = readSourceFile("client/src/pages/CourtPolicyPage.jsx");

  // Today's alerts and backup status sit on the admin-leaning court
  // policy/settings surface, leaving the calendar tab focused on the
  // week grid and leaving the dashboard focused on today's schedule.
  assert.match(
    courtPolicy,
    /import\s*\{\s*DashboardAlertsCard\s*\}\s*from\s*["'][^"']*DashboardAlertsCard\.jsx["']/
  );
  assert.match(courtPolicy, /apiRequest\("\/api\/dashboard\/alerts"\)/);
  assert.match(courtPolicy, /<DashboardAlertsCard\s+payload=\{alertsState\.payload\}/);
  assert.match(courtPolicy, /alertsState\.error/);

  // The backup reminder card moved to the court policy page so it
  // sits inside the admin-leaning settings surface (Req. 12.1, 12.5).
  assert.match(
    courtPolicy,
    /import\s*\{\s*BackupReminderCard\s*\}\s*from\s*["'][^"']*BackupReminderCard\.jsx["']/
  );
  assert.match(courtPolicy, /<BackupReminderCard\s*\/>/);

  // The dashboard remains free of all three relocated cards (the
  // visual cleanup that triggered this move).
  const dashboard = readSourceFile("client/src/pages/DashboardPage.jsx");
  assert.doesNotMatch(dashboard, /apiRequest\("\/api\/dashboard\/alerts"\)/);
  assert.doesNotMatch(dashboard, /<DashboardAlertsCard\b/);
  assert.doesNotMatch(dashboard, /<TodaySnapshotCard\b/);
  assert.doesNotMatch(dashboard, /<BackupReminderCard\b/);
});

test("TodaySnapshotCard renders today's reservation count and the next-reservation summary from the alerts metrics", () => {
  const snapshot = readSourceFile("client/src/components/TodaySnapshotCard.jsx");

  // Headline number reads from `metrics.todayReservationCount` so the
  // card never recomputes today's count (Req. 11.1).
  assert.match(snapshot, /metrics\?\.todayReservationCount/);
  assert.match(snapshot, /Reservations today/);

  // Next-reservation summary surfaces the reference number, start
  // time, and representative name when present (Req. 11.2, 1.1).
  assert.match(snapshot, /metrics\?\.nextReservation/);
  assert.match(snapshot, /Next reservation/);
  assert.match(snapshot, /formatTime\(nextReservation\.startTime\)/);
  assert.match(snapshot, /nextReservation\.representativeName/);
  assert.match(snapshot, /formatReferenceNo\(nextReservation\.referenceNo\)/);
  assert.match(snapshot, /No upcoming reservation today\./);
});

// ---------------------------------------------------------------------------
// BackupReminderCard (Req. 12.1, 12.2, 12.3, 12.6, 20.1.5).
// ---------------------------------------------------------------------------

test("BackupReminderCard fetches /api/maintenance/backup-status, renders palettes when backupDue === true, and is hidden when the endpoint errors", () => {
  const card = readSourceFile("client/src/components/BackupReminderCard.jsx");

  // Endpoint wiring (Req. 12.1, 20.1.5).
  assert.match(card, /apiRequest\("\/api\/maintenance\/backup-status"\)/);

  // The three response fields render verbatim (Req. 12.1).
  assert.match(card, /lastBackupAt/);
  assert.match(card, /daysSinceBackup/);
  assert.match(card, /reminderThresholdDays/);

  // Palette selection follows `backupDue === true` and the
  // `daysSinceBackup` vs. `2 * reminderThresholdDays` comparison
  // (Req. 12.2, 12.3, 20.1.5).
  assert.match(card, /backupDue\s*===\s*true/);
  assert.match(card, /daysSinceBackup\s*>\s*2\s*\*\s*reminderThresholdDays/);
  assert.match(card, /"warning"/);
  assert.match(card, /"danger"/);
  assert.match(card, /Backup due/);
  assert.match(card, /Backup overdue/);

  // Static instructional line referring staff to the maintenance
  // launcher option matches the wording in `STAFF-DAILY-USE.txt`
  // (Req. 12.4).
  assert.match(card, /maintenance launcher/);
  assert.match(card, /Barangay Court Scheduler - Maintenance/);

  // Endpoint error path: the card sets `hidden`, calls
  // `console.error`, and returns null so the rest of the dashboard
  // keeps rendering (Req. 12.6, 20.1.5).
  assert.match(card, /\.catch\(\(error\) => \{[\s\S]*?setHidden\(true\)[\s\S]*?\}\)/);
  assert.match(card, /console\.error\(/);
  assert.match(card, /if \(hidden\) return null;/);

  // Non-modal: the card never opens a full-screen overlay, modal
  // dialog, or auto-open dialog so the dashboard stays interactive
  // (Req. 12.5). We strip JSDoc/line comments before checking so the
  // file's own design-intent comment ("never opens a ... auto-open
  // prompt") does not register as a modal-overlay reference.
  const cardCode = stripComments(card);
  assert.doesNotMatch(cardCode, /role=["']dialog["']/);
  assert.doesNotMatch(cardCode, /modal-overlay|backdrop/i);
  assert.doesNotMatch(cardCode, /<dialog\b/i);
});

function stripComments(source) {
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
    result += char;
    index += 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// CalendarPage palette per status code (Req. 10.1, 10.2, 10.3, 10.5,
// 20.1.6).
// ---------------------------------------------------------------------------

const CALENDAR_STATUSES = [
  { code: "RESERVED", name: "Reserved", expectedClass: "status-reserved" },
  { code: "MISSED", name: "Did not show", expectedClass: "status-missed" },
  { code: "CANCELLED", name: "Cancelled", expectedClass: "status-cancelled" },
  { code: "COMPLETED", name: "Completed", expectedClass: "status-completed" },
  { code: "MAINTENANCE", name: "Maintenance", expectedClass: "status-maintenance" },
  { code: "BARANGAY_EVENT", name: "Barangay event", expectedClass: "status-barangay_event" },
  { code: "CLEARED_PUBLIC_USE", name: "Cleared for public use", expectedClass: "status-cleared_public_use" }
];

test("CalendarPage renders each cell with the correct label and palette class for every backend status code", () => {
  const dayColumn = readSourceFile("client/src/components/calendar/CalendarDayColumn.jsx");
  const legend = readSourceFile("client/src/components/calendar/CalendarLegend.jsx");

  // The calendar consumes `getStatusDisplay` for every cell and the
  // legend so status is conveyed by both label and class (Req. 10.2,
  // 10.5).
  assert.match(
    dayColumn,
    /import\s*\{[^}]*getStatusDisplay[^}]*\}\s*from\s*["'][^"']*statusDisplay\.js["']/
  );
  assert.match(dayColumn, /const status = getStatusDisplay\(item\.statusCode, item\.statusName\)/);

  // Every cell renders both the palette class on the badge and the
  // status label text inside it. The fragment is asserted twice in the
  // file (reservation block + schedule block) so a single match is
  // sufficient as a wiring pin (Req. 10.2, 10.5, 10.6).
  assert.match(dayColumn, /statusClassName=\{status\.className\}/);
  assert.match(dayColumn, /statusLabel=\{status\.label\}/);

  // The legend lists every backend status the current week may carry,
  // including the new MAINTENANCE, BARANGAY_EVENT, and
  // CLEARED_PUBLIC_USE codes (Req. 10.4).
  for (const { code, name } of CALENDAR_STATUSES) {
    const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    assert.match(
      legend,
      new RegExp(`code:\\s*"${code}"[\\s\\S]*?label:\\s*"${escapedName}"`),
      `Calendar legend must include { code: "${code}", label: "${name}" }`
    );
  }

  // Schedule blocks render their `blockType` and `reason` text
  // alongside (not merged into) the reservation cards (Req. 10.3,
  // 4.6).
  assert.match(dayColumn, /block\.blockType/);
  assert.match(dayColumn, /block\.reason/);

  // Runtime check: the helper that the calendar consumes maps every
  // required status code to the expected label and palette class.
  // This is the behavioral half of "each cell shows the correct label
  // and palette class" -- the JSX wiring above pipes these through to
  // `status-badge ${status.className}` and `{status.label}`, so the
  // helper output is what reaches the rendered cell.
  for (const { code, name, expectedClass } of CALENDAR_STATUSES) {
    const display = getStatusDisplay(code, name);
    assert.equal(
      display.label,
      name,
      `getStatusDisplay("${code}", "${name}") should return label "${name}"`
    );
    assert.equal(
      display.className,
      expectedClass,
      `getStatusDisplay("${code}", "${name}") should map to className "${expectedClass}"`
    );
    assert.notEqual(
      display.paletteKey,
      "",
      `getStatusDisplay("${code}", "${name}") should map to a non-empty palette key`
    );
  }

  // The label fallback is non-empty even when the backend omits a
  // status name, so cells never display a blank chip (Req. 10.5).
  for (const { code } of CALENDAR_STATUSES) {
    const display = getStatusDisplay(code, "");
    assert.notEqual(display.label.trim(), "", `${code} must fall back to a non-empty label`);
    assert.match(display.className, /^status-/);
  }
});
