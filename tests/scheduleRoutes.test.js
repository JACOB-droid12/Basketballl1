import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createScheduleRoutes } from "../src/features/schedule/scheduleRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("GET /schedule links reserved slots to details and available slots to add reservation", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createScheduleRoutes({
      db: {},
      todayProvider: () => "2026-05-08",
      repositories: {
        getTimeSlots: async () => [
          { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
          { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" }
        ],
        listReservations: async () => [
          {
            reservationId: 10,
            reservationDate: "2026-05-08",
            startTime: "07:00",
            endTime: "08:00",
            statusCode: "RESERVED",
            representativeName: "Sto. Niño Youth Team",
            purpose: "Practice"
          }
        ]
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/schedule`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /href="\/reservations\/10"/);
    assert.match(body, /View details/);
    assert.match(body, /href="\/reservations\/new\?date=2026-05-08&amp;startTime=08%3A00&amp;endTime=09%3A00"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
