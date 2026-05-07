import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAuthRoutes } from "../src/features/users/authRoutes.js";
import { DuplicateUsernameError } from "../src/features/users/userRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function createTestApp({ repositories, sessionUser = null } = {}) {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use((request, _response, next) => {
    request.session = {};
    if (sessionUser) {
      request.session.user = sessionUser;
    }
    next();
  });
  app.use(createAuthRoutes({ db: {}, repositories }));
  return app;
}

test("POST /login verifies a hashed password and redirects to dashboard", async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const app = createTestApp({
    repositories: {
      findUserByUsername: async () => ({
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN"
      })
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: "admin", password: "admin123" })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/dashboard");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /login rejects invalid credentials without exposing which field failed", async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const app = createTestApp({
    repositories: {
      findUserByUsername: async () => ({
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN"
      })
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: "admin", password: "wrong" })
    });
    const body = await response.text();

    assert.equal(response.status, 401);
    assert.match(body, /Invalid username or password\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /account shows account management for admin users", async () => {
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Account Management/);
    assert.match(body, /Create Account/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /account/create returns duplicate username validation", async () => {
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      createUser: async () => {
        throw new DuplicateUsernameError("Username already exists.");
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/create`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        fullName: "John Dela Cruz",
        username: "johndc",
        password: "secret123",
        role: "STAFF"
      })
    });
    const body = await response.text();

    assert.equal(response.status, 409);
    assert.match(body, /Username already exists/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
