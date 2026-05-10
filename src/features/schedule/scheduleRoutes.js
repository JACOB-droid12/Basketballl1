import { Router } from "express";

import { getTimeSlots, listReservations } from "../reservations/reservationRepository.js";
import { buildDailySchedule } from "./scheduleService.js";

const defaultRepositories = { getTimeSlots, listReservations };

export function createScheduleRoutes({ db, todayProvider = getTodayDate, repositories = {} } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/schedule", async (request, response) => {
    const date = String(request.query.date || todayProvider()).trim();

    try {
      const [timeSlots, reservations] = await Promise.all([
        repo.getTimeSlots(db),
        repo.listReservations(db, { reservationDate: date })
      ]);

      response.render("schedule/index", {
        active: "schedule",
        date,
        schedule: buildDailySchedule({ date, timeSlots, reservations }),
        displayWeekRange: formatWeekRange(date),
        displayDateLabel: formatDisplayDate(date),
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("schedule/index", {
        active: "schedule",
        date,
        schedule: [],
        displayWeekRange: formatWeekRange(date),
        displayDateLabel: formatDisplayDate(date),
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  return router;
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

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (![year, month, day].every(Number.isInteger)) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC"
  }).format(date);
}
