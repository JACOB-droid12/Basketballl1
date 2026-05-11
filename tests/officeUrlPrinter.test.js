import assert from "node:assert/strict";
import test from "node:test";

import { getOfficePort, getOfficeUrl } from "../scripts/print-office-url.mjs";

test("getOfficeUrl prints the default prototype URL for staff fallback instructions", () => {
  assert.equal(getOfficeUrl({}), "http://localhost:3000/prototype");
});

test("getOfficeUrl follows a configured APP_PORT", () => {
  assert.equal(getOfficeUrl({ APP_PORT: "3198" }), "http://localhost:3198/prototype");
});

test("getOfficePort falls back to 3000 when APP_PORT is invalid", () => {
  assert.equal(getOfficePort({ APP_PORT: "not-a-port" }), 3000);
  assert.equal(getOfficePort({ APP_PORT: "-1" }), 3000);
});
