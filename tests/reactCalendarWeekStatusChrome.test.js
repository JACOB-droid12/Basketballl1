// Property 2 + Property 3 — every `.staff-booking-block` is free of
// `.status-badge` descendants (the in-block pill is gone), and the
// `CANCELLED` / `MISSED` block names render with `line-through` on the
// computed `text-decoration-line` while a default `RESERVED` block does
// not.
//
// jsdom's `getComputedStyle` does not load external stylesheets, so the
// test injects a minimal `<style>` block that mirrors the rules from
// `client/src/styles.css` for the selectors under test:
//   .staff-booking-block.status-cancelled .staff-booking-name,
//   .staff-booking-block.status-missed   .staff-booking-name {
//     text-decoration-line: line-through;
//   }
//   .staff-booking-block.status-cancelled .staff-booking-time,
//   .staff-booking-block.status-missed   .staff-booking-time {
//     color: rgb(184, 59, 42); /* matches the --danger hex in styles.css */
//   }
// The literal hex (`#B83B2A` → `rgb(184, 59, 42)`) is the same token
// `client/src/styles.css` declares for `--danger`, so the assertion
// stays anchored to the production color even though jsdom resolves
// the inline rule rather than the page stylesheet.
//
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5 — Properties 2, 3

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeWeekDays,
  makeReservationItem,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

// Mirror the production rules so jsdom's `getComputedStyle` returns the
// same `text-decoration-line` and `color` values the real stylesheet
// produces. Inserted once per test process; the harness reuses the
// same document across tests so the rules stay live for every render.
const styleEl = document.createElement("style");
styleEl.textContent = `
  .staff-booking-block.status-cancelled .staff-booking-name,
  .staff-booking-block.status-missed .staff-booking-name {
    text-decoration-line: line-through;
  }
  .staff-booking-block.status-cancelled .staff-booking-time,
  .staff-booking-block.status-missed .staff-booking-time {
    color: rgb(184, 59, 42);
  }
`;
document.head.appendChild(styleEl);

test("Property 2 + 3 — no in-block pill; cancelled/missed strikethrough; reserved unaffected", async () => {
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  // Place one reservation per status on the first four day columns
  // so the test fixture exercises every relevant branch in one render.
  // `cells[index]` aligns with `days[index]` inside `buildItemsByDay()`.
  const cells = days.map((_day, index) => {
    if (index === 0) {
      return makeReservationItem({
        statusCode: "RESERVED",
        statusName: "Reserved",
        startTime: "09:00",
        endTime: "10:00",
        reservationId: 101,
        referenceNo: "BSN-2026-000101"
      });
    }
    if (index === 1) {
      return makeReservationItem({
        statusCode: "CANCELLED",
        statusName: "Cancelled",
        startTime: "10:00",
        endTime: "11:00",
        reservationId: 102,
        referenceNo: "BSN-2026-000102"
      });
    }
    if (index === 2) {
      return makeReservationItem({
        statusCode: "MISSED",
        statusName: "Did not show",
        startTime: "11:00",
        endTime: "12:00",
        reservationId: 103,
        referenceNo: "BSN-2026-000103"
      });
    }
    if (index === 3) {
      return makeReservationItem({
        statusCode: "COMPLETED",
        statusName: "Completed",
        startTime: "12:00",
        endTime: "13:00",
        reservationId: 104,
        referenceNo: "BSN-2026-000104"
      });
    }
    return {};
  });

  const scheduleResponse = { days, rows: [{ cells }] };
  const { container } = mountCalendarPage({ scheduleResponse, today });

  // Allow the page's `useEffect` (`apiRequest('/api/schedule?…')`) to
  // resolve so the rendered tree reflects the stubbed payload.
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const blocks = container.querySelectorAll(".staff-booking-block");
  assert.ok(
    blocks.length >= 4,
    `expected at least 4 .staff-booking-block elements, got ${blocks.length}`
  );

  // Property 2: zero `.status-badge` descendants on every block.
  for (const block of blocks) {
    assert.equal(
      block.querySelectorAll(".status-badge").length,
      0,
      "block must have zero .status-badge descendants"
    );
  }

  // Map each rendered block to its status modifier so the assertions
  // below address one block per status without depending on render
  // order.
  const blockByStatus = {};
  for (const block of blocks) {
    if (block.classList.contains("status-cancelled")) {
      blockByStatus.cancelled = block;
    } else if (block.classList.contains("status-missed")) {
      blockByStatus.missed = block;
    } else if (block.classList.contains("status-completed")) {
      blockByStatus.completed = block;
    } else if (block.classList.contains("status-reserved")) {
      blockByStatus.reserved = block;
    }
  }

  assert.ok(blockByStatus.cancelled, "expected a CANCELLED block");
  assert.ok(blockByStatus.missed, "expected a MISSED block");
  assert.ok(blockByStatus.reserved, "expected a default RESERVED block");

  // Property 3: cancelled and missed names render with `line-through`.
  for (const key of ["cancelled", "missed"]) {
    const block = blockByStatus[key];
    const name = block.querySelector(".staff-booking-name");
    assert.ok(name, `${key}: expected a .staff-booking-name child`);
    const computed = window.getComputedStyle(name);
    const decoration =
      computed.textDecorationLine || computed.textDecoration || "";
    assert.ok(
      /line-through/.test(decoration),
      `${key}: name should be line-through, got "${decoration}"`
    );

    // Property 3 reaffirmation: the cancelled/missed time line carries
    // the production `--danger` color (`#B83B2A` → `rgb(184, 59, 42)`).
    const time = block.querySelector(".staff-booking-time");
    assert.ok(time, `${key}: expected a .staff-booking-time child`);
    const timeColor = window.getComputedStyle(time).color;
    assert.equal(
      timeColor,
      "rgb(184, 59, 42)",
      `${key}: time should use the --danger color, got "${timeColor}"`
    );
  }

  // Negative case: the default RESERVED block must NOT inherit
  // `line-through` and must NOT inherit the danger color.
  const reservedName = blockByStatus.reserved.querySelector(".staff-booking-name");
  assert.ok(reservedName, "reserved: expected a .staff-booking-name child");
  const reservedDecoration =
    window.getComputedStyle(reservedName).textDecorationLine ||
    window.getComputedStyle(reservedName).textDecoration ||
    "";
  assert.ok(
    !/line-through/.test(reservedDecoration),
    `reserved name should NOT be line-through, got "${reservedDecoration}"`
  );

  const reservedTime = blockByStatus.reserved.querySelector(".staff-booking-time");
  assert.ok(reservedTime, "reserved: expected a .staff-booking-time child");
  const reservedColor = window.getComputedStyle(reservedTime).color;
  assert.notEqual(
    reservedColor,
    "rgb(184, 59, 42)",
    "reserved time should NOT use the --danger color"
  );
});
