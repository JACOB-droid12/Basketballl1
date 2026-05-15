import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
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

  if (state.loading) return <LoadingState label="Loading today's court schedule..." />;
  if (state.error) return <div className="alert error" role="alert">{state.error}</div>;

  const todaySchedule = Array.isArray(state.data?.todaySchedule) ? state.data.todaySchedule.filter(Boolean) : [];
  const summary = state.data?.summary || {};
  const hasScheduleSlots = todaySchedule.length > 0;
  const bookedSlots = todaySchedule.filter((slot) => slot?.reservation);
  const todayLabel = formatDate(summary.today);
  const nearestAvailable = state.data?.nearestAvailableSlot;

  return (
    <section className="page home-page">
      <div className="page-header home-header">
        <div>
          <p className="page-kicker">Home · {todayLabel || "Today"}</p>
          <h1>Today at the court</h1>
          <p className="page-subtitle">Ngayong araw na schedule, reserved bookings, and open court times from the live system.</p>
        </div>
        <button className="btn btn-primary btn-big home-action" type="button" onClick={() => onNavigate("/reservations/new")}>
          New Reservation
        </button>
      </div>

      <div className="home-hero">
        <div className="hero-card">
          <p className="eyebrow">Court status</p>
          <h2>{todayLabel || "Today's schedule"}</h2>
          <div className="hero-stat">
            <strong>{summary.reservedCount ?? 0}</strong>
            <span>reserved booking{summary.reservedCount === 1 ? "" : "s"} today</span>
          </div>
          <p className="hero-note">
            {hasScheduleSlots ? `${summary.availableCount ?? 0} slot${summary.availableCount === 1 ? "" : "s"} still available for staff encoding.` : "No schedule slots were returned for today."}
          </p>
        </div>
        <div className="quick-actions">
          <button className="quick-action primary" type="button" onClick={() => onNavigate("/reservations/new")}>
            <span>New Reservation</span>
            <small>Encode a walk-in request</small>
          </button>
          <button className="quick-action" type="button" onClick={() => onNavigate("/schedule")}>
            <span>Open Schedule</span>
            <small>Check the full calendar</small>
          </button>
        </div>
      </div>

      <div className="stats-grid home-stats">
        <Stat label="Reserved today" helper="Naka-book ngayong araw" value={summary.reservedCount ?? 0} />
        <Stat label="Available slots" helper="Puwedeng i-book" value={summary.availableCount ?? 0} />
        <Stat label="Did not show up" helper="Marked missed today" value={summary.missedCount ?? 0} />
      </div>

      {nearestAvailable ? (
        <div className="info-banner">
          <strong>Nearest available:</strong> {formatNearestSlot(nearestAvailable)}
        </div>
      ) : (
        <div className="info-banner">
          <strong>No available slot found.</strong> Check the schedule before accepting a new request.
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Today's schedule</h2>
            <span>Live slots from the backend schedule.</span>
          </div>
          <span>{bookedSlots.length} booking{bookedSlots.length === 1 ? "" : "s"}</span>
        </div>
        {hasScheduleSlots ? (
          <div className="booking-list">
            {todaySchedule.map((slot, index) => {
              const reservation = slot.reservation;
              const slotKey = slot.slotId ?? `${slot.startTime ?? "slot"}-${slot.endTime ?? index}`;

              return (
                <div key={slotKey} className="booking-row">
                  <strong>{displayRange(slot.startTime, slot.endTime)}</strong>
                  {reservation ? (
                    <span>
                      {reservation.representativeName || "Reserved"}
                      <small>{reservation.purpose || "No purpose listed"}</small>
                    </span>
                  ) : (
                    <span>
                      Available
                      <small>Pwede pang i-reserve</small>
                    </span>
                  )}
                  <StatusBadge statusCode={slot.statusCode || reservation?.statusCode || "AVAILABLE"} />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No schedule slots found."
            body="The dashboard did not receive court time slots for today. Check the local schedule setup before encoding bookings."
          />
        )}
      </div>

      {hasScheduleSlots && bookedSlots.length === 0 && (
        <EmptyState
          title="No bookings yet today."
          body="All returned court slots are currently open. Staff can start by creating a new reservation."
          action={<button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>}
        />
      )}
    </section>
  );
}

function Stat({ label, helper, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatNearestSlot(slot) {
  const date = formatDate(slot.date);
  const range = slot.name || displayRange(slot.startTime, slot.endTime);
  return date ? `${date}, ${range}` : range;
}
