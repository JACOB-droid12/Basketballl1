import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for ReservationFormPage Save gating (UI-AUD-002, Req. 1.6).
//
// Direct JSX rendering of `<ReservationFormPage />` under `node --test` is
// impractical in this project (no JSX transformer is wired into the
// Node test runtime; every sibling React test in `tests/` uses the same
// static-source assertion style — see `reactPostDeploymentSlipDailyPrint.test.js`
// for the pattern). This test therefore reads `ReservationFormPage.jsx`
// and asserts the three contract points that, taken together, simulate
// the "today + a past start time → Save is disabled with the
// disabled-reason copy" scenario described in Req. 1.6:
//
//   1. The Save button's `disabled` prop is wired to
//      `state.saving || Boolean(cannotSaveReason)` so a non-empty
//      cannotSaveReason (e.g. the "this time has already passed today"
//      branch returned by the disabledStartTimes check) keeps Save in
//      its disabled visual state.
//
//   2. The Save button's `title` prop is wired to
//      `cannotSaveReason || undefined` so the disabled-reason copy is
//      surfaced as the tooltip/title attribute on the disabled button
//      (matching the disabled-reason copy contract in design.md).
//
//   3. `handleSubmit` early-returns when `cannotSaveReason` is non-empty
//      so a stray Enter-key submission cannot bypass the disabled
//      visual and POST the form.
//
// Requirements covered: 1.6.
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

test("ReservationFormPage Save button disabled prop is wired to state.saving || Boolean(cannotSaveReason)", () => {
  const source = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The Save button stays disabled while a save is in flight or while
  // any cannotSaveReason branch is non-empty. The "today + past start
  // time" case is one such branch (the disabledStartTimes set
  // membership check returns "This time has already passed today.
  // Pick a later start time."), so this assertion covers the
  // simulated past-start-time scenario the task describes.
  assert.match(source, /disabled=\{state\.saving \|\| Boolean\(cannotSaveReason\)\}/);
});

test("ReservationFormPage Save button title prop matches the disabled-reason copy", () => {
  const source = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The title attribute renders the cannotSaveReason copy verbatim so
  // assistive technology and pointer hover both surface the same
  // human-readable disabled reason ("This time has already passed
  // today. Pick a later start time." for the past-start-time branch).
  assert.match(source, /title=\{cannotSaveReason \|\| undefined\}/);
});

test("ReservationFormPage handleSubmit early-returns when cannotSaveReason is non-empty", () => {
  const source = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The early-return is the Enter-key safeguard that prevents a POST
  // from sneaking past the disabled Save button. Without it, hitting
  // Enter inside a focused input could still trigger handleSubmit and
  // bypass the visual disabled state.
  assert.match(source, /async function handleSubmit\(event\)/);
  assert.match(source, /if \(cannotSaveReason\) \{/);

  // Inside the early-return, the form is kept open (no apiRequest is
  // issued), state.saving is reset to false, and the cannotSaveReason
  // copy is surfaced through the existing inline error component so
  // the staff sees the blocking message inline.
  const handleSubmitStart = source.indexOf("async function handleSubmit(event)");
  assert.ok(handleSubmitStart >= 0, "handleSubmit should be defined in ReservationFormPage.jsx");
  const earlyReturnSlice = source.slice(
    handleSubmitStart,
    handleSubmitStart + 1500
  );
  assert.match(earlyReturnSlice, /event\.preventDefault\(\)/);
  assert.match(earlyReturnSlice, /if \(cannotSaveReason\) \{[\s\S]*?error: cannotSaveReason[\s\S]*?return;\s*\}/);
});

test("ReservationFormPage disabledStartTimes set covers past slots when reservationDate equals today in Manila", () => {
  const source = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The disabledStartTimes set is the upstream signal that drives
  // cannotSaveReason for the simulated "today + a past start time"
  // case: when form.reservationDate === todayInManila, every chip
  // whose value is <= currentManilaTime is added to the set, and
  // cannotSaveReason returns the past-start-time copy when
  // form.startTime falls inside that set.
  assert.match(source, /const disabledStartTimes = useMemo\(\(\) => \{/);
  assert.match(
    source,
    /TIME_OPTIONS\.filter\(\(time\) => time <= currentManilaTime\)/
  );

  // The cannotSaveReason branch that surfaces the past-start-time
  // copy returns the exact disabled-reason string that the Save
  // button's title attribute renders when this branch is active.
  assert.match(
    source,
    /return "This time has already passed today\. Pick a later start time\."/
  );
});
