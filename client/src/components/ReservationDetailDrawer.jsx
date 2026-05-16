import { useEffect, useRef } from "react";
import { formatDate, formatTime, STATUS_LABELS } from "../api/mappers.js";
import { Icon } from "./Icon.jsx";
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

export function ReservationDetailDrawer({ reservation, busy, onClose, onEdit, onRequestStatus, suspendEscape = false }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const headingRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const suspendEscapeRef = useRef(suspendEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    suspendEscapeRef.current = suspendEscape;
  }, [suspendEscape]);

  useEffect(() => {
    if (!reservation || typeof document === "undefined") return undefined;

    const previouslyFocusedElement = document.activeElement;

    const focusTimer = window.setTimeout(() => {
      const target = closeButtonRef.current || headingRef.current;
      target?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !suspendEscapeRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = getFocusableElements(drawerRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !drawerRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
    };
  }, [reservation?.reservationId]);

  if (!reservation) return null;

  const availableStatusActions = reservation.statusCode === "RESERVED" ? STATUS_ACTIONS : [];

  return (
    <div className="drawer-backdrop open" role="presentation" onClick={onClose}>
      <section
        className="reservation-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-detail-title"
        onClick={(event) => event.stopPropagation()}
        ref={drawerRef}
      >
        <div className="dialog-head">
          <div>
            <p className="page-kicker">Reservation #{reservation.reservationId}</p>
            <h2 id="reservation-detail-title" ref={headingRef} tabIndex="-1">
              {reservation.representativeName}
            </h2>
            <div className="d-sub">{reservation.purpose}</div>
          </div>
          <button
            className="dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close reservation details"
            ref={closeButtonRef}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="dialog-body">
          <div className="detail-status-line">
            <StatusBadge statusCode={reservation.statusCode} />
          </div>
          <dl className="detail-grid staff-detail-grid">
            <DetailRow label="Date" value={formatDate(reservation.reservationDate)} />
            <DetailRow label="Time" value={displayRange(reservation.startTime, reservation.endTime)} />
            <DetailRow label="Requester or group" value={reservation.representativeName} />
            <DetailRow label="Contact" value={reservation.contactNo} />
            <DetailRow label="Address" value={reservation.address} />
            <DetailRow label="Purpose" value={reservation.purpose} />
            <DetailRow label="Remarks" value={reservation.remarks || "No remarks recorded."} />
          </dl>
        </div>

        <div className="dialog-foot reservation-drawer-actions">
          <button className="btn btn-light" type="button" onClick={onEdit} disabled={busy}>
            Edit
          </button>
          {availableStatusActions.map((action) => (
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
      </section>
    </div>
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

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter((element) => {
    if (element.hasAttribute("disabled")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    if (element.tabIndex === -1 && !element.hasAttribute("tabindex")) return false;
    return element.offsetParent !== null || element === document.activeElement;
  });
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
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
