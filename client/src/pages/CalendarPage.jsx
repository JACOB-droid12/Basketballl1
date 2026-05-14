import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

export function CalendarPage() {
  const [date, setDate] = useState(getManilaDate);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let active = true;

    setState({ loading: true, data: null, error: "" });
    apiRequest(`/api/schedule?date=${encodeURIComponent(date)}`)
      .then((data) => {
        if (!active) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, data: null, error: error.message });
      });

    return () => {
      active = false;
    };
  }, [date]);

  if (state.loading) return <LoadingState label="Loading weekly calendar..." />;

  const days = Array.isArray(state.data?.days) ? state.data.days : [];
  const rows = Array.isArray(state.data?.rows) ? state.data.rows : [];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Calendar</p>
          <h1>Weekly schedule</h1>
          <p className="page-subtitle">Tingnan ang available and reserved slots.</p>
        </div>
        <label className="date-field">
          <span>Schedule date</span>
          <input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      {state.error ? (
        <div className="alert error" role="alert">{state.error}</div>
      ) : (
        <div className="calendar-table">
          <div className="calendar-header" style={{ gridTemplateColumns: `130px repeat(${days.length}, minmax(120px, 1fr))` }}>
            <strong>Time</strong>
            {days.map((day) => (
              <strong key={day.date}>
                {day.name}
                <small>{day.date}</small>
              </strong>
            ))}
          </div>
          {rows.map((row, rowIndex) => {
            const safeRow = row || {};
            const cells = Array.isArray(safeRow.cells) ? safeRow.cells : [];

            return (
              <div className="calendar-row" style={{ gridTemplateColumns: `130px repeat(${cells.length}, minmax(120px, 1fr))` }} key={safeRow.slotId || rowIndex}>
                <strong>
                  {displayTime(safeRow.startTime)}
                  <small>{displayTime(safeRow.endTime)}</small>
                </strong>
                {cells.map((cell, index) => {
                  const safeCell = cell || {};

                  return (
                    <div
                      key={`${safeRow.slotId || rowIndex}-${days[index]?.date || index}-${safeCell.slotId || index}-${safeCell.reservation?.reservationId || "empty"}`}
                      className={`calendar-cell status-${String(safeCell.statusCode || "AVAILABLE").toLowerCase()}`}
                    >
                      <StatusBadge statusCode={safeCell.statusCode} />
                      {safeCell.reservation && <span>{safeCell.reservation.representativeName}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function displayTime(time) {
  return time ? formatTime(time) : "";
}

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
