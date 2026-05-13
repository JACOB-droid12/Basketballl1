import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailySchedule,
  buildDashboardSummary,
  buildWeeklySchedule,
  findNearestAvailableSlot
} from "../src/features/schedule/scheduleService.js";

const timeSlots = [
  { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
  { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
  { slotId: 3, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" }
];

test("marks slots with no reservations as available", () => {
  const schedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: []
  });

  assert.deepEqual(
    schedule.map((slot) => ({ slotId: slot.slotId, statusCode: slot.statusCode, available: slot.isAvailableForBooking })),
    [
      { slotId: 1, statusCode: "AVAILABLE", available: true },
      { slotId: 2, statusCode: "AVAILABLE", available: true },
      { slotId: 3, statusCode: "AVAILABLE", available: true }
    ]
  );
});

test("marks slots overlapped by reserved reservations as unavailable", () => {
  const schedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: [
      {
        reservationId: 10,
        reservationDate: "2026-05-07",
        startTime: "07:30",
        endTime: "08:30",
        statusCode: "RESERVED",
        representativeName: "Sto. Niño Youth Team",
        purpose: "Practice"
      }
    ]
  });

  assert.equal(schedule[0].statusCode, "RESERVED");
  assert.equal(schedule[0].isAvailableForBooking, false);
  assert.equal(schedule[1].statusCode, "RESERVED");
  assert.equal(schedule[1].isAvailableForBooking, false);
  assert.equal(schedule[2].statusCode, "AVAILABLE");
  assert.equal(schedule[2].isAvailableForBooking, true);
});

test("shows cancelled, missed, and completed slots while keeping them available for booking", () => {
  const schedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: [
      { reservationId: 11, reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "CANCELLED" },
      { reservationId: 12, reservationDate: "2026-05-07", startTime: "08:00", endTime: "09:00", statusCode: "MISSED" },
      { reservationId: 13, reservationDate: "2026-05-07", startTime: "09:00", endTime: "10:00", statusCode: "COMPLETED" }
    ]
  });

  assert.deepEqual(
    schedule.map((slot) => ({ statusCode: slot.statusCode, available: slot.isAvailableForBooking })),
    [
      { statusCode: "CANCELLED", available: true },
      { statusCode: "MISSED", available: true },
      { statusCode: "COMPLETED", available: true }
    ]
  );
});

test("ignores reservations from other dates", () => {
  const schedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: [
      { reservationId: 14, reservationDate: "2026-05-08", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" }
    ]
  });

  assert.equal(schedule[0].statusCode, "AVAILABLE");
  assert.equal(schedule[0].isAvailableForBooking, true);
});

test("builds a Sunday to Saturday weekly schedule with reservation cells on the correct day", () => {
  const weeklySchedule = buildWeeklySchedule({
    weekStartDate: "2026-05-03",
    timeSlots,
    reservations: [
      {
        reservationId: 15,
        reservationDate: "2026-05-05",
        startTime: "08:00",
        endTime: "09:00",
        statusCode: "RESERVED",
        representativeName: "Tuesday Team",
        purpose: "Practice"
      }
    ]
  });

  assert.deepEqual(
    weeklySchedule.days.map((day) => ({ name: day.name, date: day.date })),
    [
      { name: "Sunday", date: "2026-05-03" },
      { name: "Monday", date: "2026-05-04" },
      { name: "Tuesday", date: "2026-05-05" },
      { name: "Wednesday", date: "2026-05-06" },
      { name: "Thursday", date: "2026-05-07" },
      { name: "Friday", date: "2026-05-08" },
      { name: "Saturday", date: "2026-05-09" }
    ]
  );
  assert.equal(weeklySchedule.rows[1].cells[2].statusCode, "RESERVED");
  assert.equal(weeklySchedule.rows[1].cells[2].reservation.representativeName, "Tuesday Team");
  assert.equal(weeklySchedule.rows[1].cells[0].statusCode, "AVAILABLE");
});

test("finds the nearest available slot starting today", () => {
  const suggestion = findNearestAvailableSlot({
    startDate: "2026-05-07",
    timeSlots,
    reservations: [
      { reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" }
    ],
    searchDays: 3
  });

  assert.deepEqual(suggestion, {
    date: "2026-05-07",
    slotId: 2,
    name: "8:00 AM - 9:00 AM",
    startTime: "08:00",
    endTime: "09:00"
  });
});

test("finds the nearest future slot when today is fully reserved", () => {
  const suggestion = findNearestAvailableSlot({
    startDate: "2026-05-07",
    timeSlots,
    reservations: [
      { reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" },
      { reservationDate: "2026-05-07", startTime: "08:00", endTime: "09:00", statusCode: "RESERVED" },
      { reservationDate: "2026-05-07", startTime: "09:00", endTime: "10:00", statusCode: "RESERVED" },
      { reservationDate: "2026-05-08", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" }
    ],
    searchDays: 3
  });

  assert.deepEqual(suggestion, {
    date: "2026-05-08",
    slotId: 2,
    name: "8:00 AM - 9:00 AM",
    startTime: "08:00",
    endTime: "09:00"
  });
});

test("returns null when no available slot is found in the search window", () => {
  const suggestion = findNearestAvailableSlot({
    startDate: "2026-05-07",
    timeSlots: [timeSlots[0]],
    reservations: [
      { reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" },
      { reservationDate: "2026-05-08", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" }
    ],
    searchDays: 2
  });

  assert.equal(suggestion, null);
});

test("builds dashboard summary counts and action lists", () => {
  const todaySchedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: [
      {
        reservationId: 21,
        reservationDate: "2026-05-07",
        startTime: "07:00",
        endTime: "08:00",
        statusCode: "RESERVED",
        representativeName: "Team A",
        purpose: "Practice"
      },
      {
        reservationId: 22,
        reservationDate: "2026-05-07",
        startTime: "08:00",
        endTime: "09:00",
        statusCode: "MISSED",
        representativeName: "Team B",
        purpose: "Game"
      }
    ]
  });

  const summary = buildDashboardSummary({
    today: "2026-05-07",
    todaySchedule,
    upcomingReservations: [
      { reservationId: 30, reservationDate: "2026-05-08", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" },
      { reservationId: 31, reservationDate: "2026-05-09", startTime: "07:00", endTime: "08:00", statusCode: "CANCELLED" }
    ]
  });

  assert.equal(summary.today, "2026-05-07");
  assert.equal(summary.reservedCount, 1);
  assert.equal(summary.availableCount, 2);
  assert.equal(summary.missedCount, 1);
  assert.equal(summary.todayReserved.length, 1);
  assert.equal(summary.missedReservations.length, 1);
  assert.deepEqual(summary.upcomingReservations.map((reservation) => reservation.reservationId), [30]);
});

test("deduplicates multi-slot reserved and missed reservations in dashboard summary", () => {
  const dashboardTimeSlots = [
    ...timeSlots,
    { slotId: 4, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" }
  ];
  const todaySchedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots: dashboardTimeSlots,
    reservations: [
      {
        reservationId: 40,
        reservationDate: "2026-05-07",
        startTime: "07:00",
        endTime: "09:00",
        statusCode: "RESERVED",
        representativeName: "Team C",
        purpose: "Practice"
      },
      {
        reservationId: 41,
        reservationDate: "2026-05-07",
        startTime: "09:00",
        endTime: "11:00",
        statusCode: "MISSED",
        representativeName: "Team D",
        purpose: "Game"
      }
    ]
  });

  const summary = buildDashboardSummary({
    today: "2026-05-07",
    todaySchedule
  });

  assert.equal(summary.reservedCount, 1);
  assert.equal(summary.missedCount, 1);
  assert.equal(summary.todayReserved.length, 1);
  assert.equal(summary.missedReservations.length, 1);
  assert.deepEqual(summary.todayReserved.map((reservation) => reservation.reservationId), [40]);
  assert.deepEqual(summary.missedReservations.map((reservation) => reservation.reservationId), [41]);
});

test("counts bookable dashboard slots using availability flag", () => {
  const todaySchedule = buildDailySchedule({
    date: "2026-05-07",
    timeSlots,
    reservations: [
      { reservationId: 50, reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "CANCELLED" },
      { reservationId: 51, reservationDate: "2026-05-07", startTime: "08:00", endTime: "09:00", statusCode: "MISSED" },
      { reservationId: 52, reservationDate: "2026-05-07", startTime: "09:00", endTime: "10:00", statusCode: "COMPLETED" }
    ]
  });

  const summary = buildDashboardSummary({
    today: "2026-05-07",
    todaySchedule
  });

  assert.equal(summary.availableCount, 3);
  assert.equal(summary.missedCount, 1);
  assert.deepEqual(summary.missedReservations.map((reservation) => reservation.reservationId), [51]);
});
