import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfflineRuntimeEnv,
  findExternalResourceReferences,
  verifyPrototypeOfflineHtml
} from "../scripts/verify-offline-runtime.mjs";

test("offline runtime verifier accepts prototype HTML with only local resources", () => {
  const html = `
    <html>
      <body>
        <h1>Login your account</h1>
        <script src="/vendor/html2canvas.min.js"></script>
        <script src="/vendor/jspdf.umd.min.js"></script>
        <script src="/js/prototype-backend.js"></script>
      </body>
    </html>
  `;

  assert.doesNotThrow(() => verifyPrototypeOfflineHtml(html));
});

test("offline runtime verifier rejects external prototype resources", () => {
  const html = `
    <style>@import url('https://fonts.googleapis.com/css2?family=Lato');</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <h1>Login your account</h1>
  `;

  const references = findExternalResourceReferences(html);

  assert.deepEqual(references, [
    "https://fonts.googleapis.com/css2?family=Lato",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
  ]);
  assert.throws(
    () => verifyPrototypeOfflineHtml(html),
    /Prototype contains external resource references/
  );
});

test("package exposes an offline runtime verification command", async () => {
  const packageJson = JSON.parse(await import("node:fs/promises").then(({ readFile }) =>
    readFile("package.json", "utf8")
  ));

  assert.equal(packageJson.scripts["verify:offline-runtime"], "node scripts/verify-offline-runtime.mjs");
});

test("offline runtime verifier uses an explicit verifier-only session secret when local env is missing", () => {
  const missingSecretEnv = buildOfflineRuntimeEnv({});
  const placeholderSecretEnv = buildOfflineRuntimeEnv({
    APP_SESSION_SECRET: "development-only-change-me"
  });
  const validSecretEnv = buildOfflineRuntimeEnv({
    APP_SESSION_SECRET: "12345678901234567890123456789012"
  });

  assert.equal(missingSecretEnv.APP_SESSION_SECRET.length >= 32, true);
  assert.notEqual(placeholderSecretEnv.APP_SESSION_SECRET, "development-only-change-me");
  assert.equal(validSecretEnv.APP_SESSION_SECRET, "12345678901234567890123456789012");
});
