// Property 1 — single day-number per Day_Card.
//
// Renders `CalendarPage` with a fixture week anchored on Wednesday
// 2026-05-20. The test asserts that the rendered week grid contains
// exactly seven day-card articles, that every article carries exactly
// one `.staff-day-head-num` element and zero `<small>` elements inside
// `.staff-day-head` (the duplicated "May 17"-under-the-serif `17` from
// the rejected design cannot return), that every eyebrow text matches
// the canonical 3-letter day-name pattern (with an optional ` · TODAY`
// suffix), and that exactly one card carries the today suffix and the
// `.today` class spillover from Property 9.
//
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3,
// 9.4 — Property 1.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { setupDom } from "./helpers/reactDomHarness.js";
import {
  makeReservationItem,
  makeWeekDays,
  mountCalendarPage
} from "./helpers/calendarFixtures.js";

setupDom();

test("Property 1 — each day card renders exactly one .staff-day-head-num", async () => {
  // 2026-05-20 falls on a real Wednesday — verified: 2026-05-17 is a
  // Sunday, so day index 3 in the fixture week is the Wednesday card
  // that should pick up the today marker.
  const today = "2026-05-20";
  const days = makeWeekDays(today);

  // The page's `rows.length === 0` branch renders an `<EmptyState>`
  // instead of the week grid. To exercise the day-card path we hand the
  // page one row with seven empty cells, then drop a single reservation
  // into Wednesday's cell so `buildItemsByDay()` populates that day.
  const cells = days.map(() => ({}));
  cells[3] = makeReservationItem({
    startTime: "09:00",
    endTime: "10:00"
  });

  const scheduleResponse = {
    days,
    rows: [{ cells }]
  };

  const { findAllByRole } = mountCalendarPage({
    scheduleResponse,
    today
  });

  // The page mounts asynchronously: `useEffect` kicks off the fetch on
  // the next microtask and the grid only appears once the response
  // resolves. `findAllByRole` polls until the seven articles exist.
  const articles = await findAllByRole("article");
  assert.equal(articles.length, 7, "expected 7 day-card articles");

  const eyebrowPattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN)( · TODAY)?$/;
  let todayCount = 0;

  for (const article of articles) {
    const dayNumberCount = article.querySelectorAll(".staff-day-head-num").length;
    assert.equal(
      dayNumberCount,
      1,
      "expected exactly one .staff-day-head-num per article"
    );

    const smallCount = article.querySelectorAll(".staff-day-head small").length;
    assert.equal(
      smallCount,
      0,
      "expected zero <small> elements inside .staff-day-head"
    );

    const eyebrow = article.querySelector(".staff-day-head-name");
    assert.ok(eyebrow, "expected a .staff-day-head-name eyebrow");
    assert.match(eyebrow.textContent, eyebrowPattern);

    if (eyebrow.textContent.endsWith(" · TODAY")) {
      todayCount += 1;
      const head = article.querySelector(".staff-day-head");
      assert.ok(head, "expected a .staff-day-head wrapper on the today article");
      assert.ok(
        head.classList.contains("today"),
        "the today card should carry the .today class on .staff-day-head"
      );
    }
  }

  assert.equal(
    todayCount,
    1,
    "expected exactly one card with the · TODAY suffix"
  );
});
