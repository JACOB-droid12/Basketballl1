import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

export function DashboardPage({ onNavigate }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let active = true;

    apiRequest("/api/dashboard")
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
  }, []);

  if (state.loading) return <LoadingState label="Loading today's schedule..." />;
  if (state.error) return <div className="alert error">{state.error}</div>;

  const todaySchedule = state.data?.todaySchedule || [];
  const summary = state.data?.summary || {};
  const hasScheduleSlots = todaySchedule.length > 0;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Home</p>
          <h1>Today at the court</h1>
          <p className="page-subtitle">Ngayong araw, court schedule and available time slots.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>
          New Reservation
        </button>
      </div>

      <div className="stats-grid">
        <Stat label="Reserved today" value={summary.reservedCount ?? 0} />
        <Stat label="Available slots" value={summary.availableCount ?? 0} />
        <Stat label="Missed today" value={summary.missedCount ?? 0} />
      </div>

      {state.data?.nearestAvailableSlot && (
        <div className="info-banner">
          Nearest available: {state.data.nearestAvailableSlot.name}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Today's schedule</h2>
          <span>Click All Bookings to manage reservation records.</span>
        </div>
        {hasScheduleSlots ? (
          <div className="booking-list">
            {todaySchedule.map((slot) => (
              <div key={slot.slotId} className="booking-row">
                <strong>{displayRange(slot.startTime, slot.endTime)}</strong>
                {slot.reservation ? (
                  <span>
                    {slot.reservation.representativeName}
                    <small>{slot.reservation.purpose}</small>
                  </span>
                ) : (
                  <span className="muted">Available</span>
                )}
                <StatusBadge statusCode={slot.statusCode} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No schedule slots found." body="No court schedule slots were returned for today." />
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}
