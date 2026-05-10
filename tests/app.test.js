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
