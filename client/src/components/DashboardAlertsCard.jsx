import { formatTime } from "../api/mappers.js";
import { EmptyState } from "./EmptyState.jsx";

/**
 * Dashboard alerts and today's-snapshot card.
 *
 * Renders the payload returned by `GET /api/dashboard/alerts`:
 *   - the `alerts` array (each with `severity`, `title`, `body`),
 *   - `metrics.todayReservationCount`,
 *   - `metrics.missedPendingCount`,
 *   - `metrics.nextReservation` (start time + representative name) when non-null,
 *   - a labeled "Cleared for public use today" notice when
 *     `metrics.publicUseActiveToday === true`,
 *   - a labeled "Maintenance active today" notice when
 *     `metrics.maintenanceActiveToday === true`.
 *
 * When the alerts array is empty and every metric is zero, false, or null,
 * the card renders a calm `EmptyState` ("Nothing needs attention today")
 * rather than showing zeroed cards as warnings (Req. 11.5).
 *
 * Data fetching is orchestrated by `DashboardPage`; the alerts payload is
 * passed in as a prop so the card stays a pure presenter. Only the existing
 * Barangay_Visual_Language CSS class vocabulary in `client/src/styles.css`
 * (`card`, `card-head`, `card-title`, `padded-card`, `stat-card`,
 * `info-banner`, `alert`, `fil`) and the existing `EmptyState` component
 * are used, matching the pattern of `TodaySnapshotCard`.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 18.1
 */
export function DashboardAlertsCard({ payload }) {
  // Filter out alert objects that have no readable text. The backend
  // payload occasionally returns severity-only entries (used internally as
  // categorization markers); rendering them as bare colored strips would
  // mislead staff into thinking there's something to read, and would
  // suppress the Req. 11.5 calm empty-state by inflating `hasAlerts`.
  //
  // The current backend (`src/features/api/apiRoutes.js#buildDashboardAlertsPayload`)
  // returns each alert as `{ type, severity, message, ... }`. We accept
  // `message` first and keep `title` / `body` as forward-compat aliases so
  // the card still works if the backend later expands the schema with a
  // separate heading + body pair.
  const alerts = Array.isArray(payload?.alerts)
    ? payload.alerts.filter((alert) => {
        if (!alert) return false;
        const message = typeof alert.message === "string" ? alert.message.trim() : "";
        const title = typeof alert.title === "string" ? alert.title.trim() : "";
        const body = typeof alert.body === "string" ? alert.body.trim() : "";
        return message !== "" || title !== "" || body !== "";
      })
    : [];
  const metrics =
    payload && typeof payload.metrics === "object" && payload.metrics !== null
      ? payload.metrics
      : {};

  const todayReservationCount = normalizeCount(metrics.todayReservationCount);
  const missedPendingCount = normalizeCount(metrics.missedPendingCount);
  const nextReservation = isPlainObject(metrics.nextReservation) ? metrics.nextReservation : null;
  const publicUseActiveToday = metrics.publicUseActiveToday === true;
  const maintenanceActiveToday = metrics.maintenanceActiveToday === true;

  const hasAlerts = alerts.length > 0;
  const hasReservationToday = todayReservationCount > 0;
  const hasMissedPending = missedPendingCount > 0;
  const hasNextReservation = nextReservation !== null;
  const isCalm =
    !hasAlerts &&
    !hasReservationToday &&
    !hasMissedPending &&
    !hasNextReservation &&
    !publicUseActiveToday &&
    !maintenanceActiveToday;

  return (
    <section className="card padded-card" aria-labelledby="dashboard-alerts-heading">
      <div className="card-head">
        <div>
          <h2 id="dashboard-alerts-heading" className="card-title">
            Today's alerts
            <span className="fil">Mga babala ngayong araw</span>
          </h2>
        </div>
      </div>

      {isCalm ? (
        <EmptyState
          title="Nothing needs attention today"
          body="Walang kailangang aksyunin ngayong araw. Check the calendar if a new request comes in."
        />
      ) : (
        <>
          {hasAlerts &&
            alerts.map((alert, index) => {
              // Prefer the backend `message` field. `title` / `body`
              // remain as forward-compat aliases so the card keeps
              // working if the schema later splits a heading from
              // a body. The headline reads as a strong-weighted
              // sentence so the row is recognizable as an alert
              // even at a glance.
              const heading = alert.title ? String(alert.title) : "";
              const detail = alert.body ? String(alert.body) : "";
              const message = alert.message ? String(alert.message) : "";
              return (
                <div
                  key={alertKey(alert, index)}
                  className={`alert ${alertSeverityClass(alert.severity)}`}
                  role="alert"
                >
                  {heading && <strong>{heading}</strong>}
                  {message && <div>{message}</div>}
                  {detail && <div>{detail}</div>}
                </div>
              );
            })}

          <div className="stat-card">
            <span>Reservations today</span>
            <strong>{todayReservationCount}</strong>
            <small>Mga reserbasyon ngayon</small>
          </div>

          <div className="stat-card">
            <span>Missed, still pending</span>
            <strong>{missedPendingCount}</strong>
            <small>Hindi pa naa-update sa missed list</small>
          </div>

          {hasNextReservation && (
            <div className="info-banner">
              <strong>Next reservation:</strong>{" "}
              {formatNextReservationTime(nextReservation.startTime)} —{" "}
              {renderText(nextReservation.representativeName)}
            </div>
          )}

          {publicUseActiveToday && (
            <div className="alert info" role="status">
              <strong>Cleared for public use today.</strong>{" "}
              The court has been opened for public use for at least part of today.
            </div>
          )}

          {maintenanceActiveToday && (
            <div className="alert warning" role="status">
              <strong>Maintenance active today.</strong>{" "}
              A maintenance or unavailable block is in effect for at least part of today.
            </div>
          )}
        </>
      )}
    </section>
  );
}

function normalizeCount(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function alertSeverityClass(severity) {
  const code = String(severity || "info").toLowerCase();
  if (code === "warning") return "warning";
  if (code === "danger" || code === "error") return "error";
  return "info";
}

function alertKey(alert, index) {
  if (alert && typeof alert.id === "string" && alert.id !== "") return alert.id;
  return `alert-${index}`;
}

function formatNextReservationTime(value) {
  if (typeof value !== "string" || value.trim() === "") return "—";
  // Backend returns HH:mm; reuse the existing formatter so the dashboard
  // matches the rest of the staff console.
  return formatTime(value);
}

function renderText(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value);
  if (text.trim() === "") return "—";
  return text;
}
