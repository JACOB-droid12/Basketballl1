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

function createTestApp({ repositories, sessionUser = null, enableLegacyAccountUi = true } = {}) {
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
  app.use(createAuthRoutes({
    db: {},
    repositories: {
      writeUserActivityLog: async () => {},
      ...repositories
    },
    enableLegacyAccountUi
  }));
  return app;
}

test("POST /login verifies a hashed password and redirects to dashboard", async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);
  let loginLog = null;
  const app = createTestApp({
    repositories: {
      findUserByUsername: async () => ({
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN"
      }),
      writeUserActivityLog: async (_db, entry) => {
        loginLog = entry;
      }
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
    assert.deepEqual(loginLog, {
      userId: 1,
      action: "LOGIN",
      details: "User logged in."
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /logout writes an activity log without blocking session cleanup", async () => {
  let logoutLog = null;
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      writeUserActivityLog: async (_db, entry) => {
        logoutLog = entry;
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/logout`, {
      method: "POST",
      redirect: "manual"
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/login");
    assert.deepEqual(logoutLog, {
      userId: 1,
      action: "LOGOUT",
      details: "User logged out."
    });
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
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      listUsers: async () => [
        {
          userId: 1,
          fullName: "System Administrator",
          username: "admin",
          role: "ADMIN",
          accountStatus: "ACTIVE",
          createdAt: "2026-05-08 09:15:00"
        },
        {
          userId: 2,
          fullName: "Maria Santos",
          username: "maria_staff",
          role: "STAFF",
          accountStatus: "ACTIVE",
          createdAt: "2026-05-08 09:30:00"
        },
        {
          userId: 3,
          fullName: "John Dela Cruz",
          username: "johndc_staff",
          role: "STAFF",
          accountStatus: "INACTIVE",
          createdAt: "2026-05-08 10:00:00"
        }
      ]
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Account Management/);
    assert.match(body, /Create Account/);
    assert.match(body, /System Administrator/);
    assert.match(body, /johndc_staff/);
    assert.match(body, /return confirm\('Deactivate this account\?'\)/);
    assert.match(body, /Reactivate/);
    assert.match(body, /return confirm\('Reactivate this account\?'\)/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /account/password shows password change form for signed-in staff", async () => {
  const app = createTestApp({
    sessionUser: { userId: 2, fullName: "Maria Santos", username: "maria_staff", role: "STAFF" }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/password`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Change Password/);
    assert.match(body, /Current Password/);
    assert.match(body, /New Password/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /account/password validates current password and updates the signed-in user password", async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);
  let updatedPassword = null;
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      findUserByUsername: async () => ({
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN"
      }),
      updateUserPassword: async (_db, userId, newPassword) => {
        updatedPassword = { userId, newPassword };
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/password`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        currentPassword: "admin123",
        newPassword: "new-local-password",
        confirmPassword: "new-local-password"
      })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/account/password?updated=1");
    assert.deepEqual(updatedPassword, {
      userId: 1,
      newPassword: "new-local-password"
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /account/password rejects an incorrect current password", async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);
  let updateWasCalled = false;
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      findUserByUsername: async () => ({
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN"
      }),
      updateUserPassword: async () => {
        updateWasCalled = true;
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/password`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        currentPassword: "wrong",
        newPassword: "new-local-password",
        confirmPassword: "new-local-password"
      })
    });
    const body = await response.text();

    assert.equal(response.status, 400);
    assert.equal(updateWasCalled, false);
    assert.match(body, /Current password is incorrect\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /account/:userId/status updates another user's account status", async () => {
  let updatedStatus = null;
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      updateUserAccountStatus: async (_db, userId, accountStatus) => {
        updatedStatus = { userId, accountStatus };
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/2/status`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ accountStatus: "INACTIVE" })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/account");
    assert.deepEqual(updatedStatus, {
      userId: "2",
      accountStatus: "INACTIVE"
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /account/:userId/status prevents admins from changing their own account status", async () => {
  let updateWasCalled = false;
  const app = createTestApp({
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" },
    repositories: {
      updateUserAccountStatus: async () => {
        updateWasCalled = true;
      }
    }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/1/status`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ accountStatus: "INACTIVE" })
    });
    const body = await response.text();

    assert.equal(response.status, 400);
    assert.equal(updateWasCalled, false);
    assert.match(body, /You cannot change your own account status\./);
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

test("GET /account/create redirects to React account page when legacy account UI is disabled", async () => {
  const app = createTestApp({
    enableLegacyAccountUi: false,
    sessionUser: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" }
  });

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/account/create`, {
      redirect: "manual"
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/account");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
