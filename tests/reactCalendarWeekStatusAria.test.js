// Property 10 — status word reaches assistive technology.
//
// Renders `CalendarPage` with one reservation per status code
// (RESERVED, CANCELLED, MISSED, COMPLETED) and one block per block
// type (MAINTENANCE, BARANGAY_EVENT, CLEARED_PUBLIC_USE) — seven
// items spread across the seven days of the visible week so each
// item lands on its own `.staff-day-card`. For every rendered
// `.staff-booking-block` the test asserts that the block's
// `aria-label` attribute contains the human status label returned by
// `getStatusDisplay(statusCode, statusName).label`, even though no
// `.status-badge` element renders inside any block (Property 2 lock).
//
// The test maps each rendered block to its source item by day-card
// position: `cells[i]` flows through `buildItemsByDay()` into
// `days[i]`, the page renders day cards in that same order, and each
// card carries exactly one block in this fixture. That gives a
// deterministic source-item-to-rendered-block pairing without
// relying on any CSS modifier class.
//
// Validates: Requirements 11.1, 11.2, 11.3 — Property 10.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getStatusDisplay } from "../client/src/api/statusDisplay.js";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeBlockItem,
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

test("Property 10 — every staff-booking-block aria-label contains getStatusDisplay().label", async () => {
  // 2026-05-20 is a real Wednesday, so the Sunday-anchored fixture
  // week spans 2026-05-17 (Sun) through 2026-05-23 (Sat). Each of
  // the seven items below sits on a distinct day so each ends up in
  // its own `.staff-day-card` — that gives the test a one-to-one
  // pairing between source items and rendered blocks without
  // depending on per-day sort order.
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  // Seven source items, one per day. Statuses cover every reservation
  // code (RESERVED, CANCELLED, MISSED, COMPLETED) and every block
  // type (MAINTENANCE, BARANGAY_EVENT, CLEARED_PUBLIC_USE).
  // `statusName` is provided explicitly so the expected label is the
  // same human string staff would read in the legend, exercising the
  // primary `pickLabel()` branch in `getStatusDisplay()`.
  const sourceItems = [
    {
      kind: "reservation",
      statusCode: "RESERVED",
      statusName: "Reserved",
      payload: makeReservationItem({
        statusCode: "RESERVED",
        statusName: "Reserved",
        startTime: "08:00",
        endTime: "09:00",
        reservationId: 301,
        referenceNo: "BSN-2026-000301",
        representativeName: "Reserved Resident",
        purpose: "Liga practice"
      })
    },
    {
      kind: "reservation",
      statusCode: "CANCELLED",
      statusName: "Cancelled",
      payload: makeReservationItem({
        statusCode: "CANCELLED",
        statusName: "Cancelled",
        startTime: "09:00",
        endTime: "10:00",
        reservationId: 302,
        referenceNo: "BSN-2026-000302",
        representativeName: "Cancelled Resident",
        purpose: "Cancelled jam"
      })
    },
    {
      kind: "reservation",
      statusCode: "MISSED",
      statusName: "Did not show",
      payload: makeReservationItem({
        statusCode: "MISSED",
        statusName: "Did not show",
        startTime: "10:00",
        endTime: "11:00",
        reservationId: 303,
        referenceNo: "BSN-2026-000303",
        representativeName: "Missed Resident",
        purpose: "No-show booking"
      })
    },
    {
      kind: "reservation",
      statusCode: "COMPLETED",
      statusName: "Completed",
      payload: makeReservationItem({
        statusCode: "COMPLETED",
        statusName: "Completed",
        startTime: "11:00",
        endTime: "12:00",
        reservationId: 304,
        referenceNo: "BSN-2026-000304",
        representativeName: "Completed Resident",
        purpose: "Closed booking"
      })
    },
    {
      kind: "block",
      statusCode: "MAINTENANCE",
      statusName: "Maintenance",
      payload: makeBlockItem({
        blockType: "MAINTENANCE",
        statusCode: "MAINTENANCE",
        statusName: "Maintenance",
        startTime: "06:00",
        endTime: "07:00",
        blockId: 401,
        reason: "Court repair"
      })
    },
    {
      kind: "block",
      statusCode: "BARANGAY_EVENT",
      statusName: "Barangay event",
      payload: makeBlockItem({
        blockType: "BARANGAY_EVENT",
        statusCode: "BARANGAY_EVENT",
        statusName: "Barangay event",
        startTime: "07:00",
        endTime: "08:00",
        blockId: 402,
        reason: "Barangay assembly"
      })
    },
    {
      kind: "block",
      statusCode: "CLEARED_PUBLIC_USE",
      statusName: "Cleared for public use",
      payload: makeBlockItem({
        blockType: "CLEARED_PUBLIC_USE",
        statusCode: "CLEARED_PUBLIC_USE",
        statusName: "Cleared for public use",
        startTime: "12:00",
        endTime: "13:00",
        blockId: 403,
        reason: "Open court hours"
      })
    }
  ];

  // The page's `buildItemsByDay()` uses `cells[i]` to populate
  // `days[i]`, so spreading the seven items across the seven cell
  // slots places each item on its own day card.
  const cells = sourceItems.map((entry) => entry.payload);
  const scheduleResponse = { days, rows: [{ cells }] };

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  // Wait for the schedule fetch to settle and the seven day cards
  // to render.
  const articles = await findAllByRole("article");
  assert.equal(
    articles.length,
    7,
    `expected 7 day-card articles, got ${articles.length}`
  );

  // Seven items, seven days, exactly seven booking blocks.
  const blocks = container.querySelectorAll(".staff-booking-block");
  assert.equal(
    blocks.length,
    7,
    `expected 7 .staff-booking-block elements, got ${blocks.length}`
  );

  // Property 2 spillover: the "even though no `.status-badge` renders
  // inside any block" clause from the task. Lock the no-pill contract
  // alongside Property 10 so the aria-label path stays the only way
  // the status word reaches assistive technology.
  assert.equal(
    container.querySelectorAll(".staff-booking-block .status-badge").length,
    0,
    "no .staff-booking-block should contain a .status-badge descendant"
  );

  // Pair each source item with its rendered block via day-card index.
  // Each article carries exactly one block in this fixture, so the
  // first `.staff-booking-block` inside `articles[i]` is the block
  // produced by `sourceItems[i]`.
  for (let index = 0; index < sourceItems.length; index += 1) {
    const entry = sourceItems[index];
    const article = articles[index];
    const block = article.querySelector(".staff-booking-block");

    assert.ok(
      block,
      `expected day card ${index} (${days[index].date}) to render a .staff-booking-block for ${entry.statusCode}`
    );

    // Property 10: aria-label must contain the human status label
    // returned by `getStatusDisplay()`, regardless of whether the
    // block represents a reservation or a schedule block.
    const expected = getStatusDisplay(entry.statusCode, entry.statusName).label;
    const ariaLabel = block.getAttribute("aria-label") || "";

    assert.ok(
      ariaLabel.includes(expected),
      `block for ${entry.statusCode} should have aria-label containing "${expected}", got "${ariaLabel}"`
    );
  }
});
