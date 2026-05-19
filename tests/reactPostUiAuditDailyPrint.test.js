import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { formatBackendDateTime } from "../client/src/api/mappers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for the daily schedule print view's UI-audit fixes.
//
// JSX cannot be loaded directly under `node --test` (there is no JSX loader
// in this project's test pipeline), so we follow the established static-
// source assertion style used by the other React tests in this repo. The
// pure helper `formatBackendDateTime` is exercised directly with a Manila
// fixture (`2026-05-18T17:31:00`) to confirm the issued-at line surfaces
// `5:31 PM`, while the JSX wiring that consumes it is pinned by source-
// level regex assertions.
//
// Validates: Requirements 9.7, 2.5
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

test("DailySchedulePrintView humanizes BARANGAY_EVENT block type to 'Barangay event'", () => {
  // Static-source proxy for `BLOCK_TYPE_LABEL.BARANGAY_EVENT === "Barangay event"`.
  // The map is a frozen module-local const (not exported) and lives inside a
  // .jsx file, so we read the file text and assert the entry verbatim.
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  assert.match(daily, /const\s+BLOCK_TYPE_LABEL\s*=\s*Object\.freeze\(/);
  assert.match(daily, /BARANGAY_EVENT:\s*"Barangay event"/);

  // The map is rendered through `humanizeBlockType` so the printed
  // daily schedule never surfaces the raw uppercase enum (Req. 9.3).
  assert.match(daily, /humanizeBlockType\(resolveBlockType\(block\)\)/);
});

test("DailySchedulePrintView dims past same-day slot rows with the daily-print-row-past class", () => {
  // Validates Req. 9.7: past same-day slot rows must be visually
  // de-emphasized so the posted printout never implies the slot is
  // still bookable. The component classifies past rows via
  // `isPastSameDaySlot` and applies `.daily-print-row-past` to the
  // <tr>; the styles.css definition adds reduced opacity + strikethrough.
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  assert.match(daily, /isPastSameDaySlot\(/);
  assert.match(
    daily,
    /className=\{isPast \? "daily-print-row-past" : undefined\}/
  );

  // The "available now" / "available" / "open" / "bookable" copy is
  // stripped from the status label of past rows (Req. 9.7).
  assert.match(daily, /sanitizePastStatusLabel\(status\.label\)/);
  assert.match(daily, /\\bavailable\\s\+now\\b/);
  assert.match(daily, /\\bavailable\\b/);
  assert.match(daily, /\\bopen\\b/);
  assert.match(daily, /\\bbookable\\b/);

  // The `.daily-print-row-past` rule exists in the bundle stylesheet so
  // the dimming actually renders in print and on screen.
  const styles = readSourceFile("client/src/styles.css");
  assert.match(styles, /\.daily-print-row-past\b/);
});

test("DailySchedulePrintView renders payload.generatedAt/issuedAt through formatBackendDateTime", () => {
  // Validates Req. 2.5 for the Daily_Schedule_Printout: a representative
  // backend Manila timestamp (`2026-05-18T17:31:00`) renders as `5:31 PM`
  // under a non-Manila test timezone. We pin the wiring at the source
  // level (the JSX expression that calls `formatBackendDateTime`) and
  // exercise the helper directly to prove the wall-clock is preserved.
  const daily = readSourceFile("client/src/components/DailySchedulePrintView.jsx");

  // The component imports the shared formatter from `mappers.js`
  // (Req. 2.3 — one shared formatter for every backend timestamp).
  assert.match(
    daily,
    /import\s*\{[^}]*formatBackendDateTime[^}]*\}\s*from\s*["'][^"']*mappers\.js["']/
  );

  // The issued-at line reads `payload.issuedAt` first and falls back to
  // `payload.generatedAt`, then renders the result through
  // `formatBackendDateTime` (the task names both fields as the source).
  assert.match(
    daily,
    /const\s+issuedAtSource\s*=\s*payload\.issuedAt\s*\|\|\s*payload\.generatedAt/
  );
  assert.match(
    daily,
    /const\s+issuedAt\s*=\s*issuedAtSource\s*\?\s*formatBackendDateTime\(issuedAtSource\)\s*:\s*""/
  );

  // The "Issued on" line is rendered in the print title block.
  assert.match(daily, /Issued on \{issuedAt\}/);

  // Runtime verification: a Manila wall-clock backend value renders the
  // same hours and minutes regardless of the browser timezone. Force the
  // test process timezone to UTC for the duration of the assertion so
  // the result mirrors the Codex audit's reproduction conditions.
  const previousTz = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    const formatted = formatBackendDateTime("2026-05-18T17:31:00");
    // The shared formatter preserves Manila wall-clock minutes and
    // surfaces the 12-hour `5:31 PM` form (Req. 2.1, 2.2, 2.5).
    assert.match(formatted, /5:31\s*PM/);
    // The Manila calendar date is preserved as well — no UTC offset
    // shift bumps the value to the previous or next day.
    assert.match(formatted, /May 18, 2026/);
  } finally {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  }
});
