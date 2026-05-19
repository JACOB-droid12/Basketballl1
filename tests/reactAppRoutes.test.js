import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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
      "/schedule/daily-print",
      "/reservations",
      "/reservations/new",
      "/reservations/history",
      "/reservations/1",
      "/reservations/1/edit",
      "/reservations/1/slip",
      "/residents",
      "/account",
      "/account/password",
      "/settings/court-policy",
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

test("React app shell uses the current build manifest after assets are rebuilt", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "barangay-react-manifest-"));
  const manifestPath = path.join(tempDir, "manifest.json");
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(createReactAppRoutes({ manifestPath }));

  await writeManifest(manifestPath, "assets/index-old.js", "assets/index-old.css");

  const server = app.listen(0);
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const firstResponse = await fetch(`${baseUrl}/dashboard`);
    const firstBody = await firstResponse.text();

    assert.match(firstBody, /index-old\.js/);

    await writeManifest(manifestPath, "assets/index-new.js", "assets/index-new.css");

    const secondResponse = await fetch(`${baseUrl}/dashboard`);
    const secondBody = await secondResponse.text();

    assert.match(secondBody, /index-new\.js/);
    assert.match(secondBody, /index-new\.css/);
    assert.doesNotMatch(secondBody, /index-old\.js|index-old\.css/);
    assert.equal(secondResponse.headers.get("cache-control"), "no-store");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true });
  }
});

async function writeManifest(manifestPath, file, cssFile) {
  await writeFile(manifestPath, JSON.stringify({
    "index.html": {
      file,
      name: "index",
      src: "index.html",
      isEntry: true,
      css: [cssFile]
    }
  }), "utf8");
}
