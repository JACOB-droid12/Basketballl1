import bcrypt from "bcryptjs";
import { Router } from "express";

import { listActivityLogs } from "../activityLogs/activityLogRepository.js";
import { getBackupStatus } from "../maintenance/maintenanceRepository.js";
import {
  createReservation,
  getReservationById,
  getReservationSlipData,
  getReservationStatuses,
  getTimeSlots,
  listReservations,
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationPolicyError,
  ReservationUnavailableError,
  updateReservation,
  updateReservationStatus
} from "../reservations/reservationRepository.js";
import {
  createResidentDirectoryEntry,
  deleteResidentDirectoryEntry,
  DuplicateResidentError,
  listResidents,
  ResidentInUseError,
  ResidentNotFoundError,
  updateResidentDirectoryEntry
} from "../residents/residentRepository.js";
import { validateResidentInput } from "../residents/residentValidation.js";
import { findBlockingOverlap, timeRangesOverlap } from "../reservations/reservationOverlap.js";
import { normalizeTime, timeToMinutes, validateReservationInput } from "../reservations/reservationValidation.js";
import {
  buildDailySchedule,
  buildDashboardSummary,
  buildWeeklySchedule,
  findNearestAvailableSlot
} from "../schedule/scheduleService.js";
import {
  clearPublicUseRange,
  createScheduleBlock,
  deactivateScheduleBlock,
  listScheduleBlocks,
  ScheduleBlockConflictError,
  ScheduleBlockNotFoundError,
  ScheduleBlockReservationConflictError
} from "../schedule/scheduleBlockRepository.js";
import {
  CourtPolicyValidationError,
  getCourtPolicySettings,
  updateCourtPolicySettings
} from "../settings/courtPolicyRepository.js";
import {
  createUser,
  DuplicateUsernameError,
  findUserByUsername,
  listUsers,
  updateUserAccountStatus,
  updateUserPassword,
  UserNotFoundError,
  writeUserActivityLog
} from "../users/userRepository.js";
import { validateChangePasswordInput, validateCreateUserInput } from "../users/userValidation.js";
import { sendAdminRequired, sendDatabaseError, sendLoginRequired, sendValidationError } from "./apiErrors.js";
import {
  buildActivityLogsCsv,
  buildDailyScheduleCsv,
  buildReportsCsv,
  buildReservationsCsv,
  buildWeeklyScheduleCsv
} from "./apiExports.js";
import { toApiAccount, toApiReservation, toApiScheduleBlock, toApiScheduleSlot, toApiUser } from "./apiMappers.js";
import { buildReportsPayload } from "./apiReports.js";

const defaultRepositories = {
  clearPublicUseRange,
  createReservation,
  createResidentDirectoryEntry,
  createScheduleBlock,
  createUser,
  deactivateScheduleBlock,
  deleteResidentDirectoryEntry,
  findUserByUsername,
  getBackupStatus,
  getCourtPolicySettings,
  getReservationById,
  getReservationSlipData,
  getReservationStatuses,
  getTimeSlots,
  listActivityLogs,
  listResidents,
  listScheduleBlocks,
  listReservations,
  listUsers,
  updateCourtPolicySettings,
  updateReservation,
  updateResidentDirectoryEntry,
  updateReservationStatus,
  updateUserAccountStatus,
  updateUserPassword,
  writeUserActivityLog
};
const AVAILABILITY_SUGGESTION_SEARCH_DAYS = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESERVATION_FILTER_STATUS_CODES = new Set(["RESERVED", "MISSED", "CANCELLED", "COMPLETED"]);
const SCHEDULE_BLOCK_REASON_MAX_LENGTH = 255;

export function createApiRoutes({
  db,
  repositories = {},
  todayProvider = getTodayDate,
  currentTimeProvider = getCurrentManilaTime
} = {}) {
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
      await repo.writeUserActivityLog(db, {
        userId: user.userId,
        action: "LOGIN",
        details: "User logged in."
      });
      response.json({ user: toApiUser(request.session.user) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/logout", async (request, response) => {
    const user = request.session?.user || null;
    await writeLogoutActivityLog({ repo, db, user });

    if (typeof request.session?.destroy === "function") {
      request.session.destroy(() => response.json({ ok: true }));
      return;
    }

    request.session.user = null;
    response.json({ ok: true });
  });

  router.use("/api", requireApiSignedIn);

  router.post("/api/account/password", async (request, response) => {
    const result = validateChangePasswordInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const user = await repo.findUserByUsername(db, request.session.user.username);
      const currentPasswordMatches = user ?
        await bcrypt.compare(result.value.currentPassword, user.passwordHash) :
        false;

      if (!currentPasswordMatches) {
        sendValidationError(response, { currentPassword: "Current password is incorrect." });
        return;
      }

      await repo.updateUserPassword(db, request.session.user.userId, result.value.newPassword, {
        userId: request.session.user.userId
      });
      response.json({ ok: true });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/settings/court-policy", async (_request, response) => {
    try {
      const policy = await repo.getCourtPolicySettings(db);
      response.json({ policy });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.put("/api/settings/court-policy", requireApiAdmin, async (request, response) => {
    try {
      const policy = await repo.updateCourtPolicySettings(db, request.body, {
        userId: request.session.user.userId
      });
      response.json({ policy });
    } catch (error) {
      if (error instanceof CourtPolicyValidationError) {
        sendValidationError(response, error.errors);
        return;
      }

      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reservations", async (request, response) => {
    const filters = cleanReservationFilters(request.query);

    if (!filters.valid) {
      sendValidationError(response, filters.errors);
      return;
    }

    try {
      const reservations = await repo.listReservations(db, filters.value);
      response.json({ reservations: reservations.map(toApiReservation) });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reservations/history", async (request, response) => {
    const filters = cleanReservationHistoryFilters(request.query);

    if (!filters.valid) {
      sendValidationError(response, filters.errors);
      return;
    }

    try {
      const reservations = await repo.listReservations(db, filters.value);
      response.json(buildReservationHistoryPayload({
        today: todayProvider(),
        reservations
      }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reservations/:reservationId/slip", async (request, response) => {
    const reservationId = parsePositiveIntegerParam(request.params.reservationId);

    if (!reservationId) {
      response.status(400).json({ error: "Reservation ID must be a positive integer." });
      return;
    }

    try {
      const slip = await repo.getReservationSlipData(db, reservationId, {
        issuedAt: buildIssuedAt(todayProvider(), currentTimeProvider())
      });
      response.json({ slip });
    } catch (error) {
      sendReservationMutationError(response, error);
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
      { today: todayProvider(), currentTime: currentTimeProvider(), requireTodayOrFuture: true }
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
      currentTime: currentTimeProvider(),
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

  router.get("/api/dashboard/alerts", async (_request, response) => {
    const today = todayProvider();

    try {
      const [todayReservations, blocks, backupStatus] = await Promise.all([
        repo.listReservations(db, { reservationDate: today }),
        repo.listScheduleBlocks(db, { date: today }),
        repo.getBackupStatus(db, { today })
      ]);

      response.json(buildDashboardAlertsPayload({
        today,
        currentTime: currentTimeProvider(),
        reservations: todayReservations,
        blocks,
        backupStatus
      }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/dashboard", async (_request, response) => {
    const today = todayProvider();

    try {
      const [
        timeSlots,
        todayReservations,
        upcomingReservations,
        suggestionReservations,
        todayBlocks,
        suggestionBlocks
      ] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: today }),
        collectReservationsByDate({ db, repo, startDate: addDays(today, 1), days: 7 }),
        collectReservationsByDate({ db, repo, startDate: today, days: 14 }),
        repo.listScheduleBlocks(db, { date: today }),
        repo.listScheduleBlocks(db, { fromDate: today, toDate: addDays(today, 13) })
      ]);
      const todaySchedule = buildDailySchedule({ date: today, timeSlots, reservations: todayReservations, blocks: todayBlocks });
      const summary = buildDashboardSummary({ today, todaySchedule, upcomingReservations });
      const nearestAvailableSlot = findNearestAvailableSlot({
        startDate: today,
        timeSlots,
        reservations: suggestionReservations,
        blocks: suggestionBlocks,
        searchDays: 14,
        currentTime: currentTimeProvider()
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

  router.get("/api/schedule/daily-print", async (request, response) => {
    const date = clean(request.query.date) || todayProvider();

    if (!isValidDateString(date)) {
      sendValidationError(response, { date: "Date must use YYYY-MM-DD format." });
      return;
    }

    try {
      const [timeSlots, reservations, blocks] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: date }),
        repo.listScheduleBlocks(db, { date })
      ]);
      const schedule = buildDailySchedule({ date, timeSlots, reservations, blocks });

      response.json(buildDailyPrintPayload({
        date,
        generatedAt: buildIssuedAt(todayProvider(), currentTimeProvider()),
        schedule,
        blocks
      }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/exports/daily-schedule.csv", async (request, response) => {
    const date = clean(request.query.date) || todayProvider();

    if (!isValidDateString(date)) {
      sendValidationError(response, { date: "Date must use YYYY-MM-DD format." });
      return;
    }

    try {
      const [timeSlots, reservations, blocks] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: date }),
        repo.listScheduleBlocks(db, { date })
      ]);
      const slots = buildDailySchedule({ date, timeSlots, reservations, blocks })
        .map(toApiScheduleSlot)
        .map((slot) => ({ ...slot, date }));

      sendCsv(response, `daily-schedule-${date}-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`, buildDailyScheduleCsv({ slots }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/exports/weekly-schedule.csv", async (request, response) => {
    const date = clean(request.query.date) || todayProvider();

    if (!isValidDateString(date)) {
      sendValidationError(response, { date: "Date must use YYYY-MM-DD format." });
      return;
    }

    const weekStartDate = getWeekStartDate(date);

    try {
      const [timeSlots, reservations, blocks] = await Promise.all([
        repo.getTimeSlots(db),
        collectReservationsByDate({ db, repo, startDate: weekStartDate, days: 7 }),
        repo.listScheduleBlocks(db, { fromDate: weekStartDate, toDate: addDays(weekStartDate, 6) })
      ]);
      const weeklySchedule = buildWeeklySchedule({ weekStartDate, timeSlots, reservations, blocks });
      const rows = weeklySchedule.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell, index) => ({
          ...toApiScheduleSlot(cell),
          date: weeklySchedule.days[index].date
        }))
      }));

      sendCsv(response, `weekly-schedule-${weekStartDate}-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`, buildWeeklyScheduleCsv({ rows }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/exports/monthly-reservations.csv", async (request, response) => {
    const month = clean(request.query.month) || todayProvider().slice(0, 7);
    const monthRange = getMonthDateRange(month);

    if (!monthRange) {
      sendValidationError(response, { month: "Month must use YYYY-MM format." });
      return;
    }

    try {
      const reservations = await repo.listReservations(db, {
        fromDate: monthRange.fromDate,
        toDate: monthRange.toDate
      });
      sendCsv(response, `monthly-reservations-${month}-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`, buildReservationsCsv(reservations.map(toApiReservation)));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/exports/activity-logs.csv", async (request, response) => {
    const activityLogFilters = cleanActivityLogFilters(request.query);

    if (!activityLogFilters.valid) {
      sendValidationError(response, activityLogFilters.errors);
      return;
    }

    try {
      const logs = await repo.listActivityLogs(db, activityLogFilters.value);
      sendCsv(response, `activity-logs-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`, buildActivityLogsCsv(logs));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/exports/missed-reservations.csv", async (request, response) => {
    await sendReservationStatusExport({ request, response, repo, db, statusCode: "MISSED", todayProvider, currentTimeProvider });
  });

  router.get("/api/exports/cancelled-reservations.csv", async (request, response) => {
    await sendReservationStatusExport({ request, response, repo, db, statusCode: "CANCELLED", todayProvider, currentTimeProvider });
  });

  router.get("/api/exports/reports.csv", async (request, response) => {
    const reportFilters = cleanReportFilters(request.query);

    if (!reportFilters.valid) {
      sendValidationError(response, reportFilters.errors);
      return;
    }

    try {
      const [reservations, blocks] = await Promise.all([
        repo.listReservations(db, reportFilters.value),
        repo.listScheduleBlocks(db, { ...reportFilters.value, activeOnly: false })
      ]);
      const report = buildReportsPayload(reservations, { blocks });

      sendCsv(response, `reports-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`, buildReportsCsv(report));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/schedule/blocks", requireApiAdmin, async (request, response) => {
    const result = validateScheduleBlockInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const block = await repo.createScheduleBlock(db, result.value, {
        userId: request.session.user.userId
      });
      response.status(201).json({ block: toApiScheduleBlock(block) });
    } catch (error) {
      sendScheduleBlockMutationError(response, error);
    }
  });

  router.delete("/api/schedule/blocks/:blockId", requireApiAdmin, async (request, response) => {
    const blockId = parsePositiveIntegerParam(request.params.blockId);

    if (!blockId) {
      response.status(400).json({ error: "Schedule block ID must be a positive integer." });
      return;
    }

    try {
      const block = await repo.deactivateScheduleBlock(db, blockId, {
        userId: request.session.user.userId
      });
      response.json({ block: toApiScheduleBlock(block) });
    } catch (error) {
      sendScheduleBlockMutationError(response, error);
    }
  });

  router.post("/api/schedule/clear-public-use", requireApiAdmin, async (request, response) => {
    const result = validateClearPublicUseInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const clearResult = await repo.clearPublicUseRange(db, result.value, {
        userId: request.session.user.userId
      });
      response.status(201).json({
        block: toApiScheduleBlock(clearResult.block),
        cancelledReservations: clearResult.cancelledReservations.map(toApiReservation)
      });
    } catch (error) {
      sendScheduleBlockMutationError(response, error);
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
      const blocks = await repo.listScheduleBlocks(db, { fromDate: weekStartDate, toDate: addDays(weekStartDate, 6) });
      const weeklySchedule = buildWeeklySchedule({ weekStartDate, timeSlots, reservations, blocks });

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
    const excludeReservationIdText = clean(request.query.reservationId || request.query.excludeReservationId);
    const excludeReservationId = excludeReservationIdText ? parsePositiveIntegerParam(excludeReservationIdText) : null;
    const validationErrors = buildAvailabilityValidationErrors({
      date,
      rawStartTime: request.query.startTime,
      rawEndTime: request.query.endTime,
      startTime,
      endTime,
      today: todayProvider(),
      currentTime: currentTimeProvider(),
      excludeReservationIdText,
      excludeReservationId
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
      const blocks = await repo.listScheduleBlocks(db, {
        fromDate: date,
        toDate: addDays(date, AVAILABILITY_SUGGESTION_SEARCH_DAYS)
      });
      const activeReservations = reservations.filter((reservation) => String(reservation.statusCode).toUpperCase() === "RESERVED");
      const suggestionReservations = excludeReservationId ?
        activeReservations.filter((reservation) => Number(reservation.reservationId) !== excludeReservationId) :
        activeReservations;
      const conflict = findBlockingOverlap(
        { reservationId: excludeReservationId, reservationDate: date, startTime, endTime, statusCode: "RESERVED" },
        activeReservations
      );
      const blockConflict = findScheduleBlockOverlap({ date, startTime, endTime, blocks });

      response.json({
        available: !conflict && !blockConflict,
        conflict: toApiReservation(conflict),
        block: toApiScheduleBlock(blockConflict),
        suggestions: findAvailabilitySuggestions({ date, startTime, endTime, timeSlots, reservations: suggestionReservations, blocks })
      });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/residents", async (request, response) => {
    try {
      const residents = await repo.listResidents(db, cleanResidentFilters(request.query));
      response.json({ residents });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.post("/api/residents", async (request, response) => {
    const result = validateResidentInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const resident = await repo.createResidentDirectoryEntry(db, result.value, {
        userId: request.session.user.userId
      });
      response.status(201).json({ resident });
    } catch (error) {
      sendResidentMutationError(response, error);
    }
  });

  router.put("/api/residents/:residentId", async (request, response) => {
    const residentId = parsePositiveIntegerParam(request.params.residentId);

    if (!residentId) {
      response.status(400).json({ error: "Resident ID must be a positive integer." });
      return;
    }

    const result = validateResidentInput(request.body);

    if (!result.valid) {
      sendValidationError(response, result.errors);
      return;
    }

    try {
      const resident = await repo.updateResidentDirectoryEntry(db, residentId, result.value, {
        userId: request.session.user.userId
      });
      response.json({ resident });
    } catch (error) {
      sendResidentMutationError(response, error);
    }
  });

  router.delete("/api/residents/:residentId", async (request, response) => {
    const residentId = parsePositiveIntegerParam(request.params.residentId);

    if (!residentId) {
      response.status(400).json({ error: "Resident ID must be a positive integer." });
      return;
    }

    try {
      const resident = await repo.deleteResidentDirectoryEntry(db, residentId, {
        userId: request.session.user.userId
      });
      response.json({ resident });
    } catch (error) {
      sendResidentMutationError(response, error);
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
      await repo.updateUserAccountStatus(db, userId, accountStatus, {
        userId: request.session.user.userId
      });
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
    const activityLogFilters = cleanActivityLogFilters(request.query);

    if (!activityLogFilters.valid) {
      sendValidationError(response, activityLogFilters.errors);
      return;
    }

    try {
      const logs = await repo.listActivityLogs(db, activityLogFilters.value);
      response.json({ logs });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/maintenance/backup-status", async (_request, response) => {
    try {
      const backupStatus = await repo.getBackupStatus(db, { today: todayProvider() });
      response.json({ backupStatus });
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  router.get("/api/reports", async (request, response) => {
    const reportFilters = cleanReportFilters(request.query);

    if (!reportFilters.valid) {
      sendValidationError(response, reportFilters.errors);
      return;
    }

    try {
      const [reservations, blocks] = await Promise.all([
        repo.listReservations(db, reportFilters.value),
        repo.listScheduleBlocks(db, { ...reportFilters.value, activeOnly: false })
      ]);
      response.json(buildReportsPayload(reservations, { blocks }));
    } catch (error) {
      sendDatabaseError(response, error);
    }
  });

  return router;
}

async function writeLogoutActivityLog({ repo, db, user }) {
  if (!user?.userId) {
    return;
  }

  try {
    await repo.writeUserActivityLog(db, {
      userId: user.userId,
      action: "LOGOUT",
      details: "User logged out."
    });
  } catch (error) {
    console.error("Unable to write logout activity log:", error.message);
  }
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
  const reservationDate = clean(query.reservationDate || query.date);
  const statusCode = clean(query.statusCode || query.status).toUpperCase();
  const errors = {};
  const value = {
    reservationDate,
    statusCode,
    search: clean(query.search),
    purpose: clean(query.purpose)
  };

  if (reservationDate && !isValidDateString(reservationDate)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  }

  if (statusCode && !RESERVATION_FILTER_STATUS_CODES.has(statusCode)) {
    errors.status = "Status must be RESERVED, MISSED, CANCELLED, or COMPLETED.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

function cleanReservationHistoryFilters(query) {
  const contactNumber = clean(query.contactNumber || query.contactNo);
  const representativeName = clean(query.name || query.representativeName);
  const errors = {};
  const value = {};

  if (!contactNumber && !representativeName) {
    errors.lookup = "Provide contactNumber or name.";
  }

  if (contactNumber) {
    value.contactNumber = contactNumber;
  }

  if (representativeName) {
    value.representativeName = representativeName;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

function cleanResidentFilters(query) {
  return {
    search: clean(query.search),
    contactNumber: clean(query.contactNumber || query.contactNo)
  };
}

function cleanActivityLogFilters(query) {
  const date = clean(query.date);
  const from = clean(query.from);
  const to = clean(query.to);
  const errors = {};
  const value = {
    action: clean(query.action).toUpperCase(),
    date: "",
    search: clean(query.search)
  };

  if (date && !isValidDateString(date)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  } else if (date) {
    value.date = date;
  }

  if (from && !isValidDateString(from)) {
    errors.from = "From date must use YYYY-MM-DD format.";
  } else if (from) {
    value.fromDate = from;
  }

  if (to && !isValidDateString(to)) {
    errors.to = "To date must use YYYY-MM-DD format.";
  } else if (to) {
    value.toDate = to;
  }

  addDateRangeOrderError(errors, value.fromDate, value.toDate);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

function cleanReportFilters(query) {
  const from = clean(query.from);
  const to = clean(query.to);
  const errors = {};
  const value = {};

  if (from && !isValidDateString(from)) {
    errors.from = "From date must use YYYY-MM-DD format.";
  } else if (from) {
    value.fromDate = from;
  }

  if (to && !isValidDateString(to)) {
    errors.to = "To date must use YYYY-MM-DD format.";
  } else if (to) {
    value.toDate = to;
  }

  addDateRangeOrderError(errors, value.fromDate, value.toDate);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

function validateScheduleBlockInput(input = {}) {
  const errors = {};
  const date = clean(input.date);
  const mode = clean(input.mode || "TIME_RANGE").toUpperCase();
  const type = clean(input.blockType || input.type).toUpperCase();
  const reason = clean(input.reason);
  const startTime = mode === "WHOLE_DAY" ? "07:00" : normalizeTime(input.startTime);
  const endTime = mode === "WHOLE_DAY" ? "21:00" : normalizeTime(input.endTime);

  if (!date || !isValidDateString(date)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  }

  if (!["WHOLE_DAY", "TIME_RANGE"].includes(mode)) {
    errors.mode = "Maintenance block mode must be WHOLE_DAY or TIME_RANGE.";
  }

  if (!["CLEANING", "BARANGAY_EVENT", "REPAIRS", "TOURNAMENT", "MEETING", "EMERGENCY_USE", "MAINTENANCE"].includes(type)) {
    errors.blockType = "Block type is invalid.";
  }

  if (!reason) {
    errors.reason = "Reason is required.";
  } else if (reason.length > SCHEDULE_BLOCK_REASON_MAX_LENGTH) {
    errors.reason = "Reason must be 255 characters or fewer.";
  }

  if (mode !== "WHOLE_DAY") {
    if (!normalizeTime(input.startTime)) {
      errors.startTime = "Start time must use HH:MM format.";
    }

    if (!normalizeTime(input.endTime)) {
      errors.endTime = "End time must use HH:MM format.";
    } else if (startTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      errors.endTime = "End time must be after start time.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      date,
      startTime,
      endTime,
      category: "MAINTENANCE",
      type,
      mode,
      reason
    }
  };
}

function validateClearPublicUseInput(input = {}) {
  const errors = {};
  const date = clean(input.date);
  const mode = clean(input.mode || "WHOLE_DAY").toUpperCase();
  const reason = clean(input.reason || "Cleared for public use");
  const startTime = mode === "WHOLE_DAY" ? "07:00" : normalizeTime(input.startTime);
  const endTime = mode === "WHOLE_DAY" ? "21:00" :
    mode === "FROM_TIME_ONWARD" ? "21:00" :
      normalizeTime(input.endTime);

  if (!date || !isValidDateString(date)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  }

  if (!["WHOLE_DAY", "TIME_RANGE", "FROM_TIME_ONWARD"].includes(mode)) {
    errors.mode = "Clear mode must be WHOLE_DAY, TIME_RANGE, or FROM_TIME_ONWARD.";
  }

  if (!reason) {
    errors.reason = "Reason is required.";
  } else if (reason.length > SCHEDULE_BLOCK_REASON_MAX_LENGTH) {
    errors.reason = "Reason must be 255 characters or fewer.";
  }

  if (mode !== "WHOLE_DAY" && !normalizeTime(input.startTime)) {
    errors.startTime = "Start time must use HH:MM format.";
  }

  if (mode === "TIME_RANGE" && !normalizeTime(input.endTime)) {
    errors.endTime = "End time must use HH:MM format.";
  }

  if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    errors.endTime = "End time must be after start time.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      date,
      mode,
      startTime,
      endTime,
      reason
    }
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function addDateRangeOrderError(errors, fromDate, toDate) {
  if (fromDate && toDate && fromDate > toDate) {
    errors.dateRange = "From date must be on or before to date.";
  }
}

function sendReservationMutationError(response, error) {
  if (error instanceof ReservationConflictError) {
    response.status(409).json({
      error: error.message,
      overlap: toApiReservation(error.overlap)
    });
    return;
  }

  if (error instanceof ReservationUnavailableError) {
    response.status(409).json({
      error: error.message,
      overlap: toApiScheduleBlock(error.overlap)
    });
    return;
  }

  if (error instanceof ReservationPolicyError) {
    sendValidationError(response, error.errors);
    return;
  }

  if (error instanceof ReservationNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  sendDatabaseError(response, error);
}

function sendScheduleBlockMutationError(response, error) {
  if (error instanceof ScheduleBlockConflictError) {
    response.status(409).json({
      error: error.message,
      overlap: toApiScheduleBlock(error.overlap)
    });
    return;
  }

  if (error instanceof ScheduleBlockReservationConflictError) {
    response.status(409).json({
      error: error.message,
      overlap: toApiReservation(error.overlap)
    });
    return;
  }

  if (error instanceof ScheduleBlockNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  sendDatabaseError(response, error);
}

function sendResidentMutationError(response, error) {
  if (error instanceof DuplicateResidentError) {
    response.status(409).json({
      errors: {
        contactNumber: error.message
      }
    });
    return;
  }

  if (error instanceof ResidentNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof ResidentInUseError) {
    response.status(409).json({ error: error.message });
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

function buildReservationHistoryPayload({ today, reservations = [] }) {
  const sorted = [...reservations].sort((a, b) => (
    `${a.reservationDate} ${a.startTime}`.localeCompare(`${b.reservationDate} ${b.startTime}`) ||
    Number(a.reservationId || 0) - Number(b.reservationId || 0)
  ));
  const counts = {
    missedCount: 0,
    cancelledCount: 0,
    completedCount: 0,
    activeReservationCount: 0
  };

  for (const reservation of sorted) {
    const statusCode = String(reservation.statusCode || "").toUpperCase();

    if (statusCode === "MISSED") {
      counts.missedCount += 1;
    } else if (statusCode === "CANCELLED") {
      counts.cancelledCount += 1;
    } else if (statusCode === "COMPLETED") {
      counts.completedCount += 1;
    } else if (statusCode === "RESERVED") {
      counts.activeReservationCount += 1;
    }
  }

  const pastReservations = sorted
    .filter((reservation) => reservation.reservationDate < today || String(reservation.statusCode).toUpperCase() !== "RESERVED")
    .reverse();
  const upcomingReservations = sorted.filter((reservation) => reservation.reservationDate >= today && String(reservation.statusCode).toUpperCase() === "RESERVED");
  const lastReservation = sorted[sorted.length - 1] || null;

  return {
    lookup: {
      representativeName: sorted[0]?.representativeName || "",
      contactNo: sorted[0]?.contactNo || ""
    },
    summary: {
      totalReservations: sorted.length,
      ...counts,
      lastReservationDate: lastReservation?.reservationDate || null
    },
    pastReservations: pastReservations.map(toApiReservation),
    upcomingReservations: upcomingReservations.map(toApiReservation)
  };
}

function buildDailyPrintPayload({ date, generatedAt, schedule, blocks }) {
  const slots = schedule.map(toApiScheduleSlot);
  const totals = slots.reduce((result, slot) => {
    const key = statusTotalKey(slot.statusCode);
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {
    available: 0,
    reserved: 0,
    missed: 0,
    cancelled: 0,
    completed: 0,
    maintenance: 0,
    clearedPublicUse: 0
  });

  return {
    date,
    generatedAt,
    slots,
    blocks: blocks.map(toApiScheduleBlock),
    totals
  };
}

function buildDashboardAlertsPayload({ today, currentTime, reservations = [], blocks = [], backupStatus = {} }) {
  const activeReservations = reservations
    .filter((reservation) => String(reservation.statusCode || "").toUpperCase() === "RESERVED")
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const missedReservations = reservations
    .filter((reservation) => String(reservation.statusCode || "").toUpperCase() === "MISSED");
  const currentMinutes = timeToMinutes(currentTime);
  const nextReservation = activeReservations.find((reservation) => timeToMinutes(reservation.startTime) >= currentMinutes) || null;
  const publicUseBlocks = blocks.filter((block) => String(block.statusCode || block.category || "").toUpperCase().includes("PUBLIC_USE"));
  const maintenanceBlocks = blocks.filter((block) => String(block.category || "").toUpperCase() === "MAINTENANCE");
  const alerts = [
    {
      type: "TODAY_RESERVATIONS",
      severity: activeReservations.length > 0 ? "info" : "low",
      message: `Today has ${activeReservations.length} active reservation${activeReservations.length === 1 ? "" : "s"}.`,
      count: activeReservations.length
    }
  ];

  if (nextReservation) {
    alerts.push({
      type: "NEXT_RESERVATION",
      severity: "info",
      message: `Next reservation starts in ${Math.max(0, timeToMinutes(nextReservation.startTime) - currentMinutes)} minutes.`,
      reservation: toApiReservation(nextReservation)
    });
  }

  if (missedReservations.length > 0) {
    alerts.push({
      type: "MISSED_PENDING",
      severity: "warning",
      message: `${missedReservations.length} missed reservation${missedReservations.length === 1 ? "" : "s"} need review.`,
      count: missedReservations.length
    });
  }

  if (backupStatus.backupDue) {
    alerts.push({
      type: "BACKUP_DUE",
      severity: "warning",
      message: backupStatus.lastBackupAt ?
        `No backup has been made in ${backupStatus.daysSinceBackup} days.` :
        "No successful backup has been recorded.",
      backupStatus
    });
  }

  if (publicUseBlocks.length > 0) {
    alerts.push({
      type: "PUBLIC_USE_ACTIVE",
      severity: "info",
      message: "A cleared public-use range is active today.",
      count: publicUseBlocks.length
    });
  }

  if (maintenanceBlocks.length > 0) {
    alerts.push({
      type: "MAINTENANCE_ACTIVE",
      severity: "warning",
      message: "The court has maintenance or unavailable blocks today.",
      count: maintenanceBlocks.length
    });
  }

  return {
    date: today,
    alerts,
    metrics: {
      todayReservationCount: activeReservations.length,
      missedPendingCount: missedReservations.length,
      nextReservation: nextReservation ? {
        ...toApiReservation(nextReservation),
        startsInMinutes: Math.max(0, timeToMinutes(nextReservation.startTime) - currentMinutes)
      } : null,
      backupStatus,
      publicUseActiveToday: publicUseBlocks.length > 0,
      maintenanceActiveToday: maintenanceBlocks.length > 0
    }
  };
}

function statusTotalKey(statusCode) {
  const normalized = String(statusCode || "AVAILABLE").toUpperCase();
  const keys = {
    AVAILABLE: "available",
    RESERVED: "reserved",
    MISSED: "missed",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
    MAINTENANCE: "maintenance",
    BARANGAY_EVENT: "maintenance",
    CLEARED_PUBLIC_USE: "clearedPublicUse"
  };

  return keys[normalized] || "maintenance";
}

function buildIssuedAt(date, time) {
  return `${date} ${normalizeScheduleTime(time)}:00`;
}

async function sendReservationStatusExport({ request, response, repo, db, statusCode, todayProvider, currentTimeProvider }) {
  const reportFilters = cleanReportFilters(request.query);

  if (!reportFilters.valid) {
    sendValidationError(response, reportFilters.errors);
    return;
  }

  try {
    const reservations = await repo.listReservations(db, {
      ...reportFilters.value,
      statusCode
    });
    sendCsv(
      response,
      `${statusCode.toLowerCase()}-reservations-${buildExportTimestamp(todayProvider(), currentTimeProvider())}.csv`,
      buildReservationsCsv(reservations.map(toApiReservation))
    );
  } catch (error) {
    sendDatabaseError(response, error);
  }
}

function sendCsv(response, filename, csv) {
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-disposition", `attachment; filename="${filename}"`);
  response.send(csv);
}

function buildExportTimestamp(date, time) {
  return `${date.replaceAll("-", "")}-${normalizeScheduleTime(time).replace(":", "")}00`;
}

function getMonthDateRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    fromDate: `${month}-01`,
    toDate: `${month}-${String(lastDay).padStart(2, "0")}`
  };
}

function findAvailabilitySuggestions({ date, startTime, endTime, timeSlots, reservations, blocks = [] }) {
  const requestedDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
  const sameDaySuggestions = findAvailableSlotsForDate({
    date,
    minimumStartMinutes: timeToMinutes(startTime),
    requestedDuration,
    timeSlots,
    reservations,
    blocks
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
      reservations,
      blocks
    }));
  }

  return futureSuggestions.slice(0, 4);
}

function findAvailableSlotsForDate({ date, minimumStartMinutes, requestedDuration, timeSlots, reservations, blocks = [] }) {
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

    if (findScheduleBlockOverlap({ date, startTime: firstSlot.startTime, endTime, blocks })) {
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

function findScheduleBlockOverlap({ date, startTime, endTime, blocks = [] }) {
  return blocks
    .filter((block) => block.date === date && block.isActive !== false)
    .find((block) => timeRangesOverlap(startTime, endTime, block.startTime, block.endTime)) || null;
}

function buildAvailabilityValidationErrors({ date, rawStartTime, rawEndTime, startTime, endTime, today = "", currentTime = "", excludeReservationIdText = "", excludeReservationId = null }) {
  const errors = {};

  if (!date) {
    errors.date = "Date is required.";
  } else if (!isValidDateString(date)) {
    errors.date = "Date must use YYYY-MM-DD format.";
  } else if (today && date < today) {
    errors.date = "Reservation date cannot be before today.";
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

  if (excludeReservationIdText && !excludeReservationId) {
    errors.reservationId = "Reservation ID must be a positive integer.";
  }

  const normalizedCurrentTime = normalizeTime(currentTime);
  if (!errors.date && !errors.startTime && today && date === today && normalizedCurrentTime && timeToMinutes(startTime) <= timeToMinutes(normalizedCurrentTime)) {
    errors.startTime = "Start time must be later than the current time for today's reservations.";
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

export function getCurrentManilaTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
