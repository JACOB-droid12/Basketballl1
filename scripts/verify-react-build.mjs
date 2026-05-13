import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appDir = path.join(root, "public", "app");
const manifestPath = path.join(appDir, ".vite", "manifest.json");
const htmlPath = path.join(appDir, "index.html");
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

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, filePath)} could not be parsed: ${error.message}`);
    return null;
  }
}

function verifyAppFile(relativeFile, context) {
  const normalizedFile = relativeFile && path.normalize(relativeFile);

  if (!normalizedFile || path.isAbsolute(normalizedFile) || normalizedFile === ".." || normalizedFile.startsWith(`..${path.sep}`)) {
    failures.push(`${context} points outside public/app: ${relativeFile || "(missing)"}`);
    return;
  }

  const fullPath = path.join(appDir, normalizedFile);
  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
    failures.push(`${context} was not found: ${path.relative(root, fullPath)}`);
  }
}

function resolveHtmlAssetTarget(target) {
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("//")) {
    return { error: `remote or protocol-relative target ${target}` };
  }

  if (target.startsWith("/")) {
    if (!target.startsWith("/app/")) {
      return { error: `absolute target ${target} does not start with /app/` };
    }
    return { relativeFile: target.slice("/app/".length) };
  }

  return { relativeFile: target.replace(/^\.\//, "") };
}

function verifyHtmlAssetTarget(target, context) {
  const cleanTarget = target.split(/[?#]/, 1)[0];
  const resolved = resolveHtmlAssetTarget(cleanTarget);

  if (resolved.error) {
    failures.push(`${context} does not resolve under public/app: ${resolved.error}`);
    return;
  }

  verifyAppFile(resolved.relativeFile, context);
}

const failures = [];
const appDirExists = existsSync(appDir) && statSync(appDir).isDirectory();

if (!appDirExists) {
  failures.push("public/app directory was not found. Run npm run frontend:build.");
}

if (!existsSync(manifestPath)) {
  failures.push("public/app/.vite/manifest.json was not found.");
} else {
  const manifest = readJson(manifestPath);
  const entry = manifest && (manifest["index.html"] || manifest["client/index.html"] || Object.values(manifest).find((item) => item.isEntry));

  if (!entry) {
    failures.push("public/app/.vite/manifest.json does not contain an entry for index.html.");
  } else {
    verifyAppFile(entry.file, "React manifest entry file");
    for (const cssFile of entry.css || []) {
      verifyAppFile(cssFile, "React manifest CSS asset");
    }
  }
}

if (!existsSync(htmlPath)) {
  failures.push("public/app/index.html was not found.");
} else {
  const html = readFileSync(htmlPath, "utf8");
  const scriptTargets = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const stylesheetTargets = [...html.matchAll(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map((match) => match[1]);

  for (const target of scriptTargets) {
    verifyHtmlAssetTarget(target, `Generated HTML script target ${target}`);
  }

  for (const target of stylesheetTargets) {
    verifyHtmlAssetTarget(target, `Generated HTML stylesheet target ${target}`);
  }
}

if (appDirExists) {
  for (const file of walk(appDir)) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    const remoteReferences = text
      .match(/https?:\/\/[^\s"'`)]+|fonts\.googleapis\.com|unpkg\.com|cdnjs\.cloudflare\.com/g)
      ?.filter((reference) => !allowedRuntimeUrls.some((allowed) => reference.startsWith(allowed)));
    if (remoteReferences?.length) {
      failures.push(`Remote asset reference found in ${path.relative(root, file)}: ${remoteReferences.join(", ")}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("React build is present and contains no remote asset references.");
}
