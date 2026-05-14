import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfficeSmokeApp,
  buildSmokePages,
  fetchSmokePages
} from "../scripts/verify-ui-smoke.mjs";

test("builds the expected office workflow smoke page list", () => {
  const pages = buildSmokePages();

  assert.deepEqual(
    pages.map((page) => page.path),
    [
      "/",
      "/prototype",
      "/api/session",
      "/api/dashboard",
      "/api/schedule?date=2026-05-08",
      "/api/reservations",
      "/api/activity-logs",
      "/api/reports",
      "/api/accounts",
      "/api/prototype/session",
      "/api/prototype/reservations",
      "/login",
      "/dashboard",
      "/schedule",
      "/reservations",
      "/reservations/new",
      "/reservations/10",
      "/reservations/10/edit",
      "/account",
      "/account/create",
      "/account/password",
      "/activity-logs",
      "/reports"
    ]
  );
  assert.ok(pages.every((page) => page.expectedText));
});

test("fetches all smoke pages and verifies their expected text", async () => {
  const app = buildOfficeSmokeApp();
  const server = app.listen(0);

  try {
    const results = await fetchSmokePages(`http://127.0.0.1:${server.address().port}`, buildSmokePages());

    assert.equal(results.length, 23);
    assert.ok(results.every((result) => result.status === 200));
    assert.deepEqual(results.map((result) => result.path), buildSmokePages().map((page) => page.path));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("reports a useful error when a smoke page does not contain expected text", async () => {
  const app = buildOfficeSmokeApp();
  const server = app.listen(0);

  try {
    await assert.rejects(
      fetchSmokePages(`http://127.0.0.1:${server.address().port}`, [
        { path: "/dashboard", expectedText: "Missing smoke marker" }
      ]),
      /UI smoke check failed for \/dashboard: expected page text "Missing smoke marker"/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
