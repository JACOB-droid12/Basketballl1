import { spawn } from "node:child_process";

const defaultOfficePath = "/prototype";

export function buildOfficeUrl(port, officePath = defaultOfficePath) {
  const normalizedPath = officePath.startsWith("/") ? officePath : `/${officePath}`;
  return `http://localhost:${port}${normalizedPath}`;
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

export function startServer({ app, port, env = process.env, logger = console.log, openBrowserFn = openBrowser }) {
  return app.listen(port, () => {
    const rootUrl = `http://localhost:${port}`;
    const officeUrl = buildOfficeUrl(port);

    logger(`Basketball court scheduler listening at ${rootUrl}`);

    if (shouldOpenBrowser(env)) {
      logger(`Opening ${officeUrl}`);
      openBrowserFn(officeUrl);
    }
  });
}
