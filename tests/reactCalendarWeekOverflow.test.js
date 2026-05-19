// Property 8 — per-day overflow tile beyond 4 bookings; drawer opens with the
// full list when the staff member activates the overflow tile.
//
// The redesigned `CalendarDayColumn` caps visible booking blocks at 4 per day
// and surfaces the remainder behind a single `.staff-day-overflow` button.
// Activating that button opens the `CalendarDayDrawer` with every item for
// the day so staff never lose access to the hidden bookings.
//
// Wednesday 2026-05-20 is anchored as `today` and seeded with 6 reservations;
// Thursday 2026-05-21 is seeded with exactly 4 reservations as the negative
// case. The schedule API returns one row per cell and indexes into
// `cells[index]` per day, so each reservation lives on its own row with a
// single populated cell on the corresponding day's column.
//
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5 — Property 8.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { userEvent } from "@testing-library/user-event";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

test("Property 8 — overflow tile beyond 4 bookings; drawer opens with full list", async () => {
  // 2026-05-20 falls on a real Wednesday. The Sunday-anchored fixture week
  // resolves Wednesday at index 3 and Thursday at index 4.
  const today = "2026-05-20";
  const days = makeWeekDays(today);
  const wednesdayIndex = days.findIndex((day) => day.date === today);
  const thursdayIndex = wednesdayIndex + 1;

  assert.equal(days[wednesdayIndex].name, "Wed", "expected day index 3 to be Wednesday");
  assert.equal(days[thursdayIndex].name, "Thu", "expected day index 4 to be Thursday");

  // Build 6 rows, each with a single populated Wednesday cell. Six rows is
  // > MAX_VISIBLE_BLOCKS (4), so the day card must collapse the last 2 into
  // an overflow tile.
  const wedRows = Array.from({ length: 6 }, (_unused, index) => {
    const cells = days.map(() => ({}));
    cells[wednesdayIndex] = makeReservationItem({
      reservationId: 300 + index,
      referenceNo: `BSN-2026-0003${String(index).padStart(2, "0")}`,
      representativeName: `Wed Resident ${index + 1}`,
      purpose: `Wed Purpose ${index + 1}`,
      startTime: `0${index + 7}:00`,
      endTime: `0${index + 8}:00`
    });
    return { cells };
  });

  // Build 4 rows on Thursday — exactly at the visible cap, so no overflow.
  const thuRows = Array.from({ length: 4 }, (_unused, index) => {
    const cells = days.map(() => ({}));
    cells[thursdayIndex] = makeReservationItem({
      reservationId: 400 + index,
      referenceNo: `BSN-2026-0004${String(index).padStart(2, "0")}`,
      representativeName: `Thu Resident ${index + 1}`,
      purpose: `Thu Purpose ${index + 1}`,
      startTime: `0${index + 7}:00`,
      endTime: `0${index + 8}:00`
    });
    return { cells };
  });

  const { container, findAllByRole } = mountCalendarPage({
    scheduleResponse: { days, rows: [...wedRows, ...thuRows] },
    today
  });

  // Wait for the schedule fetch to settle and the grid to mount.
  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, `expected 7 day-card articles, got ${articles.length}`);

  const wedArticle = articles[wednesdayIndex];
  const thuArticle = articles[thursdayIndex];

  // -------------------------------------------------------------------
  // Property 8 — Wednesday: 4 visible blocks plus exactly 1 overflow tile.
  // -------------------------------------------------------------------
  const wedBlocks = wedArticle.querySelectorAll(".staff-booking-block");
  assert.equal(
    wedBlocks.length,
    4,
    `Wednesday should render exactly 4 .staff-booking-block elements, got ${wedBlocks.length}`
  );

  const wedOverflow = wedArticle.querySelectorAll(".staff-day-overflow");
  assert.equal(
    wedOverflow.length,
    1,
    `Wednesday should render exactly 1 .staff-day-overflow tile, got ${wedOverflow.length}`
  );

  const tile = wedOverflow[0];
  const tileText = (tile.textContent || "").trim();
  assert.match(
    tileText,
    /^\+\s*\d+\s+more$/,
    `overflow tile visible text should match /^\\+\\s*\\d+\\s+more$/, got "${tileText}"`
  );

  const tileAria = tile.getAttribute("aria-label") || "";
  assert.match(
    tileAria,
    /^\+\s*\d+\s+more bookings on /,
    `overflow tile aria-label should match /^\\+\\s*\\d+\\s+more bookings on /, got "${tileAria}"`
  );

  // -------------------------------------------------------------------
  // Property 8 — Thursday: exactly 4 visible blocks, zero overflow tiles.
  // -------------------------------------------------------------------
  const thuBlocks = thuArticle.querySelectorAll(".staff-booking-block");
  assert.equal(
    thuBlocks.length,
    4,
    `Thursday should render exactly 4 .staff-booking-block elements, got ${thuBlocks.length}`
  );
  assert.equal(
    thuArticle.querySelectorAll(".staff-day-overflow").length,
    0,
    "Thursday should render zero .staff-day-overflow tiles when items.length === 4"
  );

  // -------------------------------------------------------------------
  // Property 8 (5.5) — activating the overflow tile opens the day drawer
  // with every Wednesday item, not just the hidden remainder.
  // -------------------------------------------------------------------
  // `@testing-library/user-event` captures `globalThis.document` when its
  // setup.js module loads, which happens before `setupDom()` installs the
  // jsdom document. Pass the resolved jsdom `document` explicitly so the
  // input device dispatches against the same document the component mounted
  // into.
  const user = userEvent.setup({ document });
  await user.click(tile);

  // The drawer renders through `ModalShell`, so look in `document.body`
  // for the drawer list. Querying the full document avoids coupling the
  // assertion to whatever subtree the testing library `container` points at.
  const drawerList = document.body.querySelector(".staff-day-drawer-list");
  assert.ok(drawerList, "expected the .staff-day-drawer-list container after clicking the overflow tile");

  const drawerBlocks = drawerList.querySelectorAll(".staff-booking-block");
  assert.equal(
    drawerBlocks.length,
    6,
    `drawer should list all 6 Wednesday items, got ${drawerBlocks.length}`
  );

  // Sanity check — every Wednesday resident name appears inside the drawer.
  const drawerText = drawerList.textContent || "";
  for (let i = 1; i <= 6; i++) {
    assert.ok(
      drawerText.includes(`Wed Resident ${i}`),
      `drawer should include "Wed Resident ${i}"`
    );
  }
});
