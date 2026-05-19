/**
 * StaffBookingBlock renders one row inside a Day_Card body — either a
 * reservation (rendered as an interactive `<button>`) or a schedule
 * block (rendered as a `<div role="group">`). The component is purely
 * presentational: the parent `CalendarDayColumn` pre-computes
 * `statusLabel`, `statusClassName`, and `referenceLabel` (via
 * `getStatusDisplay()` / `formatReferenceNo()`) and passes them in as
 * props so this component never touches helpers or status data
 * directly.
 *
 * Visual contract (Properties 2, 3, 4, 10 / Requirements 2.1–2.6,
 * 3.1, 3.2, 3.4, 11.1, 11.2, 11.3):
 *   - Renders `.staff-booking-time` (range), `.staff-booking-name`
 *     (name), and `.staff-booking-purpose` (purpose) as direct children
 *     so the compact Barangay day-card layout stays predictable.
 *   - Renders zero `.status-badge` descendants. Status is visible in a
 *     direct `.staff-booking-status` chip and announced to assistive
 *     technology via `aria-label`.
 *   - Renders zero text starting with `Ref:`. The reference number
 *     reaches the screen reader through the `aria-label` only.
 *   - The `aria-label` always includes `statusLabel`. For reservations
 *     it appends `, reference ${referenceLabel}`. For schedule blocks
 *     it appends `, ${purpose}` only when `purpose` is a non-empty
 *     truthy string (the `CalendarDayColumn` parent passes the block's
 *     reason through as `purpose`).
 *
 * Props:
 *   kind             — "reservation" | "block"
 *   range            — pre-formatted time range, e.g. "7:00am - 8:00am"
 *   name             — representative name (reservation) or block-type
 *                      label (block)
 *   purpose          — purpose text (reservation) or reason text (block)
 *   statusCode       — accepted for parent symmetry; not rendered
 *   statusLabel      — human status label from getStatusDisplay()
 *   statusClassName  — status modifier class from getStatusDisplay()
 *   referenceLabel   — formatted reservation reference (reservations
 *                      only); ignored for blocks
 *   onActivate       — click handler for the reservation button
 *   adminAction      — { label, onClick } for the optional admin button
 *                      rendered inside schedule blocks (e.g.
 *                      "Deactivate block")
 */
export function StaffBookingBlock({
  kind,
  range,
  name,
  purpose,
  // statusCode is part of the documented prop contract for symmetry
  // with the parent's pre-computed status payload, but the visual
  // chrome reads only from `statusClassName` / `statusLabel`. The
  // unused destructure is intentional.
  // eslint-disable-next-line no-unused-vars
  statusCode,
  statusLabel,
  statusClassName,
  referenceLabel,
  onActivate,
  adminAction
}) {
  const className = `staff-booking-block ${statusClassName || ""}`.trim();

  if (kind === "reservation") {
    // Reservation aria-label literal (from tasks.md sub-task):
    //   `${name}, ${range}, ${statusLabel}, reference ${referenceLabel}`
    const ariaLabel = `${name}, ${range}, ${statusLabel}, reference ${referenceLabel}`;

    return (
      <button
        type="button"
        className={className}
        onClick={onActivate}
        aria-label={ariaLabel}
      >
        <span className="staff-booking-time">{range}</span>
        <span className="staff-booking-name">{name}</span>
        <span className="staff-booking-purpose">{purpose}</span>
        <span className="staff-booking-status">{statusLabel}</span>
      </button>
    );
  }

  // Schedule block (kind === "block"). The aria-label always carries
  // the status label and only appends the reason when it is a
  // non-empty truthy string, per the task specification.
  const purposeText = typeof purpose === "string" ? purpose : "";
  const ariaLabel = purposeText
    ? `${name}, ${range}, ${statusLabel}, ${purposeText}`
    : `${name}, ${range}, ${statusLabel}`;

  return (
    <div role="group" className={className} aria-label={ariaLabel}>
      <span className="staff-booking-time">{range}</span>
      <span className="staff-booking-name">{name}</span>
      <span className="staff-booking-purpose">{purpose}</span>
      <span className="staff-booking-status">{statusLabel}</span>
      {adminAction ? (
        <button
          type="button"
          className="btn btn-light staff-booking-block__action"
          onClick={adminAction.onClick}
        >
          {adminAction.label}
        </button>
      ) : null}
    </div>
  );
}
