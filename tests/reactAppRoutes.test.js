import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReactAppRoutes } from "../src/features/frontend/reactAppRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("main staff routes render the React app shell", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.static(path.join(projectRoot, "public")));
  app.use(createReactAppRoutes());

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
  }
});
