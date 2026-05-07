import assert from "node:assert/strict";
import test from "node:test";

import { toReservationCsv } from "../src/features/reservations/reservationExport.js";

test("exports reservation records as CSV with escaped fields", () => {
  const csv = toReservationCsv([
    {
      reservationDate: "2026-05-08",
      startTime: "07:00",
      endTime: "08:00",
      representativeName: "Sto. Niño Youth Team",
      contactNo: "09171234567",
      address: "Purok 3, Zone 2",
      purpose: "Practice \"finals\"",
      statusName: "Reserved",
      createdByName: "Admin User"
    }
  ]);

  assert.equal(
    csv,
    [
      "Reservation Date,Start Time,End Time,Representative,Contact Number,Address,Purpose,Status,Encoded By",
      "2026-05-08,07:00,08:00,Sto. Niño Youth Team,09171234567,\"Purok 3, Zone 2\",\"Practice \"\"finals\"\"\",Reserved,Admin User"
    ].join("\r\n")
  );
});
