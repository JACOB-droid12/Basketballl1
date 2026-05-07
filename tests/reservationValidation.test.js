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
