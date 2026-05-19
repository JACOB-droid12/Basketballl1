const POLICY_SETTINGS = {
  openingTime: {
    key: "opening_time",
    description: "Default daily opening time."
  },
  closingTime: {
    key: "closing_time",
    description: "Default daily closing time."
  },
  minimumReservationMinutes: {
    key: "min_reservation_minutes",
    description: "Minimum allowed reservation duration in minutes."
  },
  maximumReservationMinutes: {
    key: "max_reservation_minutes",
    description: "Maximum allowed reservation duration in minutes."
  },
  allowedDays: {
    key: "allowed_days",
    description: "Allowed reservation days as comma-separated day numbers, where 0 is Sunday."
  },
  blockedDays: {
    key: "blocked_days",
    description: "Blocked reservation dates as comma-separated YYYY-MM-DD values."
  },
  gracePeriodBeforeMissedMinutes: {
    key: "missed_grace_minutes",
    description: "Grace period before a reservation can be marked missed."
  },
  defaultSlotMinutes: {
    key: "slot_minutes",
    description: "Default schedule slot size in minutes."
  }
};

const DEFAULT_POLICY = {
  openingTime: "07:00",
  closingTime: "21:00",
  minimumReservationMinutes: 30,
  maximumReservationMinutes: 240,
  allowedDays: [0, 1, 2, 3, 4, 5, 6],
  blockedDays: [],
  gracePeriodBeforeMissedMinutes: 15,
  defaultSlotMinutes: 60
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class CourtPolicyValidationError extends Error {
  constructor(errors) {
    super("Court policy values are invalid.");
    this.name = "CourtPolicyValidationError";
    this.errors = errors;
  }
}

export async function getCourtPolicySettings(db) {
  const keys = Object.values(POLICY_SETTINGS).map((setting) => setting.key);
  const placeholders = keys.map((_key, index) => `:key${index}`).join(", ");
  const params = Object.fromEntries(keys.map((key, index) => [`key${index}`, key]));
  const [rows] = await db.execute(
    `
      SELECT setting_key, setting_value
      FROM court_settings
      WHERE setting_key IN (${placeholders})
    `,
    params
  );
  const values = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));

  return normalizePolicyFromSettings(values);
}

export async function updateCourtPolicySettings(db, patch, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const current = await getCourtPolicySettings(connection);
    const merged = { ...current, ...normalizePolicyPatch(patch) };
    const result = validateCourtPolicyInput(merged);

    if (!result.valid) {
      throw new CourtPolicyValidationError(result.errors);
    }

    for (const [field, setting] of Object.entries(POLICY_SETTINGS)) {
      await connection.execute(
        `
          INSERT INTO court_settings (setting_key, setting_value, description)
          VALUES (:settingKey, :settingValue, :description)
          ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            description = VALUES(description)
        `,
        {
          settingKey: setting.key,
          settingValue: serializePolicyValue(field, result.value[field]),
          description: setting.description
        }
      );
    }

    await connection.execute(
      `
        INSERT INTO activity_logs (user_id, action, details)
        VALUES (:userId, :action, :details)
      `,
      {
        userId,
        action: "UPDATE_COURT_POLICY",
        details: "Updated court policy settings."
      }
    );

    await connection.commit();
    return result.value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function validateCourtPolicyInput(input = {}) {
  const value = {
    openingTime: normalizeTime(input.openingTime),
    closingTime: normalizeTime(input.closingTime),
    minimumReservationMinutes: Number(input.minimumReservationMinutes),
    maximumReservationMinutes: Number(input.maximumReservationMinutes),
    allowedDays: normalizeAllowedDays(input.allowedDays),
    blockedDays: normalizeBlockedDays(input.blockedDays),
    gracePeriodBeforeMissedMinutes: Number(input.gracePeriodBeforeMissedMinutes),
    defaultSlotMinutes: Number(input.defaultSlotMinutes)
  };
  const errors = {};

  if (!value.openingTime) {
    errors.openingTime = "Opening time must use HH:MM format.";
  }

  if (!value.closingTime) {
    errors.closingTime = "Closing time must use HH:MM format.";
  }

  if (value.openingTime && value.closingTime && timeToMinutes(value.closingTime) <= timeToMinutes(value.openingTime)) {
    errors.timeRange = "Closing time must be after opening time.";
  }

  if (!Number.isInteger(value.minimumReservationMinutes) || value.minimumReservationMinutes < 15 || value.minimumReservationMinutes > 720) {
    errors.minimumReservationMinutes = "Minimum duration must be between 15 and 720 minutes.";
  }

  if (!Number.isInteger(value.maximumReservationMinutes) || value.maximumReservationMinutes < 15 || value.maximumReservationMinutes > 720) {
    errors.maximumReservationMinutes = "Maximum duration must be between 15 and 720 minutes.";
  } else if (
    Number.isInteger(value.minimumReservationMinutes) &&
    value.maximumReservationMinutes < value.minimumReservationMinutes
  ) {
    errors.maximumReservationMinutes = "Maximum duration must be at least the minimum duration.";
  }

  if (value.allowedDays.length === 0) {
    errors.allowedDays = "At least one allowed day is required.";
  }

  if (!areRealDates(value.blockedDays)) {
    errors.blockedDays = "Blocked days must contain real YYYY-MM-DD dates.";
  }

  if (!Number.isInteger(value.gracePeriodBeforeMissedMinutes) || value.gracePeriodBeforeMissedMinutes < 0 || value.gracePeriodBeforeMissedMinutes > 240) {
    errors.gracePeriodBeforeMissedMinutes = "Grace period must be between 0 and 240 minutes.";
  }

  if (!Number.isInteger(value.defaultSlotMinutes) || value.defaultSlotMinutes < 15 || value.defaultSlotMinutes > 240) {
    errors.defaultSlotMinutes = "Default slot size must be between 15 and 240 minutes.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

export function validateReservationAgainstCourtPolicy(reservation, policy = DEFAULT_POLICY) {
  const errors = {};
  const startMinutes = timeToMinutes(reservation.startTime);
  const endMinutes = timeToMinutes(reservation.endTime);
  const duration = endMinutes - startMinutes;
  const openingMinutes = timeToMinutes(policy.openingTime);
  const closingMinutes = timeToMinutes(policy.closingTime);
  const reservationDay = getDayIndex(reservation.reservationDate);

  if (!policy.allowedDays.includes(reservationDay)) {
    errors.reservationDate = "Reservations are not allowed on this day of the week.";
  } else if (policy.blockedDays.includes(reservation.reservationDate)) {
    errors.reservationDate = "Reservations are blocked on this date.";
  }

  if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
    errors.timeRange = "Reservation must be within court operating hours.";
  }

  if (duration < policy.minimumReservationMinutes) {
    errors.duration = `Reservation duration must be at least ${policy.minimumReservationMinutes} minutes.`;
  } else if (duration > policy.maximumReservationMinutes) {
    errors.duration = `Reservation duration must be no more than ${policy.maximumReservationMinutes} minutes.`;
  }

  return errors;
}

function normalizePolicyFromSettings(settings) {
  const policy = {
    openingTime: normalizeTime(settings.opening_time) || DEFAULT_POLICY.openingTime,
    closingTime: normalizeTime(settings.closing_time) || DEFAULT_POLICY.closingTime,
    minimumReservationMinutes: parsePositiveInteger(settings.min_reservation_minutes, DEFAULT_POLICY.minimumReservationMinutes),
    maximumReservationMinutes: parsePositiveInteger(settings.max_reservation_minutes, DEFAULT_POLICY.maximumReservationMinutes),
    allowedDays: normalizeAllowedDays(settings.allowed_days || DEFAULT_POLICY.allowedDays),
    blockedDays: normalizeBlockedDays(settings.blocked_days || DEFAULT_POLICY.blockedDays),
    gracePeriodBeforeMissedMinutes: parseInteger(settings.missed_grace_minutes, DEFAULT_POLICY.gracePeriodBeforeMissedMinutes),
    defaultSlotMinutes: parsePositiveInteger(settings.slot_minutes, DEFAULT_POLICY.defaultSlotMinutes)
  };
  const result = validateCourtPolicyInput(policy);

  return result.valid ? result.value : DEFAULT_POLICY;
}

function normalizePolicyPatch(input = {}) {
  const patch = {};

  for (const field of Object.keys(POLICY_SETTINGS)) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      patch[field] = input[field];
    }
  }

  return patch;
}

function serializePolicyValue(field, value) {
  if (field === "allowedDays" || field === "blockedDays") {
    return value.join(",");
  }

  if (field === "openingTime" || field === "closingTime") {
    return `${value}:00`;
  }

  return String(value);
}

function normalizeAllowedDays(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const days = raw
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);

  return [...new Set(days)].sort((a, b) => a - b);
}

function normalizeBlockedDays(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");

  return raw.map((item) => String(item).trim()).filter(Boolean);
}

function areRealDates(values) {
  return values.every((value) => DATE_PATTERN.test(value) && isRealDate(value));
}

function normalizeTime(value) {
  const text = String(value ?? "").trim();

  if (!TIME_PATTERN.test(text)) {
    return "";
  }

  return text.slice(0, 5);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : fallback;
}

function timeToMinutes(value) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayIndex(dateString) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCDay();
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

function requireAuthenticatedUserId(userId) {
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error("Authenticated user ID is required.");
  }

  return numericUserId;
}
