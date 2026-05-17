import assert from "node:assert/strict";
import test from "node:test";

import { validateReservationInput } from "../src/features/reservations/reservationValidation.js";

test("requires date, time range, resident details, contact number, address, and purpose", () => {
  const result = validateReservationInput({}, { today: "2026-05-07" });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    reservationDate: "Reservation date is required.",
    startTime: "Start time is required.",
    endTime: "End time is required.",
    representativeName: "Resident or group representative name is required.",
    contactNo: "Contact number is required.",
    address: "Address is required.",
    purpose: "Purpose is required."
  });
});

test("rejects invalid date and time formats", () => {
  const result = validateReservationInput(
    {
      reservationDate: "05/07/2026",
      startTime: "7am",
      endTime: "8am",
      representativeName: "Juan Dela Cruz",
      contactNo: "09171234567",
      address: "Barangay Sto. Niño",
      purpose: "Practice"
    },
    { today: "2026-05-07" }
  );

  assert.equal(result.valid, false);
  assert.equal(result.errors.reservationDate, "Reservation date must use YYYY-MM-DD format.");
  assert.equal(result.errors.startTime, "Start time must use HH:MM format.");
  assert.equal(result.errors.endTime, "End time must use HH:MM format.");
});

test("rejects reservations where end time is not after start time", () => {
  const result = validateReservationInput(
    {
      reservationDate: "2026-05-07",
      startTime: "09:00",
      endTime: "09:00",
      representativeName: "Juan Dela Cruz",
      contactNo: "09171234567",
      address: "Barangay Sto. Niño",
      purpose: "Practice"
    },
    { today: "2026-05-07" }
  );

  assert.equal(result.valid, false);
  assert.equal(result.errors.endTime, "End time must be after start time.");
});

test("rejects reservation dates before today when future dates are required", () => {
  const result = validateReservationInput(
    {
      reservationDate: "2026-05-06",
      startTime: "09:00",
      endTime: "10:00",
      representativeName: "Juan Dela Cruz",
      contactNo: "09171234567",
      address: "Barangay Sto. Niño",
      purpose: "Practice"
    },
    { today: "2026-05-07", requireTodayOrFuture: true }
  );

  assert.equal(result.valid, false);
  assert.equal(result.errors.reservationDate, "Reservation date cannot be before today.");
});

test("rejects same-day reservations with start times earlier than Manila current time", () => {
  const result = validateReservationInput(
    buildReservationInput({
      reservationDate: "2026-05-07",
      startTime: "09:00",
      endTime: "10:00"
    }),
    { today: "2026-05-07", currentTime: "09:30", requireTodayOrFuture: true }
  );

  assert.equal(result.valid, false);
  assert.equal(result.errors.startTime, "Start time must be later than the current time for today's reservations.");
});

test("accepts same-day reservations with start times later than Manila current time", () => {
  const result = validateReservationInput(
    buildReservationInput({
      reservationDate: "2026-05-07",
      startTime: "10:00",
      endTime: "11:00"
    }),
    { today: "2026-05-07", currentTime: "09:30", requireTodayOrFuture: true }
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("accepts future-date reservations regardless of current Manila time", () => {
  const result = validateReservationInput(
    buildReservationInput({
      reservationDate: "2026-05-08",
      startTime: "07:00",
      endTime: "08:00"
    }),
    { today: "2026-05-07", currentTime: "23:30", requireTodayOrFuture: true }
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("accepts a complete reservation and normalizes trimmed values", () => {
  const result = validateReservationInput(
    {
      reservationDate: "2026-05-07",
      startTime: "07:00",
      endTime: "08:00",
      representativeName: "  Sto. Niño Youth Team  ",
      contactNo: " 09171234567 ",
      address: " Purok 3, Barangay Sto. Niño ",
      purpose: " practice "
    },
    { today: "2026-05-07", requireTodayOrFuture: true }
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.value, {
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00",
    representativeName: "Sto. Niño Youth Team",
    contactNo: "09171234567",
    address: "Purok 3, Barangay Sto. Niño",
    purpose: "practice",
    remarks: "",
    statusCode: "RESERVED"
  });
});

test("rejects overlong reservation fields before they reach MySQL column limits", () => {
  const result = validateReservationInput({
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "A".repeat(141),
    contactNo: "9".repeat(31),
    address: "B".repeat(256),
    purpose: "C".repeat(121),
    remarks: "D".repeat(1001),
    statusCode: "RESERVED"
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    representativeName: "Resident or group representative name must be 140 characters or fewer.",
    contactNo: "Contact number must be 30 characters or fewer.",
    address: "Address must be 255 characters or fewer.",
    purpose: "Purpose must be 120 characters or fewer.",
    remarks: "Remarks must be 1000 characters or fewer."
  });
});

test("rejects malformed contact numbers without blocking common phone symbols", () => {
  const invalid = validateReservationInput({
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Team Alpha",
    contactNo: "<script>alert(1)</script>",
    address: "Purok 3",
    purpose: "Practice",
    statusCode: "RESERVED"
  });
  const valid = validateReservationInput({
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Team Alpha",
    contactNo: "+63 917-123-4567",
    address: "Purok 3",
    purpose: "Practice",
    statusCode: "RESERVED"
  });

  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.contactNo, "Contact number must use digits or common phone symbols only.");
  assert.equal(valid.valid, true);
});

function buildReservationInput(overrides = {}) {
  return {
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00",
    representativeName: "Juan Dela Cruz",
    contactNo: "09171234567",
    address: "Barangay Sto. Niño",
    purpose: "Practice",
    ...overrides
  };
}
