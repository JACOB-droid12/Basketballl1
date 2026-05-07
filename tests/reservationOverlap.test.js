import assert from "node:assert/strict";
import test from "node:test";

import { findBlockingOverlap, hasBlockingOverlap } from "../src/features/reservations/reservationOverlap.js";

const existingReservations = [
  {
    reservationId: 1,
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00",
    statusCode: "RESERVED"
  },
  {
    reservationId: 2,
    reservationDate: "2026-05-07",
    startTime: "09:00",
    endTime: "10:00",
    statusCode: "CANCELLED"
  },
  {
    reservationId: 3,
    reservationDate: "2026-05-08",
    startTime: "07:00",
    endTime: "08:00",
    statusCode: "RESERVED"
  }
];

test("detects an exact duplicate active reservation", () => {
  const overlap = findBlockingOverlap(
    { reservationDate: "2026-05-07", startTime: "07:00", endTime: "08:00", statusCode: "RESERVED" },
    existingReservations
  );

  assert.equal(overlap.reservationId, 1);
  assert.equal(hasBlockingOverlap(overlap), true);
});

test("detects partial overlap at the start of an active reservation", () => {
  const overlap = findBlockingOverlap(
    { reservationDate: "2026-05-07", startTime: "06:30", endTime: "07:30", statusCode: "RESERVED" },
    existingReservations
  );

  assert.equal(overlap.reservationId, 1);
});

test("detects partial overlap at the end of an active reservation", () => {
  const overlap = findBlockingOverlap(
    { reservationDate: "2026-05-07", startTime: "07:30", endTime: "08:30", statusCode: "RESERVED" },
    existingReservations
  );

  assert.equal(overlap.reservationId, 1);
});

test("allows adjacent reservations that touch but do not overlap", () => {
  const overlap = findBlockingOverlap(
    { reservationDate: "2026-05-07", startTime: "08:00", endTime: "09:00", statusCode: "RESERVED" },
    existingReservations
  );

  assert.equal(overlap, null);
});

test("ignores cancelled, missed, completed, available, and different-date reservations", () => {
  const overlap = findBlockingOverlap(
    { reservationDate: "2026-05-07", startTime: "09:00", endTime: "10:00", statusCode: "RESERVED" },
    [
      ...existingReservations,
      { reservationId: 4, reservationDate: "2026-05-07", startTime: "10:00", endTime: "11:00", statusCode: "MISSED" },
      { reservationId: 5, reservationDate: "2026-05-07", startTime: "11:00", endTime: "12:00", statusCode: "COMPLETED" },
      { reservationId: 6, reservationDate: "2026-05-07", startTime: "12:00", endTime: "13:00", statusCode: "AVAILABLE" }
    ]
  );

  assert.equal(overlap, null);
});

test("ignores the reservation being edited", () => {
  const overlap = findBlockingOverlap(
    {
      reservationId: 1,
      reservationDate: "2026-05-07",
      startTime: "07:00",
      endTime: "08:00",
      statusCode: "RESERVED"
    },
    existingReservations
  );

  assert.equal(overlap, null);
});
