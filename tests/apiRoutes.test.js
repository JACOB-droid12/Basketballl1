import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import test from "node:test";

import { createApiRoutes } from "../src/features/api/apiRoutes.js";

test("GET /api/session returns signed-out state", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/session");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      authenticated: false,
      user: null
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/login verifies a hashed password, normalizes username, stores session user, and returns API user", async () => {
  const session = {};
  const passwordHash = await bcrypt.hash("admin123", 4);
  let receivedUsername = null;
  const app = buildApiTestApp({
    session,
    repositories: {
      findUserByUsername: async (_db, username) => {
        receivedUsername = username;
        return {
          userId: 12,
          fullName: "System Administrator",
          username: "admin",
          passwordHash,
          role: "admin"
        };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/login", {
      username: "  ADMIN  ",
      password: "admin123"
    });

    assert.equal(response.status, 200);
    assert.equal(receivedUsername, "admin");
    assert.deepEqual(session.user, {
      userId: 12,
      fullName: "System Administrator",
      username: "admin",
      role: "admin"
    });
    assert.deepEqual(response.body, {
      user: {
        userId: 12,
        fullName: "System Administrator",
        username: "admin",
        role: "ADMIN"
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations returns 401 JSON when signed out", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations");

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "Login required." });
  } finally {
    await closeServer(server);
  }
});

test("API protection allows existing prototype API routes to remain available", async () => {
  const app = buildApiTestApp();
  app.get("/api/prototype/session", (_request, response) => {
    response.status(209).json({ ok: true });
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/prototype/session");

    assert.equal(response.status, 209);
    assert.deepEqual(response.body, { ok: true });
  } finally {
    await closeServer(server);
  }
});

function buildApiTestApp({ session = {}, repositories = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.session = session;
    next();
  });
  app.use(createApiRoutes({
    db: {},
    repositories: {
      findUserByUsername: async () => null,
      ...repositories
    },
    todayProvider: () => "2026-05-13"
  }));
  return app;
}

async function getJson(server, pathName) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function postJson(server, pathName, payload) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}
