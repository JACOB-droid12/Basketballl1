import { formatDate, formatTime, STATUS_LABELS } from "../api/mappers.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { ModalShell } from "./ModalShell.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

const STATUS_ACTIONS = [
  {
    statusCode: "MISSED",
    label: "Mark as missed",
    confirmLabel: "Yes, mark missed",
    danger: true
  },
  {
    statusCode: "CANCELLED",
    label: "Cancel",
    confirmLabel: "Yes, cancel",
    danger: true
  },
  {
    statusCode: "COMPLETED",
    label: "Mark as done",
    confirmLabel: "Yes, mark done",
    danger: false
  }
];

/**
 * Reservation detail drawer for the reservation list.
 *
 * The drawer now renders through the shared `ModalShell` so every
 * overlay shares one set of layout, focus-trap, Escape, and
 * backdrop-dismissal rules (Req. 3.1, 3.7, 3.10). The local
 * `FOCUSABLE_SELECTORS` list, `getFocusableElements` helper, and
 * focus-trap loop that used to live in this file have been
 * consolidated into `ModalShell`.
 *
 * Layout:
 *   - The shell is sized `lg` (max 720px on desktop) so the wider
 *     surface the drawer needed is preserved across Supported_Viewports.
 *   - The action row (Edit / Print slip / Mark missed / Cancel /
 *     Mark done) lives in the shell's `footer` slot so the buttons
 *     stay pinned and visible (Req. 3.7, 3.8).
 *
 * Props (unchanged from the previous implementation so callers do not
 * need to be updated, Req. 3.10):
 *   - `reservation`     -> when null/undefined the drawer is unmounted
 *                          (the shell receives `open={false}`).
 *   - `busy`            -> while truthy, every footer button is
 *                          disabled.
 *   - `onClose`         -> invoked by the shell on close (button click,
 *                          Escape when not suspended, backdrop click
 *                          when not suspended).
 *   - `onEdit`          -> Edit action click handler.
 *   - `onRequestStatus` -> invoked with the chosen `STATUS_ACTIONS`
 *                          entry when the staff member requests a
 *                          status change.
 *   - `suspendEscape`   -> when `true`, suppress the shell's Escape
 *                          close (used by `ReservationsPage` while a
 *                          `ConfirmDialog` is open on top of the
 *                          drawer). Forwarded to `ModalShell` via the
 *                          `busy` prop semantics: while suspended,
 *                          Escape and backdrop dismissal are blocked.
 *
 * The detail body keeps the existing `Reference number` row (rendered
 * through `formatReferenceNo`) and the `STATUS_ACTIONS` set is still
 * filtered by `reservation.statusCode === "RESERVED"` so cancel/missed/
 * mark-done only appear for in-flight reservations.
 *
 * Requirements: 3.7, 3.10
 */
export function ReservationDetailDrawer({
  reservation,
  busy,
  onClose,
  onEdit,
  onRequestStatus,
  suspendEscape = false
}) {
  // Unmount the drawer body when no reservation is selected so the
  // detail state cannot leak between sessions and the shared
  // ModalShell focus trap is torn down cleanly.
  if (!reservation) return null;

  const availableStatusActions = reservation.statusCode === "RESERVED" ? STATUS_ACTIONS : [];

  // Forward `suspendEscape` to the shell as `busy` so Escape and
  // backdrop dismissal are suppressed while the confirm dialog stack
  // is open on top of the drawer (the original `suspendEscape`
  // semantics, now expressed through the shared shell's `busy` prop).
  const shellBusy = Boolean(suspendEscape);

  return (
    <ModalShell
      open
      onClose={onClose}
      kicker={`Reservation #${reservation.reservationId}`}
      title={reservation.representativeName}
      subtitle={reservation.purpose}
      size="lg"
      busy={shellBusy}
      footer={
        <div className="reservation-drawer-actions">
          <div className="reservation-drawer-actions-main">
            <button className="btn btn-light" type="button" onClick={onEdit} disabled={busy}>
              Edit
            </button>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => navigateToSlip(reservation.reservationId)}
              disabled={busy}
            >
              Print slip
            </button>
          </div>
          <div className="reservation-drawer-actions-status">
            {orderStatusActions(availableStatusActions).map((action) => (
              <button
                className={`btn ${action.danger ? "btn-danger" : "btn-primary"}`}
                type="button"
                key={action.statusCode}
                onClick={() => onRequestStatus(action)}
                disabled={busy}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="detail-status-line">
        <StatusBadge statusCode={reservation.statusCode} />
      </div>
      <dl className="detail-grid staff-detail-grid">
        <DetailRow label="Reference number" value={formatReferenceNo(reservation.referenceNo)} />
        <DetailRow label="Date" value={formatDate(reservation.reservationDate)} />
        <DetailRow label="Time" value={displayRange(reservation.startTime, reservation.endTime)} />
        <DetailRow label="Requester or group" value={reservation.representativeName} />
        <DetailRow label="Contact" value={reservation.contactNo} />
        <DetailRow label="Address" value={reservation.address} />
        <DetailRow label="Purpose" value={reservation.purpose} />
        <DetailRow label="Remarks" value={reservation.remarks || "No remarks recorded."} />
      </dl>
    </ModalShell>
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

function orderStatusActions(actions) {
  return [...actions].sort((first, second) => {
    if (first.statusCode === "COMPLETED") return -1;
    if (second.statusCode === "COMPLETED") return 1;
    return 0;
  });
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Navigates the staff console to the print-slip route for the given reservation
 * using the same client-side routing pattern as the rest of the app: push the
 * URL onto history, then dispatch a synthetic `popstate` so `App.jsx`'s router
 * picks up the new path without a full page reload.
 */
function navigateToSlip(reservationId) {
  if (reservationId === null || reservationId === undefined) return;
  if (typeof window === "undefined") return;
  const target = `/reservations/${reservationId}/slip`;
  window.history.pushState({}, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function buildStatusDialog(reservation, action) {
  const actionLabel = STATUS_LABELS[action.statusCode] || action.statusCode;

  return {
    reservation,
    statusCode: action.statusCode,
    title: `${action.label}?`,
    body: `This will update reservation #${reservation.reservationId} for ${reservation.representativeName} to ${actionLabel}.`,
    confirmLabel: action.confirmLabel,
    danger: action.danger
  };
}
