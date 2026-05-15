import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("React frontend source stays offline and avoids unsupported approval workflow copy", () => {
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx", ".css"]);
  const combined = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assertNoUnsupportedApprovalWorkflow(combined);
});

test("built React app references only local bundled assets", () => {
  const appDir = path.join(projectRoot, "public", "app");
  const builtFiles = collectFiles(appDir, [".html", ".js", ".css", ".json"]);
  const combined = builtFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.match(combined, /\/assets\/|assets\//);
  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assertNoUnsupportedApprovalWorkflow(combined);
});

test("reservation detail drawer suspends Escape close while the status dialog is open", () => {
  const reservationsPage = readFileSync(path.join(projectRoot, "client", "src", "pages", "ReservationsPage.jsx"), "utf8");
  const drawer = readFileSync(path.join(projectRoot, "client", "src", "components", "ReservationDetailDrawer.jsx"), "utf8");

  assert.match(reservationsPage, /suspendEscape=\{Boolean\(dialog\)\}/);
  assert.match(drawer, /suspendEscape\s*=\s*false/);
  assert.match(drawer, /suspendEscapeRef = useRef\(suspendEscape\)/);
  assert.match(drawer, /suspendEscapeRef\.current = suspendEscape/);
  assert.match(drawer, /event\.key === "Escape" && !suspendEscapeRef\.current/);
});

function assertNoUnsupportedApprovalWorkflow(source) {
  assert.doesNotMatch(source, /\bPENDING\b/);
  assert.doesNotMatch(source, /\b(?:APPROVED|DECLINED)\b/);
  assert.doesNotMatch(source, /pending approval/i);
  assert.doesNotMatch(source, /\bApprove\b/);
  assert.doesNotMatch(source, /\bDecline\b/);
}

function collectFiles(root, extensions) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(fullPath, extensions);
    }

    return extensions.includes(path.extname(entry.name)) ? [fullPath] : [];
  });
}
