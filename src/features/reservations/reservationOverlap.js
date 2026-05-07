import { timeToMinutes } from "./reservationValidation.js";

export const BLOCKING_STATUS_CODES = new Set(["RESERVED"]);

export function isBlockingStatus(statusCode) {
  return BLOCKING_STATUS_CODES.has(String(statusCode || "").toUpperCase());
}

export function findBlockingOverlap(candidate, existingReservations = []) {
  if (!isBlockingStatus(candidate.statusCode)) {
    return null;
  }

  return (
    existingReservations.find((existing) => {
      if (!isBlockingStatus(existing.statusCode)) {
        return false;
      }

      if (existing.reservationDate !== candidate.reservationDate) {
        return false;
      }

      if (
        candidate.reservationId &&
        existing.reservationId &&
        Number(existing.reservationId) === Number(candidate.reservationId)
      ) {
        return false;
      }

      return timeRangesOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime);
    }) || null
  );
}

export function hasBlockingOverlap(overlap) {
  return overlap !== null;
}

export function timeRangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}
