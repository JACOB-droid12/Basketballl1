import assert from "node:assert/strict";
import test from "node:test";

import { buildOfficeUrl, openBrowser, shouldOpenBrowser, startServer } from "../src/serverStartup.js";

test("buildOfficeUrl points staff to the prototype after the local server is ready", () => {
  assert.equal(buildOfficeUrl(3000), "http://localhost:3000/prototype");
  assert.equal(buildOfficeUrl(3188, "prototype"), "http://localhost:3188/prototype");
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

test("startServer opens the browser from the listen callback only when requested", () => {
  const events = [];
  const app = {
    listen(port, callback) {
      events.push(`listen:${port}`);
      callback();
      return { close: () => {} };
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
    "Opening http://localhost:3000/prototype",
    "open:http://localhost:3000/prototype"
  ]);
});

test("startServer leaves the browser closed for normal npm start", () => {
  const events = [];
  const app = {
    listen(port, callback) {
      events.push(`listen:${port}`);
      callback();
      return { close: () => {} };
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
