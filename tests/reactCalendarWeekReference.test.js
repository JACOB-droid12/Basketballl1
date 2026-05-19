// Property 4 — no `Ref:` line in any block; reference flows through aria-label.
//
// Renders `CalendarPage` with a fixture week anchored on Wednesday
// 2026-05-20 and three reservations carrying real reference numbers
// dropped onto three different day cells. The test asserts:
//
//   (a) No `.staff-booking-block` contains a visible text line
//       beginning with `Ref:` (the rejected design wrote
//       `Ref: BSN-2026-…` as a fourth visible line and that line
//       cannot return). `screen.queryByText(/^Ref:/m)` must return
//       `null`.
//
//   (b) Every reservation block's `aria-label` contains the formatted
//       reference returned by `formatReferenceNo(...)` so the
//       reference still reaches assistive technology even though no
//       visible `Ref:` line renders inside the block.
//
//   (c) Each reservation block renders exactly one `.staff-booking-time`,
//       one `.staff-booking-name`, and one `.staff-booking-purpose` as
//       its only direct text children — three text spans, three
//       classes, no fourth visible line.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5 — Property 4.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { within } from "@testing-library/react";

import { formatReferenceNo } from "../client/src/api/referenceNo.js";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

test("Property 4 — no Ref: line inside block; reference flows through aria-label", async () => {
  // 2026-05-20 falls on a real Wednesday — day index 3 in the
  // Sunday-anchored fixture week. Drop the three reservations onto
  // three different days so each receives its own booking block.
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  const reservationFixtures = [
    {
      reservationId: 201,
      referenceNo: "BSN-2026-000201",
      representativeName: "Maria Santos",
      purpose: "Liga practice",
      startTime: "09:00",
      endTime: "10:00"
    },
    {
      reservationId: 202,
      referenceNo: "BSN-2026-000202",
      representativeName: "Juan Cruz",
      purpose: "Health drive",
      startTime: "10:00",
      endTime: "11:00"
    },
    {
      reservationId: 203,
      referenceNo: "BSN-2026-000203",
      representativeName: "Ana Reyes",
      purpose: "QA full system",
      startTime: "11:00",
      endTime: "12:00"
    }
  ];

  // The page's `rows.length === 0` branch renders an `<EmptyState>`
  // rather than the week grid. To exercise the day-card path we hand
  // the page one row with seven cells; the three reservations sit on
  // three distinct day indexes so the grid renders exactly three
  // `.staff-booking-block` elements.
  const cells = days.map((_day, index) => {
    if (index === 1) return makeReservationItem(reservationFixtures[0]);
    if (index === 2) return makeReservationItem(reservationFixtures[1]);
    if (index === 3) return makeReservationItem(reservationFixtures[2]);
    return {};
  });

  const scheduleResponse = {
    days,
    rows: [{ cells }]
  };

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  // Wait for the schedule fetch to settle and the grid to mount.
  // `findAllByRole("article")` polls until the seven day-card
  // articles exist.
  await findAllByRole("article");

  const blocks = container.querySelectorAll(".staff-booking-block");
  assert.equal(
    blocks.length,
    3,
    `expected 3 reservation blocks, got ${blocks.length}`
  );

  // -------------------------------------------------------------------
  // Property 4a — no visible "Ref:" line in any block.
  // -------------------------------------------------------------------
  // `within(container).queryByText` walks every descendant of the
  // mounted container looking for an element whose normalized text
  // content matches the regex; it returns `null` when nothing
  // matches. The `/^Ref:/m` multiline anchor catches both standalone
  // lines and lines that begin with `Ref:` after a newline.
  assert.equal(
    within(container).queryByText(/^Ref:/m),
    null,
    "expected no element whose text begins with 'Ref:'"
  );

  // Belt-and-suspenders: walk every block and confirm no individual
  // line and no embedded substring contains `Ref:`. This catches
  // edge cases where the text might be rendered inside a deeply
  // nested element that `queryByText` could miss.
  for (const block of blocks) {
    const text = block.textContent || "";
    const lines = text.split(/\n/);
    for (const line of lines) {
      assert.ok(
        !/^\s*Ref:/.test(line),
        `block should not contain a "Ref:" line, got "${line}"`
      );
    }
    assert.ok(
      !/Ref:\s/.test(text),
      `block should not contain "Ref: " text anywhere, got "${text}"`
    );
  }

  // -------------------------------------------------------------------
  // Property 4b — every reservation block's aria-label includes the
  // formatted reference number from `formatReferenceNo()`.
  // -------------------------------------------------------------------
  for (const fixture of reservationFixtures) {
    const formatted = formatReferenceNo(fixture.referenceNo);
    const block = Array.from(blocks).find((candidate) => {
      const ariaLabel = candidate.getAttribute("aria-label") || "";
      return ariaLabel.includes(fixture.representativeName);
    });

    assert.ok(
      block,
      `expected to find a reservation block for ${fixture.representativeName}`
    );

    const ariaLabel = block.getAttribute("aria-label") || "";
    assert.ok(
      ariaLabel.includes(formatted),
      `block aria-label should include "${formatted}", got "${ariaLabel}"`
    );
  }

  // -------------------------------------------------------------------
  // Property 4c — each block renders exactly one .staff-booking-time,
  // .staff-booking-name, and .staff-booking-purpose as its three
  // visible text spans.
  // -------------------------------------------------------------------
  for (const block of blocks) {
    assert.equal(
      block.querySelectorAll(":scope > .staff-booking-time").length,
      1,
      "expected exactly one .staff-booking-time direct child"
    );
    assert.equal(
      block.querySelectorAll(":scope > .staff-booking-name").length,
      1,
      "expected exactly one .staff-booking-name direct child"
    );
    assert.equal(
      block.querySelectorAll(":scope > .staff-booking-purpose").length,
      1,
      "expected exactly one .staff-booking-purpose direct child"
    );
  }
});
