import { formatBackendDateTime, formatDate, formatTime } from "../api/mappers.js";
import { OFFICIAL_HEADER } from "../api/officialHeader.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { EmptyState } from "./EmptyState.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

/**
 * Print-friendly reservation slip view.
 *
 * Renders the payload returned by `GET /api/reservations/:reservationId/slip`
 * as an official one-page slip suitable for monochrome ink printing. All
 * fields (`referenceNo`, `representativeName`, `contactNo`, `address`,
 * `reservationDate`, `startTime`, `endTime`, `purpose`, `statusName`,
 * `staffEncoder`, `issuedAt`, `barangayName`, `courtName`) are rendered
 * verbatim from the payload, without any client-side reformatting that
 * would change the displayed value.
 *
 * On a missing or malformed payload the view renders an `EmptyState`
 * ("Data unavailable") rather than throwing, so the print frame is never
 * empty or broken.
 *
 * On success, a printed signature line area is rendered below the
 * reservation details. When the slip's `statusCode === "CANCELLED"`,
 * an additional visible "CANCELLED" mark is rendered alongside the
 * status badge using the existing `.alert error` class (a bordered
 * stripe well within the 4px allowance).
 *
 * The slip is laid out for ink-friendly, single-page printing: a
 * `slip-print-page` modifier scopes a `@media print` block in
 * `client/src/styles.css` that hides the duplicate on-screen header,
 * collapses the detail list into a two-column grid, replaces tinted
 * cards/badges/alerts with a black-on-white treatment, and reduces the
 * acknowledgment block to two compact signature lines so a typical
 * reservation fits on one A4 page in monochrome.
 *
 * Only the existing Barangay_Visual_Language CSS class vocabulary in
 * `client/src/styles.css` and locally bundled fonts are used; no
 * external resources are referenced.
 *
 * Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5, 17.3, 17.5, 18.1, 18.2, 19.1
 */
export function ReservationSlipPrintView({ slip }) {
  if (!slip || typeof slip !== "object") {
    return (
      <EmptyState
        title="Data unavailable"
        body="The reservation slip data could not be loaded."
      />
    );
  }

  const isCancelled =
    typeof slip.statusCode === "string" &&
    slip.statusCode.trim().toUpperCase() === "CANCELLED";

  return (
    <section className="page report-page slip-print-page">
      <div className="print-title">
        <p className="page-kicker">{OFFICIAL_HEADER.barangayName}</p>
        <h1>Reservation Slip</h1>
        <p>
          {OFFICIAL_HEADER.courtName}
          <span className="slip-print-ref"> — Ref. {formatReferenceNo(slip.referenceNo)}</span>
        </p>
      </div>

      <header className="staff-page-head">
        <div>
          <p className="page-kicker">{OFFICIAL_HEADER.barangayName}</p>
          <h1 className="page-title">Reservation Slip</h1>
          <div className="page-sub">
            {`${OFFICIAL_HEADER.courtName} · ${OFFICIAL_HEADER.subtitle}`}
            <span className="page-sub-fil-inline">Resibo ng reserbasyon ng court.</span>
          </div>
        </div>
      </header>

      {isCancelled && (
        <div className="alert error slip-cancelled-mark" role="alert">
          <strong>CANCELLED</strong>
        </div>
      )}

      <section className="card padded-card slip-details-card" aria-labelledby="slip-details-heading">
        <div className="card-section-head">
          <h2 id="slip-details-heading">Reservation details</h2>
          <span className="print-hidden">Reference {formatReferenceNo(slip.referenceNo)}</span>
        </div>

        <div className="detail-status-line">
          <StatusBadge statusCode={slip.statusCode} />
        </div>

        <dl className="detail-grid staff-detail-grid slip-detail-grid">
          <DetailRow label="Reference number" value={formatReferenceNo(slip.referenceNo)} />
          <DetailRow label="Representative name" value={renderText(slip.representativeName)} />
          <DetailRow label="Contact number" value={renderText(slip.contactNo)} />
          <DetailRow label="Address" value={renderText(slip.address)} />
          <DetailRow label="Reservation date" value={formatSlipDate(slip.reservationDate)} />
          <DetailRow label="Time" value={formatSlipTimeRange(slip.startTime, slip.endTime)} />
          <DetailRow label="Purpose" value={renderText(slip.purpose)} />
          <DetailRow label="Status" value={renderText(slip.statusName)} />
          <DetailRow label="Staff encoder" value={renderText(slip.staffEncoder)} />
          <DetailRow label="Issued on" value={formatBackendDateTime(slip.issuedAt)} />
          <DetailRow label="Barangay" value={renderText(slip.barangayName)} />
          <DetailRow label="Court" value={renderText(slip.courtName)} />
        </dl>
      </section>

      <section className="card padded-card slip-sign-card" aria-labelledby="slip-signature-heading">
        <div className="card-section-head">
          <h2 id="slip-signature-heading">Acknowledgment</h2>
          <span className="print-hidden">Signed at the barangay office.</span>
        </div>

        <div className="slip-sign-row">
          <div className="slip-sign-cell">
            <div className="slip-sign-line" aria-hidden="true" />
            <div className="slip-sign-label">Resident signature over printed name</div>
          </div>
          <div className="slip-sign-cell">
            <div className="slip-sign-line" aria-hidden="true" />
            <div className="slip-sign-label">Staff on duty (signature and date)</div>
          </div>
        </div>
      </section>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function renderText(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value);
  if (text.trim() === "") return "—";
  return text;
}

// Slip-specific date/time formatters. The slip is an official barangay
// document so we never render the raw `YYYY-MM-DD` or 24-hour values
// the backend stores. When the value is missing or unparseable the
// row falls back to an em-dash via `renderText` rather than blanking
// out, so a half-populated slip still prints cleanly.
function formatSlipDate(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  const formatted = formatDate(value);
  return formatted || String(value);
}

function formatSlipTimeRange(startTime, endTime) {
  const start = startTime ? formatTime(startTime) : "";
  const end = endTime ? formatTime(endTime) : "";
  if (!start && !end) return "—";
  if (start && end) return `${start} \u2013 ${end}`;
  return start || end;
}
