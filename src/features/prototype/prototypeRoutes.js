import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const PROJECT_ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
const DEFAULT_PROTOTYPE_HTML = path.join(
  PROJECT_ROOT,
  "public",
  "prototype",
  "sto-nino-court-reservation-system-prototype.html"
);

export function createPrototypeRoutes(options = {}) {
  const router = Router();
  const prototypeHtmlPath = options.prototypeHtmlPath || DEFAULT_PROTOTYPE_HTML;

  router.get(["/", "/prototype", "/app"], async (_request, response) => {
    try {
      const html = await readFile(prototypeHtmlPath, "utf8");
      response.type("html").send(injectBackendBridge(html));
    } catch (error) {
      response.status(500).type("text/plain").send(`Unable to load prototype frontend: ${error.message}`);
    }
  });

  return router;
}

export function injectBackendBridge(html) {
  const bridge = '<script src="/js/prototype-backend.js"></script>';
  const source = rewriteOfflineVendorScripts(String(html));

  if (source.includes(bridge)) {
    return source;
  }

  const bodyCloseIndex = source.toLowerCase().lastIndexOf("</body>");
  if (bodyCloseIndex >= 0) {
    return `${source.slice(0, bodyCloseIndex)}  ${bridge}\n${source.slice(bodyCloseIndex)}`;
  }

  return `${source}\n${bridge}\n`;
}

function rewriteOfflineVendorScripts(html) {
  return html
    .replace(
      /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/g,
      "/vendor/html2canvas.min.js"
    )
    .replace(
      /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/g,
      "/vendor/jspdf.umd.min.js"
    );
}
