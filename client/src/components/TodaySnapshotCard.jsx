import { formatTime } from "../api/mappers.js";
import { formatReferenceNo } from "../api/referenceNo.js";

/**
 * Today's snapshot card for the dashboard.
 *
 * Renders today's reservation count and a compact summary of the next
 * reservation. The data is fed by `DashboardPage` from the shared
 * `/api/dashboard/alerts` fetch state, so this component is a pure
 * renderer with no fetching of its own.
 *
 * `metrics.todayReservationCount` is rendered as the headline number.
 * When `metrics.nextReservation` is present, the card renders its
 * `referenceNo` (via `formatReferenceNo` so a missing value falls back
 * to the "No reference number" placeholder), `startTime` (formatted
 * with the existing `formatTime` mapper), and `representativeName`.
 *
 * Existing Barangay_Visual_Language classes (`.card`, `.card-head`,
 * `.card-title`, `.padded-card`, `.stat-card`) are reused so no new
 * visual tokens are introduced. Each `.stat-card` follows the
 * established pattern of an uppercase `span` label, a serif `strong`
 * headline, and a muted `small` caption.
 *
 * Requirements: 1.1, 11.1, 11.2, 18.1
 */
export function TodaySnapshotCard({ metrics }) {
  const reservationCount = toNonNegativeInteger(metrics?.todayReservationCount);
  const nextReservation = metrics?.nextReservation || null;

  return (
    <section className="card" aria-label="Today's snapshot">
      <div className="card-head">
        <div>
          <h2 className="card-title">
            Today's snapshot
            <span className="fil">Buod ngayong araw</span>
          </h2>
        </div>
      </div>
      <div className="padded-card">
        <div className="stat-card">
          <span>Reservations today</span>
          <strong>{reservationCount}</strong>
          <small>
            {reservationCount === 1
              ? "1 booking listed for today."
              : `${reservationCount} bookings listed for today.`}
          </small>
        </div>

        <div className="stat-card">
          <span>Next reservation</span>
          {nextReservation ? (
            <>
              <strong>{formatTime(nextReservation.startTime)}</strong>
              <small>
                {nextReservation.representativeName || "Reserved"}
                <br />
                Ref: {formatReferenceNo(nextReservation.referenceNo)}
              </small>
            </>
          ) : (
            <small>No upcoming reservation today.</small>
          )}
        </div>
      </div>
    </section>
  );
}

function toNonNegativeInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}
