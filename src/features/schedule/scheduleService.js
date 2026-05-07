import { isBlockingStatus, timeRangesOverlap } from "../reservations/reservationOverlap.js";

const STATUS_NAMES = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed"
};

export function buildDailySchedule({ date, timeSlots = [], reservations = [] }) {
  return timeSlots.map((slot) => {
    const overlapping = reservations
      .filter((reservation) => reservation.reservationDate === date)
      .filter((reservation) => timeRangesOverlap(slot.startTime, slot.endTime, reservation.startTime, reservation.endTime))
      .sort(compareReservationsForSlot);

    const reservation = overlapping[0] || null;
    const statusCode = reservation ? String(reservation.statusCode).toUpperCase() : "AVAILABLE";

    return {
      slotId: slot.slotId,
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      statusCode,
      statusName: STATUS_NAMES[statusCode] || statusCode,
      reservation,
      isAvailableForBooking: !isBlockingStatus(statusCode)
    };
  });
}

export function findNearestAvailableSlot({ startDate, timeSlots = [], reservations = [], searchDays = 14 }) {
  for (let offset = 0; offset < searchDays; offset += 1) {
    const date = addDays(startDate, offset);
    const schedule = buildDailySchedule({ date, timeSlots, reservations });
    const availableSlot = schedule.find((slot) => slot.isAvailableForBooking);

    if (availableSlot) {
      return {
        date,
        slotId: availableSlot.slotId,
        name: availableSlot.name,
        startTime: availableSlot.startTime,
        endTime: availableSlot.endTime
      };
    }
  }

  return null;
}

export function buildDashboardSummary({ today, todaySchedule = [], upcomingReservations = [] }) {
  const todayReserved = todaySchedule
    .filter((slot) => slot.statusCode === "RESERVED" && slot.reservation)
    .map((slot) => slot.reservation);
  const missedReservations = todaySchedule
    .filter((slot) => slot.statusCode === "MISSED" && slot.reservation)
    .map((slot) => slot.reservation);
  const actionableUpcoming = upcomingReservations.filter((reservation) => reservation.statusCode === "RESERVED");

  return {
    today,
    reservedCount: todayReserved.length,
    availableCount: todaySchedule.filter((slot) => slot.statusCode === "AVAILABLE").length,
    missedCount: missedReservations.length,
    todayReserved,
    missedReservations,
    upcomingReservations: actionableUpcoming
  };
}

function compareReservationsForSlot(a, b) {
  const aBlocks = isBlockingStatus(a.statusCode) ? 0 : 1;
  const bBlocks = isBlockingStatus(b.statusCode) ? 0 : 1;

  if (aBlocks !== bBlocks) {
    return aBlocks - bBlocks;
  }

  return Number(a.reservationId || 0) - Number(b.reservationId || 0);
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
