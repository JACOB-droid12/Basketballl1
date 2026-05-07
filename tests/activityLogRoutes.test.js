import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createActivityLogRoutes } from "../src/features/activityLogs/activityLogRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("GET /activity-logs renders activity log records", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createActivityLogRoutes({
      db: {},
      repositories: {
        listActivityLogs: async () => [
          {
            logId: 1,
            action: "CREATE_RESERVATION",
            details: "Created reservation for Sto. Niño Youth Team.",
            createdAt: "2026-05-08 09:15:00",
            userName: "System Administrator",
            reservationId: 10,
            reservationDate: "2026-05-09",
            reservationStartTime: "07:00",
            reservationEndTime: "08:00"
          }
        ]
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/activity-logs`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Activity Logs/);
    assert.match(body, /CREATE_RESERVATION/);
    assert.match(body, /System Administrator/);
    assert.match(body, /Created reservation for Sto\. Niño Youth Team\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
