import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { formatDate, formatDateTimeHuman, formatTime } from "../client/src/api/mappers.js";
import { formatReferenceNo } from "../client/src/api/referenceNo.js";
import { getStatusDisplay } from "../client/src/api/statusDisplay.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for the reservation slip and daily schedule print views.
//
// Uses the same static-source assertion style as the other React tests in
// this project (JSX cannot be loaded directly under `node --test`). The
// pure helper functions (`formatReferenceNo`, `formatTime`, `formatDate`,
// `formatDateTimeHuman`, `getStatusDisplay`) are exercised directly against
// fixture data to verify the behavioral contract; the JSX wiring that
// consumes those helpers is pinned by source-level regex assertions.
//
// Requirements covered: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3, 7.4,
// 10.5, 17.3, 17.5, 18.1, 18.2, 19.1.
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

// ---------------------------------------------------------------------------
// ReservationSlipPrintView (Req. 1.1, 1.2, 2.2–2.5, 17.3, 17.5, 18.1, 19.1)
// ---------------------------------------------------------------------------

test("ReservationSlipPrintView renders every required field verbatim from the slip payload", () => {
  const slip = readSourceFile("client/src/components/ReservationSlipPrintView.jsx");

  // The component reads every required field from the `slip` prop so
  // the printed document never invents data the backend did not return.
  // Each field is rendered via a DetailRow or directly in the header.

  // referenceNo — rendered in the header and in the detail grid
  assert.match(slip, /slip\.referenceNo/);
  assert.match(slip, /formatReferenceNo\(slip\.referenceNo\)/);

  // representativeName
  assert.match(slip, /slip\.representativeName/);
  assert.match(slip, /Representative name/);

  // contactNo
  assert.match(slip, /slip\.contactNo/);
  assert.match(slip, /Contact number/);

  // address
  assert.match(slip, /slip\.address/);
  assert.match(slip, /Address/);

  // reservationDate
  assert.match(slip, /slip\.reservationDate/);
  assert.match(slip, /Reservation date/);

  // startTime and endTime
  assert.match(slip, /slip\.startTime/);
  assert.match(slip, /slip\.endTime/);
  assert.match(slip, /Time/);

  // purpose
  assert.match(slip, /slip\.purpose/);
  assert.match(slip, /Purpose/);

  // statusName
  assert.match(slip, /slip\.statusName/);
  assert.match(slip, /Status/);

  // staffEncoder
  assert.match(slip, /slip\.staffEncoder/);
  assert.match(slip, /Staff encoder/);

  // issuedAt
  assert.match(slip, /slip\.issuedAt/);
  assert.match(slip, /Issued on/);

  // barangayName
  assert.match(slip, /slip\.barangayName/);
  assert.match(slip, /Barangay/);

  // courtName
  assert.match(slip, /slip\.courtName/);
  assert.match(slip, /Court/);

  // The detail grid uses a DetailRow helper that renders <dt> label
  // and <dd> value pairs inside a <dl> (Req. 18.1 — semantic markup).
  assert.match(slip, /<dl\s+className="detail-grid/);
  assert.match(slip, /<DetailRow\s+label=/);
  assert.match(slip, /function DetailRow/);
  assert.match(slip, /<dt>/);
  assert.match(slip, /<dd>/);
});

test("ReservationSlipPrintView renders the CANCELLED mark when statusCode is CANCELLED", () => {
  const slip = readSourceFile("client/src/components/ReservationSlipPrintView.jsx");

  // The component checks for the CANCELLED status code
  assert.match(slip, /slip\.statusCode/);
  assert.match(slip, /===\s*"CANCELLED"/i);

  // When cancelled, a visible "CANCELLED" mark is rendered using the
  // existing `.alert.error` class (Req. 2.4, 2.5).
  assert.match(slip, /isCancelled/);
  assert.match(slip, /slip-cancelled-mark/);
  assert.match(slip, /className="alert error slip-cancelled-mark"/);
  assert.match(slip, /<strong>CANCELLED<\/strong>/);
  assert.match(slip, /role="alert"/);

  // The cancelled mark is conditionally rendered only when isCancelled
  // is true, so non-cancelled slips never show the mark.
  assert.match(slip, /\{isCancelled && \(/);
});

test("ReservationSlipPrintView renders EmptyState on missing or malformed payload", () => {
  const slip = readSourceFile("client/src/components/ReservationSlipPrintView.jsx");

  // Guard clause renders EmptyState when slip is null/undefined/non-object
  assert.match(slip, /if \(!slip \|\| typeof slip !== "object"\)/);
  assert.match(slip, /import\s*\{[^}]*EmptyState[^}]*\}\s*from/);
  assert.match(slip, /Data unavailable/);
  assert.match(slip, /The reservation slip data could not be loaded\./);
});

test("ReservationSlipPrintView helper functions format fixture data correctly", () => {
  // Verify the pure helpers that the slip component uses produce the
  // expected output for representative fixture values.

  // formatReferenceNo renders the value verbatim (Req. 1.1, 1.2)
  assert.equal(formatReferenceNo("REF-2026-001"), "REF-2026-001");
  assert.equal(formatReferenceNo("ABC123"), "ABC123");
  assert.equal(formatReferenceNo(null), "No reference number");
  assert.equal(formatReferenceNo(undefined), "No reference number");
  assert.equal(formatReferenceNo(""), "No reference number");

  // formatTime renders 12-hour format with AM/PM
  assert.equal(formatTime("08:00"), "8:00 AM");
  assert.equal(formatTime("13:30"), "1:30 PM");
  assert.equal(formatTime("00:00"), "12:00 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");

  // formatDate renders a human-readable date
  const dateResult = formatDate("2026-05-18");
  assert.match(dateResult, /May/);
  assert.match(dateResult, /18/);
  assert.match(dateResult, /2026/);

  // formatDateTimeHuman renders ISO timestamps through Manila office time.
  const dtResult = formatDateTimeHuman("2026-05-18T14:30:00Z");
  assert.match(dtResult, /May/);
  assert.match(dtResult, /18/);
  assert.match(dtResult, /2026/);
  assert.match(dtResult, /10:30/);
  assert.match(dtResult, /PM/);

  // Null/empty values return empty string or fallback
  assert.equal(formatDateTimeHuman(null), "");
  assert.equal(formatDateTimeHuman(""), "");
});

// ---------------------------------------------------------------------------
// DailySchedulePrintView (Req. 7.2, 7.3, 7.4, 10.5, 18.1, 18.2, 19.1)
// ---------------------------------------------------------------------------

test("DailySchedulePrintView renders slot rows in a clearly labelled reservations section", () => {
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // Slots section has its own heading and aria-labelledby for
  // accessibility (Req. 18.1).
  assert.match(daily, /aria-labelledby="daily-print-slots-heading"/);
  assert.match(daily, /id="daily-print-slots-heading"/);
  assert.match(daily, /Reservations and slots/);

  // Slot rows render in a data-table with proper column headers
  assert.match(daily, /daily-print-table/);
  assert.match(daily, /<th scope="col">Slot<\/th>/);
  assert.match(daily, /<th scope="col">Time<\/th>/);
  assert.match(daily, /<th scope="col">Status<\/th>/);
  assert.match(daily, /<th scope="col">Reference<\/th>/);
  assert.match(daily, /<th scope="col">Notes<\/th>/);

  // Each slot row renders the slot name, time range, status badge with
  // label, reference number, and block reason (Req. 7.2, 10.5).
  assert.match(daily, /slot\.name/);
  assert.match(daily, /slot\.startTime/);
  assert.match(daily, /slot\.endTime/);
  assert.match(daily, /formatTime\(slot\.startTime\)/);
  assert.match(daily, /formatTime\(slot\.endTime\)/);
  assert.match(daily, /getStatusDisplay\(slot\.statusCode, slot\.statusName\)/);
  assert.match(daily, /status-badge \$\{status\.className\}/);
  assert.match(daily, /\{status\.label\}/);
  assert.match(daily, /slot\.reservation/);
  assert.match(daily, /formatReferenceNo\(reservationRef\)/);
});

test("DailySchedulePrintView renders maintenance and public-use blocks in a separate section with status labels", () => {
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // Blocks section is clearly separated from slots with its own
  // heading (Req. 7.3, 7.4).
  assert.match(daily, /aria-labelledby="daily-print-blocks-heading"/);
  assert.match(daily, /id="daily-print-blocks-heading"/);
  assert.match(daily, /Blocks and cleared public-use ranges/);

  // Explanatory text clarifies these are not reservations
  assert.match(daily, /These ranges are not reservations/);
  assert.match(daily, /maintenance, barangay events/);
  assert.match(daily, /cleared for public use/);

  // Block rows render in their own table with type, mode, time,
  // status, and reason columns.
  assert.match(daily, /<th scope="col">Type<\/th>/);
  assert.match(daily, /<th scope="col">Mode<\/th>/);
  assert.match(daily, /<th scope="col">Status<\/th>/);
  assert.match(daily, /<th scope="col">Reason<\/th>/);

  // Each block row renders blockType, mode, time range (or "Whole day"
  // for WHOLE_DAY mode), status badge, and reason (Req. 7.3, 10.5).
  assert.match(daily, /block\.blockType/);
  assert.match(daily, /block\.mode/);
  assert.match(daily, /block\.startTime/);
  assert.match(daily, /block\.endTime/);
  assert.match(daily, /block\.reason/);
  assert.match(daily, /getStatusDisplay\(block\.statusCode, block\.statusName\)/);
  assert.match(daily, /Whole day/);
  assert.match(daily, /block\.mode === "WHOLE_DAY"/);
});

test("DailySchedulePrintView renders totals section and handles empty/missing payload gracefully", () => {
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // Totals section is a third clearly separated section
  assert.match(daily, /aria-labelledby="daily-print-totals-heading"/);
  assert.match(daily, /id="daily-print-totals-heading"/);
  assert.match(daily, /Totals/);
  assert.match(daily, /daily-print-totals/);

  // Totals render as a definition list from the backend response
  assert.match(daily, /<dl\s+className="daily-print-totals"/);
  assert.match(daily, /Object\.entries\(totals\)/);

  // Guard clause renders EmptyState on missing/malformed payload
  assert.match(daily, /if \(!payload \|\| typeof payload !== "object"\)/);
  assert.match(daily, /Data unavailable/);
  assert.match(daily, /The daily schedule print data could not be loaded\./);

  // Empty slots and blocks each render their own EmptyState
  assert.match(daily, /No slots for this date/);
  assert.match(daily, /No blocks for this date/);
  assert.match(daily, /No totals were returned for this date\./);
});

test("DailySchedulePrintView uses getStatusDisplay for status labels so status is conveyed by both text and class", () => {
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // The component imports getStatusDisplay (Req. 10.5)
  assert.match(
    daily,
    /import\s*\{[^}]*getStatusDisplay[^}]*\}\s*from\s*["'][^"']*statusDisplay\.js["']/
  );

  // Status is rendered via both className and label text so the
  // surface never relies on color alone (Req. 10.5, 18.2).
  // This pattern appears for both slot rows and block rows.
  const statusBadgeMatches = daily.match(/status-badge \$\{status\.className\}/g);
  assert.ok(
    statusBadgeMatches && statusBadgeMatches.length >= 2,
    "status-badge with className should appear at least twice (slots + blocks)"
  );

  const statusLabelMatches = daily.match(/\{(?:status|statusLabel)\.label\}|\{statusLabel\}/g);
  assert.ok(
    statusLabelMatches && statusLabelMatches.length >= 2,
    "status.label should appear at least twice (slots + blocks)"
  );

  // Runtime verification: getStatusDisplay maps maintenance and
  // public-use codes correctly for the daily print context.
  const maintenance = getStatusDisplay("MAINTENANCE", "Maintenance");
  assert.equal(maintenance.label, "Maintenance");
  assert.equal(maintenance.className, "status-maintenance");

  const publicUse = getStatusDisplay("CLEARED_PUBLIC_USE", "Cleared for public use");
  assert.equal(publicUse.label, "Cleared for public use");
  assert.equal(publicUse.className, "status-cleared_public_use");

  const reserved = getStatusDisplay("RESERVED", "Reserved");
  assert.equal(reserved.label, "Reserved");
  assert.equal(reserved.className, "status-reserved");

  const cancelled = getStatusDisplay("CANCELLED", "Cancelled");
  assert.equal(cancelled.label, "Cancelled");
  assert.equal(cancelled.className, "status-cancelled");
});

test("DailySchedulePrintView imports only local helpers and uses the existing Barangay_Visual_Language class vocabulary", () => {
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // Imports are all local project paths (Req. 19.1 — offline)
  assert.match(daily, /from\s*["']\.\.\/api\/mappers\.js["']/);
  assert.match(daily, /from\s*["']\.\.\/api\/referenceNo\.js["']/);
  assert.match(daily, /from\s*["']\.\.\/api\/statusDisplay\.js["']/);
  assert.match(daily, /from\s*["']\.\/EmptyState\.jsx["']/);

  // No external CDN or remote resource references
  assert.doesNotMatch(daily, /https?:\/\//);

  // Uses existing class vocabulary: page, report-page, card,
  // padded-card, data-table, status-badge, table-wrap, etc.
  assert.match(daily, /report-page/);
  assert.match(daily, /card padded-card/);
  assert.match(daily, /data-table/);
  assert.match(daily, /table-wrap/);
  assert.match(daily, /status-badge/);
});

test("ReservationSlipPrintView imports only local helpers and uses the existing Barangay_Visual_Language class vocabulary", () => {
  const slip = readSourceFile("client/src/components/ReservationSlipPrintView.jsx");

  // Imports are all local project paths (Req. 19.1 — offline)
  assert.match(slip, /from\s*["']\.\.\/api\/mappers\.js["']/);
  assert.match(slip, /from\s*["']\.\.\/api\/referenceNo\.js["']/);
  assert.match(slip, /from\s*["']\.\/EmptyState\.jsx["']/);
  assert.match(slip, /from\s*["']\.\/StatusBadge\.jsx["']/);

  // No external CDN or remote resource references
  assert.doesNotMatch(slip, /https?:\/\//);

  // Uses existing class vocabulary
  assert.match(slip, /report-page/);
  assert.match(slip, /card padded-card/);
  assert.match(slip, /detail-grid/);
  assert.match(slip, /slip-print-page/);

  // Status is rendered via the StatusBadge component which internally
  // applies the status-badge class (Req. 10.5, 18.2).
  assert.match(slip, /<StatusBadge\s+statusCode=\{slip\.statusCode\}/);

});
