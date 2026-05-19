import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { ReservationSlipPrintView } from "../components/ReservationSlipPrintView.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

/**
 * Print-only page that renders the reservation slip for a single
 * reservation.
 *
 * Receives the reservation id as a prop (`reservationId`). The route
 * resolver in `App.jsx` parses it from `/reservations/:reservationId/slip`
 * and forwards it here. On mount the page requests
 * `GET /api/reservations/:reservationId/slip` via `apiRequest` and renders
 * `ReservationSlipPrintView` with the returned `slip` payload on success.
 *
 * On a successful first render, the page calls `window.print()` exactly
 * once after the slip data is in the DOM so the office can hand the
 * resident a paper copy without an extra click. Subsequent renders do
 * not re-trigger the dialog.
 *
 * Errors are surfaced via the existing `.alert error` element with the
 * backend message verbatim; the signature line is intentionally not
 * rendered in the error case (the slip view is not mounted at all). On a
 * network failure the standard office-friendly offline copy from
 * Requirement 17.1 is rendered instead of the backend message.
 *
 * The page renders without `AppShell` chrome; the global `@media print`
 * rules in `client/src/styles.css` strip any remaining UI for ink-friendly
 * monochrome output. No external network resources are referenced
 * (Requirement 19.4).
 *
 * Requirements: 2.1, 2.6, 2.7, 17.1, 17.2, 17.5, 19.4
 */
export function ReservationSlipPrintPage({ reservationId }) {
  const [state, setState] = useState({ loading: true, slip: null, error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const printedRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (reservationId === undefined || reservationId === null || reservationId === "") {
      setState({
        loading: false,
        slip: null,
        error: "Reservation reference is missing from the link."
      });
      return () => {
        active = false;
      };
    }

    setState({ loading: true, slip: null, error: "" });
    printedRef.current = false;

    apiRequest(`/api/reservations/${encodeURIComponent(reservationId)}/slip`)
      .then((data) => {
        if (!active) return;
        const slip = data && typeof data === "object" ? data.slip || null : null;
        setState({ loading: false, slip, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setState({ loading: false, slip: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [reservationId, retryKey]);

  // Trigger the browser print dialog exactly once after the slip data
  // is in the DOM. We rely on the ref so a later re-render (for example,
  // a state change in a parent) does not re-open the dialog.
  useEffect(() => {
    if (state.loading || state.error || !state.slip) return;
    if (printedRef.current) return;
    if (typeof window === "undefined" || typeof window.print !== "function") return;

    printedRef.current = true;
    window.print();
  }, [state.loading, state.error, state.slip]);

  return (
    <main className="main-panel">
      {state.loading ? (
        <LoadingState label="Loading reservation slip..." />
      ) : state.error ? (
        <PrintErrorState
          message={state.error}
          onRetry={() => setRetryKey((value) => value + 1)}
          backHref={`/reservations/${encodeURIComponent(reservationId || "")}`}
          backLabel="Back to reservation"
        />
      ) : (
        <ReservationSlipPrintView slip={state.slip} />
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
