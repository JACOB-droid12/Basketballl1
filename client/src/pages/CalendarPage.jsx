import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

export function CalendarPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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

  const days = state.data?.days || [];
  const rows = state.data?.rows || [];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Calendar</p>
          <h1>Weekly schedule</h1>
          <p className="page-subtitle">Tingnan ang available and reserved slots.</p>
        </div>
        <input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      {state.error ? (
        <div className="alert error">{state.error}</div>
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
          {rows.map((row) => (
            <div className="calendar-row" style={{ gridTemplateColumns: `130px repeat(${row.cells.length}, minmax(120px, 1fr))` }} key={row.slotId}>
              <strong>
                {displayTime(row.startTime)}
                <small>{displayTime(row.endTime)}</small>
              </strong>
              {row.cells.map((cell, index) => (
                <div
                  key={`${row.slotId}-${days[index]?.date || index}-${cell.slotId}-${cell.reservation?.reservationId || "empty"}`}
                  className={`calendar-cell status-${String(cell.statusCode || "AVAILABLE").toLowerCase()}`}
                >
                  <StatusBadge statusCode={cell.statusCode} />
                  {cell.reservation && <span>{cell.reservation.representativeName}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function displayTime(time) {
  return time ? formatTime(time) : "";
}
