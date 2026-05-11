import { spawn } from "node:child_process";

const defaultOfficePath = "/prototype";

export function buildOfficeUrl(port, officePath = defaultOfficePath) {
  const normalizedPath = officePath.startsWith("/") ? officePath : `/${officePath}`;
  return `http://localhost:${port}${normalizedPath}`;
}

export function buildHealthUrl(port) {
  return `http://localhost:${port}/health`;
}

export function shouldOpenBrowser(env = process.env) {
  return env.OPEN_BROWSER === "1";
}

export function openBrowser(url, options = {}) {
  const platform = options.platform || process.platform;
  const spawnFn = options.spawnFn || spawn;
  const command = platform === "win32" ? "cmd" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawnFn(command, args, {
    detached: true,
    stdio: "ignore"
  });

  child.unref?.();
  return child;
}

export async function isOfficeAppRunning(port, options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch;

  if (!fetchFn) {
    return false;
  }

  try {
    const response = await fetchFn(buildHealthUrl(port), {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.json().catch(() => null);
    return body?.status === "ok";
  } catch {
    return false;
  }
}

export async function handleStartupError(error, options = {}) {
  const port = options.port;
  const env = options.env || process.env;
  const logger = options.logger || console.log;
  const errorLogger = options.errorLogger || console.error;
  const openBrowserFn = options.openBrowserFn || openBrowser;
  const exitProcess = options.exitProcess || process.exit;
  const appRunningCheck = options.appRunningCheck || isOfficeAppRunning;

  if (error?.code === "EADDRINUSE") {
    if (shouldOpenBrowser(env) && await appRunningCheck(port)) {
      const officeUrl = buildOfficeUrl(port);
      logger(`The local app is already running at http://localhost:${port}.`);
      logger(`Opening ${officeUrl}`);
      openBrowserFn(officeUrl);
      exitProcess(0);
      return;
    }

    errorLogger(`Port ${port} is already in use, but the Barangay Court Scheduler health check did not respond.`);
    errorLogger("Close the other app using this port, or ask technical support to change APP_PORT in .env.");
    exitProcess(1);
    return;
  }

  errorLogger(error);
  exitProcess(1);
}

export function startServer({
  app,
  port,
  env = process.env,
  logger = console.log,
  errorLogger = console.error,
  openBrowserFn = openBrowser,
  exitProcess = process.exit,
  appRunningCheck = isOfficeAppRunning
}) {
  const server = app.listen(port, () => {
    const rootUrl = `http://localhost:${port}`;
    const officeUrl = buildOfficeUrl(port);

    logger(`Basketball court scheduler listening at ${rootUrl}`);

    if (shouldOpenBrowser(env)) {
      logger(`Opening ${officeUrl}`);
      openBrowserFn(officeUrl);
    }
  });

  server.on("error", (error) => {
    void handleStartupError(error, {
      port,
      env,
      logger,
      errorLogger,
      openBrowserFn,
      exitProcess,
      appRunningCheck
    });
  });

  return server;
}
