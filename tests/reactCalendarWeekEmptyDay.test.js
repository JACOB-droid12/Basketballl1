// Property 9 — empty days render the quiet "Open day / Walang reserbasyon"
// stacked italic helper line.
//
// The redesigned `.staff-day-empty` element strips the legacy dashed
// civic-blue-softer panel: no border, no fill, no `<strong>`, no
// duplicated chrome. Instead it surfaces the bilingual line as a
// stacked pair of 13px italic ink-muted helpers (`Open day` over
// `Walang reserbasyon`) centered inside the day card body. The stack
// is enforced at every viewport width because at the desktop 7-column
// grid each `.staff-day-card` shrinks to ~130px wide and an inline
// `Open day · Walang reserbasyon` line wraps mid-token — stacking
// from the start avoids the awkward wrap.
//
// jsdom does NOT load `client/src/styles.css`, so `getComputedStyle()`
// in this harness reflects only inline-style declarations. The
// computed-style assertions listed in task 6.7 (e.g.
// `borderStyle === "none"`, `backgroundColor === "rgba(0, 0, 0, 0)"`,
// `fontStyle === "italic"`) cannot resolve at runtime when no
// stylesheet is loaded. The test therefore verifies the contract from
// two complementary angles per the task notes:
//
//   1. DOM shape — every empty day card renders a `.staff-day-empty`
//      element that contains both the `.staff-day-empty-en` span (the
//      English `Open day`) and the `.staff-day-empty-fil` span (the
//      Filipino ` · Walang reserbasyon`); contains zero `<strong>`
//      descendants; carries no inline `border`, `background`, or
//      `style` attribute that would push competing chrome from JS.
//      This proves the component does not write the rejected dashed
//      civic-blue-softer panel into the DOM.
//   2. CSS contract — `client/src/styles.css` declares the redesigned
//      `.staff-day-empty` rule with the expected token-bound values
//      (`border: 0`, `background: transparent`, italic 13px sans,
//      `var(--ink-muted)`), declares no legacy
//      `.staff-day-empty strong` rule, and stacks the bilingual halves
//      under a 820px-or-narrower media query. This locks the
//      computed-style contract that jsdom cannot evaluate at runtime.
//
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 14.2 — Property 9.

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

function setViewportWidth(width) {
  // jsdom does not redraw the layout when `innerWidth` changes — the
  // assertion below is structural — but the resize call still gives
  // future jsdom versions (or a switch to a layout-capable shim) a hook
  // to recompute against. Width and height are configurable so test
  // files can flip between breakpoints without contaminating each
  // other.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  document.documentElement.style.width = `${width}px`;
}

function buildScheduleWithEmptyDays({ today }) {
  // Anchor today on Wednesday 2026-05-20. The Sunday-anchored fixture
  // week resolves Sunday at index 0 and Saturday at index 6, leaving
  // Mon/Tue/Wed/Thu/Fri at indices 1..5.
  //
  // We seed reservations into Mon..Fri and leave Sunday and Saturday
  // empty — so exactly two days carry zero items, matching the
  // task's "two days carrying zero items" requirement.
  const days = makeWeekDays(today);
  const cells = days.map(() => ({}));

  for (let dayIndex = 1; dayIndex <= 5; dayIndex += 1) {
    cells[dayIndex] = makeReservationItem({
      reservationId: 600 + dayIndex,
      referenceNo: `BSN-2026-0006${dayIndex.toString().padStart(2, "0")}`,
      representativeName: `Resident ${dayIndex}`,
      purpose: `Practice ${dayIndex}`,
      startTime: `0${dayIndex + 6}:00`,
      endTime: `0${dayIndex + 7}:00`
    });
  }

  return {
    days,
    scheduleResponse: { days, rows: [{ cells }] },
    emptyDayIndices: [0, 6]
  };
}

function getEmptyDayElements(articles, emptyDayIndices) {
  const empties = [];
  for (const index of emptyDayIndices) {
    const article = articles[index];
    assert.ok(article, `expected an article at index ${index}`);
    const empty = article.querySelector(".staff-day-empty");
    assert.ok(
      empty,
      `expected a .staff-day-empty inside the article at index ${index}`
    );
    empties.push(empty);
  }
  return empties;
}

function assertEmptyDayShape(empty) {
  // Both halves render in the DOM regardless of viewport width — the
  // layout always stacks them via `flex-direction: column`.
  const en = empty.querySelector(".staff-day-empty-en");
  const fil = empty.querySelector(".staff-day-empty-fil");

  assert.ok(en, "expected a .staff-day-empty-en span");
  assert.ok(fil, "expected a .staff-day-empty-fil span");

  assert.equal(
    en.textContent,
    "Open day",
    `expected .staff-day-empty-en to read "Open day", got "${en.textContent}"`
  );
  assert.equal(
    fil.textContent,
    "Walang reserbasyon",
    `expected .staff-day-empty-fil to read "Walang reserbasyon", got "${fil.textContent}"`
  );

  // Zero `<strong>` descendants — the legacy `<strong>No bookings</strong>`
  // chrome cannot return.
  assert.equal(
    empty.querySelectorAll("strong").length,
    0,
    "expected zero <strong> descendants inside .staff-day-empty"
  );

  // No inline `style`, `border`, or `background` attribute pushed from
  // the component — the redesign moves all chrome to CSS, which proves
  // the JS does not push the dashed civic-blue-softer panel into the
  // DOM. The component renders a bare `<div className="staff-day-empty">`.
  assert.equal(
    empty.getAttribute("style"),
    null,
    "expected no inline style attribute on .staff-day-empty"
  );
  assert.equal(
    empty.style.borderStyle,
    "",
    "expected no inline border-style on .staff-day-empty"
  );
  assert.equal(
    empty.style.backgroundColor,
    "",
    "expected no inline background-color on .staff-day-empty"
  );
  assert.equal(
    empty.style.borderWidth,
    "",
    "expected no inline border-width on .staff-day-empty"
  );

  // Both halves remain rendered at every viewport width — the visual
  // stacking is a CSS concern, but the DOM contract guarantees both
  // strings reach the staff member as separate text nodes. The middle-
  // dot separator is dropped since the spans no longer sit inline.
  assert.ok(
    empty.textContent.includes("Open day"),
    `expected the empty card to contain "Open day", got "${empty.textContent}"`
  );
  assert.ok(
    empty.textContent.includes("Walang reserbasyon"),
    `expected the empty card to contain "Walang reserbasyon", got "${empty.textContent}"`
  );
}

function extractRule(source, selector) {
  // Returns the raw declaration block (between the matching `{` and
  // `}`) for a top-level rule whose selector list starts with the
  // exact `selector` string. Returns null when no match is found.
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
      const before = cursor === 0 ? "" : source[cursor - 1];
      const charBefore = before;
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

test("Property 9 — empty days render 'Open day' and 'Walang reserbasyon' as stacked spans at 1280px", async () => {
  setViewportWidth(1280);

  const today = "2026-05-20";
  const { scheduleResponse, emptyDayIndices } = buildScheduleWithEmptyDays({ today });

  const { findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  const empties = getEmptyDayElements(articles, emptyDayIndices);
  assert.equal(
    empties.length,
    2,
    `expected exactly two empty days, got ${empties.length}`
  );

  for (const empty of empties) {
    assertEmptyDayShape(empty);
  }
});

test("Property 9 — empty days render the same stacked shape at 819px", async () => {
  setViewportWidth(819);

  const today = "2026-05-20";
  const { scheduleResponse, emptyDayIndices } = buildScheduleWithEmptyDays({ today });

  const { findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  const empties = getEmptyDayElements(articles, emptyDayIndices);
  assert.equal(
    empties.length,
    2,
    `expected exactly two empty days, got ${empties.length}`
  );

  for (const empty of empties) {
    assertEmptyDayShape(empty);
  }
});

test("Property 9 — `.staff-day-empty` CSS rule declares the expected token-bound chrome", () => {
  // jsdom does not load `client/src/styles.css`, so the computed-style
  // assertions listed in the task (`borderStyle === "none"`,
  // `backgroundColor === "rgba(0, 0, 0, 0)"`, `fontStyle === "italic"`,
  // `color: var(--ink-muted)`) cannot resolve at runtime against a
  // mounted component. We lock the contract by reading the stylesheet
  // source directly and asserting the rule body contains each expected
  // declaration. If the rule drifts (e.g. someone reintroduces a
  // dashed border or a `--primary-softer` background), this test fails.
  const body = extractRule(STYLES_SOURCE, ".staff-day-empty ");
  assert.ok(body, "expected a top-level `.staff-day-empty` rule in styles.css");

  // No border — Req. 4.3.
  assert.match(
    body,
    /\bborder:\s*0\s*;/,
    "expected `border: 0` in the `.staff-day-empty` rule"
  );
  // No competing background fill — Req. 4.4. `transparent` resolves to
  // `rgba(0, 0, 0, 0)` per the CSS color spec, matching the
  // task-listed `backgroundColor === "rgba(0, 0, 0, 0)"` assertion.
  assert.match(
    body,
    /\bbackground:\s*transparent\s*;/,
    "expected `background: transparent` in the `.staff-day-empty` rule"
  );
  // 13px italic sans in `--ink-muted` — Req. 4.6.
  assert.match(
    body,
    /\bfont:\s*italic\s+\d+\s+13px\/[\d.]+\s+var\(--font-sans\)\s*;/,
    "expected `font: italic <weight> 13px/<lh> var(--font-sans)` in the `.staff-day-empty` rule"
  );
  assert.match(
    body,
    /\bcolor:\s*var\(--ink-muted\)\s*;/,
    "expected `color: var(--ink-muted)` in the `.staff-day-empty` rule"
  );

  // The rule must NOT carry any of the rejected legacy tokens.
  assert.doesNotMatch(
    body,
    /\bborder-style:\s*dashed\b/,
    "expected no `border-style: dashed` in `.staff-day-empty`"
  );
  assert.doesNotMatch(
    body,
    /var\(--primary-softer\)/,
    "expected no `var(--primary-softer)` background in `.staff-day-empty`"
  );
});

test("Property 9 — legacy `.staff-day-empty strong` rule is absent", () => {
  // Req. 4.5: no `<strong>` descendants. The component already renders
  // none (locked by the DOM-shape assertions above). The legacy CSS
  // selector `.staff-day-empty strong { ... }` — which used to bold a
  // "No bookings" string — must also be gone so even if a future commit
  // were to slip a `<strong>` back in, no chrome would amplify it.
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\.staff-day-empty\s+strong\b/,
    "expected no `.staff-day-empty strong` selector in styles.css"
  );
});

test("Property 9 — `.staff-day-empty` stacks at every viewport via flex-direction: column", () => {
  // The redesigned base rule sets `flex-direction: column` directly so
  // the bilingual halves stack at every viewport width, avoiding the
  // mid-token wrap when narrow day-card columns shrink the card body.
  const body = extractRule(STYLES_SOURCE, ".staff-day-empty ");
  assert.ok(body, "expected a top-level `.staff-day-empty` rule in styles.css");
  assert.match(
    body,
    /\bflex-direction:\s*column\b/,
    "expected `.staff-day-empty` to set `flex-direction: column` so the two halves always stack"
  );
});
