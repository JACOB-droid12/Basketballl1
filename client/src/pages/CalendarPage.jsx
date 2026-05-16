import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatTime } from "../api/mappers.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

export function CalendarPage({ onNavigate }) {
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

  const rawDays = Array.isArray(state.data?.days) ? state.data.days : [];
  const rows = Array.isArray(state.data?.rows) ? state.data.rows : [];
  const weekDays = normalizeWeekDays(rawDays, date);
  const bookingsByDay = buildBookingsByDay(weekDays, rows);
  const weekLabel = formatWeekLabel(weekDays);
  const today = getManilaDate();

  return (
    <section className="page">
      <div className="page-header page-head staff-page-head">
        <div>
          <h1 className="page-title">Calendar</h1>
          <div className="page-sub">{state.loading ? "Weekly schedule" : weekLabel}</div>
          <div className="page-sub-fil">Tingnan ang lahat ng reserbasyon ngayong linggo.</div>
        </div>
        <button className="btn btn-primary btn-big" type="button" onClick={() => onNavigate("/reservations/new")}>
          New Reservation
        </button>
      </div>

      <div className="calendar-toolbar" aria-label="Calendar week controls">
        <div className="calendar-week-label">
          <span>Current week</span>
          <strong>{weekLabel}</strong>
        </div>
        <div className="calendar-actions">
          <button className="btn btn-light" type="button" onClick={() => setDate(addDays(date, -7))}>
            Previous week
          </button>
          <button className="btn btn-light" type="button" onClick={() => setDate(today)}>
            This week
          </button>
          <button className="btn btn-light" type="button" onClick={() => setDate(addDays(date, 7))}>
            Next week
          </button>
          <label className="date-field compact-date">
            <span>Jump to date</span>
            <input id="schedule-jump-date" name="date" className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="calendar-legend" role="note" aria-label="Calendar status legend">
        <span className="calendar-legend-label">Legend</span>
        <span className="calendar-legend-item legend-reserved"><span className="legend-swatch" aria-hidden="true" />Reserved</span>
        <span className="calendar-legend-item legend-completed"><span className="legend-swatch" aria-hidden="true" />Completed</span>
        <span className="calendar-legend-item legend-missed"><span className="legend-swatch" aria-hidden="true" />Did not show</span>
        <span className="calendar-legend-item legend-cancelled"><span className="legend-swatch" aria-hidden="true" />Cancelled</span>
      </div>

      {state.loading ? (
        <div className="calendar-state-card">
          <LoadingState label="Loading weekly calendar..." />
        </div>
      ) : state.error ? (
        <div className="alert error" role="alert">{state.error}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No schedule slots found"
          body="The calendar could not find active court hours for this week."
          action={<button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>}
        />
      ) : (
        <div className="staff-week-grid" aria-label="Weekly reservation calendar">
          {weekDays.map((day) => {
            const bookings = bookingsByDay.get(day.date) || [];
            const isToday = day.date === today;

            return (
              <article className="staff-day-card" key={day.date}>
                <header className={`staff-day-head ${isToday ? "today" : ""}`}>
                  <div>
                    <span>{day.name}{isToday ? " · Today" : ""}</span>
                    <strong>{getDayNumber(day.date)}</strong>
                  </div>
                  <small>{formatShortDate(day.date)}</small>
                </header>
                <div className="staff-day-body">
                  {bookings.length === 0 ? (
                    <div className="staff-day-empty">
                      <strong>No bookings</strong>
                    </div>
                  ) : bookings.map((booking) => (
                    <button
                      className={`staff-booking-block status-${String(booking.statusCode || "RESERVED").toLowerCase()}`}
                      type="button"
                      key={`${day.date}-${booking.reservationId}`}
                      onClick={() => onNavigate(`/reservations/${booking.reservationId}`)}
                      aria-label={`${booking.representativeName || "Reserved"}, ${displayRange(booking.startTime, booking.endTime)}, ${booking.statusCode || "RESERVED"}`}
                    >
                      <span className="staff-booking-time">{displayRange(booking.startTime, booking.endTime)}</span>
                      <span className="staff-booking-name">{booking.representativeName || "Reserved booking"}</span>
                      <span className="staff-booking-purpose">{booking.purpose || "No purpose recorded"}</span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function buildBookingsByDay(days, rows) {
  const byDay = new Map(days.map((day) => [day.date, []]));
  const seen = new Set();

  rows.forEach((row) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];

    cells.forEach((cell, index) => {
      const day = days[index];
      const reservation = cell?.reservation;

      if (!day || !reservation?.reservationId) return;

      const key = `${day.date}-${reservation.reservationId}`;
      if (seen.has(key)) return;

      seen.add(key);
      byDay.get(day.date)?.push({
        ...reservation,
        statusCode: String(reservation.statusCode || cell.statusCode || "RESERVED").toUpperCase()
      });
    });
  });

  byDay.forEach((bookings) => {
    bookings.sort((first, second) => {
      const timeCompare = String(first.startTime || "").localeCompare(String(second.startTime || ""));
      return timeCompare || Number(first.reservationId || 0) - Number(second.reservationId || 0);
    });
  });

  return byDay;
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatWeekLabel(days) {
  if (!days.length) return "";

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const firstDate = formatCalendarDate(first, { month: "long", day: "numeric" });
  const lastDate = formatCalendarDate(last, { month: "long", day: "numeric", year: "numeric" });

  return `${firstDate} - ${lastDate}`;
}

function formatShortDate(date) {
  return formatCalendarDate(date, { month: "short", day: "numeric" });
}

function formatCalendarDate(date, options) {
  if (!date) return "";
  const parsed = parseDate(date);
  if (!parsed) return String(date || "");

  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(parsed);
}

function getDayNumber(date) {
  if (!isValidDateString(date)) return "";
  const [, , day] = String(date || "").split("-");
  return Number(day) || "";
}

function normalizeWeekDays(days, anchorDate) {
  const fallbackDays = buildWeekDays(getWeekStartDate(anchorDate));
  if (!Array.isArray(days) || days.length === 0) return fallbackDays;

  return fallbackDays.map((fallbackDay, index) => {
    const day = days[index] || {};
    const safeDate = isValidDateString(day.date) ? day.date : fallbackDay.date;
    const safeName = String(day.name || "").trim() || fallbackDay.name;

    return {
      date: safeDate,
      name: safeName
    };
  });
}

function buildWeekDays(weekStartDate) {
  return Array.from({ length: 7 }, (_item, index) => {
    const date = addDays(weekStartDate, index);

    return {
      date,
      name: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
    };
  });
}

function getWeekStartDate(date) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) return getManilaDate();

  parsed.setUTCDate(parsed.getUTCDate() - parsed.getUTCDay());
  return parsed.toISOString().slice(0, 10);
}

function addDays(date, offset) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day + offset));

  if (Number.isNaN(parsed.getTime())) return getManilaDate();

  return parsed.toISOString().slice(0, 10);
}

function isValidDateString(date) {
  return Boolean(parseDate(date));
}

function parseDate(date) {
  const text = String(date || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
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
