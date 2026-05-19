import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHealthUrl,
  buildOfficeUrl,
  handleStartupError,
  isOfficeAppRunning,
  openBrowser,
  shouldOpenBrowser,
  startServer
} from "../src/serverStartup.js";

test("buildOfficeUrl points staff to the React dashboard after the local server is ready", () => {
  assert.equal(buildOfficeUrl(3000), "http://localhost:3000/dashboard");
  assert.equal(buildOfficeUrl(3188, "prototype"), "http://localhost:3188/prototype");
});

test("buildHealthUrl points duplicate-start checks to the local health endpoint", () => {
  assert.equal(buildHealthUrl(3000), "http://localhost:3000/health");
});

test("shouldOpenBrowser only enables automatic browser launch for the office startup flag", () => {
  assert.equal(shouldOpenBrowser({ OPEN_BROWSER: "1" }), true);
  assert.equal(shouldOpenBrowser({ OPEN_BROWSER: "0" }), false);
  assert.equal(shouldOpenBrowser({}), false);
});

test("openBrowser uses Windows shell startup without requiring internet", () => {
  const calls = [];
  const child = { unref: () => calls.push({ unref: true }) };

  const result = openBrowser("http://localhost:3000/prototype", {
    platform: "win32",
    spawnFn: (command, args, options) => {
      calls.push({ command, args, options });
      return child;
    }
  });

  assert.equal(result, child);
  assert.deepEqual(calls[0].command, "cmd");
  assert.deepEqual(calls[0].args, ["/c", "start", "", "http://localhost:3000/prototype"]);
  assert.equal(calls[0].options.detached, true);
  assert.equal(calls[0].options.stdio, "ignore");
  assert.deepEqual(calls[1], { unref: true });
});

test("isOfficeAppRunning accepts only the expected local health response", async () => {
  assert.equal(
    await isOfficeAppRunning(3000, {
      fetchFn: async (url) => ({
        ok: url === "http://localhost:3000/health",
        json: async () => ({ status: "ok" })
      })
    }),
    true
  );

  assert.equal(
    await isOfficeAppRunning(3000, {
      fetchFn: async () => ({
        ok: true,
        json: async () => ({ status: "different-app" })
      })
    }),
    false
  );

  assert.equal(
    await isOfficeAppRunning(3000, {
      fetchFn: async () => {
        throw new Error("not reachable");
      }
    }),
    false
  );
});

test("handleStartupError reuses the running office app on duplicate daily startup", async () => {
  const events = [];

  await handleStartupError(
    { code: "EADDRINUSE" },
    {
      port: 3000,
      env: { OPEN_BROWSER: "1" },
      logger: (message) => events.push(message),
      errorLogger: (message) => events.push(`error:${message}`),
      openBrowserFn: (url) => events.push(`open:${url}`),
      exitProcess: (code) => events.push(`exit:${code}`),
      appRunningCheck: async () => true
    }
  );

  assert.deepEqual(events, [
    "The local app is already running at http://localhost:3000.",
    "Opening http://localhost:3000/dashboard",
    "open:http://localhost:3000/dashboard",
    "exit:0"
  ]);
});

test("handleStartupError reports a clear port conflict when health check fails", async () => {
  const events = [];

  await handleStartupError(
    { code: "EADDRINUSE" },
    {
      port: 3000,
      env: { OPEN_BROWSER: "1" },
      logger: (message) => events.push(message),
      errorLogger: (message) => events.push(`error:${message}`),
      openBrowserFn: (url) => events.push(`open:${url}`),
      exitProcess: (code) => events.push(`exit:${code}`),
      appRunningCheck: async () => false
    }
  );

  assert.deepEqual(events, [
    "error:Port 3000 is already in use, but the Barangay Court Scheduler health check did not respond.",
    "error:Close the other app using this port, or ask technical support to change APP_PORT in .env.",
    "exit:1"
  ]);
});

test("startServer opens the browser from the listen callback only when requested", () => {
  const events = [];
  const app = {
    listen(port, callback) {
      events.push(`listen:${port}`);
      callback();
      return { close: () => {}, on: () => {} };
    }
  };

  const server = startServer({
    app,
    port: 3000,
    env: { OPEN_BROWSER: "1" },
    logger: (message) => events.push(message),
    openBrowserFn: (url) => events.push(`open:${url}`)
  });

  assert.equal(typeof server.close, "function");
  assert.deepEqual(events, [
    "listen:3000",
    "Basketball court scheduler listening at http://localhost:3000",
    "Opening http://localhost:3000/dashboard",
    "open:http://localhost:3000/dashboard"
  ]);
});

test("startServer leaves the browser closed for normal npm start", () => {
  const events = [];
  const app = {
    listen(port, callback) {
      events.push(`listen:${port}`);
      callback();
      return { close: () => {}, on: () => {} };
    }
  };

  startServer({
    app,
    port: 3000,
    env: {},
    logger: (message) => events.push(message),
    openBrowserFn: (url) => events.push(`open:${url}`)
  });

  assert.deepEqual(events, ["listen:3000", "Basketball court scheduler listening at http://localhost:3000"]);
});
