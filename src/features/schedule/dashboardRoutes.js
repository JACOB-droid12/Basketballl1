import { Router } from "express";

import { getTimeSlots, listReservations } from "../reservations/reservationRepository.js";
import {
  buildDailySchedule,
  buildDashboardSummary,
  buildWeeklySchedule,
  findNearestAvailableSlot
} from "./scheduleService.js";

export function createDashboardRoutes({
  db,
  todayProvider = getTodayDate,
  currentTimeProvider = getCurrentManilaTime,
  repositories = { getTimeSlots, listReservations }
} = {}) {
  const router = Router();

  router.get("/dashboard", async (_request, response) => {
    const today = todayProvider();

    try {
      const timeSlots = await repositories.getTimeSlots(db);
      const todayReservations = await repositories.listReservations(db, { reservationDate: today });
      const upcomingReservations = await collectUpcomingReservations({
        db,
        repositories,
        startDate: addDays(today, 1),
        days: 7
      });
      const suggestionReservations = await collectUpcomingReservations({
        db,
        repositories,
        startDate: today,
        days: 14
      });
      const weekStartDate = getWeekStartDate(today);
      const weeklyReservations = await collectUpcomingReservations({
        db,
        repositories,
        startDate: weekStartDate,
        days: 7
      });
      const todaySchedule = buildDailySchedule({ date: today, timeSlots, reservations: todayReservations });
      const weeklySchedule = buildWeeklySchedule({
        weekStartDate,
        timeSlots,
        reservations: weeklyReservations
      });
      const currentTime = currentTimeProvider();
      const summary = buildDashboardSummary({ today, todaySchedule, upcomingReservations, currentTime });
      const nearestAvailableSlot = findNearestAvailableSlot({
        startDate: today,
        timeSlots,
        reservations: suggestionReservations,
        searchDays: 14,
        currentTime
      });

      response.render("dashboard", {
        active: "dashboard",
        summary,
        todaySchedule,
        weeklySchedule,
        nearestAvailableSlot,
        displayWeekRange: formatWeekRange(today),
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("dashboard", {
        active: "dashboard",
        summary: buildDashboardSummary({ today, todaySchedule: [], upcomingReservations: [] }),
        todaySchedule: [],
        weeklySchedule: buildWeeklySchedule({
          weekStartDate: getWeekStartDate(today),
          timeSlots: [],
          reservations: []
        }),
        nearestAvailableSlot: null,
        displayWeekRange: formatWeekRange(today),
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  return router;
}

async function collectUpcomingReservations({ db, repositories, startDate, days }) {
  const results = [];

  for (let offset = 0; offset < days; offset += 1) {
    const reservationDate = addDays(startDate, offset);
    const reservations = await repositories.listReservations(db, { reservationDate });
    results.push(...reservations);
  }

  return results.sort((a, b) => `${a.reservationDate} ${a.startTime}`.localeCompare(`${b.reservationDate} ${b.startTime}`));
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentManilaTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
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

function formatWeekRange(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (![year, month, day].every(Number.isInteger)) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(weekStart);
  const endMonthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(weekEnd);
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const endYear = weekEnd.getUTCFullYear();

  if (monthName === endMonthName) {
    return `${monthName}, ${startDay} - ${endDay}, ${endYear}`;
  }

  return `${monthName} ${startDay} - ${endMonthName} ${endDay}, ${endYear}`;
}
