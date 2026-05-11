import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("database README reflects current live-verification status", () => {
  const readme = readFileSync("database/README.md", "utf8");

  assert.doesNotMatch(readme, /SQL files were prepared and statically checked but not applied/i);
  assert.match(readme, /live-verified against disposable local Oracle MySQL and MariaDB servers/i);
  assert.match(readme, /rerun .* on the barangay office's target local MySQL\/MariaDB installation/i);
});
