import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { DailySchedulePrintView } from "../components/DailySchedulePrintView.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Print-only page that renders the Daily_Schedule_Printout for the date
 * passed in the query string, e.g. `/schedule/daily-print?date=2026-05-16`.
 *
 * The date is read from `window.location.search` (consistent with the rest
 * of the client-side routing); on mount the page requests
 * `GET /api/schedule/daily-print?date=YYYY-MM-DD` via `apiRequest` and
 * renders `DailySchedulePrintView` with the returned payload on success.
 *
 * On a successful first render, the page calls `window.print()` exactly
 * once after the payload is in the DOM so the office can hand out the
 * day's schedule without an extra click. Subsequent renders do not
 * re-trigger the dialog.
 *
 * Errors are surfaced via the existing `.alert error` element with the
 * backend message verbatim; the print view is intentionally not mounted
 * in the error case so an empty/broken print frame never reaches paper
 * (Requirement 7.6). On a network failure the standard office-friendly
 * offline copy from Requirement 17.1 is rendered instead of the backend
 * message.
 *
 * The page renders without `AppShell` chrome; the global `@media print`
 * rules in `client/src/styles.css` strip any remaining UI for ink-friendly
 * monochrome output. No external network resources are referenced
 * (Requirement 19.4).
 *
 * Requirements: 7.1, 7.5, 7.6, 17.1, 17.2, 17.5, 19.4
 */
export function DailySchedulePrintPage() {
  const [state, setState] = useState({ loading: true, payload: null, error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const printedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const date = readDateFromLocation();
    if (!date) {
      setState({
        loading: false,
        payload: null,
        error:
          "A date is missing from the link. Open the daily print from the schedule page so the date is included."
      });
      return () => {
        active = false;
      };
    }

    if (!DATE_PATTERN.test(date)) {
      setState({
        loading: false,
        payload: null,
        error: "The date in the link is not in YYYY-MM-DD format."
      });
      return () => {
        active = false;
      };
    }

    setState({ loading: true, payload: null, error: "" });
    printedRef.current = false;

    apiRequest(`/api/schedule/daily-print?date=${encodeURIComponent(date)}`)
      .then((data) => {
        if (!active) return;
        setState({ loading: false, payload: data || null, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setState({ loading: false, payload: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  // Trigger the browser print dialog exactly once after the daily print
  // data is in the DOM. We rely on the ref so a later re-render (for
  // example, a state change in a parent) does not re-open the dialog.
  useEffect(() => {
    if (state.loading || state.error || !state.payload) return;
    if (printedRef.current) return;
    if (typeof window === "undefined" || typeof window.print !== "function") return;

    printedRef.current = true;
    window.print();
  }, [state.loading, state.error, state.payload]);

  return (
    <main className="main-panel">
      {state.loading ? (
        <LoadingState label="Loading daily schedule..." />
      ) : state.error ? (
        <PrintErrorState
          message={state.error}
          onRetry={() => setRetryKey((value) => value + 1)}
          backHref="/schedule"
          backLabel="Back to schedule"
        />
      ) : (
        <DailySchedulePrintView payload={state.payload} />
      )}
    </main>
  );
}

function PrintErrorState({ message, onRetry, backHref, backLabel }) {
  function goBack() {
    if (typeof window !== "undefined" && window.location) {
      window.location.href = backHref;
    }
  }

  return (
    <div className="state-card error-state print-hidden" role="alert">
      <span className="state-mark empty-mark">!</span>
      <h1>Could not load print view</h1>
      <p>{message}</p>
      <div className="button-row">
        <button className="btn btn-primary" type="button" onClick={onRetry}>Try again</button>
        <button className="btn btn-light" type="button" onClick={goBack}>{backLabel}</button>
      </div>
    </div>
  );
}

function readDateFromLocation() {
  if (typeof window === "undefined" || !window.location) return "";
  const search = window.location.search || "";
  if (!search) return "";
  try {
    const params = new URLSearchParams(search);
    return (params.get("date") || "").trim();
  } catch {
    return "";
  }
}

function isNetworkError(error) {
  if (!error) return false;
  // `apiRequest` re-throws non-2xx responses with an `error.status`.
  // A genuine network failure (offline, DNS error, CORS preflight blocked)
  // throws a `TypeError` from `fetch()` with no `status`.
  if (typeof error.status !== "undefined") return false;
  if (error.name === "TypeError") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
