import bcrypt from "bcryptjs";
import { Router } from "express";

import { listActivityLogs } from "../activityLogs/activityLogRepository.js";
import {
  createReservation,
  getReservationById,
  getReservationStatuses,
  getTimeSlots,
  listReservations,
  ReservationConflictError,
  ReservationNotFoundError,
  updateReservation,
  updateReservationStatus
} from "../reservations/reservationRepository.js";
import { findBlockingOverlap, timeRangesOverlap } from "../reservations/reservationOverlap.js";
import { normalizeTime, timeToMinutes, validateReservationInput } from "../reservations/reservationValidation.js";
import {
  buildDailySchedule,
  buildDashboardSummary,
  buildWeeklySchedule,
  findNearestAvailableSlot
} from "../schedule/scheduleService.js";
import {
  createUser,
  DuplicateUsernameError,
  findUserByUsername,
  listUsers,
  updateUserAccountStatus,
  UserNotFoundError
} from "../users/userRepository.js";
import { validateCreateUserInput } from "../users/userValidation.js";
import { sendAdminRequired, sendDatabaseError, sendLoginRequired, sendValidationError } from "./apiErrors.js";
import { toApiAccount, toApiReservation, toApiScheduleSlot, toApiUser } from "./apiMappers.js";
import { buildReportsPayload } from "./apiReports.js";

const defaultRepositories = {
  createReservation,
  createUser,
  findUserByUsername,
  getReservationById,
  getReservationStatuses,
  getTimeSlots,
  listActivityLogs,
  listReservations,
  listUsers,
  updateReservation,
  updateReservationStatus,
  updateUserAccountStatus
};
const AVAILABILITY_SUGGESTION_SEARCH_DAYS = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createApiRoutes({ db, repositories = {}, todayProvider = getTodayDate } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/api/session", (request, response) => {
    response.json({
      authenticated: Boolean(request.session?.user),
      user: toApiUser(request.session?.user)
    });
  });

  router.post("/api/login", async (request, response) => {
    const username = String(request.body.username || "").trim().toLowerCase();
    const password = String(request.body.password || "");

    try {
      const user = username ? await repo.findUserByUsername(db, username) : null;
      const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

      if (!user || !passwordMatches) {
        response.status(401).json({ error: "Invalid username or password." });
        return;
      }

      request.session.user = {
        userId: user.userId,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      };
      response.json({ user: toApiUser(request.session.user) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/logout", (request, response) => {
    if (typeof request.session?.destroy === "function") {
      request.session.destroy(() => response.json({ ok: true }));
      return;
    }

    request.session.user = null;
    response.json({ ok: true });
  });

  router.use("/api", requireApiSignedIn);

  router.get("/api/reservations", async (request, response) => {
    try {
      const reservations = await repo.listReservations(db, cleanReservationFilters(request.query));
      response.json({ reservations: reservations.map(toApiReservation) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reservations/:reservationId", async (request, response) => {
    const reservationId = parsePositiveIntegerParam(request.params.reservationId);

    if (!reservationId) {
      response.status(400).json({ error: "Reservation ID must be a positive integer." });
      return;
    }

    try {
      const reservation = await repo.getReservationById(db, reservationId);

      if (!reservation) {
        response.status(404).json({ error: "Reservation record was not found." });
        return;
      }

      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/reservations", async (request, response) => {
    const result = validateReservationInput(
      { ...request.body, statusCode: "RESERVED" },
      { today: todayProvider(), requireTodayOrFuture: true }
    );

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const reservationId = await repo.createReservation(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, reservationId);
      response.status(201).json({ reservation: toApiReservation(reservation || { ...result.value, reservationId }) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.put("/api/reservations/:reservationId", async (request, response) => {
    const reservationId = parsePositiveIntegerParam(request.params.reservationId);

    if (!reservationId) {
      response.status(400).json({ error: "Reservation ID must be a positive integer." });
      return;
    }

    const result = validateReservationInput(request.body, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const updated = await repo.updateReservation(db, reservationId, result.value, {
        userId: request.session.user.userId
      });
      const reservation = updated || await repo.getReservationById(db, reservationId);
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.post("/api/reservations/:reservationId/status", async (request, response) => {
    const reservationId = parsePositiveIntegerParam(request.params.reservationId);

    if (!reservationId) {
      response.status(400).json({ error: "Reservation ID must be a positive integer." });
      return;
    }

    const statusCode = String(request.body.statusCode || "").trim().toUpperCase();
    const allowed = new Set(["MISSED", "CANCELLED", "COMPLETED"]);

    if (!allowed.has(statusCode)) {
      response.status(400).json({ error: "Reservation status is invalid." });
      return;
    }

    try {
      const updated = await repo.updateReservationStatus(db, reservationId, statusCode, {
        userId: request.session.user.userId
      });
      const reservation = updated || await repo.getReservationById(db, reservationId);
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.delete("/api/reservations/:reservationId", async (request, response) => {
    const reservationId = parsePositiveIntegerParam(request.params.reservationId);

    if (!reservationId) {
      response.status(400).json({ error: "Reservation ID must be a positive integer." });
      return;
    }

    try {
      const updated = await repo.updateReservationStatus(db, reservationId, "CANCELLED", {
        userId: request.session.user.userId
      });
      const reservation = updated || await repo.getReservationById(db, reservationId);
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.get("/api/dashboard", async (_request, response) => {
    const today = todayProvider();

    try {
      const timeSlots = await repo.getTimeSlots(db);
      const todayReservations = await repo.listReservations(db, { reservationDate: today });
      const upcomingReservations = await collectReservationsByDate({ db, repo, startDate: addDays(today, 1), days: 7 });
      const suggestionReservations = await collectReservationsByDate({ db, repo, startDate: today, days: 14 });
      const todaySchedule = buildDailySchedule({ date: today, timeSlots, reservations: todayReservations });
      const summary = buildDashboardSummary({ today, todaySchedule, upcomingReservations });
      const nearestAvailableSlot = findNearestAvailableSlot({
        startDate: today,
        timeSlots,
        reservations: suggestionReservations,
        searchDays: 14
      });

      response.json({
        summary: mapDashboardSummary(summary),
        todaySchedule: todaySchedule.map(toApiScheduleSlot),
        nearestAvailableSlot
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/schedule", async (request, response) => {
    const date = clean(request.query.date) || todayProvider();

    if (!isValidDateString(date)) {
      sendValidationError(response, { date: "Date must use YYYY-MM-DD format." });
      return;
    }

    const weekStartDate = getWeekStartDate(date);

    try {
      const timeSlots = await repo.getTimeSlots(db);
      const reservations = await collectReservationsByDate({ db, repo, startDate: weekStartDate, days: 7 });
      const weeklySchedule = buildWeeklySchedule({ weekStartDate, timeSlots, reservations });

      response.json({
        weekStartDate,
        days: weeklySchedule.days,
        rows: weeklySchedule.rows.map((row) => ({
          ...row,
          startTime: normalizeScheduleTime(row.startTime),
          endTime: normalizeScheduleTime(row.endTime),
          cells: row.cells.map(toApiScheduleSlot)
        }))
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/availability", async (request, response) => {
    const date = clean(request.query.date);
    const startTime = normalizeTime(request.query.startTime);
    const endTime = normalizeTime(request.query.endTime);
    const validationErrors = buildAvailabilityValidationErrors({
      date,
      rawStartTime: request.query.startTime,
      rawEndTime: request.query.endTime,
      startTime,
      endTime
    });

    if (Object.keys(validationErrors).length > 0) {
      sendValidationError(response, validationErrors);
      return;
    }

    try {
      const timeSlots = await repo.getTimeSlots(db);
      const scheduleCoverageError = validateAvailabilitySlotCoverage({ startTime, endTime, timeSlots });

      if (scheduleCoverageError) {
        sendValidationError(response, { timeRange: scheduleCoverageError });
        return;
      }

      const reservations = await collectReservationsByDate({
        db,
        repo,
        startDate: date,
        days: AVAILABILITY_SUGGESTION_SEARCH_DAYS + 1
      });
      const activeReservations = reservations.filter((reservation) => String(reservation.statusCode).toUpperCase() === "RESERVED");
      const conflict = findBlockingOverlap(
        { reservationDate: date, startTime, endTime, statusCode: "RESERVED" },
        activeReservations
      );

      response.json({
        available: !conflict,
        conflict: toApiReservation(conflict),
        suggestions: findAvailabilitySuggestions({ date, startTime, endTime, timeSlots, reservations: activeReservations })
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/accounts", requireApiAdmin, async (_request, response) => {
    try {
      const accounts = await repo.listUsers(db);
      response.json({ accounts: accounts.map(toApiAccount) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/accounts", requireApiAdmin, async (request, response) => {
    const result = validateCreateUserInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const account = await repo.createUser(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      response.status(201).json({ account: toApiAccount(account) });
    } catch (error) {
      if (error instanceof DuplicateUsernameError) {
        response.status(409).json({ errors: { username: "Username already exists." } });
        return;
      }

      sendDatabaseError(response, error);
    }
  });

  router.post("/api/accounts/:userId/status", requireApiAdmin, async (request, response) => {
    const userId = parsePositiveIntegerParam(request.params.userId);

    if (!userId) {
      response.status(400).json({ error: "User ID must be a positive integer." });
      return;
    }

    const accountStatus = String(request.body.accountStatus || "").trim().toUpperCase();

    if (!["ACTIVE", "INACTIVE"].includes(accountStatus)) {
      response.status(400).json({ error: "Account status is invalid." });
      return;
    }

    if (userId === Number(request.session.user.userId)) {
      response.status(400).json({ error: "You cannot change your own account status." });
      return;
    }

    try {
      await repo.updateUserAccountStatus(db, userId, accountStatus);
      response.json({ ok: true });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }

      sendDatabaseError(response, error);
    }
  });

  router.get("/api/activity-logs", async (request, response) => {
    try {
      const logs = await repo.listActivityLogs(db, cleanActivityLogFilters(request.query));
      response.json({ logs });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reports", async (_request, response) => {
    try {
      const reservations = await repo.listReservations(db, {});
      response.json(buildReportsPayload(reservations));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  return router;
}

function requireApiSignedIn(request, response, next) {
  if (request.path.startsWith("/prototype/")) {
    next();
    return;
  }

  if (!request.session?.user) {
    sendLoginRequired(response);
    return;
  }

  next();
}

function requireApiAdmin(request, response, next) {
  if (String(request.session?.user?.role || "").toUpperCase() !== "ADMIN") {
    sendAdminRequired(response);
    return;
  }

  next();
}

function cleanReservationFilters(query) {
  return {
    reservationDate: clean(query.reservationDate || query.date),
    statusCode: clean(query.statusCode || query.status).toUpperCase(),
    search: clean(query.search),
    purpose: clean(query.purpose)
  };
}

function cleanActivityLogFilters(query) {
  return {
    action: clean(query.action).toUpperCase(),
    date: clean(query.date),
    search: clean(query.search)
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function sendReservationMutationError(response, error) {
  if (error instanceof ReservationConflictError) {
    response.status(409).json({
      error: error.message,
      overlap: toApiReservation(error.overlap)
    });
    return;
  }

  if (error instanceof ReservationNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  sendDatabaseError(response, error);
}

async function collectReservationsByDate({ db, repo, startDate, days }) {
  const reservationsByDate = await Promise.all(
    Array.from({ length: days }, (_item, offset) => {
      const reservationDate = addDays(startDate, offset);
      return repo.listReservations(db, { reservationDate });
    })
  );
  const results = reservationsByDate.flat();

  return results.sort((a, b) => `${a.reservationDate} ${a.startTime}`.localeCompare(`${b.reservationDate} ${b.startTime}`));
}

function mapDashboardSummary(summary) {
  return {
    ...summary,
    todayReserved: summary.todayReserved.map(toApiReservation),
    missedReservations: summary.missedReservations.map(toApiReservation),
    upcomingReservations: summary.upcomingReservations.map(toApiReservation)
  };
}

function findAvailabilitySuggestions({ date, startTime, endTime, timeSlots, reservations }) {
  const requestedDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
  const sameDaySuggestions = findAvailableSlotsForDate({
    date,
    minimumStartMinutes: timeToMinutes(startTime),
    requestedDuration,
    timeSlots,
    reservations
  });

  if (sameDaySuggestions.length > 0) {
    return sameDaySuggestions.slice(0, 4);
  }

  const futureSuggestions = [];

  for (let offset = 1; offset <= AVAILABILITY_SUGGESTION_SEARCH_DAYS && futureSuggestions.length < 4; offset += 1) {
    futureSuggestions.push(...findAvailableSlotsForDate({
      date: addDays(date, offset),
      minimumStartMinutes: 0,
      requestedDuration,
      timeSlots,
      reservations
    }));
  }

  return futureSuggestions.slice(0, 4);
}

function findAvailableSlotsForDate({ date, minimumStartMinutes, requestedDuration, timeSlots, reservations }) {
  const slots = [...timeSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const suggestions = [];

  for (let startIndex = 0; startIndex < slots.length; startIndex += 1) {
    const firstSlot = slots[startIndex];
    const startMinutes = timeToMinutes(firstSlot.startTime);

    if (startMinutes < minimumStartMinutes) {
      continue;
    }

    let endTime = firstSlot.endTime;
    let endMinutes = timeToMinutes(endTime);

    for (let index = startIndex; index < slots.length && endMinutes - startMinutes < requestedDuration; index += 1) {
      const slot = slots[index];

      if (index > startIndex && normalizeScheduleTime(slot.startTime) !== normalizeScheduleTime(endTime)) {
        break;
      }

      endTime = slot.endTime;
      endMinutes = timeToMinutes(endTime);
    }

    if (endMinutes - startMinutes !== requestedDuration) {
      continue;
    }

    if (reservations.some((reservation) => (
      reservation.reservationDate === date &&
      timeRangesOverlap(firstSlot.startTime, endTime, reservation.startTime, reservation.endTime)
    ))) {
      continue;
    }

    suggestions.push({
      date,
      slotId: firstSlot.slotId,
      name: `${formatDisplayTime(firstSlot.startTime)} - ${formatDisplayTime(endTime)}`,
      startTime: normalizeScheduleTime(firstSlot.startTime),
      endTime: normalizeScheduleTime(endTime)
    });
  }

  return suggestions;
}

function buildAvailabilityValidationErrors({ date, rawStartTime, rawEndTime, startTime, endTime }) {
  const errors = {};

  if (!date) {
    errors.date = "Date is required.";
  } else if (!isValidDateString(date)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  }

  if (!clean(rawStartTime)) {
    errors.startTime = "Start time is required.";
  } else if (!startTime) {
    errors.startTime = "Start time must use HH:MM format.";
  }

  if (!clean(rawEndTime)) {
    errors.endTime = "End time is required.";
  } else if (!endTime) {
    errors.endTime = "End time must use HH:MM format.";
  } else if (startTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    errors.endTime = "End time must be after start time.";
  }

  return errors;
}

function validateAvailabilitySlotCoverage({ startTime, endTime, timeSlots }) {
  const requestedEndMinutes = timeToMinutes(endTime);
  let nextStartTime = startTime;
  let matchedSlot = false;
  const slots = [...timeSlots]
    .map((slot) => ({
      ...slot,
      startTime: normalizeScheduleTime(slot.startTime),
      endTime: normalizeScheduleTime(slot.endTime)
    }))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (const slot of slots) {
    if (slot.startTime !== nextStartTime) {
      continue;
    }

    matchedSlot = true;
    nextStartTime = slot.endTime;

    if (nextStartTime === endTime) {
      return "";
    }

    if (timeToMinutes(nextStartTime) > requestedEndMinutes) {
      break;
    }
  }

  return matchedSlot ?
    "Requested time must be covered by contiguous active court schedule slots." :
    "Requested time must be covered by active court schedule slots.";
}

function isValidDateString(value) {
  return DATE_PATTERN.test(value) && isRealDate(value);
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

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function getWeekStartDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return addDays(dateString, -date.getUTCDay());
}

function normalizeScheduleTime(value) {
  const match = String(value || "").match(/\d{2}:\d{2}/);
  return match ? match[0] : "";
}

function formatDisplayTime(value) {
  const normalized = normalizeScheduleTime(value);
  const [hours, minutes] = normalized.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function parsePositiveIntegerParam(value) {
  const text = String(value || "").trim();

  if (!/^[1-9]\d*$/.test(text)) {
    return null;
  }

  return Number(text);
}

export function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
