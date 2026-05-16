import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

const TEST_SESSION_SECRET = "test-session-secret-123456789012345";

test("createApp rejects missing placeholder and short session secrets in normal runtime", () => {
  const invalidSecrets = [
    undefined,
    "",
    "short-secret",
    "development-only-change-me",
    "replace-with-a-long-random-local-secret"
  ];

  for (const secret of invalidSecrets) {
    assert.throws(
      () => createApp({
        db: { end: async () => {} },
        env: { APP_SESSION_SECRET: secret }
      }),
      /APP_SESSION_SECRET must be at least 32 characters.*npm run setup:env/
    );
  }
});

test("createApp accepts a valid session secret for normal startup configuration", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    env: { APP_SESSION_SECRET: TEST_SESSION_SECRET }
  });

  assert.equal(app.locals.db, db);
  await app.locals.db.end();
});

test("createApp exposes the database pool for verification shutdown hooks", async () => {
  const app = createApp({
    env: { ...process.env, APP_SESSION_SECRET: TEST_SESSION_SECRET }
  });

  try {
    assert.equal(typeof app.locals.db?.end, "function");
  } finally {
    await app.locals.db?.end?.();
  }
});

test("createApp serves the backend-injected prototype at the office URL", async () => {
  const app = createApp({
    env: { ...process.env, APP_SESSION_SECRET: TEST_SESSION_SECRET }
  });
  const server = app.listen(0);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/prototype/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /id="prototype-backend-unsupported-style"/);
    assert.match(body, /\/js\/prototype-backend\.js/);
    assert.doesNotMatch(body, /cdnjs\.cloudflare\.com/);
    assert.doesNotMatch(body, /fonts\.googleapis\.com/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp serves React staff shell for authenticated main staff routes", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {
        user: {
          userId: 1,
          fullName: "System Administrator",
          username: "admin",
          role: "ADMIN"
        }
      };
      next();
    }
  });
  const server = app.listen(0);

  try {
    const routes = [
      "/",
      "/dashboard",
      "/schedule",
      "/reservations",
      "/reservations/new",
      "/reservations/1",
      "/reservations/1/edit",
      "/account",
      "/account/password",
      "/activity-logs",
      "/reports"
    ];

    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      const body = await response.text();

      assert.equal(response.status, 200, route);
      assert.match(body, /id="root"/, route);
      assert.match(body, /\/app\/assets\//, route);
      assert.doesNotMatch(body, /mockup-topbar|prototype-backend-unsupported-style|\/css\/styles\.css/, route);
      assert.doesNotMatch(body, /unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com/, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp serves React shell for signed-out normal staff routes", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {};
      next();
    }
  });
  const server = app.listen(0);

  try {
    const routes = [
      "/",
      "/login",
      "/dashboard",
      "/schedule",
      "/reservations",
      "/reservations/new",
      "/reservations/1",
      "/reservations/1/edit",
      "/account",
      "/account/password",
      "/activity-logs",
      "/reports"
    ];

    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      const body = await response.text();

      assert.equal(response.status, 200, route);
      assert.match(body, /id="root"/, route);
      assert.match(body, /\/app\/assets\//, route);
      assert.doesNotMatch(body, /mockup-topbar|prototype-backend-unsupported-style|\/css\/styles\.css/, route);
      assert.doesNotMatch(body, /unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com/, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp returns 404 for missing React assets instead of auth HTML", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {};
      next();
    }
  });
  const server = app.listen(0);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/app/assets/missing-stale-build.js`, {
      redirect: "manual"
    });
    const body = await response.text();

    assert.equal(response.status, 404);
    assert.doesNotMatch(body, /id="root"|Login your account|Barangay Sto\. Niño Court Scheduler/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp returns an empty favicon response without auth redirects", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {};
      next();
    }
  });
  const server = app.listen(0);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/favicon.ico`, {
      redirect: "manual"
    });
    const body = await response.text();

    assert.equal(response.status, 204);
    assert.equal(body, "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp keeps reservation CSV export on the legacy handler", async () => {
  let executeCall = null;
  const db = {
    execute: async (sql, params) => {
      executeCall = { sql, params };
      return [[
        {
          reservation_id: 7,
          reservation_date: "2026-05-08",
          start_time: "07:00:00",
          end_time: "08:00:00",
          purpose: "Practice",
          remarks: "",
          status_code: "RESERVED",
          status_name: "Reserved",
          resident_name: "Sto. Niño Youth Team",
          contact_no: "09171234567",
          address: "Purok 3",
          created_by_name: "Admin User"
        }
      ]];
    },
    end: async () => {}
  };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {
        user: {
          userId: 1,
          fullName: "System Administrator",
          username: "admin",
          role: "ADMIN"
        }
      };
      next();
    }
  });
  const server = app.listen(0);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/export.csv`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/csv/);
    assert.match(response.headers.get("content-disposition"), /reservations\.csv/);
    assert.match(body, /Reservation Date,Start Time,End Time,Representative/);
    assert.match(body, /2026-05-08,07:00,08:00,Sto\. Niño Youth Team/);
    assert.doesNotMatch(body, /id="root"/);
    assert.match(executeCall.sql, /FROM reservations r/);
    assert.deepEqual(executeCall.params, {});
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});

test("createApp keeps legacy account POST handlers before React routes", async () => {
  const db = { end: async () => {} };
  const app = createApp({
    db,
    sessionMiddleware: (request, _response, next) => {
      request.session = {
        user: {
          userId: 1,
          fullName: "System Administrator",
          username: "admin",
          role: "ADMIN"
        }
      };
      next();
    }
  });
  const server = app.listen(0);

  try {
    const passwordResponse = await fetch(`http://127.0.0.1:${server.address().port}/account/password`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({})
    });
    const passwordBody = await passwordResponse.text();

    assert.equal(passwordResponse.status, 400);
    assert.match(passwordBody, /Current password is required\./);

    const statusResponse = await fetch(`http://127.0.0.1:${server.address().port}/account/2/status`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ accountStatus: "SUSPENDED" })
    });
    const statusBody = await statusResponse.text();

    assert.equal(statusResponse.status, 400);
    assert.match(statusBody, /Account status is invalid\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});
