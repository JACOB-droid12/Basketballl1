import process from "node:process";
import { pathToFileURL } from "node:url";

import { createApp } from "../src/app.js";

const EXTERNAL_REFERENCE_PATTERN = /(?:src|href)=["'](https?:\/\/[^"']+)["']|@import\s+url\(["']?(https?:\/\/[^"')]+)["']?\)|url\(["']?(https?:\/\/[^"')]+)["']?\)/gi;

export function findExternalResourceReferences(html) {
  const references = [];
  const source = String(html);
  let match;

  while ((match = EXTERNAL_REFERENCE_PATTERN.exec(source)) !== null) {
    references.push(match[1] || match[2] || match[3]);
  }

  return references;
}

export function verifyPrototypeOfflineHtml(html) {
  const source = String(html);
  const externalReferences = findExternalResourceReferences(source);

  if (externalReferences.length > 0) {
    throw new Error(`Prototype contains external resource references: ${externalReferences.join(", ")}`);
  }

  const requiredSnippets = [
    "Login your account",
    "/vendor/html2canvas.min.js",
    "/vendor/jspdf.umd.min.js",
    "/js/prototype-backend.js"
  ];

  const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));
  if (missingSnippets.length > 0) {
    throw new Error(`Prototype runtime HTML is missing required local content: ${missingSnippets.join(", ")}`);
  }
}

export async function verifyOfflineRuntime(options = {}) {
  const app = options.app || createApp();
  const listenPort = options.port || 0;
  const fetchFn = options.fetchFn || globalThis.fetch;
  const output = options.output || console;
  const server = await listen(app, listenPort);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : listenPort;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const healthResponse = await fetchFn(`${baseUrl}/health`, {
      headers: { accept: "application/json" }
    });
    const health = await healthResponse.json().catch(() => null);

    if (!healthResponse.ok || health?.status !== "ok") {
      throw new Error(`Health check failed at ${baseUrl}/health.`);
    }

    const prototypeResponse = await fetchFn(`${baseUrl}/prototype`, {
      headers: { accept: "text/html" }
    });
    const prototypeHtml = await prototypeResponse.text();

    if (!prototypeResponse.ok) {
      throw new Error(`Prototype page failed at ${baseUrl}/prototype.`);
    }

    verifyPrototypeOfflineHtml(prototypeHtml);
    output.log(`Offline runtime verification passed at ${baseUrl}/prototype.`);
  } finally {
    await closeServer(server);
    if (app.locals?.db?.end) {
      await app.locals.db.end();
    }
  }
}

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.once("error", reject);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyOfflineRuntime().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
