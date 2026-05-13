import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appDir = path.join(root, "public", "app");
const manifest = path.join(appDir, ".vite", "manifest.json");
const allowedRuntimeUrls = [
  "https://reactjs.org/docs/error-decoder.html?invariant=",
  "http://www.w3.org/1998/Math/MathML",
  "http://www.w3.org/1999/xhtml",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/XML/1998/namespace"
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const failures = [];

if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
  failures.push("public/app directory was not found. Run npm run frontend:build.");
}

if (!existsSync(manifest)) {
  failures.push("public/app/.vite/manifest.json was not found.");
}

if (existsSync(appDir)) {
  for (const file of walk(appDir)) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    const remoteReferences = text
      .match(/https?:\/\/[^\s"'`)]+|fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/g)
      ?.filter((reference) => !allowedRuntimeUrls.some((allowed) => reference.startsWith(allowed)));
    if (remoteReferences?.length) {
      failures.push(`Remote asset reference found in ${path.relative(root, file)}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("React build is present and contains no remote asset references.");
}
