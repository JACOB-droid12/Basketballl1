import { isBlockingStatus, timeRangesOverlap } from "../reservations/reservationOverlap.js";

const STATUS_NAMES = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  MAINTENANCE: "Maintenance",
  BARANGAY_EVENT: "Barangay event",
  CLEARED_PUBLIC_USE: "Cleared for public use"
};

export function buildDailySchedule({ date, timeSlots = [], reservations = [], blocks = [] }) {
  return timeSlots.map((slot) => {
    const block = blocks
      .filter((item) => item.date === date && item.isActive !== false)
      .filter((item) => timeRangesOverlap(slot.startTime, slot.endTime, item.startTime, item.endTime))
      .sort(compareBlocksForSlot)[0] || null;

    if (block) {
      const statusCode = String(block.statusCode || block.type || block.category || "MAINTENANCE").toUpperCase();

      return {
        slotId: slot.slotId,
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        statusCode,
        statusName: STATUS_NAMES[statusCode] || statusCode,
        reservation: null,
        block,
        isAvailableForBooking: false
      };
    }

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
      block: null,
      isAvailableForBooking: !isBlockingStatus(statusCode)
    };
  });
}

export function buildWeeklySchedule({ weekStartDate, timeSlots = [], reservations = [], blocks = [] }) {
  const days = Array.from({ length: 7 }, (_item, index) => {
    const date = addDays(weekStartDate, index);
    return {
      date,
      name: DAY_NAMES[index]
    };
  });

  const dailySchedules = new Map(
    days.map((day) => [
      day.date,
      buildDailySchedule({
        date: day.date,
        timeSlots,
        reservations,
        blocks
      })
    ])
  );

  return {
    days,
    rows: timeSlots.map((slot, slotIndex) => ({
      slotId: slot.slotId,
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      cells: days.map((day) => dailySchedules.get(day.date)[slotIndex])
    }))
  };
}

export function findNearestAvailableSlot({ startDate, timeSlots = [], reservations = [], blocks = [], searchDays = 14 }) {
  for (let offset = 0; offset < searchDays; offset += 1) {
    const date = addDays(startDate, offset);
    const schedule = buildDailySchedule({ date, timeSlots, reservations, blocks });
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
  const todayReserved = uniqueReservationsById(
    todaySchedule
      .filter((slot) => slot.statusCode === "RESERVED" && slot.reservation)
      .map((slot) => slot.reservation)
  );
  const missedReservations = uniqueReservationsById(
    todaySchedule
      .filter((slot) => slot.statusCode === "MISSED" && slot.reservation)
      .map((slot) => slot.reservation)
  );
  const actionableUpcoming = upcomingReservations.filter((reservation) => reservation.statusCode === "RESERVED");

  return {
    today,
    reservedCount: todayReserved.length,
    availableCount: todaySchedule.filter(isBookableSlot).length,
    missedCount: missedReservations.length,
    todayReserved,
    missedReservations,
    upcomingReservations: actionableUpcoming
  };
}

function uniqueReservationsById(reservations) {
  const uniqueReservations = new Map();

  for (const reservation of reservations) {
    const key = reservation.reservationId ?? reservation;
    if (!uniqueReservations.has(key)) {
      uniqueReservations.set(key, reservation);
    }
  }

  return [...uniqueReservations.values()];
}

function isBookableSlot(slot) {
  if (typeof slot.isAvailableForBooking === "boolean") {
    return slot.isAvailableForBooking;
  }

  return slot.statusCode === "AVAILABLE";
}

function compareReservationsForSlot(a, b) {
  const aBlocks = isBlockingStatus(a.statusCode) ? 0 : 1;
  const bBlocks = isBlockingStatus(b.statusCode) ? 0 : 1;

  if (aBlocks !== bBlocks) {
    return aBlocks - bBlocks;
  }

  return Number(a.reservationId || 0) - Number(b.reservationId || 0);
}

function compareBlocksForSlot(a, b) {
  const categoryOrder = {
    PUBLIC_USE: 0,
    MAINTENANCE: 1
  };
  const aOrder = categoryOrder[String(a.category || "").toUpperCase()] ?? 2;
  const bOrder = categoryOrder[String(b.category || "").toUpperCase()] ?? 2;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  return Number(a.blockId || 0) - Number(b.blockId || 0);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
