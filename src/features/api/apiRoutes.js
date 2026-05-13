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
import { timeToMinutes, validateReservationInput } from "../reservations/reservationValidation.js";
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
    try {
      const reservation = await repo.getReservationById(db, request.params.reservationId);

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
    const result = validateReservationInput(request.body, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const updated = await repo.updateReservation(db, request.params.reservationId, result.value, {
        userId: request.session.user.userId
      });
      const reservation = updated || await repo.getReservationById(db, request.params.reservationId);
      response.json({ reservation: toApiReservation(reservation) });
    } catch (error) {
      sendReservationMutationError(response, error);
    }
  });

  router.post("/api/reservations/:reservationId/status", async (request, response) => {
    const statusCode = String(request.body.statusCode || "").trim().toUpperCase();
    const allowed = new Set(["MISSED", "CANCELLED", "COMPLETED"]);

    if (!allowed.has(statusCode)) {
      response.status(400).json({ error: "Reservation status is invalid." });
      return;
    }

    try {
      const updated = await repo.updateReservationStatus(db, request.params.reservationId, statusCode, {
        userId: request.session.user.userId
      });
      const reservation = updated || await repo.getReservationById(db, request.params.reservationId);
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
    const startTime = normalizeScheduleTime(request.query.startTime);
    const endTime = normalizeScheduleTime(request.query.endTime);

    if (!date || !startTime || !endTime) {
      sendValidationError(response, buildAvailabilityValidationErrors({ date, startTime, endTime }));
      return;
    }

    try {
      const [timeSlots, reservations] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: date })
      ]);
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
    const accountStatus = String(request.body.accountStatus || "").trim().toUpperCase();

    if (!["ACTIVE", "INACTIVE"].includes(accountStatus)) {
      response.status(400).json({ error: "Account status is invalid." });
      return;
    }

    if (Number(request.params.userId) === Number(request.session.user.userId)) {
      response.status(400).json({ error: "You cannot change your own account status." });
      return;
    }

    try {
      await repo.updateUserAccountStatus(db, request.params.userId, accountStatus);
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
    action: clean(query.action),
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
  const results = [];

  for (let offset = 0; offset < days; offset += 1) {
    const reservationDate = addDays(startDate, offset);
    const reservations = await repo.listReservations(db, { reservationDate });
    results.push(...reservations);
  }

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

  return timeSlots
    .filter((slot) => timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime) === requestedDuration)
    .filter((slot) => !reservations.some((reservation) => (
      reservation.reservationDate === date &&
      timeRangesOverlap(slot.startTime, slot.endTime, reservation.startTime, reservation.endTime)
    )))
    .slice(0, 4)
    .map((slot) => ({
      date,
      slotId: slot.slotId,
      name: slot.name,
      startTime: normalizeScheduleTime(slot.startTime),
      endTime: normalizeScheduleTime(slot.endTime)
    }));
}

function buildAvailabilityValidationErrors({ date, startTime, endTime }) {
  const errors = {};

  if (!date) {
    errors.date = "Date is required.";
  }

  if (!startTime) {
    errors.startTime = "Start time is required.";
  }

  if (!endTime) {
    errors.endTime = "End time is required.";
  }

  return errors;
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
