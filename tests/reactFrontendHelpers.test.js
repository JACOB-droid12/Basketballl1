import assert from "node:assert/strict";
import test from "node:test";

// ---------------------------------------------------------------------------
// Unit tests for the shared frontend helper modules.
//
// These are behavioral (example-based) tests that exercise the exported
// functions directly, complementing the static-source assertions in
// `reactFrontendStatic.test.js`.
//
// Requirements covered: 1.4, 6.1–6.7, 10.1, 20.2, 20.3.
// ---------------------------------------------------------------------------

import { formatReferenceNo, matchesReferenceNo } from "../client/src/api/referenceNo.js";
import { getStatusDisplay } from "../client/src/api/statusDisplay.js";
import { buildCsvExportUrl, CSV_EXPORT_ENDPOINTS } from "../client/src/api/csvExport.js";
import { buildActivityLogsCsv } from "../src/features/api/apiExports.js";

// ===========================================================================
// formatReferenceNo
// ===========================================================================

test("formatReferenceNo returns the value verbatim when present", () => {
  assert.equal(formatReferenceNo("REF-2026-0001"), "REF-2026-0001");
  assert.equal(formatReferenceNo("abc-123"), "abc-123");
  assert.equal(formatReferenceNo("0"), "0");
});

test("formatReferenceNo returns placeholder for null, undefined, or empty string", () => {
  assert.equal(formatReferenceNo(null), "No reference number");
  assert.equal(formatReferenceNo(undefined), "No reference number");
  assert.equal(formatReferenceNo(""), "No reference number");
  assert.equal(formatReferenceNo("   "), "No reference number");
});

// ===========================================================================
// matchesReferenceNo
// ===========================================================================

test("matchesReferenceNo performs case-insensitive substring match", () => {
  const reservation = { referenceNo: "REF-2026-0001" };

  assert.equal(matchesReferenceNo(reservation, "ref"), true);
  assert.equal(matchesReferenceNo(reservation, "REF"), true);
  assert.equal(matchesReferenceNo(reservation, "2026"), true);
  assert.equal(matchesReferenceNo(reservation, "0001"), true);
  assert.equal(matchesReferenceNo(reservation, "ref-2026-0001"), true);
  assert.equal(matchesReferenceNo(reservation, "XYZ"), false);
});

test("matchesReferenceNo returns false when reservation has no referenceNo", () => {
  assert.equal(matchesReferenceNo({ referenceNo: null }, "ref"), false);
  assert.equal(matchesReferenceNo({ referenceNo: undefined }, "ref"), false);
  assert.equal(matchesReferenceNo({ referenceNo: "" }, "ref"), false);
  assert.equal(matchesReferenceNo(null, "ref"), false);
  assert.equal(matchesReferenceNo(undefined, "ref"), false);
});

test("matchesReferenceNo returns false when query is empty or null", () => {
  const reservation = { referenceNo: "REF-2026-0001" };

  assert.equal(matchesReferenceNo(reservation, ""), false);
  assert.equal(matchesReferenceNo(reservation, "   "), false);
  assert.equal(matchesReferenceNo(reservation, null), false);
  assert.equal(matchesReferenceNo(reservation, undefined), false);
});

// ===========================================================================
// getStatusDisplay
// ===========================================================================

test("getStatusDisplay returns correct display for AVAILABLE", () => {
  const result = getStatusDisplay("AVAILABLE", "Available");
  assert.equal(result.label, "Available");
  assert.equal(result.className, "status-available");
  assert.equal(result.paletteKey, "positive");
});

test("getStatusDisplay returns correct display for RESERVED", () => {
  const result = getStatusDisplay("RESERVED", "Reserved");
  assert.equal(result.label, "Reserved");
  assert.equal(result.className, "status-reserved");
  assert.equal(result.paletteKey, "info");
});

test("getStatusDisplay returns correct display for MISSED", () => {
  const result = getStatusDisplay("MISSED", "Missed");
  assert.equal(result.label, "Missed");
  assert.equal(result.className, "status-missed");
  assert.equal(result.paletteKey, "danger");
});

test("getStatusDisplay returns correct display for CANCELLED", () => {
  const result = getStatusDisplay("CANCELLED", "Cancelled");
  assert.equal(result.label, "Cancelled");
  assert.equal(result.className, "status-cancelled");
  assert.equal(result.paletteKey, "danger");
});

test("getStatusDisplay returns correct display for COMPLETED", () => {
  const result = getStatusDisplay("COMPLETED", "Completed");
  assert.equal(result.label, "Completed");
  assert.equal(result.className, "status-completed");
  assert.equal(result.paletteKey, "muted");
});

test("getStatusDisplay returns correct display for MAINTENANCE", () => {
  const result = getStatusDisplay("MAINTENANCE", "Maintenance");
  assert.equal(result.label, "Maintenance");
  assert.equal(result.className, "status-maintenance");
  assert.equal(result.paletteKey, "warning");
});

test("getStatusDisplay returns correct display for BARANGAY_EVENT", () => {
  const result = getStatusDisplay("BARANGAY_EVENT", "Barangay Event");
  assert.equal(result.label, "Barangay Event");
  assert.equal(result.className, "status-barangay_event");
  assert.equal(result.paletteKey, "info");
});

test("getStatusDisplay returns correct display for CLEARED_PUBLIC_USE", () => {
  const result = getStatusDisplay("CLEARED_PUBLIC_USE", "Cleared for Public Use");
  assert.equal(result.label, "Cleared for Public Use");
  assert.equal(result.className, "status-cleared_public_use");
  assert.equal(result.paletteKey, "neutral");
});

test("getStatusDisplay falls back to humanized statusCode when statusName is missing", () => {
  const result = getStatusDisplay("BARANGAY_EVENT", null);
  assert.equal(result.label, "Barangay event");
  assert.equal(result.className, "status-barangay_event");
  assert.equal(result.paletteKey, "info");
});

test("getStatusDisplay falls back to 'Status unknown' when both statusCode and statusName are missing", () => {
  const result = getStatusDisplay(null, null);
  assert.equal(result.label, "Status unknown");
  assert.equal(result.className, "status-unknown");
  assert.equal(result.paletteKey, "muted");
});

// ===========================================================================
// buildCsvExportUrl
// ===========================================================================

test("buildCsvExportUrl builds correct URL for daily-schedule", () => {
  const url = buildCsvExportUrl("daily-schedule", { date: "2026-05-18" });
  assert.equal(url, "/api/exports/daily-schedule.csv?date=2026-05-18");
});

test("buildCsvExportUrl builds correct URL for weekly-schedule", () => {
  const url = buildCsvExportUrl("weekly-schedule", { from: "2026-05-12", to: "2026-05-18" });
  assert.equal(url, "/api/exports/weekly-schedule.csv?from=2026-05-12&to=2026-05-18");
});

test("buildCsvExportUrl builds correct URL for monthly-reservations", () => {
  const url = buildCsvExportUrl("monthly-reservations", { month: "2026-05" });
  assert.equal(url, "/api/exports/monthly-reservations.csv?month=2026-05");
});

test("buildCsvExportUrl builds correct URL for activity-logs", () => {
  const url = buildCsvExportUrl("activity-logs", { action: "CREATE_RESERVATION", date: "2026-05-18" });
  assert.equal(url, "/api/exports/activity-logs.csv?action=CREATE_RESERVATION&date=2026-05-18");
});

test("buildCsvExportUrl builds correct URL for missed-reservations", () => {
  const url = buildCsvExportUrl("missed-reservations", { from: "2026-05-01", to: "2026-05-31" });
  assert.equal(url, "/api/exports/missed-reservations.csv?from=2026-05-01&to=2026-05-31");
});

test("buildCsvExportUrl builds correct URL for cancelled-reservations", () => {
  const url = buildCsvExportUrl("cancelled-reservations", { from: "2026-05-01", to: "2026-05-31" });
  assert.equal(url, "/api/exports/cancelled-reservations.csv?from=2026-05-01&to=2026-05-31");
});

test("buildCsvExportUrl builds correct URL for reports", () => {
  const url = buildCsvExportUrl("reports", { range: "week" });
  assert.equal(url, "/api/exports/reports.csv?range=week");
});

test("buildCsvExportUrl returns base URL without query string when no params provided", () => {
  const url = buildCsvExportUrl("daily-schedule");
  assert.equal(url, "/api/exports/daily-schedule.csv");
});

test("buildCsvExportUrl omits null, undefined, and empty-string params from query string", () => {
  const url = buildCsvExportUrl("activity-logs", {
    action: "CREATE_RESERVATION",
    date: null,
    search: undefined,
    from: ""
  });
  assert.equal(url, "/api/exports/activity-logs.csv?action=CREATE_RESERVATION");
});

test("buildCsvExportUrl throws on unknown endpoint", () => {
  assert.throws(
    () => buildCsvExportUrl("unknown-endpoint", {}),
    /Unknown CSV export endpoint/
  );
  assert.throws(
    () => buildCsvExportUrl("daily-schedule.pdf", {}),
    /Unknown CSV export endpoint/
  );
});

test("buildCsvExportUrl accepts all seven documented endpoints", () => {
  const expected = [
    "daily-schedule",
    "weekly-schedule",
    "monthly-reservations",
    "activity-logs",
    "missed-reservations",
    "cancelled-reservations",
    "reports"
  ];

  assert.deepEqual(CSV_EXPORT_ENDPOINTS, expected);

  for (const endpoint of expected) {
    const url = buildCsvExportUrl(endpoint);
    assert.equal(url, `/api/exports/${endpoint}.csv`);
  }
});

test("buildActivityLogsCsv includes linked reservation reference numbers", () => {
  const csv = buildActivityLogsCsv([
    {
      createdAt: "2026-05-20 08:30:00",
      action: "CREATE_RESERVATION",
      userName: "Admin User",
      reservationId: 7,
      referenceNo: "BCS-2026-000007",
      reservationDate: "2026-05-20",
      reservationStartTime: "09:00",
      reservationEndTime: "10:00",
      details: "Created reservation BCS-2026-000007."
    }
  ]);

  assert.match(csv, /Reservation Reference No/);
  assert.match(csv, /BCS-2026-000007/);
});
