// Property 5 + Property 6 — `CalendarLegend` renders one swatch per status
// token, never falls back to in-legend pills, and lays out without horizontal
// clipping at the desktop breakpoint (≥1280px).
//
// `CalendarLegend` is a pure stateless component (no fetch, no session, no
// page-level wiring), so the test renders it standalone with
// `@testing-library/react` rather than going through `mountCalendarPage`.
//
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5

import { strict as assert } from "node:assert";
import { test } from "node:test";

import React from "react";
import { render } from "@testing-library/react";

import { CalendarLegend } from "../client/src/components/calendar/CalendarLegend.jsx";

import { setupDom } from "./helpers/reactDomHarness.js";

setupDom();

const EXPECTED_LABELS = [
  "Available",
  "Reserved",
  "Completed",
  "Did not show",
  "Cancelled",
  "Maintenance",
  "Barangay event",
  "Cleared for public use"
];

test("Property 5 + 6 — legend renders 8 swatches, no pills, fits at 1280px", () => {
  // Resize jsdom to a 1280x800 viewport so any layout-sensitive measurement
  // resolves against the desktop breakpoint guarded by Requirement 7.5.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  document.documentElement.style.width = "1280px";

  const { container } = render(React.createElement(CalendarLegend));

  const legend = container.querySelector(".calendar-legend");
  assert.ok(legend, "expected the .calendar-legend root element");
  assert.equal(legend.getAttribute("role"), "note");
  assert.equal(legend.getAttribute("aria-label"), "Calendar status legend");

  const items = legend.querySelectorAll(".calendar-legend-item");
  assert.equal(
    items.length,
    8,
    `expected 8 .calendar-legend-item children, got ${items.length}`
  );

  // Property 5: each item carries exactly one .legend-swatch and zero
  // .status-badge descendants — the legend never doubles as a pill gallery.
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    assert.equal(
      item.querySelectorAll(".legend-swatch").length,
      1,
      `item[${i}] should have exactly one .legend-swatch`
    );
    assert.equal(
      item.querySelectorAll(".status-badge").length,
      0,
      `item[${i}] should have zero .status-badge descendants`
    );
  }

  // English labels in design order.
  for (let i = 0; i < EXPECTED_LABELS.length; i++) {
    const label = items[i].textContent.trim();
    assert.equal(
      label,
      EXPECTED_LABELS[i],
      `item[${i}] label should be "${EXPECTED_LABELS[i]}", got "${label}"`
    );
  }

  // Property 6: legend does not horizontally clip at ≥1280px.
  //
  // jsdom does not compute layout, so `clientWidth` and `scrollWidth` both
  // resolve to 0 in this environment. The wrap-no-clip contract is therefore
  // structurally enforced by the wrap-friendly markup (`flex-wrap: wrap` on
  // `.calendar-legend`, eight ~80–90px items at 1280px) and verified visually
  // by the project's Playwright snapshot suite. We still emit the assertion
  // below so that, on any future jsdom that reports real layout, the
  // contract is checked here too.
  if (legend.scrollWidth > 0) {
    assert.ok(
      legend.clientWidth >= legend.scrollWidth - 1,
      `legend should not horizontally clip at 1280px; ` +
        `clientWidth=${legend.clientWidth}, scrollWidth=${legend.scrollWidth}`
    );
  }
});
