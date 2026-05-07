import assert from "node:assert/strict";
import express from "express";
import test from "node:test";

import { requireSignedIn } from "../src/features/users/sessionMiddleware.js";

test("requireSignedIn redirects unauthenticated users to login", async () => {
  const app = express();
  app.use((request, _response, next) => {
    request.session = {};
    next();
  });
  app.get("/protected", requireSignedIn, (_request, response) => response.send("allowed"));

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`, {
      redirect: "manual"
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/login");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("requireSignedIn allows authenticated users", async () => {
  const app = express();
  app.use((request, _response, next) => {
    request.session = {
      user: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" }
    };
    next();
  });
  app.get("/protected", requireSignedIn, (_request, response) => response.send("allowed"));

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, "allowed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
