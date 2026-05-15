import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime, STATUS_LABELS } from "../api/mappers.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUS_OPTIONS = ["all", "RESERVED", "MISSED", "CANCELLED", "COMPLETED"];
const STATUS_ACTIONS = ["MISSED", "CANCELLED", "COMPLETED"];

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
  const filteredReservations = useMemo(() => {
    return filterReservations(reservations, query, status);
  }, [query, reservations, status]);

  const selectedReservation = useMemo(() => {
    if (!selectedId) return null;
    return filteredReservations.find((reservation) => reservation.reservationId === selectedId) || null;
  }, [filteredReservations, selectedId]);

  useEffect(() => {
    const selectedVisible = selectedId && filteredReservations.some((reservation) => reservation.reservationId === selectedId);
    const initialVisible = initialSelectedId && filteredReservations.some((reservation) => reservation.reservationId === initialSelectedId);

    if (!selectedId && initialVisible) {
      setSelectedId(initialSelectedId);
      return;
    }

    if (selectedId && !selectedVisible && selectedId !== initialSelectedId) {
      setSelectedId(null);
    }
  }, [filteredReservations, initialSelectedId, selectedId]);

  async function loadReservations(nextSelectedId = selectedId) {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await apiRequest("/api/reservations");
      const nextReservations = Array.isArray(data.reservations) ? data.reservations : [];
      const nextFilteredReservations = filterReservations(nextReservations, query, status);
      setState({ loading: false, reservations: nextReservations, error: "" });

      if (nextSelectedId && nextFilteredReservations.some((reservation) => reservation.reservationId === nextSelectedId)) {
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

  if (state.loading) return <LoadingState label="Loading reservations..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Reservations</p>
          <h1>All bookings</h1>
          <p className="page-subtitle">Search reservation records, open details, and update active reservation status.</p>
        </div>
        <div className="button-row">
          <a className="btn btn-light" href="/reservations/export.csv">Export CSV</a>
          <button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>
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
          <div className="content-split">
            <div className="card">
              <div className="toolbar">
                <label className="field compact">
                  <span>Search</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, contact, purpose, ID" />
                </label>
                <label className="field compact">
                  <span>Status</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "All statuses" : STATUS_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredReservations.length === 0 ? (
                <EmptyState title="No matching reservations" body="Try a different search term or status filter." />
              ) : (
                <div className="table-wrap">
                  <table className="data-table" role="grid">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Representative</th>
                        <th>Contact</th>
                        <th>Purpose</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map((reservation) => (
                        <ReservationRow
                          key={reservation.reservationId}
                          reservation={reservation}
                          selected={reservation.reservationId === selectedReservation?.reservationId}
                          onSelect={() => setSelectedId(reservation.reservationId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <ReservationDetail
              reservation={selectedReservation}
              onEdit={() => selectedReservation && onNavigate(`/reservations/${selectedReservation.reservationId}/edit`)}
              onStatusAction={(statusCode) => setDialog({ reservation: selectedReservation, statusCode })}
            />
          </div>
        )
      )}

      {dialog && (
        <ConfirmDialog
          title={`Mark as ${STATUS_LABELS[dialog.statusCode] || dialog.statusCode}?`}
          body={`This will update reservation #${dialog.reservation.reservationId} for ${dialog.reservation.representativeName}.`}
          confirmLabel={`Mark ${STATUS_LABELS[dialog.statusCode] || dialog.statusCode}`}
          danger={dialog.statusCode === "CANCELLED" || dialog.statusCode === "MISSED"}
          onConfirm={updateStatus}
          onCancel={() => setDialog(null)}
          busy={busy}
        />
      )}
    </section>
  );
}

function ReservationRow({ reservation, selected, onSelect }) {
  return (
    <tr
      className={selected ? "selected" : ""}
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <td>#{reservation.reservationId}</td>
      <td>{reservation.representativeName}</td>
      <td>{reservation.contactNo}</td>
      <td>{reservation.purpose}</td>
      <td>{formatDate(reservation.reservationDate)}</td>
      <td>{displayRange(reservation.startTime, reservation.endTime)}</td>
      <td><StatusBadge statusCode={reservation.statusCode} /></td>
    </tr>
  );
}

function ReservationDetail({ reservation, onEdit, onStatusAction }) {
  if (!reservation) {
    return (
      <aside className="detail-panel">
        <EmptyState title="Select a reservation" body="Choose a row to view details and actions." />
      </aside>
    );
  }

  const canUpdateStatus = reservation.statusCode === "RESERVED";

  return (
    <aside className="detail-panel" aria-label="Reservation details">
      <div className="detail-head">
        <div>
          <p className="page-kicker">Reservation #{reservation.reservationId}</p>
          <h2>{reservation.representativeName}</h2>
        </div>
        <StatusBadge statusCode={reservation.statusCode} />
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Date</dt>
          <dd>{formatDate(reservation.reservationDate)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{displayRange(reservation.startTime, reservation.endTime)}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>{reservation.contactNo}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{reservation.address}</dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>{reservation.purpose}</dd>
        </div>
        <div>
          <dt>Remarks</dt>
          <dd>{reservation.remarks || "No remarks recorded."}</dd>
        </div>
      </dl>

      <div className="button-row">
        <button className="btn btn-light" type="button" onClick={onEdit}>
          Edit
        </button>
        {canUpdateStatus && STATUS_ACTIONS.map((statusCode) => (
          <button
            className={`btn ${statusCode === "CANCELLED" || statusCode === "MISSED" ? "btn-danger" : "btn-primary"}`}
            type="button"
            key={statusCode}
            onClick={() => onStatusAction(statusCode)}
          >
            {STATUS_LABELS[statusCode]}
          </button>
        ))}
      </div>
    </aside>
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

  return reservations.filter((reservation) => {
    const matchesStatus = status === "all" || reservation.statusCode === status;
    const searchable = [
      reservation.reservationId,
      reservation.representativeName,
      reservation.contactNo,
      reservation.purpose,
      reservation.reservationDate,
      reservation.startTime,
      reservation.endTime,
      STATUS_LABELS[reservation.statusCode] || reservation.statusCode
    ].join(" ").toLowerCase();

    return matchesStatus && (!needle || searchable.includes(needle));
  });
}
