// Property 11 — single roving tabindex inside `.staff-week-grid`.
//
// The redesigned week grid behaves as a single Tab stop: exactly one
// `[tabindex="0"]` descendant lives inside `.staff-week-grid` at any
// time and arrow keys move that focus inside the grid. Staff press Tab
// once to enter the grid and arrow keys to traverse the focusable
// booking blocks; they never have to Tab through every booking block
// in the visible week to leave.
//
// Fixture: days at indexes 1 (Mon), 3 (Wed), and 5 (Fri) carry 2
// reservations each. Days 0, 2, 4, and 6 are empty so the ArrowRight
// skip-empty behaviour can be observed against three non-empty columns
// with two focusable rows each.
//
// Keyboard contract under test (`useRovingTabindex.js`):
//   - On mount, the hook sweeps every focusable descendant of the
//     grid to `tabindex="-1"` and promotes the first focusable child
//     of the first non-empty column to `tabindex="0"`.
//   - On keydown, ArrowRight / ArrowLeft cross day columns (skipping
//     empty ones), ArrowDown / ArrowUp move within the focused column,
//     and Home / End jump to the first / last block in the focused
//     column. The hook re-runs the tabindex sweep so the grid still
//     contains exactly one `[tabindex="0"]` descendant after each key.
//   - The hook does NOT preventDefault on Enter, so pressing Enter
//     while a reservation block is focused falls through to the
//     native button click flow, which fires the block's `onClick` —
//     the page wires that handler through to the reservation detail drawer.
//
// jsdom caveat: `el.focus()` does not always update `document.activeElement`
// synchronously inside a userEvent keystroke chain. The arrow-key
// assertions therefore dispatch `keydown` events directly on the
// focused element with `fireEvent.keyDown(focused, { key })`. The hook
// reads `event.target` to choose the next focus target, so dispatching
// against the freshly-promoted element matches what a real browser
// would deliver.
//
// Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 — Property 11.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { fireEvent } from "@testing-library/react";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

test("Property 11 — single roving tabindex; arrow/Home/End/Enter navigation", async () => {
  // 2026-05-20 falls on a real Wednesday. The Sunday-anchored fixture
  // week resolves Mon at index 1, Wed at index 3, and Fri at index 5.
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  assert.equal(days[1].name, "Mon", "expected day index 1 to be Monday");
  assert.equal(days[3].name, "Wed", "expected day index 3 to be Wednesday");
  assert.equal(days[5].name, "Fri", "expected day index 5 to be Friday");

  // Days at indexes 1, 3, 5 each carry 2 reservations. Sunday (0),
  // Tuesday (2), Thursday (4), and Saturday (6) carry zero items so
  // ArrowRight has to skip them.
  const fixtures = [
    {
      dayIndex: 1,
      reservations: [
        {
          reservationId: 1101,
          referenceNo: "BSN-2026-001101",
          representativeName: "Mon Resident A",
          purpose: "Liga AM",
          startTime: "07:00",
          endTime: "08:00"
        },
        {
          reservationId: 1102,
          referenceNo: "BSN-2026-001102",
          representativeName: "Mon Resident B",
          purpose: "Liga Mid",
          startTime: "10:00",
          endTime: "11:00"
        }
      ]
    },
    {
      dayIndex: 3,
      reservations: [
        {
          reservationId: 1301,
          referenceNo: "BSN-2026-001301",
          representativeName: "Wed Resident A",
          purpose: "QA AM",
          startTime: "07:00",
          endTime: "08:00"
        },
        {
          reservationId: 1302,
          referenceNo: "BSN-2026-001302",
          representativeName: "Wed Resident B",
          purpose: "QA Mid",
          startTime: "10:00",
          endTime: "11:00"
        }
      ]
    },
    {
      dayIndex: 5,
      reservations: [
        {
          reservationId: 1501,
          referenceNo: "BSN-2026-001501",
          representativeName: "Fri Resident A",
          purpose: "Drive AM",
          startTime: "07:00",
          endTime: "08:00"
        },
        {
          reservationId: 1502,
          referenceNo: "BSN-2026-001502",
          representativeName: "Fri Resident B",
          purpose: "Drive Mid",
          startTime: "10:00",
          endTime: "11:00"
        }
      ]
    }
  ];

  // One row per reservation, with `cells[dayIndex]` populated for the
  // appropriate day. The page's `buildItemsByDay()` reads
  // `cell?.reservation` from each cell, so this layout produces three
  // non-empty day columns each carrying two booking blocks.
  const rows = [];
  for (const fixture of fixtures) {
    for (const reservation of fixture.reservations) {
      const cells = days.map(() => ({}));
      cells[fixture.dayIndex] = makeReservationItem(reservation);
      rows.push({ cells });
    }
  }

  const navigationCalls = [];
  const onNavigate = (path) => navigationCalls.push(path);

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse: { days, rows },
    today,
    onNavigate
  });

  // Wait for the schedule fetch to settle and the grid to mount, then
  // give the roving sweep `useEffect` a tick to run.
  await findAllByRole("article");
  await new Promise((resolve) => setTimeout(resolve, 0));

  const grid = container.querySelector(".staff-week-grid");
  assert.ok(grid, "expected the .staff-week-grid root");

  const columns = Array.from(grid.querySelectorAll(".staff-day-card"));
  assert.equal(columns.length, 7, `expected 7 .staff-day-card columns, got ${columns.length}`);

  const monColumn = columns[1];
  const wedColumn = columns[3];
  const friColumn = columns[5];

  const monBlocks = Array.from(monColumn.querySelectorAll(".staff-booking-block"));
  const wedBlocks = Array.from(wedColumn.querySelectorAll(".staff-booking-block"));
  const friBlocks = Array.from(friColumn.querySelectorAll(".staff-booking-block"));
  assert.equal(monBlocks.length, 2, "Monday should render 2 booking blocks");
  assert.equal(wedBlocks.length, 2, "Wednesday should render 2 booking blocks");
  assert.equal(friBlocks.length, 2, "Friday should render 2 booking blocks");

  // Helper that re-queries the grid for the sole `[tabindex="0"]`
  // descendant and asserts there is exactly one. Returns the live
  // element so each step of the keystroke chain operates on whatever
  // the hook just promoted.
  function assertSingleRoving(label) {
    const zeros = grid.querySelectorAll('[tabindex="0"]');
    assert.equal(
      zeros.length,
      1,
      `${label}: expected exactly one [tabindex="0"] inside .staff-week-grid, got ${zeros.length}`
    );
    return zeros[0];
  }

  // ---------------------------------------------------------------
  // Initial render — Property 11 (Req. 8.1) plus the resting-member
  // contract from `useRovingTabindex.js`: the first focusable child
  // of the first non-empty column carries tabindex="0".
  // ---------------------------------------------------------------
  let current = assertSingleRoving("initial render");
  assert.equal(
    current,
    monBlocks[0],
    "initial [tabindex=0] should be the first booking block in Monday (the first non-empty column)"
  );
  assert.ok(
    current.classList.contains("staff-booking-block"),
    "initial [tabindex=0] should be a .staff-booking-block element"
  );

  // ---------------------------------------------------------------
  // ArrowRight — Req. 8.2. From Monday's first block focus moves to
  // the first focusable child of the next non-empty column. Tuesday
  // is empty, so the next non-empty column is Wednesday.
  // ---------------------------------------------------------------
  current.focus();
  fireEvent.keyDown(current, { key: "ArrowRight" });
  current = assertSingleRoving("after ArrowRight");
  assert.equal(
    current,
    wedBlocks[0],
    "ArrowRight should skip the empty Tuesday column and land on Wednesday's first block"
  );

  // ---------------------------------------------------------------
  // ArrowDown — Req. 8.3. Focus moves to the next focusable block in
  // the same column.
  // ---------------------------------------------------------------
  fireEvent.keyDown(current, { key: "ArrowDown" });
  current = assertSingleRoving("after ArrowDown");
  assert.equal(
    current,
    wedBlocks[1],
    "ArrowDown should move focus to the second block in the same (Wednesday) column"
  );

  // ---------------------------------------------------------------
  // Home — Req. 8.4. From Wednesday's second block, Home jumps to the
  // first block in the focused column.
  // ---------------------------------------------------------------
  fireEvent.keyDown(current, { key: "Home" });
  current = assertSingleRoving("after Home");
  assert.equal(
    current,
    wedBlocks[0],
    "Home should jump focus to the first block in the focused (Wednesday) column"
  );

  // ---------------------------------------------------------------
  // End — Req. 8.5. From Wednesday's first block, End jumps to the
  // last block in the focused column.
  // ---------------------------------------------------------------
  fireEvent.keyDown(current, { key: "End" });
  current = assertSingleRoving("after End");
  assert.equal(
    current,
    wedBlocks[wedBlocks.length - 1],
    "End should jump focus to the last block in the focused (Wednesday) column"
  );

  // ---------------------------------------------------------------
  // Enter — Req. 8.6. The hook does not preventDefault on Enter, so
  // the native button click flow runs and the reservation block's
  // onClick handler (wired to `onNavigate('/reservations/${id}')`)
  // fires. jsdom does not synthesize a click from a synthetic
  // keydown, so dispatch a click event directly on the focused
  // button — this is the same DOM call the browser would make in
  // response to Enter on a `<button>` and exercises the same code
  // path the hook delegates to.
  // ---------------------------------------------------------------
  // The currently focused button is Wednesday's second reservation
  // (`reservationId === 1302`) so the detail drawer should open for
  // that resident without changing routes.
  fireEvent.click(current);
  assert.deepEqual(navigationCalls, [], "calendar detail activation should stay in-page");
  assert.ok(
    container.textContent.includes("Wed Resident B"),
    "expected the reservation detail drawer to show Wednesday's second reservation"
  );

  // Final invariant — the grid still has exactly one [tabindex="0"]
  // descendant after the activation step.
  assertSingleRoving("after Enter activation");
});
