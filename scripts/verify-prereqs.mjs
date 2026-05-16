import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

import { hasStrongSessionSecret } from "../src/config/sessionSecret.js";

dotenv.config();

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function parseMajorVersion(value) {
  const match = String(value || "").match(/(\d+)(?:\.\d+)*/);
  return match ? Number(match[1]) : null;
}

export function commandResult({ ok, stdout = "", stderr = "", error = "" }) {
  return { ok, stdout, stderr, error };
}

export async function buildPrereqReport(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const env = options.env || process.env;
  const runCommand = options.runCommand || runVersionCommand;
  const fileExists = options.fileExists || exists;
  const checks = [];

  const nodeResult = await runCommand("node", ["--version"]);
  const nodeMajor = parseMajorVersion(nodeResult.stdout || nodeResult.stderr);
  checks.push({
    name: "Node.js 20+",
    ok: nodeResult.ok && nodeMajor >= 20,
    detail: nodeResult.ok ? `found ${cleanOutput(nodeResult.stdout || nodeResult.stderr)}` : missingDetail("node", nodeResult)
  });

  const npmResult = await runCommand("npm", ["--version"]);
  checks.push({
    name: "npm",
    ok: npmResult.ok,
    detail: npmResult.ok ? `found ${cleanOutput(npmResult.stdout || npmResult.stderr)}` : missingDetail("npm", npmResult)
  });

  const mysqlResult = await runCommand("mysql", ["--version"]);
  checks.push({
    name: "mysql client",
    ok: mysqlResult.ok,
    detail: mysqlResult.ok ? `found ${cleanOutput(mysqlResult.stdout || mysqlResult.stderr)}` : missingDetail("mysql", mysqlResult)
  });

  const mysqldumpResult = await runCommand("mysqldump", ["--version"]);
  checks.push({
    name: "mysqldump",
    ok: mysqldumpResult.ok,
    detail: mysqldumpResult.ok ? `found ${cleanOutput(mysqldumpResult.stdout || mysqldumpResult.stderr)}` : missingDetail("mysqldump", mysqldumpResult)
  });

  checks.push({
    name: "package.json",
    ok: await fileExists(path.join(cwd, "package.json")),
    detail: "required project manifest"
  });

  checks.push({
    name: ".env",
    ok: await fileExists(path.join(cwd, ".env")),
    detail: "run npm run setup:env, then set local values"
  });

  checks.push({
    name: "DB_NAME",
    ok: Boolean(String(env.DB_NAME || "").trim()),
    detail: env.DB_NAME ? "configured" : "set DB_NAME in .env"
  });

  checks.push({
    name: "DB_USER",
    ok: Boolean(String(env.DB_USER || "").trim()),
    detail: env.DB_USER ? "configured" : "set DB_USER in .env"
  });

  checks.push({
    name: "APP_SESSION_SECRET",
    ok: hasStrongSessionSecret(env.APP_SESSION_SECRET),
    detail: "set APP_SESSION_SECRET to a 32+ character local secret in .env"
  });

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}

export function formatPrereqReport(report) {
  return report.checks
    .map((check) => `[${check.ok ? "OK" : "FAIL"}] ${check.name} - ${check.detail}`)
    .join("\n");
}

export async function verifyPrerequisites(options = {}) {
  const output = options.output || console;
  const buildReport = options.buildReport || (() => buildPrereqReport(options));
  const report = await buildReport();
  const formatted = formatPrereqReport(report);

  output.log(formatted);

  if (!report.ok) {
    throw new Error("Prerequisite verification failed. Resolve failed checks, then rerun npm run verify:prereqs.");
  }

  return report;
}

function runVersionCommand(command, args) {
  return new Promise((resolve) => {
    let child;
    let stdout = "";
    let stderr = "";

    try {
      child = spawn(command, args, {
        shell: process.platform === "win32",
        windowsHide: true
      });
    } catch (error) {
      resolve(commandResult({ ok: false, error: error.message }));
      return;
    }

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve(commandResult({ ok: false, error: error.message }));
    });
    child.on("close", (code) => {
      resolve(commandResult({ ok: code === 0, stdout, stderr }));
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function missingDetail(command, result) {
  return `${command} unavailable${result.error ? `: ${result.error}` : ""}`;
}

function cleanOutput(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPrerequisites().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
