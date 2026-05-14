import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("React frontend source stays offline and avoids unsupported pending status", () => {
  const sourceFiles = collectFiles(path.join(projectRoot, "client", "src"), [".js", ".jsx", ".css"]);
  const combined = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assert.doesNotMatch(combined, /\bPENDING\b/);
});

test("built React app references only local bundled assets", () => {
  const appDir = path.join(projectRoot, "public", "app");
  const builtFiles = collectFiles(appDir, [".html", ".js", ".css", ".json"]);
  const combined = builtFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  assert.match(combined, /\/assets\/|assets\//);
  assert.doesNotMatch(combined, /(?:src|href|url\()=["']?https?:\/\//i);
  assert.doesNotMatch(combined, /fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/i);
  assert.doesNotMatch(combined, /\bPENDING\b/);
});

function collectFiles(root, extensions) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(fullPath, extensions);
    }

    return extensions.includes(path.extname(entry.name)) ? [fullPath] : [];
  });
}
