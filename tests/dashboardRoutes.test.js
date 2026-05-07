import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createDashboardRoutes } from "../src/features/schedule/dashboardRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("GET /dashboard renders summary counts from repository data", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createDashboardRoutes({
      todayProvider: () => "2026-05-07",
      repositories: {
        getTimeSlots: async () => [
          { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
          { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" }
        ],
        listReservations: async (_db, filters) => {
          if (filters.reservationDate === "2026-05-07") {
            return [
              {
                reservationId: 1,
                reservationDate: "2026-05-07",
                startTime: "07:00",
                endTime: "08:00",
                statusCode: "RESERVED",
                representativeName: "Team A",
                purpose: "Practice"
              }
            ];
          }

          return [
            {
              reservationId: 2,
              reservationDate: "2026-05-08",
              startTime: "08:00",
              endTime: "09:00",
              statusCode: "RESERVED",
              representativeName: "Team B",
              purpose: "Game"
            }
          ];
        }
      },
      db: {}
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/dashboard`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Date and Schedule time of basketball court game/);
    assert.match(body, /Available Slots/);
    assert.match(body, /Team A/);
    assert.match(body, /Team B/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
