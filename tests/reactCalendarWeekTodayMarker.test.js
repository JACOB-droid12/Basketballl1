// Today-marker semantics — Requirement 9 — and the toolbar's
// `This week` segmented pill `aria-pressed` semantics — Requirements
// 9.5 / 9.6.
//
// Two scenarios are exercised:
//
//   1. The visible week includes today (Asia/Manila). In that case
//      exactly one `.staff-day-head.today` element renders inside the
//      week grid, the today head's day-name eyebrow ends with the
//      ` · TODAY` suffix, and the toolbar's segmented `This week`
//      pill (matched via `.calendar-week-nav-today`) carries
//      `aria-pressed="true"`.
//
//   2. The visible week is one week ahead of today. In that case zero
//      `.staff-day-head.today` elements render and the same toolbar
//      pill carries `aria-pressed="false"`.
//
// The "one-week-ahead" case is achieved by clicking the toolbar's
// "Next week" button after the page mounts. Driving the visible week
// through the page's own state mutation keeps the test independent of
// any tz / Date.parse quirk in `normalizeWeekDays`'s handling of
// `scheduleResponse.days` — whichever weekday the harness resolves
// today to, advancing the week by 7 days guarantees the visible week
// no longer contains today.
//
// jsdom does not load `client/src/styles.css`, so the
// computed-background and computed-text-color assertions cannot
// resolve at runtime. The test therefore locks the contract from two
// complementary angles per the task notes:
//
//   1. DOM shape — the today card carries the `staff-day-head today`
//      class pair and its `.staff-day-head-name` eyebrow text ends
//      with ` · TODAY`.
//   2. CSS contract — the `.staff-day-head.today`,
//      `.staff-day-head.today .staff-day-head-name`, and
//      `.staff-day-head.today .staff-day-head-num` rules in
//      `client/src/styles.css` declare the expected `var(--primary)`
//      background and `var(--paper-surface, white)` text-color
//      tokens.
//
// Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { userEvent } from "@testing-library/user-event";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const STYLES_SOURCE = readFileSync(
  path.join(projectRoot, "client", "src", "styles.css"),
  "utf8"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the declaration block of a top-level CSS rule whose full
 * selector list (everything to the left of `{`) exactly matches
 * `selector`, ignoring leading and trailing whitespace and trailing
 * comma-separated alternates. Returns the body between `{` and `}`
 * or `null` when no matching rule is found. Skips matches inside
 * nested at-rules (e.g. `@media`) by tracking brace depth from index 0.
 */
function extractRule(source, selector) {
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("{", cursor);
    if (open === -1) return null;

    // Read backwards from `{` to the boundary that starts this rule's
    // selector list. The boundary is either `}`, `;`, the start of the
    // file, or `*/` (end of comment). Any of those marks the previous
    // rule's terminator. We then scan forward from that boundary,
    // collecting the raw selector text up to `{`.
    let selectorStart = open;
    while (selectorStart > 0) {
      const ch = source[selectorStart - 1];
      if (ch === "}" || ch === ";") break;
      selectorStart -= 1;
    }
    const rawSelector = source.slice(selectorStart, open);
    // Strip CSS block comments so a `/* */` between rules doesn't
    // contaminate the selector text.
    const cleanedSelector = rawSelector.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    // Match against any of the comma-separated alternates so a rule
    // declared as `.foo, .bar { … }` matches both `extractRule(…, ".foo")`
    // and `extractRule(…, ".bar")`.
    const alternates = cleanedSelector.split(",").map((part) => part.trim()).filter(Boolean);
    if (alternates.includes(selector)) {
      // Read the matching declaration block.
      let bodyDepth = 1;
      let scan = open + 1;
      while (scan < source.length && bodyDepth > 0) {
        if (source[scan] === "{") bodyDepth += 1;
        else if (source[scan] === "}") bodyDepth -= 1;
        if (bodyDepth === 0) break;
        scan += 1;
      }
      if (bodyDepth === 0) {
        // Skip nested at-rules (e.g. when the brace at `open` was the
        // opening brace of a `@media` block, not a regular rule). A
        // selector like `.foo` will never appear at the top of a
        // `@media (max-width: 820px)` block, so the alternates check
        // above already rejects those — but include this guard for
        // safety against future changes.
        if (!cleanedSelector.startsWith("@")) {
          return source.slice(open + 1, scan);
        }
      }
    }

    // Skip past the entire `{…}` block (whatever it is) before
    // searching again so we don't re-enter it during the next pass.
    let bodyDepth = 1;
    let scan = open + 1;
    while (scan < source.length && bodyDepth > 0) {
      if (source[scan] === "{") bodyDepth += 1;
      else if (source[scan] === "}") bodyDepth -= 1;
      scan += 1;
    }
    cursor = scan;
  }
  return null;
}

function buildScheduleForToday(today) {
  // Seed a single reservation somewhere in the visible week so the
  // page renders the week grid (instead of the EmptyState branch that
  // appears when `rows` is empty). The exact column index does not
  // matter for the today-marker contract — the test queries the today
  // card by class, not by position.
  //
  // Important: the response intentionally omits a `days` array. The
  // page's `normalizeWeekDays(rawDays, anchorDate)` honours `rawDays`
  // when it is non-empty, so a fixed `days` array would pin the
  // visible week to today's week even after the user clicks "Next
  // week" (the fetch stub returns the same response for every
  // `/api/schedule` request). With `days` omitted the page derives
  // the visible week from its own `date` state, which advances
  // correctly when the toolbar handlers fire.
  const days = makeWeekDays(today);
  const cells = days.map(() => ({}));
  cells[3] = makeReservationItem({
    reservationId: 9001,
    referenceNo: "BSN-2026-009001",
    representativeName: "Visible Week Resident",
    purpose: "Practice",
    startTime: "09:00",
    endTime: "10:00"
  });

  return {
    days,
    scheduleResponse: { rows: [{ cells }] }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("today-marker — visible week including today renders exactly one .staff-day-head.today and toolbar `aria-pressed=true`", async () => {
  const today = "2026-05-20";
  const { scheduleResponse } = buildScheduleForToday(today);

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  // Wait for the grid to mount once the schedule fetch resolves.
  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  // Req. 9.1 — exactly one `.staff-day-head.today` exists in the grid.
  const grid = container.querySelector(".staff-week-grid");
  assert.ok(grid, "expected a .staff-week-grid root");

  const todayHeads = grid.querySelectorAll(".staff-day-head.today");
  assert.equal(
    todayHeads.length,
    1,
    `expected exactly one .staff-day-head.today inside the week grid, got ${todayHeads.length}`
  );

  // Locate the today card by class rather than by weekday index. The
  // test must work regardless of which weekday the harness resolves
  // today to (jsdom + Asia/Manila tz interplay can shift the visible
  // index by a day in some environments).
  const todayHead = todayHeads[0];
  const todayArticle = todayHead.closest("article");
  assert.ok(todayArticle, "expected the today head to live inside an <article> day card");

  const todayArticleIndex = articles.indexOf(todayArticle);
  assert.ok(
    todayArticleIndex >= 0 && todayArticleIndex <= 6,
    `expected the today article to be one of the 7 visible-week articles, got index ${todayArticleIndex}`
  );

  // Req. 9.4 — the today eyebrow ends with the ` · TODAY` suffix.
  const eyebrow = todayHead.querySelector(".staff-day-head-name");
  assert.ok(eyebrow, "expected a .staff-day-head-name eyebrow on the today head");
  assert.ok(
    eyebrow.textContent.endsWith(" · TODAY"),
    `expected today eyebrow to end with " · TODAY", got "${eyebrow.textContent}"`
  );

  // Req. 9.5 — toolbar `This week` pill carries `aria-pressed="true"`.
  const thisWeekBtn = container.querySelector(".calendar-week-nav-today");
  assert.ok(thisWeekBtn, "expected the segmented .calendar-week-nav-today button");
  assert.equal(
    thisWeekBtn.getAttribute("aria-pressed"),
    "true",
    `expected aria-pressed="true" on the This week pill when the visible week includes today, got "${thisWeekBtn.getAttribute("aria-pressed")}"`
  );
});

test("today-marker — visible week one week ahead renders zero .staff-day-head.today and toolbar `aria-pressed=false`", async () => {
  // Mount the page with today inside the initial visible week, then
  // click the toolbar's "Next week" button to advance the visible
  // week by 7 days. Driving the next-week state through the page's
  // own onNext handler keeps the test independent of any tz quirk in
  // `normalizeWeekDays`'s handling of `scheduleResponse.days`.
  const today = "2026-05-20";
  const { scheduleResponse } = buildScheduleForToday(today);

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  // Wait for the initial mount so the toolbar is in the DOM.
  await findAllByRole("article");

  const nextBtn = container.querySelector(
    '.calendar-week-nav-btn[aria-label="Next week"]'
  );
  assert.ok(nextBtn, 'expected a .calendar-week-nav-btn[aria-label="Next week"] toolbar button');

  const user = userEvent.setup({ document: window.document });
  await user.click(nextBtn);

  // After the click the page refetches `/api/schedule` for the new
  // anchor date. Our fetch stub returns the same `scheduleResponse`
  // for every `/api/schedule` request, but the page recomputes
  // `weekDays` from the new `date` state (which is now today + 7),
  // so the visible week shifts forward and no longer contains today.
  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  // Req. 9.2 — zero `.staff-day-head.today` elements when today is
  // outside the visible week.
  const grid = container.querySelector(".staff-week-grid");
  assert.ok(grid, "expected a .staff-week-grid root");

  const todayHeads = grid.querySelectorAll(".staff-day-head.today");
  assert.equal(
    todayHeads.length,
    0,
    `expected zero .staff-day-head.today elements when today is outside the visible week, got ${todayHeads.length}`
  );

  // Req. 9.6 — toolbar `This week` pill carries `aria-pressed="false"`.
  const thisWeekBtn = container.querySelector(".calendar-week-nav-today");
  assert.ok(thisWeekBtn, "expected the segmented .calendar-week-nav-today button");
  assert.equal(
    thisWeekBtn.getAttribute("aria-pressed"),
    "false",
    `expected aria-pressed="false" on the This week pill when the visible week is one week ahead, got "${thisWeekBtn.getAttribute("aria-pressed")}"`
  );
});

test("today-marker — `.staff-day-head.today` CSS rule declares `var(--primary)` background and `var(--paper-surface)` text", () => {
  // jsdom does not load `client/src/styles.css`, so the computed
  // background-color and text color cannot resolve at runtime against
  // a mounted component. The contract is locked by reading the
  // stylesheet source directly: the today-card chrome must paint its
  // background with `var(--primary)` and its eyebrow + day-number
  // text with `var(--paper-surface)`.

  // Req. 9.3 — the today head paints a `var(--primary)` background.
  const todayBody = extractRule(STYLES_SOURCE, ".staff-day-head.today");
  assert.ok(
    todayBody,
    "expected a top-level `.staff-day-head.today` rule in styles.css"
  );
  assert.match(
    todayBody,
    /\bbackground:\s*var\(--primary\)\s*;/,
    "expected `background: var(--primary)` in the `.staff-day-head.today` rule"
  );

  // Req. 9.3 — the today head's eyebrow text resolves to `var(--paper-surface)`.
  const eyebrowBody = extractRule(STYLES_SOURCE, ".staff-day-head.today .staff-day-head-name");
  assert.ok(
    eyebrowBody,
    "expected a top-level `.staff-day-head.today .staff-day-head-name` rule in styles.css"
  );
  assert.match(
    eyebrowBody,
    /\bcolor:\s*var\(--paper-surface(?:\s*,\s*[^)]+)?\)\s*;/,
    "expected `color: var(--paper-surface, ...)` in the today eyebrow rule"
  );

  // Req. 9.3 — the today head's day-number text resolves to `var(--paper-surface)`.
  const numBody = extractRule(STYLES_SOURCE, ".staff-day-head.today .staff-day-head-num");
  assert.ok(
    numBody,
    "expected a top-level `.staff-day-head.today .staff-day-head-num` rule in styles.css"
  );
  assert.match(
    numBody,
    /\bcolor:\s*var\(--paper-surface(?:\s*,\s*[^)]+)?\)\s*;/,
    "expected `color: var(--paper-surface, ...)` in the today day-number rule"
  );
});
