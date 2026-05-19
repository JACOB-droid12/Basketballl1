// Calendar booking activation should open the in-place reservation drawer,
// not route staff away to /reservations/:id.

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

test("calendar booking click opens detail drawer without navigation", async () => {
  const today = "2026-05-19";
  const days = makeWeekDays(today);
  const tuesdayIndex = days.findIndex((day) => day.date === today);
  const cells = days.map(() => ({}));
  cells[tuesdayIndex] = makeReservationItem({
    reservationId: 66,
    referenceNo: "BCS-2026-000014",
    representativeName: "tghtt",
    contactNo: "454545",
    address: "htht",
    purpose: "drgdrg",
    reservationDate: today,
    startTime: "12:00",
    endTime: "13:00"
  });

  const navigations = [];
  const { findByRole } = mountCalendarPage({
    scheduleResponse: { days, rows: [{ cells }] },
    sessionResponse: {
      authenticated: true,
      user: { username: "admin", fullName: "System Administrator", role: "ADMIN" }
    },
    today,
    onNavigate: (path) => navigations.push(path)
  });

  const booking = await findByRole("button", {
    name: /tghtt, 12:00 PM - 1:00 PM, Reserved, reference BCS-2026-000014/
  });
  const user = userEvent.setup({ document });
  await user.click(booking);

  const dialog = await findByRole("dialog", { name: "tghtt" });
  assert.ok(dialog, "expected the reservation detail drawer to open");
  assert.equal(navigations.length, 0, "calendar booking click should not navigate away");
});
