import { randomBytes } from "node:crypto";
import { access, readFile as defaultReadFile, writeFile as defaultWriteFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function buildEnvFile(exampleContent, options = {}) {
  const sessionSecret = options.sessionSecret || generateSessionSecret();
  const lines = String(exampleContent || "").split(/\r?\n/);
  const updated = lines.map((line) => {
    if (line.startsWith("APP_SESSION_SECRET=")) {
      return `APP_SESSION_SECRET=${sessionSecret}`;
    }

    return line;
  });

  return `${updated.join("\n").replace(/\n*$/, "")}\n`;
}

export async function createLocalEnvFile(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const fileExists = options.fileExists || exists;
  const readFile = options.readFile || defaultReadFile;
  const writeFile = options.writeFile || defaultWriteFile;
  const generateSecret = options.generateSecret || generateSessionSecret;
  const output = options.output || console;
  const exampleFilePath = path.join(cwd, ".env.example");
  const envFilePath = path.join(cwd, ".env");

  if (await fileExists(envFilePath)) {
    throw new Error(".env already exists. Edit it manually if local settings need to change.");
  }

  if (!await fileExists(exampleFilePath)) {
    throw new Error(`.env.example was not found: ${exampleFilePath}`);
  }

  const exampleContent = await readFile(exampleFilePath, "utf8");
  const envContent = buildEnvFile(exampleContent, {
    sessionSecret: generateSecret()
  });

  await writeFile(envFilePath, envContent, { encoding: "utf8", flag: "wx" });
  output.log(`Created local environment file: ${envFilePath}`);
  output.log(getNextStepMessage({ env: options.env }));

  return { envFilePath };
}

export function getNextStepMessage(options = {}) {
  const env = options.env || process.env;

  if (env.BARANGAY_OFFICE_ONE_STOP_SETUP === "1") {
    return "START-HERE.bat will finish the local database password automatically and continue setup.";
  }

  return "Update DB_PASSWORD in .env, then run npm run verify:prereqs.";
}

function generateSessionSecret() {
  return randomBytes(32).toString("hex");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createLocalEnvFile().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
