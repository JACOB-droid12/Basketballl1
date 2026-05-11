import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import test from "node:test";

import {
  createPrototypeRoutes,
  injectBackendBridge
} from "../src/features/prototype/prototypeRoutes.js";

test("injectBackendBridge appends the backend adapter before the closing body", () => {
  const html = "<html><body><main>Prototype</main></body></html>";
  const bridged = injectBackendBridge(html);

  assert.match(bridged, /<script src="\/js\/prototype-backend\.js"><\/script>\s*\n<\/body>/);
});

test("injectBackendBridge uses the final body close so prototype script literals stay intact", () => {
  const html = "<html><body><script>doc.write(`<body>Printable</body>`);</script></body></html>";
  const bridged = injectBackendBridge(html);

  assert.match(bridged, /doc\.write\(`<body>Printable<\/body>`\);<\/script>\s*<script src="\/js\/prototype-backend\.js"><\/script>\s*\n<\/body>/);
});

test("injectBackendBridge does not duplicate the adapter script", () => {
  const html = '<html><body><script src="/js/prototype-backend.js"></script></body></html>';

  assert.equal(injectBackendBridge(html), html);
});

test("injectBackendBridge rewrites prototype CDN scripts to local offline vendor files", () => {
  const html = `
    <style>@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Merriweather:wght@400;700&display=swap');</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    </body>
  `;
  const bridged = injectBackendBridge(html);

  assert.match(bridged, /src="\/vendor\/html2canvas\.min\.js"/);
  assert.match(bridged, /src="\/vendor\/jspdf\.umd\.min\.js"/);
  assert.doesNotMatch(bridged, /cdnjs\.cloudflare\.com/);
  assert.doesNotMatch(bridged, /fonts\.googleapis\.com/);
});

test("prototype routes serve the supplied frontend as the app entry point", async () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "prototype-route-"));
  const prototypeHtmlPath = path.join(tempRoot, "prototype.html");
  writeFileSync(prototypeHtmlPath, "<html><body><h1>Prototype Login</h1></body></html>");

  const app = express();
  app.use(createPrototypeRoutes({ prototypeHtmlPath }));
  const server = app.listen(0);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const routePath of ["/", "/prototype", "/app"]) {
      const response = await fetch(`${baseUrl}${routePath}`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(body, /Prototype Login/);
      assert.match(body, /\/js\/prototype-backend\.js/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
