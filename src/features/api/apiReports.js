import { timeToMinutes } from "../reservations/reservationValidation.js";

const TRACKED_STATUS_CODES = ["RESERVED", "MISSED", "COMPLETED", "CANCELLED"];

export function buildReportsPayload(reservations = []) {
  const statusCounts = {};
  const requesterHours = new Map();
  let courtHoursBooked = 0;

  for (const reservation of reservations) {
    const statusCode = String(reservation.statusCode || "").toUpperCase();
    const hours = getReservationHours(reservation);
    const requesterName = String(reservation.representativeName || "Unknown requester").trim() || "Unknown requester";
    const contributesBookedHours = statusCode !== "CANCELLED";

    statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;

    if (contributesBookedHours) {
      courtHoursBooked += hours;
      requesterHours.set(requesterName, (requesterHours.get(requesterName) || 0) + hours);
    }
  }

  return {
    summary: {
      totalReservations: reservations.length,
      courtHoursBooked: roundHours(courtHoursBooked),
      missedCount: statusCounts.MISSED || 0,
      completedCount: statusCounts.COMPLETED || 0,
      reservedCount: statusCounts.RESERVED || 0,
      cancelledCount: statusCounts.CANCELLED || 0
    },
    statusCounts: buildStatusCounts(statusCounts),
    topRequesters: [...requesterHours.entries()]
      .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))
      .slice(0, 5)
  };
}

function buildStatusCounts(statusCounts) {
  const result = {};

  for (const statusCode of TRACKED_STATUS_CODES) {
    result[statusCode] = statusCounts[statusCode] || 0;
  }

  for (const [statusCode, count] of Object.entries(statusCounts)) {
    if (!Object.prototype.hasOwnProperty.call(result, statusCode)) {
      result[statusCode] = count;
    }
  }

  return result;
}

function getReservationHours(reservation) {
  const start = safeTimeToMinutes(reservation.startTime);
  const end = safeTimeToMinutes(reservation.endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return (end - start) / 60;
}

function safeTimeToMinutes(value) {
  return timeToMinutes(value);
}

function roundHours(value) {
  return Math.round(value * 100) / 100;
}
