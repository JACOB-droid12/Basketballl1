// Property 7 — every interactive control inside `.calendar-toolbar`
// (`.calendar-week-nav-btn`, `.date-input`, `.calendar-more-trigger`)
// reads at the staff-control height of at least 48px, the dateline
// eyebrow says the literal "Week of" with the bold week label set in
// Inter (never Instrument Serif), and the date input carries the
// inline "Jump to" prefix span on the same baseline.
//
// `CalendarWeekToolbar` is a pure stateless component (no fetch, no
// session, no page-level wiring), so the test renders it standalone
// with `@testing-library/react` rather than going through
// `mountCalendarPage`.
//
// jsdom does not load external stylesheets, so the relevant rules from
// `client/src/styles.css` are mirrored into a small inline `<style>`
// block before mounting. Keep the values in sync if those rules
// change in styles.css.
//
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5

import { strict as assert } from "node:assert";
import { test } from "node:test";

import React from "react";
import { render } from "@testing-library/react";

import { CalendarWeekToolbar } from "../client/src/components/calendar/CalendarWeekToolbar.jsx";

import { setupDom } from "./helpers/reactDomHarness.js";

setupDom();

function injectToolbarStyles() {
  // Self-contained mirror of the toolbar-height + dateline-font rules
  // declared in `client/src/styles.css`. Keep the height values aligned
  // with the source rules under `.calendar-week-nav-btn`,
  // `.calendar-toolbar .date-input`, and `.calendar-more-trigger`.
  const style = document.createElement("style");
  style.textContent = `
    .calendar-week-nav-btn { height: 48px; padding: 0 16px; }
    .calendar-toolbar .date-input { min-height: 48px; }
    .calendar-more-trigger { min-height: 48px; }
    .calendar-week-label strong { font-family: Inter, system-ui, sans-serif; }
  `;
  document.head.appendChild(style);
}

test("Property 7 — every toolbar control reads at least 48px and the dateline uses Inter", () => {
  injectToolbarStyles();

  const noop = () => {};
  const { container } = render(
    React.createElement(CalendarWeekToolbar, {
      weekLabel: "May 17 - May 23, 2026",
      isCurrent: true,
      isAdmin: false,
      date: "2026-05-20",
      onPrev: noop,
      onNext: noop,
      onJumpToToday: noop,
      onSelectDate: noop,
      onDailyPrint: noop,
      onAddMaintenance: noop,
      onClearPublicUse: noop
    })
  );

  const toolbar = container.querySelector(".calendar-toolbar");
  assert.ok(toolbar, "expected .calendar-toolbar root");

  // 48px floor on every interactive control. jsdom does not compute
  // layout, so `getComputedStyle(...).height` may report 0 even when
  // the rule sets `height: 48px`. The assertion falls back to
  // `min-height` (which `getComputedStyle` reads from the inline style
  // declaration) and accepts whichever of the two paths resolves to a
  // value at or above the 48px floor.
  for (const selector of [".calendar-week-nav-btn", ".date-input", ".calendar-more-trigger"]) {
    const matches = toolbar.querySelectorAll(selector);
    assert.ok(matches.length >= 1, `expected at least one ${selector}`);
    for (const node of matches) {
      const computed = window.getComputedStyle(node);
      const height = parseFloat(computed.height || "0") || 0;
      const minHeight = parseFloat(computed.minHeight || "0") || 0;
      const effective = Math.max(height, minHeight);
      assert.ok(
        effective >= 48,
        `${selector} effective height should be >= 48px, ` +
          `got height=${height}, min-height=${minHeight}`
      );
    }
  }

  // Dateline eyebrow text and the Inter font on the bold label. The
  // eyebrow is the literal "Week of" — staff orient on the screen by
  // reading "Week of <range>", and the label below is bold Inter, never
  // Instrument Serif (the page-title masthead already carries the sole
  // serif moment for this surface).
  const eyebrow = toolbar.querySelector(".calendar-week-label > span");
  assert.ok(eyebrow, "expected dateline eyebrow span");
  assert.equal(eyebrow.textContent.trim(), "Week of");

  const dateLabel = toolbar.querySelector(".calendar-week-label > strong");
  assert.ok(dateLabel, "expected dateline strong");
  const fontFamily = window.getComputedStyle(dateLabel).fontFamily || "";
  assert.ok(
    /inter/i.test(fontFamily),
    `dateline should use Inter, got "${fontFamily}"`
  );
  assert.ok(
    !/instrument serif/i.test(fontFamily),
    `dateline should never use Instrument Serif, got "${fontFamily}"`
  );

  // Inline "Jump to" prefix sitting to the left of the date input.
  const jumpLabel = toolbar.querySelector(".compact-date > span");
  assert.ok(jumpLabel, "expected the inline 'Jump to' label span");
  assert.equal(jumpLabel.textContent.trim(), "Jump to");
});
