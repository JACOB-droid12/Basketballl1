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
  { value: "MISSED", label: "Did not show" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" }
];

const PAGE_SIZE = 20;

export function ReservationsPage({ onNavigate, initialReservationId = null }) {
  const initialSelectedId = parseReservationId(initialReservationId);
  const [state, setState] = useState({ loading: true, reservations: [], error: "" });
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [statusFilter, setStatusFilter] = useState("any");
  const [dateFilter, setDateFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [todayKey, setTodayKey] = useState(getManilaDateKey);
  const [statusToast, setStatusToast] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dismissedAttentionIds, setDismissedAttentionIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem("dismissed-attention-ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

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
  const activeAttentionCount = useMemo(() => {
    return attentionReservations.filter((r) => !dismissedAttentionIds.has(r.reservationId)).length;
  }, [attentionReservations, dismissedAttentionIds]);
  const counts = useMemo(() => {
    const baseCounts = buildScopeCounts(reservations, todayKey);
    // Override attention count to reflect dismissed items
    baseCounts.attention = activeAttentionCount;
    return baseCounts;
  }, [reservations, todayKey, activeAttentionCount]);
  const filteredReservations = useMemo(() => {
    let filtered = filterReservations(reservations, query, scope, statusFilter, todayKey);
    if (dateFilter) {
      filtered = filtered.filter((r) => r.reservationDate === dateFilter);
    }
    if (scope === "attention") {
      filtered = filtered.filter((r) => !dismissedAttentionIds.has(r.reservationId));
    }
    if (sortOrder === "oldest") {
      filtered = [...filtered].reverse();
    }
    return filtered;
  }, [query, reservations, scope, statusFilter, todayKey, dismissedAttentionIds, dateFilter, sortOrder]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, scope, statusFilter, dateFilter, sortOrder]);

  const paginatedReservations = useMemo(() => {
    return filteredReservations.slice(0, visibleCount);
  }, [filteredReservations, visibleCount]);

  const hasMore = filteredReservations.length > visibleCount;

  // Group paginated reservations by date for sticky headers
  const dateGroups = useMemo(() => {
    const groups = [];
    let currentDate = null;
    for (const reservation of paginatedReservations) {
      const dateKey = reservation.reservationDate || "unknown";
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ dateKey, label: formatDate(dateKey), isToday: dateKey === todayKey, reservations: [] });
      }
      groups[groups.length - 1].reservations.push(reservation);
    }
    return groups;
  }, [paginatedReservations, todayKey]);

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

  // Keyboard shortcuts: N = new reservation, ArrowDown/Up = navigate list, Enter = open selected
  useEffect(() => {
    function handleKeyDown(event) {
      // Don't intercept when typing in inputs
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (dialog) return;

      if (event.key === "n" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        onNavigate("/reservations/new");
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const ids = paginatedReservations.map((r) => r.reservationId);
        if (ids.length === 0) return;
        const currentIndex = selectedId ? ids.indexOf(selectedId) : -1;
        let nextIndex;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex < ids.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : ids.length - 1;
        }
        setSelectedId(ids[nextIndex]);
        return;
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        const reservation = paginatedReservations.find((r) => r.reservationId === selectedId);
        if (reservation) openReservation(reservation);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginatedReservations, selectedId, dialog, onNavigate]);

  function closeReservation() {
    setSelectedId(null);
    if (initialSelectedId) onNavigate("/reservations");
  }

  function dismissAttentionItem(reservationId) {
    setDismissedAttentionIds((prev) => {
      const next = new Set(prev);
      next.add(reservationId);
      try { sessionStorage.setItem("dismissed-attention-ids", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function clearAllDismissed() {
    setDismissedAttentionIds(new Set());
    try { sessionStorage.removeItem("dismissed-attention-ids"); } catch {}
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
            className="btn btn-light"
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
            {activeAttentionCount > 0 && (
            <section className="attention-panel" aria-labelledby="attention-title">
              <div className="attention-panel-body">
                <p className="page-kicker">Needs attention</p>
                <h2 id="attention-title">Records staff may need to check today</h2>
                <p>
                  Missed or cancelled bookings stay visible here. Today's reserved bookings are also listed so staff can mark them done or missed after the scheduled time.
                </p>
              </div>
              <div className="attention-panel-actions">
                <button
                  className="attention-count"
                  type="button"
                  onClick={() => { setScope("attention"); setStatusFilter("any"); }}
                  aria-label={`View items — ${activeAttentionCount} records that need staff attention`}
                >
                  <strong>{activeAttentionCount}</strong>
                  <span>View items</span>
                  <span className="attention-count-fil">Kailangang tingnan</span>
                </button>
                {dismissedAttentionIds.size > 0 && (
                  <button
                    className="btn btn-light btn-small"
                    type="button"
                    onClick={clearAllDismissed}
                  >
                    Restore dismissed ({dismissedAttentionIds.size})
                  </button>
                )}
              </div>
            </section>
            )}

            <div className="bookings-toolbar">
              <label className="search-input" aria-label="Search bookings">
                <span className="search-mark"><Icon name="search" size={20} /></span>
                <input id="reservation-search" name="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, purpose, phone, ID, or reference no." />
              </label>
              <button
                className={`btn btn-light btn-small sort-toggle ${sortOrder === "oldest" ? "ascending" : ""}`}
                type="button"
                onClick={() => setSortOrder((o) => o === "newest" ? "oldest" : "newest")}
                aria-label={`Sort by date: ${sortOrder === "newest" ? "newest first" : "oldest first"}`}
                title={sortOrder === "newest" ? "Newest first" : "Oldest first"}
              >
                <Icon name={sortOrder === "newest" ? "chevronDown" : "chevronUp"} size={16} />
                <span className="sort-toggle-label">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
              </button>
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
                    <span> ({counts[option] || 0})</span>
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
              <div className="date-filter-group">
                <label className="date-filter-label" htmlFor="reservations-date-filter">Date</label>
                <input
                  id="reservations-date-filter"
                  className="date-input"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  aria-label="Filter by date"
                  title="Show bookings for a specific date only"
                />
                {dateFilter && (
                  <button
                    className="btn btn-light btn-small btn-icon date-filter-clear"
                    type="button"
                    onClick={() => setDateFilter("")}
                    aria-label="Clear date filter"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <EmptyState title="No matching bookings" body={getEmptyMessage(scope)} />
            ) : (
              <>
                <ul className="booking-card-list" aria-label="Reservation records">
                  {dateGroups.map((group) => (
                    <li key={group.dateKey} className="booking-date-group" aria-label={group.label}>
                      <div className={`booking-date-header ${group.isToday ? "is-today" : ""}`}>
                        <span className="booking-date-label">{group.label}</span>
                        {group.isToday && <span className="booking-date-today-badge">Today</span>}
                        <span className="booking-date-count">{group.reservations.length} {group.reservations.length === 1 ? "booking" : "bookings"}</span>
                      </div>
                      <ul className="booking-date-list">
                        {group.reservations.map((reservation) => {
                          const isSelected = reservation.reservationId === selectedId;
                          const statusClass = reservation.statusCode === "CANCELLED" || reservation.statusCode === "MISSED"
                            ? "status-muted"
                            : reservation.reservationDate === todayKey && reservation.statusCode === "RESERVED"
                              ? "status-today"
                              : "";
                          return (
                            <li
                              key={reservation.reservationId}
                              className={`booking-card-item ${statusClass}`}
                              aria-current={isSelected ? "true" : undefined}
                            >
                              <ReservationCard
                                reservation={reservation}
                                attentionReason={scope === "attention" ? getAttentionReason(reservation, todayKey) : ""}
                                selected={isSelected}
                                onOpen={() => openReservation(reservation)}
                                onPrintSlip={() => onNavigate(`/reservations/${reservation.reservationId}/slip`)}
                                onDismiss={scope === "attention" ? () => dismissAttentionItem(reservation.reservationId) : undefined}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
                {hasMore && (
                  <div className="booking-load-more">
                    <button
                      className="btn btn-light"
                      type="button"
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    >
                      Show more ({filteredReservations.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
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

function ReservationCard({ reservation, selected, onOpen, onPrintSlip, onDismiss, attentionReason = "" }) {
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
            aria-label={`${selected ? "Viewing" : "Open record"} — ${reservationLabel}`}
          >
            {selected ? "Viewing" : "Open record"}
          </button>
          <button
            className="btn btn-light btn-small"
            type="button"
            onClick={onPrintSlip}
            aria-label={`Print slip — ${reservationLabel}`}
          >
            Print slip
          </button>
          {onDismiss && (
            <button
              className="btn btn-light btn-small btn-dismiss"
              type="button"
              onClick={onDismiss}
              aria-label={`Reviewed — ${reservationLabel}`}
            >
              Reviewed
            </button>
          )}
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
