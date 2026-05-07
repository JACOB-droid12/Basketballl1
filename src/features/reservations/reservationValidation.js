const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const VALID_STATUS_CODES = new Set(["RESERVED", "MISSED", "CANCELLED", "COMPLETED"]);

export function validateReservationInput(input = {}, options = {}) {
  const errors = {};
  const value = {};

  value.reservationDate = normalizeText(input.reservationDate);
  value.startTime = normalizeTime(input.startTime);
  value.endTime = normalizeTime(input.endTime);
  value.representativeName = normalizeText(input.representativeName);
  value.contactNo = normalizeText(input.contactNo);
  value.address = normalizeText(input.address);
  value.purpose = normalizeText(input.purpose);
  value.remarks = normalizeText(input.remarks);
  value.statusCode = normalizeText(input.statusCode || "RESERVED").toUpperCase();

  if (!value.reservationDate) {
    errors.reservationDate = "Reservation date is required.";
  } else if (!DATE_PATTERN.test(value.reservationDate) || !isRealDate(value.reservationDate)) {
    errors.reservationDate = "Reservation date must use YYYY-MM-DD format.";
  } else if (options.requireTodayOrFuture && options.today && value.reservationDate < options.today) {
    errors.reservationDate = "Reservation date cannot be before today.";
  }

  if (!normalizeText(input.startTime)) {
    errors.startTime = "Start time is required.";
  } else if (!value.startTime) {
    errors.startTime = "Start time must use HH:MM format.";
  }

  if (!normalizeText(input.endTime)) {
    errors.endTime = "End time is required.";
  } else if (!value.endTime) {
    errors.endTime = "End time must use HH:MM format.";
  }

  if (value.startTime && value.endTime && timeToMinutes(value.endTime) <= timeToMinutes(value.startTime)) {
    errors.endTime = "End time must be after start time.";
  }

  if (!value.representativeName) {
    errors.representativeName = "Resident or group representative name is required.";
  }

  if (!value.contactNo) {
    errors.contactNo = "Contact number is required.";
  }

  if (!value.address) {
    errors.address = "Address is required.";
  }

  if (!value.purpose) {
    errors.purpose = "Purpose is required.";
  }

  if (!VALID_STATUS_CODES.has(value.statusCode)) {
    errors.statusCode = "Reservation status is invalid.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeTime(value) {
  const text = normalizeText(value);
  if (!TIME_PATTERN.test(text)) {
    return "";
  }

  return text.slice(0, 5);
}

function isRealDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function timeToMinutes(value) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
}
