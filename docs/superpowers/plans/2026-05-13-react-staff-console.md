# React Staff Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current main authenticated UI with an offline-capable React staff console that follows the Staff-Friendly design and keeps all existing scheduling, account, activity log, and offline package behavior backend-backed.

**Architecture:** Express remains the local backend, session owner, MySQL/MariaDB data layer, and offline app host. React is added as a locally bundled frontend served by Express for the main app routes, while `/api/...` endpoints expose normalized data using the existing repository and service functions. The frontend must not use CDN scripts, remote fonts, cloud APIs, or fake seed data.

**Tech Stack:** Node 20+, Express 4, EJS fallback views, MySQL2, bcryptjs, React 18, Vite, plain CSS modules or app CSS, Node `node:test`, Playwright or local browser smoke scripts where useful.

---

## Scope Notes

The approved design is a large feature, but it is one coherent subsystem: replacing the authenticated staff UI while preserving the same backend domain. The work is split into independently testable tasks. Each task should leave the app runnable and should be committed separately when complete.

Do not add a `PENDING` status. New reservations save as `RESERVED`. Valid status actions remain `MISSED`, `CANCELLED`, and `COMPLETED`.

## File Structure

Create:

- `src/features/api/apiRoutes.js`: JSON API routes for session, dashboard, reservations, schedule, availability, accounts, logs, and reports.
- `src/features/api/apiMappers.js`: Converts repository rows into React-friendly JSON and keeps status labels consistent.
- `src/features/api/apiErrors.js`: Shared API error helpers for validation, auth, conflicts, and database failures.
- `src/features/api/apiReports.js`: Computes report summaries from real reservation records.
- `tests/apiRoutes.test.js`: API coverage for auth, reservations, dashboard, availability, accounts, logs, and reports.
- `client/index.html`: Vite entry document.
- `client/src/main.jsx`: React app bootstrap.
- `client/src/App.jsx`: App-level routing and session bootstrapping.
- `client/src/api/client.js`: Same-origin API client with JSON error parsing.
- `client/src/api/mappers.js`: Frontend-only display format helpers.
- `client/src/components/AppShell.jsx`: Top bar, sidebar, and route container.
- `client/src/components/ConfirmDialog.jsx`: Reusable confirmation dialog for status actions.
- `client/src/components/StatusBadge.jsx`: Consistent status labels.
- `client/src/components/LoadingState.jsx`: Skeleton/quiet loading UI.
- `client/src/components/EmptyState.jsx`: Staff-facing empty states.
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/CalendarPage.jsx`
- `client/src/pages/ReservationFormPage.jsx`
- `client/src/pages/ReservationsPage.jsx`
- `client/src/pages/AccountsPage.jsx`
- `client/src/pages/ActivityLogsPage.jsx`
- `client/src/pages/ReportsPage.jsx`
- `client/src/styles.css`: Staff-Friendly visual system and responsive layout.
- `views/app.ejs`: Minimal server-rendered wrapper that loads the React build.
- `tests/reactAppRoutes.test.js`: Verifies main routes serve the React wrapper and do not require remote assets.
- `scripts/verify-react-build.mjs`: Verifies built assets exist and contain no remote CDN references.

Modify:

- `package.json`: Add React/Vite dependencies and scripts.
- `package-lock.json`: Update after `npm install`.
- `src/app.js`: Mount API routes and React app fallback routes.
- `src/features/users/authRoutes.js`: Either add JSON login/logout behavior or delegate to API routes while retaining existing form routes.
- `src/features/reservations/reservationRepository.js`: Add approved-by fields if needed for detail display, without schema changes.
- `src/features/schedule/scheduleService.js`: Reuse for API schedule and availability payloads.
- `scripts/create-offline-bundle.ps1`: Require `public/app/.vite/manifest.json` before bundling so offline packages cannot omit the React staff console.
- `scripts/verify-offline-bundle.mjs`: Require the built React app output.
- `scripts/verify-runtime-package.mjs`: Require the built React app output in runtime packages.
- `.gitignore`: Ignore `.superpowers/` companion output.

Preserve:

- `public/prototype/sto-nino-court-reservation-system-prototype.html` and `/prototype` as non-primary reference/fallback.
- Existing EJS files until the React app is verified.
- Existing database schema unless a real gap appears.

---

### Task 1: Add Local React Build Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/styles.css`
- Modify: `.gitignore`
- Test: `scripts/verify-react-build.mjs`
- Test: `tests/reactAppRoutes.test.js`

- [ ] **Step 1: Add dependencies and scripts**

Run:

```powershell
npm install react@18.3.1 react-dom@18.3.1 @vitejs/plugin-react@latest vite@latest
```

Expected: `package.json` and `package-lock.json` update, and no install error.

Then update `package.json` scripts to include:

```json
{
  "scripts": {
    "frontend:dev": "vite --host 127.0.0.1 --config client/vite.config.js",
    "frontend:build": "vite build --config client/vite.config.js",
    "frontend:preview": "vite preview --host 127.0.0.1 --config client/vite.config.js",
    "verify:react-build": "node scripts/verify-react-build.mjs"
  }
}
```

Keep all existing scripts. Do not remove `start`, `test`, or offline verification scripts.

- [ ] **Step 2: Create Vite config**

Create `client/vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../public/app",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: "client/index.html"
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
});
```

The build output goes under `public/app` so the existing offline bundler copies it automatically when it copies `public`.

- [ ] **Step 3: Create the React entry document**

Create `client/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Barangay Sto. Niño Court Scheduler</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create a minimal React bootstrap**

Create `client/src/main.jsx`:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `client/src/App.jsx`:

```jsx
export function App() {
  return (
    <main className="boot-screen">
      <section className="boot-card">
        <div className="brand-seal">N</div>
        <h1>Barangay Sto. Niño</h1>
        <p>Basketball Court Scheduling System</p>
      </section>
    </main>
  );
}
```

Create `client/src/styles.css`:

```css
:root {
  --bg: #f6f4ee;
  --surface: #fbfaf7;
  --ink: #202326;
  --ink-muted: #716b62;
  --primary: #0b4a6f;
  --primary-dark: #083a57;
  --primary-soft: #dceaf2;
  --border: #ded8cd;
  font-family: "Segoe UI", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
}

.boot-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.boot-card {
  width: min(420px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}

.brand-seal {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  background: var(--primary);
  color: white;
  font-weight: 800;
  font-size: 28px;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

p {
  margin: 0;
  color: var(--ink-muted);
}
```

- [ ] **Step 5: Ignore companion output**

Modify `.gitignore` by adding:

```gitignore
.superpowers/
```

This prevents visual brainstorming scratch files from being staged.

- [ ] **Step 6: Build the frontend**

Run:

```powershell
npm run frontend:build
```

Expected: PASS, and `public/app/.vite/manifest.json` exists.

- [ ] **Step 7: Add React build verifier**

Create `scripts/verify-react-build.mjs`:

```js
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appDir = path.join(root, "public", "app");
const manifest = path.join(appDir, ".vite", "manifest.json");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const failures = [];

if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
  failures.push("public/app directory was not found. Run npm run frontend:build.");
}

if (!existsSync(manifest)) {
  failures.push("public/app/.vite/manifest.json was not found.");
}

if (existsSync(appDir)) {
  for (const file of walk(appDir)) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    if (/https?:\/\/|fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/.test(text)) {
      failures.push(`Remote asset reference found in ${path.relative(root, file)}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("React build is present and contains no remote asset references.");
}
```

- [ ] **Step 8: Run verifier**

Run:

```powershell
npm run verify:react-build
```

Expected: PASS with `React build is present and contains no remote asset references.`

- [ ] **Step 9: Commit**

Run:

```powershell
git add package.json package-lock.json client public/app scripts/verify-react-build.mjs .gitignore
git commit -m "build: add local React frontend bundle"
```

Expected: commit succeeds.

---

### Task 2: Serve React For Main App Routes

**Files:**
- Create: `views/app.ejs`
- Modify: `src/app.js`
- Create: `tests/reactAppRoutes.test.js`
- Modify: `tests/app.test.js`

- [ ] **Step 1: Write route tests first**

Create `tests/reactAppRoutes.test.js`:

```js
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
    for (const route of ["/dashboard", "/schedule", "/reservations", "/reservations/new", "/account", "/activity-logs", "/reports"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      const body = await response.text();

      assert.equal(response.status, 200, route);
      assert.match(body, /id="root"/, route);
      assert.match(body, /\/app\/assets\//, route);
      assert.doesNotMatch(body, /unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com/, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

Expected initial result:

```powershell
node scripts/run-tests.mjs tests/reactAppRoutes.test.js
```

Expected: FAIL because `src/features/frontend/reactAppRoutes.js` does not exist.

- [ ] **Step 2: Implement manifest reader and routes**

Create `src/features/frontend/reactAppRoutes.js`:

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const PROJECT_ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
const MANIFEST_PATH = path.join(PROJECT_ROOT, "public", "app", ".vite", "manifest.json");

const MAIN_ROUTES = [
  "/dashboard",
  "/schedule",
  "/reservations",
  "/reservations/new",
  "/reservations/:reservationId",
  "/reservations/:reservationId/edit",
  "/account",
  "/account/password",
  "/activity-logs",
  "/reports"
];

export function createReactAppRoutes(options = {}) {
  const router = Router();
  const manifestPath = options.manifestPath || MANIFEST_PATH;

  router.get(MAIN_ROUTES, (_request, response) => {
    const assets = readReactAssets(manifestPath);
    response.render("app", assets);
  });

  return router;
}

export function readReactAssets(manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest["client/index.html"] || Object.values(manifest).find((item) => item.isEntry);

  if (!entry?.file) {
    throw new Error("React build manifest does not contain an entry file.");
  }

  return {
    scriptPath: `/app/${entry.file}`,
    cssPaths: (entry.css || []).map((file) => `/app/${file}`)
  };
}
```

- [ ] **Step 3: Add wrapper view**

Create `views/app.ejs`:

```ejs
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay Sto. Niño Court Scheduler</title>
    <% for (const cssPath of cssPaths) { %>
      <link rel="stylesheet" href="<%= cssPath %>">
    <% } %>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="<%= scriptPath %>"></script>
  </body>
</html>
```

- [ ] **Step 4: Mount routes after API and auth**

Modify `src/app.js` imports:

```js
import { createReactAppRoutes } from "./features/frontend/reactAppRoutes.js";
```

Mount React routes after API/authenticated middleware and before legacy EJS feature routes:

```js
  app.use(createAuthRoutes({ db }));
  app.use(createPrototypeApiRoutes({ db }));
  app.use(requireSignedIn);
  app.use(createReactAppRoutes());
  app.use(createDashboardRoutes({ db }));
  app.use(createReservationRoutes({ db }));
  app.use(createScheduleRoutes({ db }));
  app.use(createActivityLogRoutes({ db }));
```

This keeps `/login` server-rendered until the React login page is wired, and all signed-in staff routes load the SPA.

- [ ] **Step 5: Update app smoke test**

Modify `tests/app.test.js` by adding:

```js
test("createApp serves React staff shell for authenticated dashboard route", async () => {
  const app = createApp();
  app.use((request, _response, next) => {
    request.session = { user: { userId: 1, fullName: "Admin", username: "admin", role: "ADMIN" } };
    next();
  });
  const server = app.listen(0);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/dashboard`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /id="root"/);
    assert.match(body, /\/app\/assets\//);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.db?.end?.();
  }
});
```

If Express middleware order makes this exact helper awkward, keep the route-specific test in `tests/reactAppRoutes.test.js` and avoid weakening `createApp` coverage.

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run frontend:build
node scripts/run-tests.mjs tests/reactAppRoutes.test.js tests/app.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/features/frontend/reactAppRoutes.js views/app.ejs src/app.js tests/reactAppRoutes.test.js tests/app.test.js public/app
git commit -m "feat: serve React staff console on main routes"
```

---

### Task 3: Add Backend API Foundation

**Files:**
- Create: `src/features/api/apiErrors.js`
- Create: `src/features/api/apiMappers.js`
- Create: `src/features/api/apiRoutes.js`
- Modify: `src/app.js`
- Create: `tests/apiRoutes.test.js`

- [ ] **Step 1: Write API session/auth tests**

Create `tests/apiRoutes.test.js` with the initial tests:

```js
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import test from "node:test";

import { createApiRoutes } from "../src/features/api/apiRoutes.js";

const TODAY = "2026-05-13";

test("GET /api/session returns signed-out state", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/session");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { authenticated: false, user: null });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/login verifies hashed password and stores session", async () => {
  const session = {};
  const passwordHash = await bcrypt.hash("admin123", 4);
  const app = buildApiTestApp({
    session,
    repositories: {
      findUserByUsername: async (_db, username) => ({
        userId: 1,
        fullName: "System Administrator",
        username,
        passwordHash,
        role: "ADMIN",
        accountStatus: "ACTIVE"
      })
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/login", { username: "ADMIN", password: "admin123" });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, "admin");
    assert.equal(response.body.user.role, "ADMIN");
    assert.equal(session.user.userId, 1);
  } finally {
    await closeServer(server);
  }
});

test("protected APIs return 401 JSON when signed out", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations");
    assert.equal(response.status, 401);
    assert.equal(response.body.error, "Login required.");
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
    todayProvider: () => TODAY,
    repositories: {
      findUserByUsername: async () => null,
      listReservations: async () => [],
      getTimeSlots: async () => [],
      listUsers: async () => [],
      listActivityLogs: async () => [],
      ...repositories
    }
  }));
  return app;
}

async function getJson(server, pathName) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`);
  return { status: response.status, body: await response.json() };
}

async function postJson(server, pathName, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}
```

Expected:

```powershell
node scripts/run-tests.mjs tests/apiRoutes.test.js
```

Expected: FAIL because API routes do not exist.

- [ ] **Step 2: Implement API error helpers**

Create `src/features/api/apiErrors.js`:

```js
export function sendValidationError(response, errors) {
  response.status(400).json({ errors });
}

export function sendLoginRequired(response) {
  response.status(401).json({ error: "Login required." });
}

export function sendAdminRequired(response) {
  response.status(403).json({ error: "Admin access required." });
}

export function sendDatabaseError(response, error) {
  const message = process.env.NODE_ENV === "development" && error?.message
    ? `Database is unavailable: ${error.message}`
    : "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
  response.status(503).json({ error: message });
}
```

- [ ] **Step 3: Implement API mappers**

Create `src/features/api/apiMappers.js`:

```js
const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed"
};

export function toApiUser(user) {
  if (!user) return null;
  return {
    userId: Number(user.userId),
    fullName: user.fullName,
    username: user.username,
    role: String(user.role || "").toUpperCase()
  };
}

export function toApiAccount(user) {
  return {
    userId: Number(user.userId),
    fullName: user.fullName,
    username: user.username,
    role: String(user.role || "").toUpperCase(),
    accountStatus: user.accountStatus || "ACTIVE",
    createdAt: user.createdAt || ""
  };
}

export function toApiReservation(reservation) {
  const statusCode = String(reservation.statusCode || "RESERVED").toUpperCase();
  return {
    reservationId: Number(reservation.reservationId),
    representativeName: reservation.representativeName || "",
    contactNo: reservation.contactNo || "",
    address: reservation.address || "",
    purpose: reservation.purpose || "",
    reservationDate: reservation.reservationDate || "",
    startTime: normalizeTime(reservation.startTime),
    endTime: normalizeTime(reservation.endTime),
    remarks: reservation.remarks || "",
    statusCode,
    statusName: reservation.statusName || STATUS_LABELS[statusCode] || statusCode,
    createdByName: reservation.createdByName || ""
  };
}

export function toApiScheduleSlot(slot) {
  return {
    slotId: Number(slot.slotId),
    name: slot.name,
    startTime: normalizeTime(slot.startTime),
    endTime: normalizeTime(slot.endTime),
    statusCode: String(slot.statusCode || "AVAILABLE").toUpperCase(),
    statusName: slot.statusName || STATUS_LABELS[String(slot.statusCode || "AVAILABLE").toUpperCase()] || "Available",
    isAvailableForBooking: Boolean(slot.isAvailableForBooking),
    reservation: slot.reservation ? toApiReservation(slot.reservation) : null
  };
}

export function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}
```

- [ ] **Step 4: Implement session, login, logout, and auth middleware**

Create the first version of `src/features/api/apiRoutes.js`:

```js
import bcrypt from "bcryptjs";
import { Router } from "express";

import { listActivityLogs } from "../activityLogs/activityLogRepository.js";
import {
  createReservation,
  getReservationById,
  getReservationStatuses,
  getTimeSlots,
  listReservations,
  updateReservation,
  updateReservationStatus
} from "../reservations/reservationRepository.js";
import { buildDailySchedule, buildDashboardSummary, buildWeeklySchedule, findNearestAvailableSlot } from "../schedule/scheduleService.js";
import { createUser, findUserByUsername, listUsers, updateUserAccountStatus } from "../users/userRepository.js";
import { sendAdminRequired, sendDatabaseError, sendLoginRequired } from "./apiErrors.js";
import { toApiAccount, toApiReservation, toApiScheduleSlot, toApiUser } from "./apiMappers.js";

const defaultRepositories = {
  createReservation,
  createUser,
  findUserByUsername,
  getReservationById,
  getReservationStatuses,
  getTimeSlots,
  listActivityLogs,
  listReservations,
  listUsers,
  updateReservation,
  updateReservationStatus,
  updateUserAccountStatus
};

export function createApiRoutes({ db, repositories = {}, todayProvider = getTodayDate } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/api/session", (request, response) => {
    response.json({
      authenticated: Boolean(request.session?.user),
      user: toApiUser(request.session?.user)
    });
  });

  router.post("/api/login", async (request, response) => {
    const username = String(request.body.username || "").trim().toLowerCase();
    const password = String(request.body.password || "");

    try {
      const user = username ? await repo.findUserByUsername(db, username) : null;
      const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;

      if (!user || !matches) {
        response.status(401).json({ error: "Invalid username or password." });
        return;
      }

      request.session.user = {
        userId: user.userId,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      };

      response.json({ user: toApiUser(request.session.user) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/logout", (request, response) => {
    if (typeof request.session?.destroy === "function") {
      request.session.destroy(() => response.json({ ok: true }));
      return;
    }
    request.session.user = null;
    response.json({ ok: true });
  });

  router.use("/api", requireApiSignedIn);

  router.get("/api/reservations", async (_request, response) => {
    response.json({ reservations: [] });
  });

  return router;

  function requireApiSignedIn(request, response, next) {
    if (!request.session?.user) {
      sendLoginRequired(response);
      return;
    }
    next();
  }
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
```

- [ ] **Step 5: Mount API routes**

Modify `src/app.js` import:

```js
import { createApiRoutes } from "./features/api/apiRoutes.js";
```

Mount before prototype API routes:

```js
  app.use(createAuthRoutes({ db }));
  app.use(createApiRoutes({ db }));
  app.use(createPrototypeApiRoutes({ db }));
```

- [ ] **Step 6: Run API foundation tests**

Run:

```powershell
node scripts/run-tests.mjs tests/apiRoutes.test.js
```

Expected: PASS for session/login/protected tests.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/features/api src/app.js tests/apiRoutes.test.js
git commit -m "feat: add staff console API foundation"
```

---

### Task 4: Implement Reservation, Schedule, Dashboard, Availability, Logs, Accounts, And Reports APIs

**Files:**
- Modify: `src/features/api/apiRoutes.js`
- Create: `src/features/api/apiReports.js`
- Modify: `tests/apiRoutes.test.js`

- [ ] **Step 1: Add reservation API tests**

Append to `tests/apiRoutes.test.js`:

```js
test("GET /api/reservations maps repository reservations", async () => {
  const app = buildApiTestApp({
    session: signedInStaffSession(),
    repositories: {
      listReservations: async (_db, filters) => {
        assert.deepEqual(filters, { reservationDate: "2026-05-13", statusCode: "RESERVED", search: "team", purpose: "" });
        return [sampleReservation()];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations?reservationDate=2026-05-13&statusCode=RESERVED&search=team");
    assert.equal(response.status, 200);
    assert.equal(response.body.reservations[0].representativeName, "Sto. Niño Youth Team");
    assert.equal(response.body.reservations[0].statusCode, "RESERVED");
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations creates a RESERVED reservation with signed-in creator", async () => {
  let createCall = null;
  const app = buildApiTestApp({
    session: signedInStaffSession(),
    repositories: {
      createReservation: async (_db, reservation, options) => {
        createCall = { reservation, options };
        return 9;
      },
      getReservationById: async () => ({ ...sampleReservation(), reservationId: 9 })
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", sampleReservationInput());
    assert.equal(response.status, 201);
    assert.equal(createCall.options.createdByUserId, 4);
    assert.equal(createCall.reservation.statusCode, "RESERVED");
    assert.equal(response.body.reservation.reservationId, 9);
  } finally {
    await closeServer(server);
  }
});

function signedInStaffSession() {
  return { user: { userId: 4, fullName: "Court Staff", username: "staff", role: "STAFF" } };
}

function signedInAdminSession() {
  return { user: { userId: 1, fullName: "System Administrator", username: "admin", role: "ADMIN" } };
}

function sampleReservation() {
  return {
    reservationId: 7,
    reservationDate: "2026-05-13",
    startTime: "07:00",
    endTime: "08:00",
    representativeName: "Sto. Niño Youth Team",
    contactNo: "09171234567",
    address: "Purok 3",
    purpose: "Practice",
    remarks: "Bring barangay ID.",
    statusCode: "RESERVED",
    statusName: "Reserved",
    createdByName: "Court Staff"
  };
}

function sampleReservationInput() {
  return {
    reservationDate: "2026-05-13",
    startTime: "07:00",
    endTime: "08:00",
    representativeName: "Sto. Niño Youth Team",
    contactNo: "09171234567",
    address: "Purok 3",
    purpose: "Practice",
    remarks: "Bring barangay ID."
  };
}
```

Expected: FAIL until endpoints are implemented.

- [ ] **Step 2: Implement reservation endpoints**

Add imports in `apiRoutes.js`:

```js
import { ReservationConflictError, ReservationNotFoundError } from "../reservations/reservationRepository.js";
import { validateReservationInput } from "../reservations/reservationValidation.js";
import { DuplicateUsernameError, UserNotFoundError } from "../users/userRepository.js";
import { validateCreateUserInput } from "../users/userValidation.js";
import { sendAdminRequired, sendDatabaseError, sendLoginRequired, sendValidationError } from "./apiErrors.js";
```

Replace the temporary `/api/reservations` route with:

```js
  router.get("/api/reservations", async (request, response) => {
    try {
      const filters = cleanReservationFilters(request.query);
      const reservations = await repo.listReservations(db, filters);
      response.json({ reservations: reservations.map(toApiReservation) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reservations/:reservationId", async (request, response) => {
    try {
      const reservation = await repo.getReservationById(db, request.params.reservationId);
      if (!reservation) {
        response.status(404).json({ error: "Reservation record was not found." });
        return;
      }
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/reservations", async (request, response) => {
    const result = validateReservationInput({ ...request.body, statusCode: "RESERVED" }, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const reservationId = await repo.createReservation(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, reservationId);
      response.status(201).json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.put("/api/reservations/:reservationId", async (request, response) => {
    const result = validateReservationInput({ ...request.body, statusCode: request.body.statusCode || "RESERVED" }, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      await repo.updateReservation(db, request.params.reservationId, result.value, {
        userId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, request.params.reservationId);
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.post("/api/reservations/:reservationId/status", async (request, response) => {
    const statusCode = String(request.body.statusCode || "").trim().toUpperCase();
    if (!["MISSED", "CANCELLED", "COMPLETED"].includes(statusCode)) {
      response.status(400).json({ error: "Reservation status is invalid." });
      return;
    }

    try {
      await repo.updateReservationStatus(db, request.params.reservationId, statusCode, {
        userId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, request.params.reservationId);
      response.json({ reservation: reservation ? toApiReservation(reservation) : null });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });
```

Add helpers:

```js
function cleanReservationFilters(query) {
  return {
    reservationDate: clean(query.reservationDate || query.date),
    statusCode: clean(query.statusCode || query.status).toUpperCase(),
    search: clean(query.search),
    purpose: clean(query.purpose)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function sendReservationMutationError(response, error) {
  if (error instanceof ReservationConflictError) {
    response.status(409).json({
      error: error.message,
      overlap: error.overlap ? toApiReservation(error.overlap) : null
    });
    return;
  }
  if (error instanceof ReservationNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }
  sendDatabaseError(response, error);
}
```

- [ ] **Step 3: Add dashboard, schedule, and availability tests**

Append tests:

```js
test("GET /api/dashboard returns today schedule and nearest slot", async () => {
  const app = buildApiTestApp({
    session: signedInStaffSession(),
    repositories: {
      getTimeSlots: async () => [
        { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
        { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" }
      ],
      listReservations: async (_db, filters) => filters.reservationDate === TODAY ? [sampleReservation()] : []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/dashboard");
    assert.equal(response.status, 200);
    assert.equal(response.body.summary.today, TODAY);
    assert.equal(response.body.todaySchedule.length, 2);
    assert.equal(response.body.nearestAvailableSlot.startTime, "08:00");
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability reports a conflict and suggestions", async () => {
  const app = buildApiTestApp({
    session: signedInStaffSession(),
    repositories: {
      getTimeSlots: async () => [
        { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
        { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" }
      ],
      listReservations: async () => [sampleReservation()]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-13&startTime=07:00&endTime=08:00");
    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    assert.equal(response.body.conflict.representativeName, "Sto. Niño Youth Team");
    assert.equal(response.body.suggestions[0].startTime, "08:00");
  } finally {
    await closeServer(server);
  }
});
```

- [ ] **Step 4: Implement dashboard, schedule, and availability**

Add routes to `apiRoutes.js`:

```js
  router.get("/api/dashboard", async (_request, response) => {
    const today = todayProvider();
    try {
      const timeSlots = await repo.getTimeSlots(db);
      const todayReservations = await repo.listReservations(db, { reservationDate: today });
      const suggestionReservations = await collectReservations({ db, repo, startDate: today, days: 14 });
      const todaySchedule = buildDailySchedule({ date: today, timeSlots, reservations: todayReservations });
      const summary = buildDashboardSummary({ today, todaySchedule, upcomingReservations: suggestionReservations });
      const nearestAvailableSlot = findNearestAvailableSlot({
        startDate: today,
        timeSlots,
        reservations: suggestionReservations,
        searchDays: 14
      });

      response.json({
        summary,
        todaySchedule: todaySchedule.map(toApiScheduleSlot),
        nearestAvailableSlot
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/schedule", async (request, response) => {
    const date = clean(request.query.date) || todayProvider();
    try {
      const weekStartDate = getWeekStartDate(date);
      const timeSlots = await repo.getTimeSlots(db);
      const reservations = await collectReservations({ db, repo, startDate: weekStartDate, days: 7 });
      const weeklySchedule = buildWeeklySchedule({ weekStartDate, timeSlots, reservations });
      response.json({
        weekStartDate,
        days: weeklySchedule.days,
        rows: weeklySchedule.rows.map((row) => ({
          ...row,
          cells: row.cells.map(toApiScheduleSlot)
        }))
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/availability", async (request, response) => {
    const date = clean(request.query.date);
    const startTime = clean(request.query.startTime);
    const endTime = clean(request.query.endTime);

    if (!date || !startTime || !endTime) {
      response.status(400).json({ error: "Date, start time, and end time are required." });
      return;
    }

    try {
      const [timeSlots, dayReservations] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: date })
      ]);
      const conflict = dayReservations.find((reservation) =>
        ["RESERVED"].includes(String(reservation.statusCode).toUpperCase()) &&
        startTime < reservation.endTime &&
        endTime > reservation.startTime
      );
      const durationMinutes = minutesBetween(startTime, endTime);
      const suggestions = findSameDaySuggestions({ date, durationMinutes, timeSlots, reservations: dayReservations });

      response.json({
        available: !conflict,
        conflict: conflict ? toApiReservation(conflict) : null,
        suggestions
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });
```

Add helpers:

```js
async function collectReservations({ db, repo, startDate, days }) {
  const results = [];
  for (let offset = 0; offset < days; offset += 1) {
    results.push(...await repo.listReservations(db, { reservationDate: addDays(startDate, offset) }));
  }
  return results.sort((a, b) => `${a.reservationDate} ${a.startTime}`.localeCompare(`${b.reservationDate} ${b.startTime}`));
}

function findSameDaySuggestions({ date, durationMinutes, timeSlots, reservations }) {
  return timeSlots
    .filter((slot) => minutesBetween(slot.startTime, slot.endTime) >= durationMinutes)
    .filter((slot) => !reservations.some((reservation) =>
      String(reservation.statusCode).toUpperCase() === "RESERVED" &&
      slot.startTime < reservation.endTime &&
      addMinutes(slot.startTime, durationMinutes) > reservation.startTime
    ))
    .slice(0, 4)
    .map((slot) => ({
      date,
      startTime: slot.startTime,
      endTime: addMinutes(slot.startTime, durationMinutes)
    }));
}

function minutesBetween(startTime, endTime) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

function addMinutes(time, minutes) {
  const value = timeToMinutes(time) + minutes;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function getWeekStartDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addDays(dateString, -date.getUTCDay());
}
```

- [ ] **Step 5: Add accounts, logs, and reports tests**

Append tests:

```js
test("GET /api/accounts is admin-only", async () => {
  const staffApp = buildApiTestApp({ session: signedInStaffSession() });
  const staffServer = staffApp.listen(0);
  try {
    const response = await getJson(staffServer, "/api/accounts");
    assert.equal(response.status, 403);
  } finally {
    await closeServer(staffServer);
  }
});

test("GET /api/activity-logs returns audit rows", async () => {
  const app = buildApiTestApp({
    session: signedInAdminSession(),
    repositories: {
      listActivityLogs: async (_db, filters) => {
        assert.equal(filters.action, "MARK_MISSED");
        return [{
          logId: 2,
          action: "MARK_MISSED",
          details: "Reservation status changed to MISSED.",
          createdAt: "2026-05-13 09:00:00",
          userName: "Court Staff",
          reservationId: 7
        }];
      }
    }
  });
  const server = app.listen(0);
  try {
    const response = await getJson(server, "/api/activity-logs?action=MARK_MISSED");
    assert.equal(response.status, 200);
    assert.equal(response.body.logs[0].action, "MARK_MISSED");
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports computes summary from real reservations", async () => {
  const app = buildApiTestApp({
    session: signedInAdminSession(),
    repositories: {
      listReservations: async () => [sampleReservation(), { ...sampleReservation(), reservationId: 8, statusCode: "MISSED", startTime: "08:00", endTime: "09:00" }]
    }
  });
  const server = app.listen(0);
  try {
    const response = await getJson(server, "/api/reports");
    assert.equal(response.status, 200);
    assert.equal(response.body.summary.totalReservations, 2);
    assert.equal(response.body.summary.missedCount, 1);
    assert.equal(response.body.summary.courtHoursBooked, 2);
  } finally {
    await closeServer(server);
  }
});
```

- [ ] **Step 6: Implement reports helper**

Create `src/features/api/apiReports.js`:

```js
export function buildReportsPayload(reservations = []) {
  const statusCounts = {};
  const requesterHours = new Map();
  let courtHoursBooked = 0;

  for (const reservation of reservations) {
    const status = String(reservation.statusCode || "RESERVED").toUpperCase();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const hours = hoursBetween(reservation.startTime, reservation.endTime);
    courtHoursBooked += hours;
    requesterHours.set(
      reservation.representativeName,
      (requesterHours.get(reservation.representativeName) || 0) + hours
    );
  }

  return {
    summary: {
      totalReservations: reservations.length,
      courtHoursBooked,
      missedCount: statusCounts.MISSED || 0,
      completedCount: statusCounts.COMPLETED || 0,
      reservedCount: statusCounts.RESERVED || 0,
      cancelledCount: statusCounts.CANCELLED || 0
    },
    statusCounts,
    topRequesters: [...requesterHours.entries()]
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
  };
}

function hoursBetween(startTime, endTime) {
  const [startHour, startMinute] = String(startTime).split(":").map(Number);
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
}
```

- [ ] **Step 7: Implement accounts, logs, and reports routes**

Add routes to `apiRoutes.js`:

```js
  router.get("/api/accounts", requireApiAdmin, async (_request, response) => {
    try {
      const users = await repo.listUsers(db);
      response.json({ accounts: users.map(toApiAccount) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/accounts", requireApiAdmin, async (request, response) => {
    const result = validateCreateUserInput(request.body);
    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }
    try {
      const account = await repo.createUser(db, result.value);
      response.status(201).json({ account: toApiAccount({ ...account, accountStatus: "ACTIVE", createdAt: "" }) });
    } catch (error) {
      if (error instanceof DuplicateUsernameError) {
        response.status(409).json({ errors: { username: "Username already exists." } });
        return;
      }
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/accounts/:userId/status", requireApiAdmin, async (request, response) => {
    const accountStatus = String(request.body.accountStatus || "").trim().toUpperCase();
    if (!["ACTIVE", "INACTIVE"].includes(accountStatus)) {
      response.status(400).json({ error: "Account status is invalid." });
      return;
    }
    if (Number(request.params.userId) === Number(request.session.user.userId)) {
      response.status(400).json({ error: "You cannot change your own account status." });
      return;
    }
    try {
      await repo.updateUserAccountStatus(db, request.params.userId, accountStatus);
      response.json({ ok: true });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/activity-logs", async (request, response) => {
    try {
      const filters = {
        action: clean(request.query.action).toUpperCase(),
        date: clean(request.query.date),
        search: clean(request.query.search)
      };
      const logs = await repo.listActivityLogs(db, filters);
      response.json({ logs });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reports", async (_request, response) => {
    try {
      const reservations = await repo.listReservations(db, {});
      response.json(buildReportsPayload(reservations));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });
```

Add admin middleware:

```js
  function requireApiAdmin(request, response, next) {
    if (request.session?.user?.role !== "ADMIN") {
      sendAdminRequired(response);
      return;
    }
    next();
  }
```

- [ ] **Step 8: Run full API tests**

Run:

```powershell
node scripts/run-tests.mjs tests/apiRoutes.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add src/features/api tests/apiRoutes.test.js
git commit -m "feat: expose staff console APIs"
```

---

### Task 5: Build React API Client, Shell, And Login

**Files:**
- Create: `client/src/api/client.js`
- Create: `client/src/api/mappers.js`
- Create: `client/src/components/AppShell.jsx`
- Create: `client/src/components/LoadingState.jsx`
- Create: `client/src/components/EmptyState.jsx`
- Create: `client/src/components/StatusBadge.jsx`
- Modify: `client/src/App.jsx`
- Create: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Add API client**

Create `client/src/api/client.js`:

```js
export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || firstValidationError(data.errors) || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function getSession() {
  return apiRequest("/api/session");
}

export function login(payload) {
  return apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return apiRequest("/api/logout", {
    method: "POST",
    body: "{}"
  });
}

function firstValidationError(errors) {
  return Object.values(errors || {})[0] || "";
}
```

- [ ] **Step 2: Add display helpers**

Create `client/src/api/mappers.js`:

```js
export const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Did not show up",
  CANCELLED: "Cancelled",
  COMPLETED: "Done"
};

export function formatTime(time) {
  const [hoursText, minutes = "00"] = String(time || "").split(":");
  let hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function initials(name) {
  return String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
```

- [ ] **Step 3: Add reusable components**

Create `client/src/components/LoadingState.jsx`:

```jsx
export function LoadingState({ label = "Loading records..." }) {
  return (
    <div className="state-card">
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <p>{label}</p>
    </div>
  );
}
```

Create `client/src/components/EmptyState.jsx`:

```jsx
export function EmptyState({ title, body, action }) {
  return (
    <div className="state-card empty">
      <div className="empty-mark">i</div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
```

Create `client/src/components/StatusBadge.jsx`:

```jsx
import { STATUS_LABELS } from "../api/mappers.js";

export function StatusBadge({ statusCode }) {
  const code = String(statusCode || "AVAILABLE").toUpperCase();
  return <span className={`status-badge status-${code.toLowerCase()}`}>{STATUS_LABELS[code] || code}</span>;
}
```

- [ ] **Step 4: Add app shell**

Create `client/src/components/AppShell.jsx`:

```jsx
import { initials } from "../api/mappers.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", helper: "Today's schedule" },
  { path: "/schedule", label: "Calendar", helper: "See the week" },
  { path: "/reservations/new", label: "New Reservation", helper: "Encode walk-in" },
  { path: "/reservations", label: "All Bookings", helper: "Search records" },
  { path: "/reports", label: "Summary", helper: "Local reports" },
  { path: "/activity-logs", label: "Activity Logs", helper: "Audit trail" },
  { path: "/account", label: "Accounts", helper: "Admin only", adminOnly: true }
];

export function AppShell({ user, path, onNavigate, onLogout, children }) {
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal small">N</div>
          <div>
            <strong>Barangay Sto. Niño</strong>
            <span>Basketball Court</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span className="avatar">{initials(user.fullName)}</span>
            <span>
              <strong>{user.fullName}</strong>
              <small>{user.role === "ADMIN" ? "Administrator" : "Staff"}</small>
            </span>
          </div>
          <button className="btn btn-light" type="button" onClick={onLogout}>Sign Out</button>
        </div>
      </header>
      <aside className="sidebar">
        {visibleNav.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${path === item.path || (item.path !== "/dashboard" && path.startsWith(item.path)) ? "active" : ""}`}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            <span>{item.label}</span>
            <small>{item.helper}</small>
          </button>
        ))}
        <div className="sidebar-help">
          <strong>Need help?</strong>
          Ask the system administrator before changing account access.
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Add login page**

Create `client/src/pages/LoginPage.jsx`:

```jsx
import { useState } from "react";
import { login } from "../api/client.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(form);
      onLogin(data.user);
      window.history.replaceState({}, "", "/dashboard");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="brand-row">
          <div className="brand-seal">N</div>
          <div>
            <strong>Barangay Sto. Niño</strong>
            <span>Local Office System</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Basketball Court Scheduling</p>
          <h1>Manage court reservations at the office.</h1>
          <p>Encode walk-in requests, check available slots, and keep reservation records updated on this local computer.</p>
        </div>
      </section>
      <section className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Personnel Sign In</h2>
          <p>For authorized barangay staff only.</p>
          {error && <div className="alert error">{error}</div>}
          <label className="field">
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <button className="btn btn-primary btn-big" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Wire App session and navigation**

Modify `client/src/App.jsx`:

```jsx
import { useEffect, useState } from "react";
import { getSession, logout } from "./api/client.js";
import { AppShell } from "./components/AppShell.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

function InterimPage({ title }) {
  return (
    <section className="page">
      <p className="page-kicker">Staff Console</p>
      <h1>{title}</h1>
      <p className="page-subtitle">This screen will be connected in the next implementation task.</p>
    </section>
  );
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState({ loading: true, user: null });

  useEffect(() => {
    getSession()
      .then((data) => setSession({ loading: false, user: data.user }))
      .catch(() => setSession({ loading: false, user: null }));
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  async function handleLogout() {
    await logout().catch(() => {});
    setSession({ loading: false, user: null });
    window.history.replaceState({}, "", "/login");
    setPath("/login");
  }

  if (session.loading) return <LoadingState label="Opening local staff console..." />;
  if (!session.user || path === "/login") return <LoginPage onLogin={(user) => setSession({ loading: false, user })} />;

  return (
    <AppShell user={session.user} path={path} onNavigate={navigate} onLogout={handleLogout}>
      <InterimPage title={routeTitle(path)} />
    </AppShell>
  );
}

function routeTitle(path) {
  if (path.startsWith("/schedule")) return "Calendar";
  if (path.startsWith("/reservations/new")) return "New Reservation";
  if (path.startsWith("/reservations")) return "All Bookings";
  if (path.startsWith("/account")) return "Accounts";
  if (path.startsWith("/activity-logs")) return "Activity Logs";
  if (path.startsWith("/reports")) return "Summary";
  return "Today at the Court";
}
```

- [ ] **Step 7: Add shell CSS**

Append to `client/src/styles.css` the concrete classes used above:

```css
.login-page,
.app-layout {
  min-height: 100vh;
}

.login-page {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 1fr);
}

.login-side {
  background: var(--primary);
  color: white;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.login-side p {
  color: rgba(255, 255, 255, 0.85);
}

.brand-row,
.brand,
.topbar-actions,
.user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-seal.small {
  width: 42px;
  height: 42px;
  font-size: 18px;
  margin: 0;
  background: white;
  color: var(--primary);
}

.login-form-side {
  display: grid;
  place-items: center;
  padding: 48px;
}

.login-card {
  width: min(420px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px;
}

.field {
  display: grid;
  gap: 8px;
  margin: 18px 0;
  font-weight: 700;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 13px 14px;
  font: inherit;
  background: white;
}

.btn {
  border: 1px solid var(--border);
  background: white;
  border-radius: 10px;
  padding: 11px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-big {
  width: 100%;
  padding: 15px 18px;
}

.btn-light {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.alert.error {
  border: 1px solid #b42318;
  color: #8a1f16;
  background: #fdf3f1;
  border-radius: 10px;
  padding: 12px;
  margin: 16px 0;
}

.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 72px 1fr;
}

.topbar {
  grid-column: 1 / -1;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.brand span,
.user-chip small {
  display: block;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  font-weight: 800;
}

.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
}

.nav-item span,
.nav-item small {
  display: block;
}

.nav-item span {
  font-weight: 800;
  color: var(--ink);
}

.nav-item small {
  margin-top: 2px;
  color: var(--ink-muted);
}

.nav-item.active {
  background: var(--primary-soft);
  border-color: #c7dcea;
}

.sidebar-help {
  margin-top: auto;
  border: 1px solid #c7dcea;
  background: #eff5f8;
  color: var(--primary);
  border-radius: 10px;
  padding: 14px;
  font-size: 14px;
}

.main-panel {
  padding: 28px;
  overflow: auto;
}

.page-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink-muted);
}

.page h1 {
  margin: 0 0 8px;
}

.state-card {
  min-height: 240px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 28px;
}

.skeleton-line {
  width: 180px;
  height: 12px;
  border-radius: 999px;
  background: var(--border);
}

.skeleton-line.wide {
  width: 260px;
}

.status-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid currentColor;
}

.status-reserved { color: #0b4a6f; background: #eff5f8; }
.status-available { color: #0b6b3a; background: #edf7ef; }
.status-missed { color: #b42318; background: #fdf3f1; }
.status-cancelled { color: #716b62; background: #f1eee8; }
.status-completed { color: #0b6b3a; background: #edf7ef; }

@media (max-width: 820px) {
  .login-page,
  .app-layout {
    display: block;
  }

  .sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .topbar {
    min-height: 72px;
    gap: 14px;
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 8: Build and smoke test**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add client/src public/app
git commit -m "feat: add React staff shell and login"
```

---

### Task 6: Implement Dashboard And Calendar Pages

**Files:**
- Create: `client/src/pages/DashboardPage.jsx`
- Create: `client/src/pages/CalendarPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Create dashboard page**

Create `client/src/pages/DashboardPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

export function DashboardPage({ onNavigate }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    apiRequest("/api/dashboard")
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: null, error: error.message }));
  }, []);

  if (state.loading) return <LoadingState label="Loading today's schedule..." />;
  if (state.error) return <div className="alert error">{state.error}</div>;

  const reservedSlots = state.data.todaySchedule.filter((slot) => slot.reservation);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Home</p>
          <h1>Today at the court</h1>
          <p className="page-subtitle">Ngayong araw, court schedule and available time slots.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>
          New Reservation
        </button>
      </div>

      <div className="stats-grid">
        <Stat label="Reserved today" value={state.data.summary.reservedCount} />
        <Stat label="Available slots" value={state.data.summary.availableCount} />
        <Stat label="Missed today" value={state.data.summary.missedCount} />
      </div>

      {state.data.nearestAvailableSlot && (
        <div className="info-banner">
          Nearest available: {state.data.nearestAvailableSlot.name}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Today's schedule</h2>
          <span>Click All Bookings to manage reservation records.</span>
        </div>
        {reservedSlots.length === 0 ? (
          <EmptyState title="No reservations today." body="Walang reserbasyon ngayon. The court is open for walk-in scheduling." />
        ) : (
          <div className="booking-list">
            {state.data.todaySchedule.map((slot) => (
              <div key={slot.slotId} className="booking-row">
                <strong>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</strong>
                {slot.reservation ? (
                  <span>
                    {slot.reservation.representativeName}
                    <small>{slot.reservation.purpose}</small>
                  </span>
                ) : (
                  <span className="muted">Available</span>
                )}
                <StatusBadge statusCode={slot.statusCode} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
```

- [ ] **Step 2: Create calendar page**

Create `client/src/pages/CalendarPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

export function CalendarPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    setState({ loading: true, data: null, error: "" });
    apiRequest(`/api/schedule?date=${encodeURIComponent(date)}`)
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: null, error: error.message }));
  }, [date]);

  if (state.loading) return <LoadingState label="Loading weekly calendar..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Calendar</p>
          <h1>Weekly schedule</h1>
          <p className="page-subtitle">Tingnan ang available and reserved slots.</p>
        </div>
        <input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      {state.error ? (
        <div className="alert error">{state.error}</div>
      ) : (
        <div className="calendar-table">
          <div className="calendar-header" style={{ gridTemplateColumns: `130px repeat(${state.data.days.length}, minmax(120px, 1fr))` }}>
            <strong>Time</strong>
            {state.data.days.map((day) => <strong key={day.date}>{day.name}<small>{day.date}</small></strong>)}
          </div>
          {state.data.rows.map((row) => (
            <div className="calendar-row" style={{ gridTemplateColumns: `130px repeat(${row.cells.length}, minmax(120px, 1fr))` }} key={row.slotId}>
              <strong>{formatTime(row.startTime)}<small>{formatTime(row.endTime)}</small></strong>
              {row.cells.map((cell) => (
                <div key={`${row.slotId}-${cell.slotId}-${cell.reservation?.reservationId || "empty"}`} className={`calendar-cell status-${cell.statusCode.toLowerCase()}`}>
                  <StatusBadge statusCode={cell.statusCode} />
                  {cell.reservation && <span>{cell.reservation.representativeName}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Wire pages in App**

Modify `client/src/App.jsx` imports:

```jsx
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
```

Replace interim screen rendering with:

```jsx
function renderPage(path, navigate) {
  if (path.startsWith("/schedule")) return <CalendarPage />;
  if (path.startsWith("/dashboard")) return <DashboardPage onNavigate={navigate} />;
  return <InterimPage title={routeTitle(path)} />;
}
```

Then in the shell:

```jsx
{renderPage(path, navigate)}
```

- [ ] **Step 4: Add dashboard/calendar CSS**

Append:

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.page-subtitle,
.muted {
  color: var(--ink-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.stat-card,
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.stat-card {
  padding: 18px;
}

.stat-card span,
.stat-card strong {
  display: block;
}

.stat-card strong {
  margin-top: 8px;
  font-size: 34px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.card-head h2 {
  margin: 0;
}

.booking-list {
  display: grid;
}

.booking-row {
  display: grid;
  grid-template-columns: 170px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.booking-row small,
.calendar-header small,
.calendar-row small {
  display: block;
  color: var(--ink-muted);
  font-weight: 500;
}

.info-banner {
  margin-bottom: 18px;
  border: 1px solid #c7dcea;
  background: #eff5f8;
  color: var(--primary);
  border-radius: 10px;
  padding: 14px 16px;
  font-weight: 700;
}

.date-input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  font: inherit;
}

.calendar-table {
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.calendar-header,
.calendar-row {
  display: grid;
  min-width: 980px;
}

.calendar-header > *,
.calendar-row > * {
  padding: 12px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.calendar-cell {
  min-height: 72px;
  display: grid;
  gap: 6px;
  align-content: start;
}
```

- [ ] **Step 5: Build and verify**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
node scripts/run-tests.mjs tests/apiRoutes.test.js tests/reactAppRoutes.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add client/src public/app
git commit -m "feat: add dashboard and calendar screens"
```

---

### Task 7: Implement Reservation List, Detail, Create, And Edit

**Files:**
- Create: `client/src/components/ConfirmDialog.jsx`
- Create: `client/src/pages/ReservationsPage.jsx`
- Create: `client/src/pages/ReservationFormPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Add confirmation dialog**

Create `client/src/components/ConfirmDialog.jsx`:

```jsx
export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add reservations list and detail**

Create `client/src/pages/ReservationsPage.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUS_OPTIONS = ["", "RESERVED", "MISSED", "CANCELLED", "COMPLETED"];

export function ReservationsPage({ onNavigate }) {
  const [filters, setFilters] = useState({ search: "", statusCode: "" });
  const [state, setState] = useState({ loading: true, reservations: [], error: "" });
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await apiRequest("/api/reservations");
      setState({ loading: false, reservations: data.reservations, error: "" });
    } catch (error) {
      setState({ loading: false, reservations: [], error: error.message });
    }
  }

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return state.reservations.filter((reservation) => {
      if (filters.statusCode && reservation.statusCode !== filters.statusCode) return false;
      if (!query) return true;
      return [reservation.representativeName, reservation.contactNo, reservation.purpose, String(reservation.reservationId)]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [filters, state.reservations]);

  async function updateStatus(statusCode) {
    const target = selected;
    setConfirm((current) => ({ ...current, busy: true }));
    try {
      const data = await apiRequest(`/api/reservations/${target.reservationId}/status`, {
        method: "POST",
        body: JSON.stringify({ statusCode })
      });
      setSelected(data.reservation);
      await loadReservations();
      setConfirm(null);
    } catch (error) {
      setConfirm(null);
      setState((current) => ({ ...current, error: error.message }));
    }
  }

  if (state.loading) return <LoadingState label="Loading reservations..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">All Bookings</p>
          <h1>Reservation records</h1>
          <p className="page-subtitle">Search past and upcoming court reservations.</p>
        </div>
        <div className="button-row">
          <a className="btn" href="/reservations/export.csv">Export CSV</a>
          <button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>
        </div>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      <div className="toolbar">
        <input placeholder="Search name, contact, purpose, or ID" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.statusCode} onChange={(event) => setFilters({ ...filters, statusCode: event.target.value })}>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}
        </select>
      </div>
      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="No matching reservations." body="Try clearing the search or status filter." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reservation) => (
                <tr key={reservation.reservationId} onClick={() => setSelected(reservation)}>
                  <td>{reservation.reservationId}</td>
                  <td>{reservation.representativeName}<small>{reservation.contactNo}</small></td>
                  <td>{reservation.purpose}</td>
                  <td>{reservation.reservationDate}</td>
                  <td>{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</td>
                  <td><StatusBadge statusCode={reservation.statusCode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && (
        <aside className="detail-panel">
          <button className="btn close-btn" type="button" onClick={() => setSelected(null)}>Close</button>
          <h2>{selected.representativeName}</h2>
          <StatusBadge statusCode={selected.statusCode} />
          <dl className="detail-grid">
            <dt>Date</dt><dd>{formatDate(selected.reservationDate)}</dd>
            <dt>Time</dt><dd>{formatTime(selected.startTime)} - {formatTime(selected.endTime)}</dd>
            <dt>Contact</dt><dd>{selected.contactNo}</dd>
            <dt>Address</dt><dd>{selected.address}</dd>
            <dt>Purpose</dt><dd>{selected.purpose}</dd>
            <dt>Remarks</dt><dd>{selected.remarks || "None"}</dd>
          </dl>
          <div className="button-row">
            <button className="btn" type="button" onClick={() => onNavigate(`/reservations/${selected.reservationId}/edit`)}>Edit</button>
            {selected.statusCode === "RESERVED" && (
              <>
                <button className="btn btn-danger" type="button" onClick={() => setConfirm({ statusCode: "MISSED", title: "Mark as missed?", label: "Mark missed" })}>Did not show up</button>
                <button className="btn" type="button" onClick={() => setConfirm({ statusCode: "CANCELLED", title: "Cancel reservation?", label: "Cancel reservation" })}>Cancel</button>
                <button className="btn btn-primary" type="button" onClick={() => setConfirm({ statusCode: "COMPLETED", title: "Mark as done?", label: "Mark done" })}>Mark done</button>
              </>
            )}
          </div>
        </aside>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={`This will update ${selected.representativeName}'s reservation record.`}
          confirmLabel={confirm.label}
          danger={confirm.statusCode !== "COMPLETED"}
          busy={confirm.busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => updateStatus(confirm.statusCode)}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 3: Add reservation form page**

Create `client/src/pages/ReservationFormPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { LoadingState } from "../components/LoadingState.jsx";

const emptyForm = {
  representativeName: "",
  contactNo: "",
  address: "Barangay Sto. Niño, Parañaque City",
  purpose: "",
  reservationDate: new Date().toISOString().slice(0, 10),
  startTime: "07:00",
  endTime: "08:00",
  remarks: ""
};

export function ReservationFormPage({ reservationId, onNavigate }) {
  const isEdit = Boolean(reservationId);
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState({ loading: isEdit, saving: false, error: "", errors: {}, availability: null });

  useEffect(() => {
    if (!isEdit) return;
    apiRequest(`/api/reservations/${reservationId}`)
      .then((data) => {
        setForm(data.reservation);
        setState((current) => ({ ...current, loading: false }));
      })
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, [isEdit, reservationId]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      date: form.reservationDate,
      startTime: form.startTime,
      endTime: form.endTime
    });
    apiRequest(`/api/availability?${query.toString()}`, { signal: controller.signal })
      .then((availability) => setState((current) => ({ ...current, availability })))
      .catch(() => {});
    return () => controller.abort();
  }, [form.reservationDate, form.startTime, form.endTime]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", errors: {} }));
    try {
      const data = await apiRequest(isEdit ? `/api/reservations/${reservationId}` : "/api/reservations", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      onNavigate(`/reservations`);
      return data;
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error.message,
        errors: error.data?.errors || {}
      }));
    }
  }

  if (state.loading) return <LoadingState label="Loading reservation..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">{isEdit ? "Edit Booking" : "New Reservation"}</p>
          <h1>{isEdit ? "Edit reservation" : "Encode walk-in reservation"}</h1>
          <p className="page-subtitle">Save a real reservation record. New bookings are marked Reserved.</p>
        </div>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      <form className="form-card" onSubmit={handleSubmit}>
        <Field label="Resident or group name" error={state.errors.representativeName}>
          <input value={form.representativeName} onChange={(event) => setField("representativeName", event.target.value)} />
        </Field>
        <Field label="Contact number" error={state.errors.contactNo}>
          <input value={form.contactNo} onChange={(event) => setField("contactNo", event.target.value)} />
        </Field>
        <Field label="Address" error={state.errors.address}>
          <input value={form.address} onChange={(event) => setField("address", event.target.value)} />
        </Field>
        <Field label="Purpose" error={state.errors.purpose}>
          <input value={form.purpose} onChange={(event) => setField("purpose", event.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Date" error={state.errors.reservationDate}>
            <input type="date" value={form.reservationDate} onChange={(event) => setField("reservationDate", event.target.value)} />
          </Field>
          <Field label="Start time" error={state.errors.startTime}>
            <input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} />
          </Field>
          <Field label="End time" error={state.errors.endTime}>
            <input type="time" value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} />
          </Field>
        </div>
        <Field label="Remarks" error={state.errors.remarks}>
          <textarea value={form.remarks} onChange={(event) => setField("remarks", event.target.value)} />
        </Field>
        {state.availability && !state.availability.available && (
          <div className="alert error">
            <strong>Time is not available.</strong>
            <p>{state.availability.conflict?.representativeName} already has this time. Try: {state.availability.suggestions.map((slot) => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`).join(", ")}</p>
          </div>
        )}
        <div className="button-row">
          <button className="btn" type="button" onClick={() => onNavigate("/reservations")}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={state.saving}>{state.saving ? "Saving..." : "Save Reservation"}</button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
```

- [ ] **Step 4: Wire pages in App**

Add imports:

```jsx
import { ReservationFormPage } from "./pages/ReservationFormPage.jsx";
import { ReservationsPage } from "./pages/ReservationsPage.jsx";
```

Update `renderPage`:

```jsx
  if (path === "/reservations/new") return <ReservationFormPage onNavigate={navigate} />;
  const editMatch = path.match(/^\/reservations\/(\d+)\/edit$/);
  if (editMatch) return <ReservationFormPage reservationId={editMatch[1]} onNavigate={navigate} />;
  if (path.startsWith("/reservations")) return <ReservationsPage onNavigate={navigate} />;
```

- [ ] **Step 5: Add list/form/dialog CSS**

Append:

```css
.button-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar input,
.toolbar select {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
}

.toolbar input {
  flex: 1;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.data-table tr {
  cursor: pointer;
}

.data-table tr:hover td {
  background: #eff5f8;
}

.data-table small {
  display: block;
  color: var(--ink-muted);
}

.detail-panel {
  position: fixed;
  top: 72px;
  right: 0;
  bottom: 0;
  width: min(460px, 100%);
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -16px 0 32px rgba(0, 0, 0, 0.12);
  padding: 24px;
  overflow: auto;
  z-index: 10;
}

.close-btn {
  float: right;
}

.detail-grid {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px;
  margin: 20px 0;
}

.detail-grid dt {
  color: var(--ink-muted);
  font-weight: 700;
}

.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px;
  max-width: 820px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.field textarea {
  min-height: 100px;
}

.field-error {
  color: #b42318;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  display: grid;
  place-items: center;
  z-index: 30;
}

.dialog {
  width: min(420px, calc(100% - 32px));
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.btn-danger {
  border-color: #b42318;
  color: #b42318;
  background: #fdf3f1;
}
```

- [ ] **Step 6: Build, test, and run backend tests**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
node scripts/run-tests.mjs tests/apiRoutes.test.js tests/reservationValidation.test.js tests/reservationOverlap.test.js tests/reservationRepository.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add client/src public/app
git commit -m "feat: add reservation management screens"
```

---

### Task 8: Implement Accounts, Logs, And Reports Pages

**Files:**
- Create: `client/src/pages/AccountsPage.jsx`
- Create: `client/src/pages/ActivityLogsPage.jsx`
- Create: `client/src/pages/ReportsPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Create accounts page**

Create `client/src/pages/AccountsPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { LoadingState } from "../components/LoadingState.jsx";

export function AccountsPage({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "STAFF" });
  const [state, setState] = useState({ loading: true, saving: false, error: "", errors: {} });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const data = await apiRequest("/api/accounts");
      setAccounts(data.accounts);
      setState((current) => ({ ...current, loading: false, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", errors: {} }));
    try {
      await apiRequest("/api/accounts", { method: "POST", body: JSON.stringify(form) });
      setForm({ fullName: "", username: "", password: "", role: "STAFF" });
      await loadAccounts();
      setState((current) => ({ ...current, saving: false }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message, errors: error.data?.errors || {} }));
    }
  }

  async function updateStatus(account, accountStatus) {
    await apiRequest(`/api/accounts/${account.userId}/status`, { method: "POST", body: JSON.stringify({ accountStatus }) });
    await loadAccounts();
  }

  if (state.loading) return <LoadingState label="Loading accounts..." />;
  if (user.role !== "ADMIN") return <div className="alert error">Admin access required.</div>;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Accounts</p>
          <h1>Staff account management</h1>
          <p className="page-subtitle">Create and manage local barangay staff accounts.</p>
        </div>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      <form className="form-card" onSubmit={createAccount}>
        <div className="form-grid">
          <label className="field"><span>Full name</span><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />{state.errors.fullName && <small className="field-error">{state.errors.fullName}</small>}</label>
          <label className="field"><span>Username</span><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />{state.errors.username && <small className="field-error">{state.errors.username}</small>}</label>
          <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{state.errors.password && <small className="field-error">{state.errors.password}</small>}</label>
        </div>
        <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></label>
        <button className="btn btn-primary" type="submit" disabled={state.saving}>{state.saving ? "Creating..." : "Create Account"}</button>
      </form>
      <div className="card spacing-top">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.userId}>
                <td>{account.fullName}</td>
                <td>{account.username}</td>
                <td>{account.role}</td>
                <td>{account.accountStatus}</td>
                <td>
                  {account.userId !== user.userId && (
                    <button className="btn" type="button" onClick={() => updateStatus(account, account.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
                      {account.accountStatus === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create activity logs page**

Create `client/src/pages/ActivityLogsPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { LoadingState } from "../components/LoadingState.jsx";

export function ActivityLogsPage() {
  const [filters, setFilters] = useState({ search: "", action: "", date: "" });
  const [state, setState] = useState({ loading: true, logs: [], error: "" });

  useEffect(() => {
    const query = new URLSearchParams(filters);
    apiRequest(`/api/activity-logs?${query.toString()}`)
      .then((data) => setState({ loading: false, logs: data.logs, error: "" }))
      .catch((error) => setState({ loading: false, logs: [], error: error.message }));
  }, [filters]);

  if (state.loading) return <LoadingState label="Loading activity logs..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Activity Logs</p>
          <h1>Audit trail</h1>
          <p className="page-subtitle">Real system actions from reservation and account workflows.</p>
        </div>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      <div className="toolbar">
        <input placeholder="Search user, action, or detail" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        <select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}>
          <option value="">All actions</option>
          <option value="CREATE_RESERVATION">Created reservation</option>
          <option value="UPDATE_RESERVATION">Updated reservation</option>
          <option value="MARK_MISSED">Marked missed</option>
          <option value="MARK_CANCELLED">Cancelled</option>
          <option value="MARK_COMPLETED">Completed</option>
        </select>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {state.logs.map((log) => (
              <tr key={log.logId}>
                <td>{log.createdAt}</td>
                <td>{log.userName}</td>
                <td>{log.action}</td>
                <td>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create reports page**

Create `client/src/pages/ReportsPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { LoadingState } from "../components/LoadingState.jsx";

export function ReportsPage() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: null, error: error.message }));
  }, []);

  if (state.loading) return <LoadingState label="Loading local report..." />;
  if (state.error) return <div className="alert error">{state.error}</div>;

  const { summary, statusCounts, topRequesters } = state.data;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Summary</p>
          <h1>Local reservation report</h1>
          <p className="page-subtitle">A printable report from real reservation records.</p>
        </div>
        <button className="btn" type="button" onClick={() => window.print()}>Print</button>
      </div>
      <div className="stats-grid">
        <ReportStat label="Total reservations" value={summary.totalReservations} />
        <ReportStat label="Court hours booked" value={`${summary.courtHoursBooked}h`} />
        <ReportStat label="Did not show up" value={summary.missedCount} />
      </div>
      <div className="report-grid">
        <div className="card padded">
          <h2>Status breakdown</h2>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div className="bar-row" key={status}><span>{status}</span><strong>{count}</strong></div>
          ))}
        </div>
        <div className="card padded">
          <h2>Top requesters</h2>
          {topRequesters.map((requester) => (
            <div className="bar-row" key={requester.name}><span>{requester.name}</span><strong>{requester.hours}h</strong></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportStat({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;
}
```

- [ ] **Step 4: Wire pages in App**

Add imports:

```jsx
import { AccountsPage } from "./pages/AccountsPage.jsx";
import { ActivityLogsPage } from "./pages/ActivityLogsPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
```

Update `renderPage` signature to accept user:

```jsx
function renderPage(path, navigate, user) {
  if (path.startsWith("/account")) return <AccountsPage user={user} />;
  if (path.startsWith("/activity-logs")) return <ActivityLogsPage />;
  if (path.startsWith("/reports")) return <ReportsPage />;
  // keep existing cases
}
```

Update call:

```jsx
{renderPage(path, navigate, session.user)}
```

- [ ] **Step 5: Add reports CSS**

Append:

```css
.spacing-top {
  margin-top: 22px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.padded {
  padding: 20px;
}

.bar-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

@media print {
  .topbar,
  .sidebar,
  .button-row,
  .btn {
    display: none !important;
  }

  .app-layout,
  .main-panel {
    display: block;
    padding: 0;
  }
}
```

- [ ] **Step 6: Build and verify**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
node scripts/run-tests.mjs tests/apiRoutes.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add client/src public/app
git commit -m "feat: add accounts logs and reports screens"
```

---

### Task 9: Update Offline Package Verification

**Files:**
- Modify: `scripts/verify-offline-bundle.mjs`
- Modify: `scripts/verify-runtime-package.mjs`
- Modify: `scripts/create-offline-bundle.ps1`
- Modify: `tests/offlineBundle.test.js`
- Modify: `tests/runtimePackage.test.js`

- [ ] **Step 1: Add bundle test expectations**

Modify `tests/offlineBundle.test.js` in two places:

Add these entries to `createTemporaryBundle()` `requiredItems`:

```js
"public/app/",
"public/app/.vite/manifest.json",
```

Add these assertions to `offline bundle script copies runtime files and node_modules`:

```js
assert.match(script, /React staff console build was not found/);
assert.match(script, /public\\app\\\.vite\\manifest\.json/);
```

Add these assertions to `offline bundle verifier accepts a complete prepared bundle` after `mode`:

```js
assert.equal(report.checks.some((check) => check.name === "required directory: public/app" && check.ok), true);
assert.equal(report.checks.some((check) => check.name === "required file: public/app/.vite/manifest.json" && check.ok), true);
```

- [ ] **Step 2: Require React output in offline verifier**

Modify `scripts/verify-offline-bundle.mjs` `REQUIRED_BUNDLE_ITEMS`:

```js
  { path: "public/app", type: "directory" },
  { path: "public/app/.vite/manifest.json", type: "file" },
```

- [ ] **Step 3: Require React output in runtime package verifier**

Modify `scripts/verify-runtime-package.mjs` `REQUIRED_APP_ITEMS`:

```js
  { path: "public/app", type: "directory", detail: "built React staff console assets" },
  { path: "public/app/.vite/manifest.json", type: "file", detail: "React asset manifest" },
```

- [ ] **Step 4: Add frontend build guard**

Add this guard to `scripts/create-offline-bundle.ps1` before `$ItemsToCopy`:

```powershell
$ReactManifestPath = Join-Path $ProjectRoot "public\app\.vite\manifest.json"
if (-not (Test-Path -LiteralPath $ReactManifestPath)) {
  throw "React staff console build was not found. Run npm run frontend:build before npm run bundle:offline."
}
```

This is safer than silently producing a bundle with stale or missing frontend assets.

- [ ] **Step 5: Run verification tests**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
node scripts/run-tests.mjs tests/offlineBundle.test.js tests/runtimePackage.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add scripts/verify-offline-bundle.mjs scripts/verify-runtime-package.mjs scripts/create-offline-bundle.ps1 tests/offlineBundle.test.js tests/runtimePackage.test.js
git commit -m "test: require React staff console in offline package"
```

---

### Task 10: Full Verification And Browser QA

**Files:**
- Modify or create: `scripts/verify-ui-smoke.mjs` if existing smoke test needs React routes
- Create: `tests/reactFrontendStatic.test.js` if static frontend checks are easier than browser checks
- No database schema changes expected

- [ ] **Step 1: Run full automated test suite**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run build and static verification**

Run:

```powershell
npm run frontend:build
npm run verify:react-build
npm run verify:foundation
npm run verify:sql
```

Expected: all PASS.

- [ ] **Step 3: Start local app**

Run:

```powershell
$env:PORT='3000'; npm start
```

Expected:

```text
Barangay Basketball Court Scheduling System running at http://localhost:3000
```

If port 3000 is already in use, use the currently configured project launcher or set another local port and record it in the final report.

- [ ] **Step 4: Browser smoke test**

Using Playwright or the in-app browser, verify:

- `/login` shows the React or retained local login path with no remote asset requests.
- Valid admin login reaches `/dashboard`.
- Dashboard loads today schedule from `/api/dashboard`.
- Calendar loads `/api/schedule`.
- New reservation submits to `/api/reservations`.
- Overlap attempt shows backend conflict.
- Reservations list opens detail panel.
- `MISSED`, `CANCELLED`, and `COMPLETED` actions require confirmation and call backend status API.
- Accounts page is visible only to admin users.
- Duplicate username error appears inline.
- Activity logs show real rows.
- Reports show real computed counts.
- Responsive width around 390px has no horizontal text overlap in top-level workflows.

- [ ] **Step 5: Offline package checks**

Run:

```powershell
npm run bundle:offline
npm run verify:bundle
npm run verify:bundle:strict
npm run verify:runtime-package
npm run verify:offline-runtime
```

Expected: PASS where the local runtime package is available. If `verify:mysql` or runtime checks depend on a running bundled database, start the bundled database before treating a failure as an app defect.

- [ ] **Step 6: Final status and commit**

Run:

```powershell
git status --short
```

Expected: only intentional changes are present.

Commit any verification script updates:

```powershell
git add scripts tests docs
git commit -m "test: verify React staff console workflow"
```

Do not commit generated `dist/`, local database files, backups, reports, `.env`, or `.superpowers/`.

---

## Final Implementation Report Requirements

After implementation, report:

- Changed files.
- Screens/components updated.
- Backend endpoints added or modified.
- Database/schema changes, expected to be none.
- Features confirmed working.
- Commands run and pass/fail results.
- Offline package verification result.
- Remaining limitations or manual checks needed.
