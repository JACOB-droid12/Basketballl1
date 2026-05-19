// Property 12 — weekend cards render identically to weekday cards.
//
// The redesign explicitly forbids weekend muting (Req. 10.1–10.3).
// Saturdays and Sundays must surface with the same chrome the rest of
// the week carries: same `.staff-day-head` background, same eyebrow
// `font-style` and `font-weight`, full opacity, and no `--surface-2`
// muted-paper fill on the card body. The component sets
// `data-weekend="true"` on the Sat/Sun articles and the stylesheet
// declares no `.weekend` modifier — both sides of the contract get
// asserted below.
//
// jsdom does NOT load `client/src/styles.css`, so `getComputedStyle()`
// in this harness reflects only inline-style declarations and any
// `<style>` rules injected directly into the document. That makes the
// "computed style equals computed style" assertions in the task list
// trivially true (every unstyled element returns the same default
// `rgba(0, 0, 0, 0)` background, the same empty `font-style`, the
// same empty `font-weight`, and the same empty `opacity`). The test
// therefore verifies the contract from two complementary angles per
// the task notes:
//
//   1. DOM shape — Saturday and Sunday articles render the exact same
//      DOM structure as Monday: a `<article className="staff-day-card">`
//      with no extra modifier classes for weekends, a
//      `<header className="staff-day-head">` with no `.weekend` class
//      added, a `<span className="staff-day-head-name">` eyebrow, and
//      a `<strong className="staff-day-head-num">` day number. The
//      only marker is `data-weekend="true"`, which both Sat and Sun
//      cards must carry while Mon does not. The computed-style pairs
//      listed in the task all resolve to identical defaults under
//      jsdom, locking the equality.
//   2. CSS contract — `client/src/styles.css` declares the
//      `.staff-day-card[data-weekend="true"]` rule with `opacity: 1`,
//      `background: var(--surface)` (matches the weekday card), the
//      `.staff-day-head { background: inherit }` rule (matches the
//      weekday head fill), the `.staff-day-head-name { font-style:
//      normal }` rule (matches the weekday eyebrow), declares NO
//      `.weekend` modifier or `--surface-2` background for weekend
//      cards, and never targets a Sat/Sun card with a muting rule.
//
// Validates: Requirements 10.1, 10.2, 10.3, 12.1 — Property 12.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

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

function buildScheduleWithWeekendBookings({ today }) {
  // Anchor today on Wednesday 2026-05-20. The Sunday-anchored fixture
  // week resolves Sunday at index 0, Monday at index 1, and Saturday
  // at index 6, so the three reservations land where the task expects
  // them.
  const days = makeWeekDays(today);
  const cells = days.map(() => ({}));

  cells[0] = makeReservationItem({
    reservationId: 7001,
    referenceNo: "BSN-2026-007001",
    representativeName: "Sunday Resident",
    purpose: "Sunday practice",
    startTime: "09:00",
    endTime: "10:00"
  });
  cells[1] = makeReservationItem({
    reservationId: 7002,
    referenceNo: "BSN-2026-007002",
    representativeName: "Monday Resident",
    purpose: "Monday practice",
    startTime: "10:00",
    endTime: "11:00"
  });
  cells[6] = makeReservationItem({
    reservationId: 7003,
    referenceNo: "BSN-2026-007003",
    representativeName: "Saturday Resident",
    purpose: "Saturday practice",
    startTime: "11:00",
    endTime: "12:00"
  });

  return { days, scheduleResponse: { days, rows: [{ cells }] } };
}

function getDayParts(article) {
  // Returns the four DOM nodes the task's pair-wise assertions read:
  // the card itself, its `.staff-day-head` header, the `.staff-day-head-name`
  // eyebrow span, and the `.staff-booking-block` body row (used by the
  // `getComputedStyle(satCard).opacity === "1"` assertion via the
  // card's own opacity, plus an extra check that no inline opacity
  // override is applied).
  const card = article;
  const head = article.querySelector(".staff-day-head");
  const eyebrow = article.querySelector(".staff-day-head-name");
  const dayNumber = article.querySelector(".staff-day-head-num");
  const block = article.querySelector(".staff-booking-block");
  return { card, head, eyebrow, dayNumber, block };
}

function extractRule(source, selector) {
  // Mirrors the helper in `tests/reactCalendarWeekEmptyDay.test.js` so
  // both Property 9 and Property 12 read the stylesheet through the
  // same lens. Returns the raw declaration block (between the matching
  // `{` and `}`) for a top-level rule whose selector list starts with
  // the exact `selector` string. Returns `null` when no match is found.
  // Top-level only: skips matches that sit inside an `@media` block by
  // tracking brace depth from index 0.
  let depth = 0;
  let cursor = 0;

  while (cursor < source.length) {
    const ch = source[cursor];

    if (ch === "{") {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      cursor += 1;
      continue;
    }

    if (depth === 0 && source.startsWith(selector, cursor)) {
      const charBefore = cursor === 0 ? "" : source[cursor - 1];
      const isBoundary =
        cursor === 0 ||
        charBefore === "\n" ||
        charBefore === "}" ||
        charBefore === " " ||
        charBefore === "\t";
      if (isBoundary) {
        const open = source.indexOf("{", cursor);
        if (open === -1) return null;
        let bodyDepth = 1;
        let scan = open + 1;
        while (scan < source.length && bodyDepth > 0) {
          if (source[scan] === "{") bodyDepth += 1;
          else if (source[scan] === "}") bodyDepth -= 1;
          if (bodyDepth === 0) break;
          scan += 1;
        }
        if (bodyDepth === 0) {
          return source.slice(open + 1, scan);
        }
        return null;
      }
    }

    cursor += 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("Property 12 — weekend articles render the same DOM structure as weekday articles", async () => {
  const today = "2026-05-20";
  const { scheduleResponse } = buildScheduleWithWeekendBookings({ today });

  const { findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  const sun = articles[0];
  const mon = articles[1];
  const sat = articles[6];

  // Weekend marker — Sat and Sun carry `data-weekend="true"`; Mon does
  // not. This is the only structural difference the redesign permits.
  assert.equal(
    sat.getAttribute("data-weekend"),
    "true",
    "expected the Saturday article to carry data-weekend=\"true\""
  );
  assert.equal(
    sun.getAttribute("data-weekend"),
    "true",
    "expected the Sunday article to carry data-weekend=\"true\""
  );
  assert.equal(
    mon.getAttribute("data-weekend"),
    null,
    "expected the Monday article to NOT carry a data-weekend attribute"
  );

  // The article class list is exactly `.staff-day-card` for every day —
  // no `weekend`, no `is-weekend`, no muting modifier of any kind.
  for (const [label, article] of [["sun", sun], ["mon", mon], ["sat", sat]]) {
    const classList = Array.from(article.classList);
    assert.deepEqual(
      classList,
      ["staff-day-card"],
      `${label}: expected article classList to be ["staff-day-card"], got ${JSON.stringify(classList)}`
    );
  }

  // Every weekday and weekend article renders the same head structure:
  // one `.staff-day-head` (no `.weekend` class), one
  // `.staff-day-head-name` eyebrow, one `.staff-day-head-num` day
  // number. No extra elements or modifier classes are permitted.
  for (const [label, article] of [["sun", sun], ["mon", mon], ["sat", sat]]) {
    const { head, eyebrow, dayNumber } = getDayParts(article);
    assert.ok(head, `${label}: expected a .staff-day-head element`);
    assert.ok(eyebrow, `${label}: expected a .staff-day-head-name span`);
    assert.ok(dayNumber, `${label}: expected a .staff-day-head-num strong`);

    const headClasses = Array.from(head.classList);
    assert.ok(
      !headClasses.includes("weekend"),
      `${label}: head should not carry a .weekend class, got ${JSON.stringify(headClasses)}`
    );
    assert.ok(
      !headClasses.includes("is-weekend"),
      `${label}: head should not carry an .is-weekend class, got ${JSON.stringify(headClasses)}`
    );
  }

  // Each pair (Sat vs Mon, Sun vs Mon) must report identical computed
  // values for the four properties the task lists. jsdom does not load
  // `client/src/styles.css`, so the equality reduces to "every unstyled
  // element returns the same defaults" — which is exactly the property
  // the redesign demands. Any future commit that introduces a weekend
  // muting rule via inline styles or a JS-pushed style attribute would
  // diverge these values and trip the assertions.
  for (const [label, weekend] of [["sat", sat], ["sun", sun]]) {
    const monParts = getDayParts(mon);
    const wkParts = getDayParts(weekend);

    assert.equal(
      window.getComputedStyle(wkParts.head).backgroundColor,
      window.getComputedStyle(monParts.head).backgroundColor,
      `${label}: head background-color must equal the Monday head background-color`
    );
    assert.equal(
      window.getComputedStyle(wkParts.eyebrow).fontStyle,
      window.getComputedStyle(monParts.eyebrow).fontStyle,
      `${label}: eyebrow font-style must equal the Monday eyebrow font-style`
    );
    assert.equal(
      window.getComputedStyle(wkParts.eyebrow).fontWeight,
      window.getComputedStyle(monParts.eyebrow).fontWeight,
      `${label}: eyebrow font-weight must equal the Monday eyebrow font-weight`
    );

    // The task literal: `getComputedStyle(satCard).opacity === "1"`.
    // jsdom returns an empty string for `opacity` when no rule sets
    // it, so we accept either `"1"` (the production stylesheet's
    // declared value) or `""` (the unstyled jsdom default). Anything
    // else — `0`, `0.5`, etc. — would mean a JS path or inline style
    // is muting the weekend card, which the redesign forbids.
    const wkOpacity = window.getComputedStyle(wkParts.card).opacity;
    assert.ok(
      wkOpacity === "1" || wkOpacity === "",
      `${label}: card opacity must be "1" (or unset under jsdom), got "${wkOpacity}"`
    );

    // No inline opacity override from JS — the article must not carry
    // a `style="opacity: …"` attribute that would dim the weekend.
    assert.equal(
      wkParts.card.style.opacity,
      "",
      `${label}: card must not carry an inline opacity declaration`
    );

    // The weekend card must NOT push a `--surface-2` background fill
    // through an inline `style` attribute. The CSS contract assertion
    // below locks the same property at the stylesheet level.
    assert.equal(
      wkParts.card.style.backgroundColor,
      "",
      `${label}: card must not carry an inline background-color`
    );
  }
});

test("Property 12 — `.staff-day-card[data-weekend=\"true\"]` CSS rule declares the equality contract", () => {
  // The redesign locks the weekend-equality contract at the stylesheet
  // level even though jsdom cannot resolve the rule at runtime. This
  // test reads `client/src/styles.css` directly and verifies each of
  // the four declarations the design calls out: full opacity, the
  // weekday `--surface` background, an `inherit` head fill, and a
  // `normal` eyebrow font-style. Any future commit that drifts these
  // values (e.g. drops `opacity: 1` or swaps `--surface` for
  // `--surface-2`) breaks this test.
  const cardBody = extractRule(
    STYLES_SOURCE,
    '.staff-day-card[data-weekend="true"] '
  );
  assert.ok(
    cardBody,
    'expected a top-level `.staff-day-card[data-weekend="true"]` rule in styles.css'
  );
  assert.match(
    cardBody,
    /\bopacity:\s*1\s*;/,
    'expected `opacity: 1` in `.staff-day-card[data-weekend="true"]`'
  );
  assert.match(
    cardBody,
    /\bbackground:\s*var\(--surface\)\s*;/,
    'expected `background: var(--surface)` in `.staff-day-card[data-weekend="true"]`'
  );
  // Req. 10.3 — the weekend card must NOT carry the `--surface-2`
  // muted-paper fill the rejected design used for "weekend" tiles.
  assert.doesNotMatch(
    cardBody,
    /var\(--surface-2\)/,
    'expected no `var(--surface-2)` background in `.staff-day-card[data-weekend="true"]`'
  );

  const headBody = extractRule(
    STYLES_SOURCE,
    '.staff-day-card[data-weekend="true"] .staff-day-head '
  );
  assert.ok(
    headBody,
    'expected a top-level `.staff-day-card[data-weekend="true"] .staff-day-head` rule in styles.css'
  );
  assert.match(
    headBody,
    /\bbackground:\s*inherit\s*;/,
    'expected `background: inherit` in the weekend head rule'
  );

  const eyebrowBody = extractRule(
    STYLES_SOURCE,
    '.staff-day-card[data-weekend="true"] .staff-day-head-name '
  );
  assert.ok(
    eyebrowBody,
    'expected a top-level `.staff-day-card[data-weekend="true"] .staff-day-head-name` rule in styles.css'
  );
  assert.match(
    eyebrowBody,
    /\bfont-style:\s*normal\s*;/,
    'expected `font-style: normal` in the weekend eyebrow rule'
  );
});

test("Property 12 — no `.weekend` modifier or weekend-muting selector exists in styles.css", () => {
  // The redesign forbids any weekend-only modifier class. The CSS
  // contract test above asserts the positive declarations; this test
  // asserts the absence of every legacy or alternative selector that
  // could re-introduce weekend muting. If a future commit reaches for
  // `.staff-day-card.weekend`, `.staff-day-card-weekend`, or any rule
  // that targets `.staff-day-card[data-weekend="true"]` with a
  // `--surface-2` background, this test fails.
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\.staff-day-card\.weekend\b/,
    "expected no `.staff-day-card.weekend` selector in styles.css"
  );
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\.staff-day-card-weekend\b/,
    "expected no `.staff-day-card-weekend` selector in styles.css"
  );
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\.staff-day-head\.weekend\b/,
    "expected no `.staff-day-head.weekend` selector in styles.css"
  );

  // No rule of the form `.staff-day-card[data-weekend="true"] { …
  // background: var(--surface-2) … }` may exist anywhere in the
  // stylesheet. A targeted regex catches the rejected pattern even if
  // a future contributor writes it inside a media query.
  const mutingPattern =
    /\.staff-day-card\[data-weekend="true"\][^{]*\{[^}]*background:[^;]*var\(--surface-2\)/;
  assert.doesNotMatch(
    STYLES_SOURCE,
    mutingPattern,
    'expected no rule targeting `.staff-day-card[data-weekend="true"]` with a `--surface-2` background'
  );
});
