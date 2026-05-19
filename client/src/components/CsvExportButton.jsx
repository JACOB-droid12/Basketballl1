import { useState } from "react";

import { buildCsvExportUrl } from "../api/csvExport.js";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const SERVER_ERROR_PREFIX = "CSV export could not be downloaded.";

/**
 * Thin wrapper that triggers a CSV download from one of the seven backend
 * `/api/exports/*.csv` endpoints. The button is always labelled with the
 * word "CSV" (default `"Export CSV"`) so staff users know the file format
 * before clicking. PDF, XLSX, and JSON variants are intentionally absent;
 * the underlying `buildCsvExportUrl` only accepts the seven CSV endpoint
 * names enumerated in `client/src/api/csvExport.js`.
 *
 * On click the component:
 *
 *  1. Builds the URL with `buildCsvExportUrl(endpoint, params)` (or uses
 *     the explicit `url` prop when provided so consumers can target a
 *     legacy non-`/api/exports/` route such as
 *     `/reservations/export.csv`). Only defined, non-empty params are
 *     appended to the query string.
 *  2. Pre-flights the URL with a GET so a `4xx`/`5xx` server response or
 *     a network failure can be surfaced inline rather than navigating
 *     the React app to an error page.
 *  3. On a 2xx response, triggers the browser-native CSV download by
 *     setting `window.location.href` to the resulting URL. The backend
 *     `Content-Disposition: attachment` header keeps the React app
 *     mounted while the browser downloads the file.
 *
 * Error states reuse the existing `.alert.error` class from
 * `client/src/styles.css`:
 *
 *  - On a server-reachable `4xx`/`5xx` response, "CSV export could not
 *    be downloaded." is rendered together with the backend `error` (or
 *    first `errors[]` entry) when present (Req. 6.8, 7.5).
 *  - On a network failure, the standard offline copy from Req. 17.1 is
 *    rendered (Req. 6.9, 17.1).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.8, 6.9, 7.1, 7.2, 7.5, 7.6, 15.1, 15.2,
 * 17.1, 18.1
 */
export function CsvExportButton({
  endpoint,
  url: urlOverride,
  params,
  label = "Export CSV",
  className = "btn btn-light"
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setError("");

    let url;
    try {
      // When `url` is supplied we honor it as-is so the button can target
      // legacy routes that pre-date the `/api/exports/*` whitelist
      // (path (b) of UI-AUD-008: the reservations list export points at
      // `/reservations/export.csv`, which is intentionally outside the
      // whitelist). Otherwise fall back to the endpoint-based URL builder
      // so the seven canonical CSV endpoints continue to be enforced.
      url = urlOverride || buildCsvExportUrl(endpoint, params);
    } catch (buildError) {
      setError(`${SERVER_ERROR_PREFIX}${suffixFromMessage(buildError?.message)}`);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(url, { credentials: "same-origin" });

      if (!response.ok) {
        const backendMessage = await readBackendErrorMessage(response);
        setError(`${SERVER_ERROR_PREFIX}${suffixFromMessage(backendMessage)}`);
        return;
      }

      // The pre-flight succeeded: hand the actual download off to the
      // browser by navigating to the resulting URL. The backend sends
      // `Content-Disposition: attachment`, so the browser downloads the
      // file without unloading the React app.
      window.location.href = url;
    } catch (requestError) {
      if (isNetworkError(requestError)) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(`${SERVER_ERROR_PREFIX}${suffixFromMessage(requestError?.message)}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={handleClick}
        disabled={busy}
      >
        {label}
      </button>
      {error && (
        <div className="alert error" role="alert">{error}</div>
      )}
    </>
  );
}

async function readBackendErrorMessage(response) {
  try {
    const data = await response.clone().json();
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim() !== "") {
        return data.error;
      }
      const firstError = firstValidationError(data.errors);
      if (firstError) return firstError;
    }
  } catch (parseError) {
    // Response body wasn't JSON; fall through and return an empty
    // message so the prefix is shown on its own.
  }
  return "";
}

function firstValidationError(errors) {
  if (!errors || typeof errors !== "object") return "";
  for (const value of Object.values(errors)) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

function suffixFromMessage(message) {
  if (typeof message !== "string") return "";
  const trimmed = message.trim();
  return trimmed === "" ? "" : ` ${trimmed}`;
}

function isNetworkError(error) {
  if (!error) return false;
  // fetch() throws a TypeError with no `status` when the request never
  // reached the server (offline, DNS failure, CORS preflight blocked,
  // etc.). Mirrors the detection used elsewhere in `client/src`.
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
