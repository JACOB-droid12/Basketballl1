import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { BackupReminderCard } from "../components/BackupReminderCard.jsx";
import { CourtPolicyForm } from "../components/CourtPolicyForm.jsx";
import { DashboardAlertsCard } from "../components/DashboardAlertsCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

/**
 * Court policy settings page.
 *
 * Loads the current policy from `GET /api/settings/court-policy` and
 * renders the `CourtPolicyForm` for both staff (read-only) and admin
 * (editable) users. The form handles its own save flow against
 * `PUT /api/settings/court-policy`; on success this page updates the
 * locally cached policy so a subsequent re-render reflects the saved
 * values.
 *
 * Renders the standard offline copy on a network failure and the backend
 * `error` message verbatim on `4xx`/`5xx`. The `CourtPolicyForm` itself
 * surfaces per-field validation errors from the backend `errors` body
 * via the existing `Field` `error` prop.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 17.1, 17.2, 18.1
 */
export function CourtPolicyPage({ user, onNavigate }) {
  const [state, setState] = useState({ loading: true, policy: null, error: "" });
  const [alertsState, setAlertsState] = useState({ loading: true, payload: null, error: "" });
  const [alertsRetry, setAlertsRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, loading: true, error: "" }));
    apiRequest("/api/settings/court-policy")
      .then((data) => {
        if (!active) return;
        setState({ loading: false, policy: data?.policy || null, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setState({ loading: false, policy: null, error: message });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setAlertsState((previous) =>
      previous.loading && previous.payload === null && previous.error === ""
        ? previous
        : { loading: true, payload: null, error: "" }
    );

    apiRequest("/api/dashboard/alerts")
      .then((payload) => {
        if (!active) return;
        setAlertsState({ loading: false, payload, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setAlertsState({ loading: false, payload: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [alertsRetry]);

  function handleSaved(updatedPolicy) {
    setState((current) => ({ ...current, policy: updatedPolicy }));
  }

  return (
    <section className="page">
      <div className="page-header page-head staff-page-head">
        <div>
          <p className="page-kicker">Settings</p>
          <h1 className="page-title">Court policy</h1>
          <div className="page-sub">
            Default opening hours, reservation duration limits, allowed days, blocked dates,
            and the grace period before a no-show is recorded.
            <span className="page-sub-fil-inline">Para sa default na patakaran ng court.</span>
          </div>
        </div>
      </div>

      {state.loading ? (
        <LoadingState label="Loading court policy..." />
      ) : state.error ? (
        <div className="alert error" role="alert">{state.error}</div>
      ) : !state.policy ? (
        <EmptyState
          title="Data unavailable"
          body="The court policy data could not be loaded."
        />
      ) : (
        <>
          <BackupReminderCard />
          {alertsState.error && (
            <div className="alert error" role="alert">
              <span>{alertsState.error}</span>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => setAlertsRetry((count) => count + 1)}
              >
                Try again
              </button>
            </div>
          )}
          {alertsState.payload && <DashboardAlertsCard payload={alertsState.payload} />}
          <CourtPolicyForm
            user={user}
            initialPolicy={state.policy}
            onSaved={handleSaved}
            onNavigate={onNavigate}
          />
        </>
      )}
    </section>
  );
}

function isNetworkError(error) {
  if (!error) return false;
  // fetch() throws a TypeError with no `status` when the request never
  // reached the server (offline, DNS failure, CORS preflight blocked, etc.).
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
