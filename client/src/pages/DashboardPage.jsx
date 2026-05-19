import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icon } from "../components/Icon.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

/**
 * Dashboard page.
 *
 * Renders today's hero, quick actions, the nearest-available banner,
 * and today's schedule list. The dashboard is the staff member's
 * natural daily starting point showing court bookings at a glance.
 * Alerts and backup status are shown on the Court Policy (Settings)
 * page to keep this surface focused on today's schedule.
 *
 * Network failures (where fetch() throws without an HTTP status) render
 * the standard office-friendly offline copy from Req. 17.1; HTTP `4xx`
 * and `5xx` responses render the backend `error` message verbatim from
 * the existing `apiRequest` client (Req. 17.2). The page never throws
 * an uncaught render exception or shows a blank panel for the new
 * request paths (Req. 17.5).
 */
export function DashboardPage({ onNavigate, user }) {
  const [dashboardState, setDashboardState] = useState({ loading: true, data: null, error: "" });


  useEffect(() => {
    let active = true;

    apiRequest("/api/dashboard")
      .then((data) => {
        if (!active) return;
        setDashboardState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setDashboardState({ loading: false, data: null, error: message });
      });

    return () => {
      active = false;
    };
  }, []);



  if (dashboardState.loading) {
    return <LoadingState label="Loading today's court schedule..." />;
  }

  const dashboardData = dashboardState.data;
  const todaySchedule = Array.isArray(dashboardData?.todaySchedule)
    ? dashboardData.todaySchedule.filter(Boolean)
    : [];
  const summary = dashboardData?.summary || {};
  const hasScheduleSlots = todaySchedule.length > 0;
  const bookedSlots = todaySchedule.filter((slot) => slot?.reservation);
  const todayLabel = formatDate(summary.today);
  const nearestAvailable = dashboardData?.nearestAvailableSlot;
  const totalHours = bookedSlots.reduce((sum, slot) => sum + getSlotHours(slot), 0);
  const firstName = getStaffFirstName(user?.fullName);

  return (
    <section className="page home-page">
      <div className="page-head staff-page-head">
        <div>
          <h1 className="page-title">Today</h1>
          <div className="page-sub">{todayLabel || "Today"}</div>
          <div className="page-sub-fil">Ngayong araw</div>
        </div>
        <button className="btn btn-primary btn-big home-action" type="button" onClick={() => onNavigate("/reservations/new")}>
          <Icon name="plus" />
          <span>New Reservation<span className="btn-fil">Magpa-reserba</span></span>
        </button>
      </div>

      {dashboardState.error && (
        <div className="alert error" role="alert">{dashboardState.error}</div>
      )}

      {dashboardData && (
        <>
          <div className="home-hero">
            <div className="hero-card">
              <h2>Good day, {firstName}.</h2>
              <div className="hero-date">Here is what's happening at the court today.</div>
              <div className="hero-stat">
                <div className="num">{bookedSlots.length}</div>
                <div className="unit">booking{bookedSlots.length === 1 ? "" : "s"} listed</div>
              </div>
              <div className="hero-note">
                That's {formatHourCount(totalHours)} of court time today.
                {hasScheduleSlots && <><br /><strong>{summary.availableCount ?? 0} open slot{summary.availableCount === 1 ? "" : "s"} still available for staff encoding.</strong></>}
              </div>
            </div>
            <div className="quick-actions">
              <button className="quick-action" type="button" onClick={() => onNavigate("/reservations/new")}>
                <span className="qa-ic"><Icon name="plus" /></span>
                <span className="qa-label">
                  <span className="l1">Make a reservation</span>
                  <span className="l2">Someone came to the office to book</span>
                </span>
                <span className="qa-arrow"><Icon name="chevronRight" /></span>
              </button>
              <button className="quick-action" type="button" onClick={() => onNavigate("/schedule")}>
                <span className="qa-ic"><Icon name="calendar" /></span>
                <span className="qa-label">
                  <span className="l1">Check the calendar</span>
                  <span className="l2">See which days are free</span>
                </span>
                <span className="qa-arrow"><Icon name="chevronRight" /></span>
              </button>
              <button className="quick-action" type="button" onClick={() => onNavigate("/reservations")}>
                <span className="qa-ic"><Icon name="search" /></span>
                <span className="qa-label">
                  <span className="l1">Find a booking</span>
                  <span className="l2">Search by name or date</span>
                </span>
                <span className="qa-arrow"><Icon name="chevronRight" /></span>
              </button>
            </div>
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
                <h2 className="card-title">Today's Schedule<span className="fil">Iskedyul ngayong araw</span></h2>
              </div>
              <span>Click a booking to see details</span>
            </div>
            {bookedSlots.length > 0 ? (
              <div className="booking-list">
                {bookedSlots.map((slot, index) => {
                  const reservation = slot.reservation;
                  const slotKey = slot.slotId ?? `${slot.startTime ?? "slot"}-${slot.endTime ?? index}`;

                  return (
                    <button
                      key={slotKey}
                      className={`booking-row ${String(slot.statusCode || reservation?.statusCode || "").toLowerCase()}`}
                      type="button"
                      onClick={() => onNavigate(`/reservations/${reservation.reservationId}`)}
                    >
                      <div className="b-time">
                        {displayCompactRange(slot.startTime, slot.endTime)}
                        <span className="b-dur">{formatHourCount(getSlotHours(slot))}</span>
                      </div>
                      <div>
                        <div className="b-name">{reservation.representativeName || "Reserved"}</div>
                        <div className="b-purpose">{reservation.purpose || "No purpose listed"}</div>
                        <div className="b-meta">Contact: {reservation.contactNo || "Not listed"}</div>
                      </div>
                      <StatusBadge statusCode={slot.statusCode || reservation?.statusCode || "RESERVED"} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No reservations today"
                body="Walang reserbasyon ngayon. Staff can still check the calendar for available court time."
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

function displayRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function displayCompactRange(startTime, endTime) {
  if (!startTime || !endTime) return "Time unavailable";
  return `${formatCompactTime(startTime)}-${formatCompactTime(endTime)}`;
}

function formatCompactTime(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return formatTime(value);
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${suffix}`;
}

function formatNearestSlot(slot) {
  const date = formatDate(slot.date);
  const range = slot.name || displayRange(slot.startTime, slot.endTime);
  return date ? `${date}, ${range}` : range;
}

function getSlotHours(slot) {
  const start = minutesFromTime(slot.startTime);
  const end = minutesFromTime(slot.endTime);
  if (start == null || end == null || end <= start) return 0;
  return (end - start) / 60;
}

function minutesFromTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatHourCount(hours) {
  const value = Number.isInteger(hours) ? hours : Number(hours.toFixed(1));
  return `${value} hour${value === 1 ? "" : "s"}`;
}

function getStaffFirstName(fullName) {
  const name = String(fullName || "staff").trim();
  if (!name) return "staff";
  return name.split(/\s+/)[0];
}

function isNetworkError(error) {
  if (!error) return false;
  // fetch() throws a TypeError with no `status` when the request never
  // reached the server (offline, DNS failure, CORS preflight blocked, etc.).
  // `apiRequest` re-throws non-2xx responses with `error.status` set, so a
  // missing `error.status` distinguishes a network failure from an HTTP
  // failure.
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
