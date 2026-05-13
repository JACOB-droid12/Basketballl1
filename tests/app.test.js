import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

test("createApp exposes the database pool for verification shutdown hooks", async () => {
  const app = createApp();

  try {
    assert.equal(typeof app.locals.db?.end, "function");
  } finally {
    await app.locals.db?.end?.();
  }
});

test("createApp serves the backend-injected prototype at the office URL", async () => {
  const app = createApp();
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
      assert.doesNotMatch(body, /unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com/, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});
