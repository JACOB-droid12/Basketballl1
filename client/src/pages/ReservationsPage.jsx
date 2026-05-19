import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime, STATUS_LABELS } from "../api/mappers.js";
import { formatReferenceNo, matchesReferenceNo } from "../api/referenceNo.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { CsvExportButton } from "../components/CsvExportButton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icon } from "../components/Icon.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { buildStatusDialog, ReservationDetailDrawer } from "../components/ReservationDetailDrawer.jsx";
import { StaffPageHeader } from "../components/StaffPageHeader.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const SCOPE_OPTIONS = ["all", "attention", "past"];
const STATUS_FILTER_OPTIONS = [
  { value: "any", label: "Any status" },
  { value: "RESERVED", label: "Reserved" },
  { value: "MISSED", label: "Did not show up" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" }
];

export function ReservationsPage({ onNavigate, initialReservationId = null }) {
  const initialSelectedId = parseReservationId(initialReservationId);
  const [state, setState] = useState({ loading: true, reservations: [], error: "" });
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [statusFilter, setStatusFilter] = useState("any");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [todayKey, setTodayKey] = useState(getManilaDateKey);
  const [statusToast, setStatusToast] = useState(null);

  useEffect(() => {
    loadReservations(initialSelectedId);
  }, [initialSelectedId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTodayKey(getManilaDateKey()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const reservations = state.reservations;
  const attentionReservations = useMemo(() => {
    return reservations.filter((reservation) => isAttentionReservation(reservation, todayKey));
  }, [reservations, todayKey]);
  const counts = useMemo(() => buildScopeCounts(reservations, todayKey), [reservations, todayKey]);
  const filteredReservations = useMemo(() => {
    return filterReservations(reservations, query, scope, statusFilter, todayKey);
  }, [query, reservations, scope, statusFilter, todayKey]);

  const selectedReservation = useMemo(() => {
    if (!selectedId) return null;
    return reservations.find((reservation) => reservation.reservationId === selectedId) || null;
  }, [reservations, selectedId]);

  async function loadReservations(nextSelectedId = selectedId) {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await apiRequest("/api/reservations");
      const nextReservations = Array.isArray(data.reservations) ? data.reservations : [];
      setTodayKey(getManilaDateKey());
      setState({ loading: false, reservations: nextReservations, error: "" });

      if (nextSelectedId && nextReservations.some((reservation) => reservation.reservationId === nextSelectedId)) {
        setSelectedId(nextSelectedId);
      } else {
        setSelectedId(null);
      }
    } catch (error) {
      setState({ loading: false, reservations: [], error: error.message });
    }
  }

  async function updateStatus() {
    if (!dialog) return;

    const action = dialog;
    setDialog(null);
    setBusy(true);
    setActionError("");

    try {
      const data = await apiRequest(`/api/reservations/${action.reservation.reservationId}/status`, {
        method: "POST",
        body: JSON.stringify({ statusCode: action.statusCode })
      });

      const updated = data.reservation;
      if (updated?.reservationId) {
        setState((current) => ({
          ...current,
          reservations: current.reservations.map((reservation) =>
            reservation.reservationId === updated.reservationId ? updated : reservation
          )
        }));
        setSelectedId(updated.reservationId);
        setTodayKey(getManilaDateKey());
        setStatusToast({
          message: `Status changed to ${STATUS_LABELS[updated.statusCode] || updated.statusCode}.`,
          reservationId: updated.reservationId
        });
      } else {
        await loadReservations(action.reservation.reservationId);
        setStatusToast({
          message: `Status changed to ${STATUS_LABELS[action.statusCode] || action.statusCode}.`,
          reservationId: action.reservation.reservationId
        });
      }
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function openReservation(reservation) {
    setSelectedId(reservation.reservationId);
    setActionError("");
  }

  function closeReservation() {
    setSelectedId(null);
    if (initialSelectedId) onNavigate("/reservations");
  }

  if (state.loading) return <LoadingState label="Loading reservations..." />;

  return (
    <section className="page staff-bookings-page">
      <StaffPageHeader
        title="All Bookings"
        subtitle="Search any reservation, past or upcoming."
        filipino="Lahat ng reserbasyon, nakaraan at paparating."
        actions={
        <div className="button-row bookings-actions">
          <CsvExportButton
            url="/reservations/export.csv"
            label="Export all reservations (CSV)"
            className="btn btn-light btn-big"
          />
          <button className="btn btn-primary btn-big" type="button" onClick={() => onNavigate("/reservations/new")}>
            New Reservation
          </button>
        </div>
        }
      />

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {actionError && <div className="alert error" role="alert">{actionError}</div>}
      {statusToast && (
        <div className="alert success status-toast" role="status" aria-live="polite" aria-atomic="true">
          <span>{statusToast.message}</span>
          <button
            className="btn btn-light btn-small"
            type="button"
            onClick={() => {
              setStatusToast(null);
              setSelectedId(statusToast.reservationId);
            }}
          >
            View record
          </button>
          <button
            className="btn btn-light btn-small btn-icon"
            type="button"
            onClick={() => setStatusToast(null)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {!state.error && reservations.length === 0 ? (
        <EmptyState
          title="No reservations yet"
          body="Create the first walk-in reservation record."
          action={<button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>}
        />
      ) : (
        !state.error && (
          <div className="card staff-bookings-card">
            <section className="attention-panel" aria-labelledby="attention-title">
              <div>
                <p className="page-kicker">Needs attention</p>
                <h2 id="attention-title">Records staff may need to check today</h2>
                <p>
                  Missed or cancelled bookings stay visible here. Today's reserved bookings are also listed so staff can mark them done or missed after the scheduled time.
                </p>
              </div>
              <button
                className="attention-count"
                type="button"
                onClick={() => { setScope("attention"); setStatusFilter("any"); }}
                aria-label={`${attentionReservations.length} reservation records need staff attention`}
              >
                <strong>{attentionReservations.length}</strong>
                <span>Kailangang tingnan</span>
              </button>
            </section>

            <div className="bookings-toolbar">
              <label className="search-input" aria-label="Search bookings">
                <span className="search-mark"><Icon name="search" size={20} /></span>
                <input id="reservation-search" name="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, purpose, phone, ID, or reference no." />
              </label>
              <div className="filter-tabs" role="group" aria-label="Reservation scope">
                {SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-tab ${scope === option ? "on" : ""}`}
                    onClick={() => setScope(option)}
                    aria-pressed={scope === option}
                  >
                    {getScopeLabel(option)}
                    <span>({counts[option] || 0})</span>
                  </button>
                ))}
              </div>
              <label className="status-filter-select" htmlFor="reservations-status-filter">
                <span className="status-filter-label">Status</span>
                <select
                  id="reservations-status-filter"
                  name="status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {filteredReservations.length === 0 ? (
              <EmptyState title="No matching bookings" body={getEmptyMessage(scope)} />
            ) : (
              <ul className="booking-card-list" aria-label="Reservation records">
                {filteredReservations.map((reservation) => {
                  const isSelected = reservation.reservationId === selectedId;
                  return (
                    <li
                      key={reservation.reservationId}
                      className="booking-card-item"
                      aria-current={isSelected ? "true" : undefined}
                    >
                      <ReservationCard
                        reservation={reservation}
                        attentionReason={scope === "attention" ? getAttentionReason(reservation, todayKey) : ""}
                        selected={isSelected}
                        onOpen={() => openReservation(reservation)}
                        onPrintSlip={() => onNavigate(`/reservations/${reservation.reservationId}/slip`)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )
      )}

      <ReservationDetailDrawer
        reservation={selectedReservation}
        busy={busy}
        onClose={closeReservation}
        onEdit={() => selectedReservation && onNavigate(`/reservations/${selectedReservation.reservationId}/edit`)}
        onRequestStatus={(action) => selectedReservation && setDialog(buildStatusDialog(selectedReservation, action))}
        suspendEscape={Boolean(dialog)}
      />

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          body={dialog.body}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          onConfirm={updateStatus}
          onCancel={() => setDialog(null)}
          busy={busy}
        />
      )}
    </section>
  );
}

function ReservationCard({ reservation, selected, onOpen, onPrintSlip, attentionReason = "" }) {
  // The card is a semantic <article> with no click handler, no
  // role="button", and no aria-pressed. Two sibling <button> actions
  // (Open record / Print slip) live in the body. The attentionReason
  // tooltip moves to the Open record button via `title`. Selected
  // styling is driven by the parent <li>'s `aria-current` plus the
  // existing `.selected` class on this article (UI-AUD-007, Req 6.2-6.5).
  const reservationLabel = reservation.referenceNo || reservation.reservationId;
  return (
    <article
      className={`booking-card ${selected ? "selected" : ""} ${attentionReason ? "needs-attention" : ""}`}
    >
      <div className="booking-card-time">
        <strong>{displayRange(reservation.startTime, reservation.endTime)}</strong>
        <span>{formatDate(reservation.reservationDate)}</span>
      </div>
      <div className="booking-card-main">
        <strong>{reservation.representativeName}</strong>
        <span>{reservation.purpose}</span>
        <small>{reservation.contactNo} · {formatReferenceNo(reservation.referenceNo)}</small>
      </div>
      <div className="booking-card-meta">
        <StatusBadge statusCode={reservation.statusCode} />
        {attentionReason && <span className="attention-reason">{attentionReason}</span>}
        <div className="booking-card-actions">
          <button
            className="btn btn-light btn-small"
            type="button"
            onClick={onOpen}
            title={attentionReason || undefined}
            aria-label={`Open reservation ${reservationLabel}`}
          >
            {selected ? "Viewing" : "Open record"}
          </button>
          <button
            className="btn btn-light btn-small"
            type="button"
            onClick={onPrintSlip}
            aria-label={`Print slip for ${reservationLabel}`}
          >
            Print slip
          </button>
        </div>
      </div>
    </article>
  );
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function parseReservationId(value) {
  const text = String(value || "").trim();
  return /^[1-9]\d*$/.test(text) ? Number(text) : null;
}

function filterReservations(reservations, query, scope, statusFilter, todayKey) {
  const needle = query.trim().toLowerCase();

  return reservations
    .filter((reservation) => {
      const matchesScope = scope === "all"
        || (scope === "attention" && isAttentionReservation(reservation, todayKey))
        || (scope === "past" && isPastReservation(reservation, todayKey));
      const matchesStatus = statusFilter === "any" || reservation.statusCode === statusFilter;
      const searchable = [
        reservation.reservationId,
        reservation.representativeName,
        reservation.contactNo,
        reservation.address,
        reservation.purpose,
        reservation.reservationDate,
        reservation.startTime,
        reservation.endTime,
        STATUS_LABELS[reservation.statusCode] || reservation.statusCode
      ].join(" ").toLowerCase();

      const matchesSearch = !needle
        || searchable.includes(needle)
        || matchesReferenceNo(reservation, query);

      return matchesScope && matchesStatus && matchesSearch;
    })
    .sort((left, right) => {
      const dateCompare = String(right.reservationDate || "").localeCompare(String(left.reservationDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(left.startTime || "").localeCompare(String(right.startTime || ""));
    });
}

function buildScopeCounts(reservations, todayKey) {
  return reservations.reduce((counts, reservation) => {
    counts.all += 1;
    if (isAttentionReservation(reservation, todayKey)) counts.attention += 1;
    if (isPastReservation(reservation, todayKey)) counts.past += 1;
    return counts;
  }, { all: 0, attention: 0, past: 0 });
}

function getScopeLabel(option) {
  if (option === "all") return "All";
  if (option === "attention") return "Needs attention";
  if (option === "past") return "Past";
  return option;
}

function getEmptyMessage(scope) {
  if (scope === "attention") {
    return "No missed, cancelled, or today's reserved bookings match this search.";
  }
  if (scope === "past") {
    return "No past bookings match this search. Try widening the date or status filter.";
  }

  return "Try a different search term or status filter.";
}

function isPastReservation(reservation, todayKey) {
  if (!reservation || !reservation.reservationDate) return false;
  return String(reservation.reservationDate) < todayKey;
}

function isAttentionReservation(reservation, todayKey) {
  if (!reservation) return false;
  if (reservation.statusCode === "MISSED" || reservation.statusCode === "CANCELLED") return true;
  return reservation.statusCode === "RESERVED" && reservation.reservationDate === todayKey;
}

function getAttentionReason(reservation, todayKey) {
  if (reservation.statusCode === "MISSED") return "Marked missed - review if staff need follow-up.";
  if (reservation.statusCode === "CANCELLED") return "Cancelled booking - keep visible for desk questions.";
  if (reservation.statusCode === "RESERVED" && reservation.reservationDate === todayKey) {
    return "Today reserved - mark done or missed when finished.";
  }

  return "";
}

function getManilaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
