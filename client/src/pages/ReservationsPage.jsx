import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime, STATUS_LABELS } from "../api/mappers.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { buildStatusDialog, ReservationDetailDrawer } from "../components/ReservationDetailDrawer.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUS_OPTIONS = ["all", "RESERVED", "MISSED", "CANCELLED", "COMPLETED"];

export function ReservationsPage({ onNavigate, initialReservationId = null }) {
  const initialSelectedId = parseReservationId(initialReservationId);
  const [state, setState] = useState({ loading: true, reservations: [], error: "" });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadReservations(initialSelectedId);
  }, [initialSelectedId]);

  const reservations = state.reservations;
  const counts = useMemo(() => buildStatusCounts(reservations), [reservations]);
  const filteredReservations = useMemo(() => {
    return filterReservations(reservations, query, status);
  }, [query, reservations, status]);

  const selectedReservation = useMemo(() => {
    if (!selectedId) return null;
    return reservations.find((reservation) => reservation.reservationId === selectedId) || null;
  }, [reservations, selectedId]);

  async function loadReservations(nextSelectedId = selectedId) {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await apiRequest("/api/reservations");
      const nextReservations = Array.isArray(data.reservations) ? data.reservations : [];
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
      await loadReservations(data.reservation?.reservationId || action.reservation.reservationId);
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
      <div className="page-header page-head staff-page-head">
        <div>
          <h1 className="page-title">All Bookings</h1>
          <div className="page-sub">Search any reservation, past or upcoming.</div>
          <div className="page-sub-fil">Lahat ng reserbasyon, nakaraan at paparating.</div>
        </div>
        <div className="button-row bookings-actions">
          <a className="btn btn-light btn-big" href="/reservations/export.csv">Export CSV</a>
          <button className="btn btn-light btn-big print-hidden" type="button" onClick={() => window.print()}>
            Print
          </button>
          <button className="btn btn-primary btn-big" type="button" onClick={() => onNavigate("/reservations/new")}>
            New Reservation
          </button>
        </div>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {actionError && <div className="alert error" role="alert">{actionError}</div>}

      {!state.error && reservations.length === 0 ? (
        <EmptyState
          title="No reservations yet"
          body="Create the first walk-in reservation record."
          action={<button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>}
        />
      ) : (
        !state.error && (
          <div className="card staff-bookings-card">
            <div className="bookings-toolbar">
              <label className="search-input" aria-label="Search bookings">
                <span className="search-mark">⌕</span>
                <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, purpose, phone, or ID" />
              </label>
              <div className="filter-tabs" role="tablist" aria-label="Reservation status filter">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-tab ${status === option ? "on" : ""}`}
                    onClick={() => setStatus(option)}
                    role="tab"
                    aria-selected={status === option}
                  >
                    {option === "all" ? "All" : STATUS_LABELS[option]}
                    <span>({counts[option] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <EmptyState title="No matching bookings" body="Try a different search term or status filter." />
            ) : (
              <div className="booking-card-list">
                {filteredReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.reservationId}
                    reservation={reservation}
                    selected={reservation.reservationId === selectedId}
                    onOpen={() => openReservation(reservation)}
                  />
                ))}
              </div>
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

function ReservationCard({ reservation, selected, onOpen }) {
  return (
    <button
      className={`booking-card ${selected ? "selected" : ""}`}
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
    >
      <div className="booking-card-time">
        <strong>{displayRange(reservation.startTime, reservation.endTime)}</strong>
        <span>{formatDate(reservation.reservationDate)}</span>
      </div>
      <div className="booking-card-main">
        <strong>{reservation.representativeName}</strong>
        <span>{reservation.purpose}</span>
        <small>{reservation.contactNo} · #{reservation.reservationId}</small>
      </div>
      <StatusBadge statusCode={reservation.statusCode} />
    </button>
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

function filterReservations(reservations, query, status) {
  const needle = query.trim().toLowerCase();

  return reservations
    .filter((reservation) => {
      const matchesStatus = status === "all" || reservation.statusCode === status;
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

      return matchesStatus && (!needle || searchable.includes(needle));
    })
    .sort((left, right) => {
      const dateCompare = String(right.reservationDate || "").localeCompare(String(left.reservationDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(left.startTime || "").localeCompare(String(right.startTime || ""));
    });
}

function buildStatusCounts(reservations) {
  return reservations.reduce((counts, reservation) => {
    counts.all += 1;
    counts[reservation.statusCode] = (counts[reservation.statusCode] || 0) + 1;
    return counts;
  }, { all: 0 });
}
