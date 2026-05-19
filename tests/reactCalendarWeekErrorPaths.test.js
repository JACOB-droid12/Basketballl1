// Requirement 15 — no new error paths, plus the strict design-system
// adherence guards from Requirement 12.4 / 12.5 (no `backdrop-filter`,
// no `background-clip: text`).
//
// Four scenarios are exercised in this file:
//
//   1. The schedule fetch rejects (or returns a non-ok response).
//      `CalendarPage.jsx` propagates the thrown `Error` through the
//      page's existing `state.error` slot, which renders the existing
//      `<div class="alert error" role="alert">` primitive carrying the
//      error message. No additional error indicator surfaces.
//
//   2. The schedule fetch resolves with `{ rows: [], days: [...] }`.
//      The page's `rows.length === 0` branch renders the existing
//      `<EmptyState>` component with the title `No schedule slots
//      found`, and the alert primitive does NOT render alongside it.
//
//   3. A reservation arrives with a malformed `startTime` (the empty
//      string). `displayRange()` in `client/src/components/calendar/
//      calendarHelpers.js` returns the literal string `Time
//      unavailable` whenever either bound fails the time-of-day
//      validation. The booking block must render the `Time
//      unavailable` literal in its `.staff-booking-time` slot AND
//      still render the representative name and purpose underneath.
//
//   4. No element rendered by the calendar surface has a non-`none`
//      `backdrop-filter`, and no element renders text via
//      `background-clip: text`. jsdom does not load
//      `client/src/styles.css`, so the runtime-style assertion
//      additionally locks down the stylesheet source: no
//      `backdrop-filter:` declaration appears anywhere in the file,
//      and no `background-clip: text` declaration appears anywhere
//      in the file.
//
// Validates: Requirements 12.4, 12.5, 13.1, 13.2, 15.1, 15.2, 15.3,
// 15.4.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { render, waitFor } from "@testing-library/react";

import { CalendarPage } from "../client/src/pages/CalendarPage.jsx";
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
// Test 1 — schedule fetch rejects
// ---------------------------------------------------------------------------

test("Requirement 15.1 — schedule fetch failure renders the existing alert primitive only", async () => {
  // Render `CalendarPage` directly via `@testing-library/react` with a
  // hand-rolled `globalThis.fetch` stub so the schedule branch returns
  // a non-ok response. We avoid `mountCalendarPage` here because that
  // helper always returns ok=200 from its internal stub, leaving no
  // path to drive the page's `state.error` slot.
  //
  // `apiRequest()` (see `client/src/api/client.js`) reads the JSON
  // body, then — when `response.ok === false` — throws an `Error`
  // whose message is the `error` field returned by the server. The
  // page's `useEffect` catches that error and stores `error.message`
  // in `state.error`, which the resting render writes into the alert
  // primitive verbatim.

  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (isAbsoluteHttpUrl(url) && typeof originalFetch === "function") {
      return originalFetch(input, init);
    }

    const path = toRequestPath(url);
    if (path.startsWith("/api/schedule")) {
      return jsonResponse({ error: "Schedule fetch failed" }, { ok: false, status: 500 });
    }
    if (path.startsWith("/api/session")) {
      return jsonResponse({ authenticated: false, user: null });
    }

    return jsonResponse({}, { ok: false, status: 404 });
  };

  // Pin `Date.now()` so `getManilaDate()` resolves deterministically.
  // 04:00 UTC sits at noon Manila on 2026-05-20, comfortably inside
  // the day in every timezone the page formats with.
  const fixed = Date.parse("2026-05-20T04:00:00.000Z");
  Date.now = () => fixed;

  // Restore globals after the assertions run, regardless of outcome.
  // Using a single afterEach scoped to this test keeps the clean-up
  // local to the rejecting-fetch branch and does not contaminate the
  // other tests in this file (Tests 2-4 use `mountCalendarPage`,
  // which installs and restores its own stubs through the harness).
  afterEach(() => {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  });

  const onNavigate = () => {};
  const { container, findByRole } = render(
    React.createElement(CalendarPage, { onNavigate })
  );

  // Wait for the schedule fetch to settle and the alert primitive to
  // appear. `findByRole` polls until the alert is mounted.
  const alert = await findByRole("alert");

  // Req. 15.1 — alert primitive renders with role="alert" and the
  // exact `<div class="alert error">` chrome.
  assert.equal(
    alert.getAttribute("role"),
    "alert",
    `expected role="alert", got "${alert.getAttribute("role")}"`
  );
  assert.ok(
    alert.classList.contains("alert"),
    "expected the alert primitive to carry the .alert class"
  );
  assert.ok(
    alert.classList.contains("error"),
    "expected the alert primitive to carry the .error class"
  );

  // The alert text must contain the error message returned by the
  // backend's `error` field. `apiRequest()` wraps the JSON `error`
  // field into the thrown Error's message verbatim, and the page's
  // `setState` writes `error.message` into `state.error`, which the
  // alert renders.
  assert.match(
    alert.textContent,
    /Schedule fetch failed/,
    `expected the alert text to include "Schedule fetch failed", got "${alert.textContent}"`
  );

  // Req. 15.4 — exactly one `.alert.error` element renders, and no
  // other error-indicator surface coexists with it.
  assert.equal(
    container.querySelectorAll(".alert.error").length,
    1,
    "expected exactly one .alert.error element"
  );
  assert.equal(
    container.querySelectorAll(".staff-week-grid").length,
    0,
    "expected no .staff-week-grid alongside the alert (Req. 15.4)"
  );
  // The empty-state surface must not render alongside the alert
  // either; its title (`No schedule slots found`) cannot appear.
  assert.equal(
    container.querySelectorAll(".state-card.empty").length,
    0,
    "expected no <EmptyState> alongside the alert (Req. 15.4)"
  );
});

// ---------------------------------------------------------------------------
// Test 2 — schedule fetch returns zero rows
// ---------------------------------------------------------------------------

test("Requirement 15.2 — empty schedule renders <EmptyState> only, no alert primitive", async () => {
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  const { container, findByRole } = mountCalendarPage({
    scheduleResponse: { days, rows: [] },
    today
  });

  // The empty-state primitive renders an `<h2>` with the title text.
  // `findByRole("heading", { name: ... })` polls until that heading
  // appears, which is the page's signal that the schedule fetch has
  // settled into the rows.length === 0 branch.
  const heading = await findByRole("heading", { name: "No schedule slots found" });
  assert.ok(heading, "expected an <h2>No schedule slots found</h2> heading");

  // Req. 15.2 — exactly one `<EmptyState>` (matched by its
  // `.state-card.empty` root) renders, and no alert primitive
  // accompanies it.
  const emptyStates = container.querySelectorAll(".state-card.empty");
  assert.equal(
    emptyStates.length,
    1,
    `expected exactly one .state-card.empty element, got ${emptyStates.length}`
  );
  assert.equal(
    container.querySelectorAll(".alert.error").length,
    0,
    "expected zero .alert.error elements when the schedule succeeds (Req. 15.2)"
  );
  // The week grid must NOT render either — the empty-state branch
  // is the *only* surface that paints when rows is empty.
  assert.equal(
    container.querySelectorAll(".staff-week-grid").length,
    0,
    "expected no .staff-week-grid when the schedule has zero rows"
  );
});

// ---------------------------------------------------------------------------
// Test 3 — malformed startTime falls back to "Time unavailable"
// ---------------------------------------------------------------------------

test("Requirement 15.3 — malformed startTime renders 'Time unavailable' with name and purpose intact", async () => {
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  // Anchor the malformed reservation on Wednesday (index 3) so the
  // day-card test fixture follows the same shape as the other
  // calendar suites. Empty `startTime` fails the `^\d{1,2}:\d{2}$`
  // pattern in `calendarHelpers.js`'s `isValidTimeOfDay()`, which
  // sends `displayRange()` down its fallback branch and returns the
  // literal `"Time unavailable"`.
  const cells = days.map(() => ({}));
  cells[3] = makeReservationItem({
    reservationId: 9201,
    referenceNo: "BSN-2026-009201",
    representativeName: "Test Resident",
    purpose: "Test purpose",
    startTime: "",
    endTime: "08:00",
    statusCode: "RESERVED",
    statusName: "Reserved"
  });

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse: { days, rows: [{ cells }] },
    today
  });

  // Wait for the schedule fetch to settle and the seven day-card
  // articles to mount.
  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  // The malformed reservation lands inside the Wednesday article.
  const wedArticle = articles[3];
  const block = wedArticle.querySelector(".staff-booking-block");
  assert.ok(
    block,
    "expected the Wednesday article to render exactly one .staff-booking-block"
  );

  // Req. 15.3 — `.staff-booking-time` reads exactly `Time unavailable`.
  const time = block.querySelector(".staff-booking-time");
  assert.ok(time, "expected a .staff-booking-time span on the malformed block");
  assert.equal(
    time.textContent,
    "Time unavailable",
    `expected .staff-booking-time to read "Time unavailable", got "${time.textContent}"`
  );

  // Req. 15.3 — the booking block still renders the rest of its
  // content. The representative name and purpose must remain
  // visible in their respective slots.
  const name = block.querySelector(".staff-booking-name");
  assert.ok(name, "expected a .staff-booking-name span on the malformed block");
  assert.equal(
    name.textContent,
    "Test Resident",
    `expected .staff-booking-name to read "Test Resident", got "${name.textContent}"`
  );

  const purpose = block.querySelector(".staff-booking-purpose");
  assert.ok(purpose, "expected a .staff-booking-purpose span on the malformed block");
  assert.equal(
    purpose.textContent,
    "Test purpose",
    `expected .staff-booking-purpose to read "Test purpose", got "${purpose.textContent}"`
  );

  // No new error indicator (Req. 15.4) — the alert primitive must not
  // appear just because one block fell through to the time-unavailable
  // fallback.
  assert.equal(
    container.querySelectorAll(".alert.error").length,
    0,
    "expected no .alert.error when only the time-unavailable fallback fires"
  );
});

// ---------------------------------------------------------------------------
// Test 4 — no glass / no gradient text anywhere on the surface
// ---------------------------------------------------------------------------

test("Requirements 12.4, 12.5 — no element carries a non-none backdrop-filter or background-clip: text", async () => {
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  // Seed the week with a few reservations so the assertion walks a
  // realistic DOM tree: toolbar, legend, week grid, and several day
  // cards with booking blocks.
  const cells = days.map(() => ({}));
  cells[1] = makeReservationItem({
    reservationId: 9301,
    referenceNo: "BSN-2026-009301",
    representativeName: "Resident Mon",
    purpose: "Practice Mon",
    startTime: "07:00",
    endTime: "08:00"
  });
  cells[3] = makeReservationItem({
    reservationId: 9302,
    referenceNo: "BSN-2026-009302",
    representativeName: "Resident Wed",
    purpose: "Practice Wed",
    startTime: "09:00",
    endTime: "10:00"
  });
  cells[5] = makeReservationItem({
    reservationId: 9303,
    referenceNo: "BSN-2026-009303",
    representativeName: "Resident Fri",
    purpose: "Practice Fri",
    startTime: "14:00",
    endTime: "15:00"
  });

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse: { days, rows: [{ cells }] },
    today
  });

  // Wait for the grid to mount so every interesting element is
  // present in the tree before we walk it.
  await findAllByRole("article");
  await waitFor(() => {
    assert.ok(
      container.querySelector(".staff-week-grid"),
      "expected the week grid to render before walking the tree"
    );
  });

  // Walk every element and assert the runtime-style contract. jsdom
  // returns the empty string for unset properties, which is the
  // task-listed equivalent of `none` for both `backdropFilter` and
  // `backgroundClip` (the spec defines unset values as the initial
  // value `none` for backdrop-filter and `border-box` for
  // background-clip — neither of those equal `text`).
  const elements = container.querySelectorAll("*");
  for (const el of elements) {
    const computed = getComputedStyle(el);

    // Req. 12.4 — every element renders a computed `backdrop-filter`
    // of `none`. jsdom returns `""` when no rule sets the property,
    // which is the task-listed equivalent of `none`.
    const backdrop = computed.backdropFilter || "";
    assert.ok(
      backdrop === "none" || backdrop === "",
      `expected backdrop-filter to be "none" or "" on every element; got "${backdrop}" on <${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ""}>`
    );

    // Req. 12.5 — no element renders text via
    // `background-clip: text`. jsdom returns `""` when no rule sets
    // the property; only the literal `text` value is forbidden.
    const clip = computed.backgroundClip || "";
    assert.notEqual(
      clip,
      "text",
      `expected background-clip !== "text" on every element; got "text" on <${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ""}>`
    );
  }
});

test("Requirements 12.4, 12.5 — no `backdrop-filter` or `background-clip: text` declarations exist in styles.css", () => {
  // jsdom does not load `client/src/styles.css`, so the runtime-style
  // walk above only catches inline `style` attributes pushed by JS.
  // The CSS-source assertion locks the contract at the stylesheet
  // level: even if a future commit adds a `backdrop-filter: blur(…)`
  // or `background-clip: text` rule, this test fails at the source
  // level before the runtime walk gets a chance to evaluate it.
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\bbackdrop-filter\s*:/,
    "expected no `backdrop-filter:` declaration anywhere in client/src/styles.css (Req. 12.4)"
  );
  assert.doesNotMatch(
    STYLES_SOURCE,
    /\bbackground-clip\s*:\s*text\b/,
    "expected no `background-clip: text` declaration anywhere in client/src/styles.css (Req. 12.5)"
  );
});

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers()
  };
}

function toRequestPath(url) {
  if (!isAbsoluteHttpUrl(url)) return url;

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isAbsoluteHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}
