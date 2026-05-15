import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const PROJECT_ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
const MANIFEST_PATH = path.join(PROJECT_ROOT, "public", "app", ".vite", "manifest.json");

const MAIN_ROUTES = [
  "/",
  "/login",
  "/dashboard",
  "/schedule",
  "/reservations",
  "/reservations/new",
  "/reservations/:reservationId(\\d+)",
  "/reservations/:reservationId(\\d+)/edit",
  "/account",
  "/account/password",
  "/activity-logs",
  "/reports"
];

export function createReactAppRoutes(options = {}) {
  const router = Router();
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  const routes = options.routes || MAIN_ROUTES;
  let cachedAssets = null;

  router.get(routes, (_request, response) => {
    cachedAssets ||= readReactAssets(manifestPath);
    const assets = cachedAssets;
    response.render("app", assets);
  });

  return router;
}

export function readReactAssets(manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest["client/index.html"] ||
    manifest["index.html"] ||
    Object.values(manifest).find((item) => item.isEntry);

  if (!entry?.file) {
    throw new Error("React build manifest does not contain an entry file.");
  }

  return {
    scriptPath: `/app/${entry.file}`,
    cssPaths: (entry.css || []).map((file) => `/app/${file}`)
  };
}
