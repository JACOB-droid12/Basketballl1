import { timeToMinutes } from "../reservations/reservationValidation.js";

const TRACKED_STATUS_CODES = ["RESERVED", "MISSED", "COMPLETED", "CANCELLED"];
const USAGE_STATUS_CODES = new Set(["RESERVED", "MISSED", "COMPLETED"]);
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function buildReportsPayload(reservations = [], { blocks = [] } = {}) {
  const statusCounts = {};
  const requesterHours = new Map();
  const days = new Map();
  const timeSlots = new Map();
  const monthlyCounts = new Map();
  const purposes = new Map();
  const staffCounts = new Map();
  let courtHoursBooked = 0;

  for (const reservation of reservations) {
    const statusCode = String(reservation.statusCode || "").toUpperCase();
    const hours = getReservationHours(reservation);
    const requesterName = String(reservation.representativeName || "Unknown requester").trim() || "Unknown requester";
    const purpose = String(reservation.purpose || "Unspecified").trim() || "Unspecified";
    const staffName = String(reservation.createdByName || "Unknown staff").trim() || "Unknown staff";
    const contributesBookedHours = statusCode !== "CANCELLED";
    const contributesUsage = USAGE_STATUS_CODES.has(statusCode);

    statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;
    incrementMonthlyCount(monthlyCounts, reservation.reservationDate);
    incrementCount(staffCounts, staffName, 1);

    if (contributesBookedHours) {
      courtHoursBooked += hours;
      requesterHours.set(requesterName, (requesterHours.get(requesterName) || 0) + hours);
    }

    if (contributesUsage) {
      incrementDayUsage(days, reservation, hours);
      incrementTimeSlotUsage(timeSlots, reservation, hours);
    }

    incrementPurposeUsage(purposes, purpose, statusCode === "CANCELLED" ? 0 : hours);
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
      .slice(0, 5),
    mostUsedDays: [...days.values()]
      .map((item) => ({ ...item, hours: roundHours(item.hours) }))
      .sort((a, b) => b.count - a.count || b.hours - a.hours || daySortValue(a.day) - daySortValue(b.day)),
    mostUsedTimeSlots: [...timeSlots.values()]
      .map((item) => ({ ...item, hours: roundHours(item.hours) }))
      .sort((a, b) => b.count - a.count || b.hours - a.hours || a.label.localeCompare(b.label)),
    monthlyReservationCount: [...monthlyCounts.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    missedReservations: reservations
      .filter((reservation) => String(reservation.statusCode || "").toUpperCase() === "MISSED")
      .map(toReportReservation),
    cancelledReservations: reservations
      .filter((reservation) => String(reservation.statusCode || "").toUpperCase() === "CANCELLED")
      .map(toReportReservation),
    reservationsByPurpose: [...purposes.values()]
      .map((item) => ({ ...item, hours: roundHours(item.hours) }))
      .sort((a, b) => b.count - a.count || a.purpose.localeCompare(b.purpose)),
    reservationsEncodedByStaff: [...staffCounts.entries()]
      .map(([staffName, count]) => ({ staffName, count }))
      .sort((a, b) => b.count - a.count || a.staffName.localeCompare(b.staffName)),
    clearedPublicUseRanges: blocks
      .filter((block) => String(block.category || "").toUpperCase() === "PUBLIC_USE")
      .map(toReportBlock),
    maintenanceBlocks: blocks
      .filter((block) => String(block.category || "").toUpperCase() === "MAINTENANCE")
      .map(toReportBlock)
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

function incrementDayUsage(days, reservation, hours) {
  const day = getDayName(reservation.reservationDate);
  const current = days.get(day) || { day, count: 0, hours: 0 };
  current.count += 1;
  current.hours += hours;
  days.set(day, current);
}

function incrementTimeSlotUsage(timeSlots, reservation, hours) {
  const startMinutes = safeTimeToMinutes(reservation.startTime);
  const endMinutes = safeTimeToMinutes(reservation.endTime);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return;
  }

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    const chunkEnd = Math.min(minutes + 60, endMinutes);
    const startTime = minutesToTime(minutes);
    const endTime = minutesToTime(chunkEnd);
    const label = `${startTime}-${endTime}`;
    const current = timeSlots.get(label) || { startTime, endTime, label, count: 0, hours: 0 };
    current.count += 1;
    current.hours += Math.min(hours, (chunkEnd - minutes) / 60);
    timeSlots.set(label, current);
  }
}

function incrementMonthlyCount(monthlyCounts, reservationDate) {
  const month = String(reservationDate || "").slice(0, 7);

  if (/^\d{4}-\d{2}$/.test(month)) {
    incrementCount(monthlyCounts, month, 1);
  }
}

function incrementPurposeUsage(purposes, purpose, hours) {
  const current = purposes.get(purpose) || { purpose, count: 0, hours: 0 };
  current.count += 1;
  current.hours += hours;
  purposes.set(purpose, current);
}

function incrementCount(map, key, amount) {
  map.set(key, (map.get(key) || 0) + amount);
}

function toReportReservation(reservation) {
  return {
    reservationId: reservation.reservationId,
    referenceNo: reservation.referenceNo || "",
    reservationDate: reservation.reservationDate,
    startTime: normalizeReportTime(reservation.startTime),
    endTime: normalizeReportTime(reservation.endTime),
    representativeName: reservation.representativeName,
    contactNo: reservation.contactNo,
    purpose: reservation.purpose || "",
    statusCode: String(reservation.statusCode || "").toUpperCase(),
    createdByName: reservation.createdByName || ""
  };
}

function toReportBlock(block) {
  return {
    blockId: block.blockId,
    date: block.date,
    startTime: normalizeReportTime(block.startTime),
    endTime: normalizeReportTime(block.endTime),
    mode: block.mode || "TIME_RANGE",
    category: block.category || "",
    type: block.type || "",
    statusCode: block.statusCode || "",
    reason: block.reason || "",
    isActive: block.isActive !== false,
    createdByName: block.createdByName || "",
    createdAt: block.createdAt || ""
  };
}

function safeTimeToMinutes(value) {
  return timeToMinutes(value);
}

function roundHours(value) {
  return Math.round(value * 100) / 100;
}

function getDayName(dateString) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return DAY_NAMES[date.getUTCDay()];
}

function daySortValue(dayName) {
  const index = DAY_NAMES.indexOf(dayName);
  return index === -1 ? DAY_NAMES.length : index;
}

function normalizeReportTime(value) {
  const match = String(value || "").match(/\d{2}:\d{2}/);
  return match ? match[0] : "";
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
