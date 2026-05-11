import dotenv from "dotenv";
import { pathToFileURL } from "node:url";

import { buildOfficeUrl } from "../src/serverStartup.js";

export function getOfficePort(env = process.env) {
  const port = Number(env.APP_PORT || 3000);
  return Number.isInteger(port) && port > 0 ? port : 3000;
}

export function getOfficeUrl(env = process.env) {
  return buildOfficeUrl(getOfficePort(env));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config();
  console.log(getOfficeUrl());
}
