import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { Field } from "../components/Field.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StaffPageHeader } from "../components/StaffPageHeader.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const LOOKUP_OPTIONS = [
  { value: "contactNumber", label: "Contact number", filipino: "Numero ng telepono" },
  { value: "name", label: "Name or group", filipino: "Pangalan o grupo" }
];

/**
 * Reservation history lookup page.
 *
 * Provides a search form that looks up a resident's reservation history
 * by `contactNumber` or `name` against
 * `GET /api/reservations/history?contactNumber=...` /
 * `GET /api/reservations/history?name=...`.
 *
 * On success the page renders the backend `summary` counts and lists
 * the `pastReservations` and `upcomingReservations` arrays in a single
 * tabbed card (default tab favours whichever side has rows). Each row
 * is clickable and routes to `/reservations/:id` so the staff can open
 * the detail drawer in one click instead of hand-copying a reference
 * number to All Bookings.
 *
 * When both lists are empty an `EmptyState` reading "No records found
 * for this lookup" is shown. On `4xx`/`5xx` the backend message is
 * surfaced in an alert and no placeholder counts are rendered. On a
 * network failure the standard offline copy is rendered.
 *
 * Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5, 17.1, 17.2, 18.1
 */
export function ReservationHistoryPage({ onNavigate } = {}) {
  const [lookupType, setLookupType] = useState("contactNumber");
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [state, setState] = useState({
    loading: false,
    submitted: false,
    data: null,
    error: ""
  });
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = inputValue.trim();
    if (!trimmed) {
      const message = lookupType === "contactNumber"
        ? "Enter a contact number to look up."
        : "Enter a name or group to look up.";
      setValidationError(message);
      // Move focus back to the field so a keyboard-only flow does not
      // need to Shift+Tab off the Submit button.
      if (inputRef.current) {
        try {
          inputRef.current.focus();
        } catch (_focusError) {
          // Some test renderers do not implement focus(); ignore.
        }
      }
      return;
    }

    setValidationError("");
    setState({ loading: true, submitted: true, data: null, error: "" });

    const path = `/api/reservations/history?${lookupType}=${encodeURIComponent(trimmed)}`;

    try {
      const data = await apiRequest(path);
      setState({ loading: false, submitted: true, data, error: "" });
    } catch (error) {
      const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
      setState({ loading: false, submitted: true, data: null, error: message });
    }
  }

  function clearLookup() {
    setLookupType("contactNumber");
    setInputValue("");
    setValidationError("");
    setState({ loading: false, submitted: false, data: null, error: "" });
  }

  function handleLookupTypeChange(event) {
    const next = event.target.value;
    setLookupType(next);
    // Switching the lookup type after the user has typed leaves stale
    // input behind (e.g., a phone number in the name search). Wipe it
    // so the visible field always matches the placeholder.
    if (inputValue) setInputValue("");
    setValidationError("");
  }

  const data = state.data;
  const summary = data?.summary || null;
  const pastReservations = Array.isArray(data?.pastReservations) ? data.pastReservations : [];
  const upcomingReservations = Array.isArray(data?.upcomingReservations) ? data.upcomingReservations : [];
  const bothListsEmpty = pastReservations.length === 0 && upcomingReservations.length === 0;

  return (
    <section className="page">
      <StaffPageHeader
        kicker="Reservations"
        title="Reservation history"
        subtitle="Look up a resident's past, upcoming, missed, and cancelled reservations. "
        filipino="Para sa mga tanong sa counter."
        filipinoInline
      />

      <form className="card filter-card staff-filter-card" onSubmit={handleSubmit}>
        <div className="staff-filter-head">
          <div>
            <h2>Find a resident's reservations</h2>
            <p>Search by contact number for a single resident, or by name for a group.</p>
          </div>
        </div>

        <div className="form-grid">
          <Field
            id="reservation-history-lookup-type"
            label="Look up by"
            filipino="Hanapin sa pamamagitan ng"
          >
            <select
              name="lookupType"
              value={lookupType}
              onChange={handleLookupTypeChange}
            >
              {LOOKUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field
            id="reservation-history-search"
            label={lookupType === "contactNumber" ? "Contact number" : "Name or group"}
            filipino={lookupType === "contactNumber" ? "Numero ng telepono" : "Pangalan o grupo"}
            hint={lookupType === "contactNumber"
              ? "Enter the resident's full contact number."
              : "Enter the representative or group name."}
            error={validationError || undefined}
            wide
          >
            <input
              name="lookupValue"
              type={lookupType === "contactNumber" ? "tel" : "text"}
              autoComplete="off"
              placeholder={lookupType === "contactNumber" ? "09171234567" : "Team Alpha"}
              value={inputValue}
              ref={inputRef}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (validationError) setValidationError("");
              }}
            />
          </Field>
        </div>

        <div className="button-row filter-actions">
          <button className="btn btn-primary" type="submit" disabled={state.loading}>
            {state.loading ? "Looking up..." : "Look up history"}
          </button>
          <button
            className="btn btn-light"
            type="button"
            onClick={clearLookup}
            disabled={state.loading || (!state.submitted && !inputValue)}
          >
            Clear
          </button>
        </div>
      </form>

      {state.error && (
        <div className="alert error" role="alert">{state.error}</div>
      )}

      {state.loading && <LoadingState label="Looking up reservation history..." />}

      {!state.loading && !state.error && state.submitted && data && (
        <>
          {summary && <HistorySummary summary={summary} />}

          {bothListsEmpty ? (
            <EmptyState
              title="No records found for this lookup"
              body="Try a different contact number or name to find more reservations."
            />
          ) : (
            <ReservationHistoryTabs
              upcomingReservations={upcomingReservations}
              pastReservations={pastReservations}
              onNavigate={onNavigate}
            />
          )}
        </>
      )}
    </section>
  );
}

function HistorySummary({ summary }) {
  // Hero number takes the lead. It answers the most common counter
  // question ("how many times has this resident booked?") in one
  // glance. The supporting stats sit underneath in a tight grid;
  // missed + cancelled + completed read together as the resident's
  // track record, active + last-reservation read together as the
  // current state.
  const totalReservations = Number(summary.totalReservations || 0);
  const lastReservationLabel = summary.lastReservationDate
    ? formatDate(summary.lastReservationDate)
    : "None on record";

  return (
    <div className="card padded-card history-summary-card">
      <div className="history-summary-hero">
        <span className="history-summary-eyebrow">Court visits on record</span>
        <strong className="history-summary-number">{totalReservations}</strong>
        <span className="history-summary-sub">
          {totalReservations === 1 ? "reservation" : "reservations"} so far
        </span>
      </div>
      <dl className="history-summary-stats">
        <SummaryStat label="Completed" value={summary.completedCount} />
        <SummaryStat label="Did not show up" value={summary.missedCount} />
        <SummaryStat label="Cancelled" value={summary.cancelledCount} />
        <SummaryStat label="Active now" value={summary.activeReservationCount} />
        <SummaryStat
          label="Last reservation"
          value={lastReservationLabel}
          variant="serif"
          wide
        />
      </dl>
    </div>
  );
}

function SummaryStat({ label, value, wide, variant }) {
  // `variant="serif"` gives the value the same 22px/700 visual weight as
  // its sibling counts but in Instrument Serif so a date string keeps
  // its own family contrast and does not read as de-emphasised.
  const className = [
    "history-summary-stat",
    wide ? "is-wide" : "",
    variant === "serif" ? "is-serif" : ""
  ].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd>{value === null || value === undefined ? "" : String(value)}</dd>
    </div>
  );
}

function ReservationHistoryTabs({ upcomingReservations, pastReservations, onNavigate }) {
  // One bordered card holds both lists. Tabs at the top show counts;
  // the default tab favours whichever side actually has rows so the
  // first thing the clerk sees is the answer to the desk question.
  const TABS = [
    {
      id: "upcoming",
      label: "Upcoming",
      reservations: upcomingReservations,
      emptyTitle: "No upcoming reservations",
      emptyBody: "No upcoming reservations on record for this resident."
    },
    {
      id: "past",
      label: "Past",
      reservations: pastReservations,
      emptyTitle: "No past reservations",
      emptyBody: "No past reservations on record for this resident."
    }
  ];

  const initialTabId = upcomingReservations.length > 0
    ? "upcoming"
    : pastReservations.length > 0
      ? "past"
      : "upcoming";
  const [activeId, setActiveId] = useState(initialTabId);
  const active = TABS.find((tab) => tab.id === activeId) || TABS[0];

  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  }

  async function handleCopyReferences() {
    const references = active.reservations
      .map((reservation) => formatReferenceNo(reservation.referenceNo))
      .filter(Boolean)
      .join("\n");
    if (!references) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(references);
      }
    } catch (_clipboardError) {
      // Clipboard write can fail when the page lacks permission. We
      // intentionally do not surface a toast here — the staff will see
      // immediately whether their paste lands. A future "harden" pass
      // can add a system-wide toast queue.
    }
  }

  return (
    <div className="card padded-card history-tabs-card">
      <div className="history-tabs-toolbar">
        <div
          className="filter-tabs history-tabs"
          role="group"
          aria-label="Reservation history lists"
        >
          {TABS.map((tab) => {
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                id={`history-list-tab-${tab.id}`}
                className={`filter-tab ${selected ? "on" : ""}`}
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
                <span>({tab.reservations.length})</span>
              </button>
            );
          })}
        </div>
        <div className="button-row history-tabs-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={handleCopyReferences}
            disabled={active.reservations.length === 0}
          >
            Copy references
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={handlePrint}
          >
            Print history
          </button>
        </div>
      </div>

      <div
        id={`history-list-${active.id}`}
        aria-labelledby={`history-list-tab-${active.id}`}
        className="history-tab-panel"
      >
        {active.reservations.length === 0 ? (
          <EmptyState title={active.emptyTitle} body={active.emptyBody} />
        ) : (
          <div className="booking-card-list">
            {active.reservations.map((reservation) => (
              <ReservationHistoryRow
                key={reservation.reservationId}
                reservation={reservation}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationHistoryRow({ reservation, onNavigate }) {
  function handleOpen() {
    if (!reservation || !Number.isFinite(Number(reservation.reservationId))) return;
    const target = `/reservations/${reservation.reservationId}`;
    if (typeof onNavigate === "function") {
      onNavigate(target);
      return;
    }
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <button
      type="button"
      className="booking-card history-row"
      onClick={handleOpen}
      aria-label={`Open reservation ${formatReferenceNo(reservation.referenceNo)}`}
    >
      <div className="booking-card-time">
        <strong>{displayRange(reservation.startTime, reservation.endTime)}</strong>
        <span>{formatDate(reservation.reservationDate)}</span>
      </div>
      <div className="booking-card-main">
        <strong>{reservation.representativeName}</strong>
        <span>{reservation.purpose}</span>
        <small>{formatReferenceNo(reservation.referenceNo)}</small>
      </div>
      <div className="booking-card-meta">
        <StatusBadge statusCode={reservation.statusCode} />
      </div>
    </button>
  );
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function isNetworkError(error) {
  if (!error) return false;
  // `apiRequest` re-throws non-2xx responses with an `error.status`.
  // Network failures (offline, DNS, no JSON body) surface as a
  // `TypeError` from `fetch` with no `status` field.
  if (typeof error.status === "number") return false;
  if (error.name === "TypeError") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
