import { formatBackendDateTime, formatDate, formatTime } from "../api/mappers.js";
import { OFFICIAL_HEADER } from "../api/officialHeader.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { getStatusDisplay } from "../api/statusDisplay.js";
import { EmptyState } from "./EmptyState.jsx";

/**
 * Print-friendly view of `GET /api/schedule/daily-print?date=YYYY-MM-DD`.
 *
 * Renders the day's slot list and a separately labelled section for blocks
 * (maintenance + Public_Use_Clear ranges) so block ranges are never merged
 * into the reservation rows. Status is always conveyed by both a text label
 * (via `getStatusDisplay`) and a status class so the surface never relies on
 * color alone. Uses only locally bundled fonts and the existing
 * Barangay_Visual_Language CSS class vocabulary; the global `@media print`
 * rules in `client/src/styles.css` strip color and chrome for ink-friendly
 * monochrome output.
 *
 * On a missing or malformed payload, renders `EmptyState` rather than
 * throwing, so the print frame is never empty or broken.
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 7.2, 7.3, 7.4, 10.5, 18.1, 18.2, 19.1
 */
export function DailySchedulePrintView({ payload }) {
  if (!payload || typeof payload !== "object") {
    return (
      <EmptyState
        title="Data unavailable"
        body="The daily schedule print data could not be loaded."
      />
    );
  }

  const slots = Array.isArray(payload.slots) ? payload.slots : [];
  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  const totals = payload.totals && typeof payload.totals === "object" ? payload.totals : {};
  const issuedAtSource = payload.issuedAt || payload.generatedAt;
  const issuedAt = issuedAtSource ? formatBackendDateTime(issuedAtSource) : "";
  // Derive Manila wall-clock date/time at render time so the past-same-day
  // slot dimming (Req. 9.6, 9.7) reflects the office's local civil time.
  const todayManila = getManilaDate();
  const currentManilaTime = getManilaTime();

  return (
    <section className="page report-page daily-print-page">
      <div className="print-title">
        <p className="page-kicker">{OFFICIAL_HEADER.barangayName}</p>
        <h1>Daily Court Schedule</h1>
        {payload.date && <p>{formatDate(payload.date)}</p>}
        {issuedAt && <p className="print-issued-line">Issued on {issuedAt}</p>}
      </div>

      <header className="staff-page-head">
        <div>
          <p className="page-kicker">Daily Schedule</p>
          <h1 className="page-title">{formatDate(payload.date) || "Selected date"}</h1>
          <div className="page-sub">
            Court reservations and blocks for the selected date.
            <span className="page-sub-fil-inline">Iskedyul ng court para sa araw na ito.</span>
          </div>
          {issuedAt && (
            <div className="page-sub print-hidden">Issued on {issuedAt}</div>
          )}
        </div>
      </header>

      <section className="card padded-card daily-print-section" aria-labelledby="daily-print-slots-heading">
        <div className="card-section-head">
          <h2 id="daily-print-slots-heading">Reservations and slots</h2>
          <span>
            {slots.length} slot{slots.length === 1 ? "" : "s"}
          </span>
        </div>

        {slots.length === 0 ? (
          <EmptyState
            title="No slots for this date"
            body="The daily print response did not include any slot rows."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table daily-print-table">
              <thead>
                <tr>
                  <th scope="col">Slot</th>
                  <th scope="col">Time</th>
                  <th scope="col">Status</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, index) => {
                  const status = getStatusDisplay(slot.statusCode, slot.statusName);
                  const reservationRef = slot.reservation && slot.reservation.referenceNo;
                  const blockReason = slot.block && slot.block.reason;
                  const rowKey = slot.slotId != null ? `slot-${slot.slotId}` : `slot-${index}`;
                  const isPast = isPastSameDaySlot(slot, todayManila, currentManilaTime, payload.date);
                  // For past same-day slots, strip "available", "available now",
                  // "open", "bookable" phrasing from the status label so the
                  // posted printout never implies the slot can still be booked
                  // (Req. 9.7). Other status labels (Reserved, Completed, etc.)
                  // continue to render as resolved.
                  const statusLabel = isPast
                    ? sanitizePastStatusLabel(status.label)
                    : status.label;
                  return (
                    <tr key={rowKey} className={isPast ? "daily-print-row-past" : undefined}>
                      <td>{slot.name || "—"}</td>
                      <td>
                        {slot.startTime ? formatTime(slot.startTime) : "—"}
                        {slot.endTime ? ` \u2013 ${formatTime(slot.endTime)}` : ""}
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>{statusLabel}</span>
                      </td>
                      <td>{reservationRef ? formatReferenceNo(reservationRef) : "—"}</td>
                      <td>{blockReason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card padded-card daily-print-section" aria-labelledby="daily-print-blocks-heading">
        <div className="card-section-head">
          <h2 id="daily-print-blocks-heading">Blocks and cleared public-use ranges</h2>
          <span>
            {blocks.length} entr{blocks.length === 1 ? "y" : "ies"}
          </span>
        </div>

        <p className="form-copy">
          These ranges are not reservations. They cover maintenance, barangay events, and any
          time the court was cleared for public use.
        </p>

        {blocks.length === 0 ? (
          <EmptyState
            title="No blocks for this date"
            body="No maintenance or public-use ranges were recorded for the selected date."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table daily-print-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Time</th>
                  <th scope="col">Status</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block, index) => {
                  const status = getStatusDisplay(block.statusCode, block.statusName);
                  const rowKey = block.blockId != null ? `block-${block.blockId}` : `block-${index}`;
                  const isWholeDay = block.mode === "WHOLE_DAY";
                  return (
                    <tr key={rowKey}>
                      <td>{humanizeBlockType(resolveBlockType(block))}</td>
                      <td>{block.mode || "—"}</td>
                      <td>
                        {isWholeDay
                          ? "Whole day"
                          : `${block.startTime ? formatTime(block.startTime) : "—"}${
                              block.endTime ? ` \u2013 ${formatTime(block.endTime)}` : ""
                            }`}
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>{status.label}</span>
                      </td>
                      <td>{block.reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card padded-card daily-print-section" aria-labelledby="daily-print-totals-heading">
        <div className="card-section-head">
          <h2 id="daily-print-totals-heading">Totals</h2>
          <span>Counts from the backend response.</span>
        </div>
        <dl className="daily-print-totals">
          {Object.keys(totals).length === 0 ? (
            <p className="form-copy">No totals were returned for this date.</p>
          ) : (
            Object.entries(totals).map(([key, value]) => (
              <div key={key}>
                <dt>{humanizeTotalKey(key)}</dt>
                <dd>{value == null ? "—" : String(value)}</dd>
              </div>
            ))
          )}
        </dl>
      </section>
    </section>
  );
}

function humanizeTotalKey(key) {
  const text = String(key || "").trim();
  if (!text) return "";
  const spaced = text
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Frozen mapping from backend block type enum values to humanized labels
 * (Req. 9.3). Mirrors the same enum vocabulary used throughout the staff
 * console so the printed daily schedule never renders raw uppercase enums.
 */
const BLOCK_TYPE_LABEL = Object.freeze({
  CLEANING: "Cleaning",
  BARANGAY_EVENT: "Barangay event",
  REPAIRS: "Repairs",
  TOURNAMENT: "Tournament",
  MEETING: "Meeting",
  EMERGENCY_USE: "Emergency use",
  MAINTENANCE: "Maintenance"
});

/**
 * Resolve a block's type from the backend payload. Reads `block.type`
 * first (the canonical field on newer responses) and falls back to
 * `block.blockType` only when `block.type` is null, undefined, or an
 * empty string. Returns "" when neither field carries a non-empty
 * value, so callers can render a stable fallback (Req. 9.1, 9.2).
 */
function resolveBlockType(block) {
  if (!block || typeof block !== "object") return "";
  const primary = block.type;
  if (primary !== null && primary !== undefined && primary !== "") {
    return primary;
  }
  const fallback = block.blockType;
  if (fallback !== null && fallback !== undefined && fallback !== "") {
    return fallback;
  }
  return "";
}

/**
 * Translate a resolved block-type value to its humanized label. An
 * empty resolved value renders as "Blocked" (Req. 9.2); a value that
 * is not in `BLOCK_TYPE_LABEL` renders as "Other" (Req. 9.4); the raw
 * uppercase enum is never rendered (Req. 9.3).
 */
function humanizeBlockType(resolved) {
  if (resolved === "" || resolved === null || resolved === undefined) {
    return "Blocked";
  }
  const label = BLOCK_TYPE_LABEL[resolved];
  return label || "Other";
}

/**
 * Manila wall-clock date in `YYYY-MM-DD` form. Mirrors the helper used
 * by `ReservationFormPage` so the daily print classifies "today" the
 * same way the rest of the staff console does (Req. 9.6).
 */
function getManilaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Manila wall-clock time in 24-hour `HH:MM` form. Used to compare a
 * slot's `endTime` against "now" when the print sheet is opened for
 * the current calendar date (Req. 9.6).
 */
function getManilaTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

/**
 * Classify a slot row as a past same-day slot. Returns `true` when the
 * print sheet's date equals today's Manila date and the slot's end time
 * is strictly less than the current Manila wall-clock time (Req. 9.6).
 *
 * Times are compared as `HH:MM` strings, which sort lexicographically
 * the same way they sort numerically for the 24-hour form the backend
 * emits, so no parsing is required.
 */
function isPastSameDaySlot(slot, todayManila, currentManilaTime, printDate) {
  if (!slot || typeof slot !== "object") return false;
  if (!printDate || printDate !== todayManila) return false;
  const endTime = typeof slot.endTime === "string" ? slot.endTime : "";
  if (!endTime) return false;
  return endTime < currentManilaTime;
}

/**
 * Strip "available now", "available", "open", and "bookable" phrasing
 * from a status label so a past-same-day slot's status text does not
 * imply the slot can still be booked (Req. 9.7). Matches case-
 * insensitively as whole words and falls back to "Past" when the label
 * is consumed entirely by the strip.
 */
function sanitizePastStatusLabel(label) {
  const text = typeof label === "string" ? label.trim() : "";
  if (!text) return "Past";
  const stripped = text
    .replace(/\bavailable\s+now\b/gi, "")
    .replace(/\bavailable\b/gi, "")
    .replace(/\bopen\b/gi, "")
    .replace(/\bbookable\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return stripped || "Past";
}
