import express from "express";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createActivityLogRoutes } from "../src/features/activityLogs/activityLogRoutes.js";
import { createApiRoutes } from "../src/features/api/apiRoutes.js";
import { createReactAppRoutes } from "../src/features/frontend/reactAppRoutes.js";
import { createPrototypeApiRoutes } from "../src/features/prototype/prototypeApiRoutes.js";
import { createPrototypeRoutes } from "../src/features/prototype/prototypeRoutes.js";
import { createReservationRoutes } from "../src/features/reservations/reservationRoutes.js";
import { createDashboardRoutes } from "../src/features/schedule/dashboardRoutes.js";
import { createScheduleRoutes } from "../src/features/schedule/scheduleRoutes.js";
import { createAuthRoutes } from "../src/features/users/authRoutes.js";
import { requireSignedIn } from "../src/features/users/sessionMiddleware.js";

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TODAY = "2026-05-08";

export function buildSmokePages() {
  return [
    { path: "/", expectedText: "Barangay Sto. Niño - Basketball Court Scheduling" },
    { path: "/prototype", expectedText: "/js/prototype-backend.js" },
    { path: "/api/session", expectedText: "\"authenticated\":true" },
    { path: "/api/dashboard", expectedText: "\"todaySchedule\"" },
    { path: `/api/schedule?date=${TODAY}`, expectedText: "\"rows\"" },
    { path: "/api/reservations", expectedText: "Sto. Nino Youth Team" },
    { path: "/api/activity-logs", expectedText: "CREATE_RESERVATION" },
    { path: "/api/reports", expectedText: "\"summary\"" },
    { path: "/api/accounts", expectedText: "System Administrator" },
    { path: "/api/prototype/session", expectedText: "\"authenticated\":true" },
    { path: "/api/prototype/reservations", expectedText: "Sto. Nino Youth Team" },
    { path: "/login", expectedText: "id=\"root\"" },
    { path: "/dashboard", expectedText: "id=\"root\"" },
    { path: "/schedule", expectedText: "id=\"root\"" },
    { path: "/reservations", expectedText: "id=\"root\"" },
    { path: "/reservations/new", expectedText: "id=\"root\"" },
    { path: "/reservations/10", expectedText: "id=\"root\"" },
    { path: "/reservations/10/edit", expectedText: "id=\"root\"" },
    { path: "/account", expectedText: "id=\"root\"" },
    { path: "/account/password", expectedText: "id=\"root\"" },
    { path: "/activity-logs", expectedText: "id=\"root\"" },
    { path: "/reports", expectedText: "id=\"root\"" }
  ];
}

export function buildOfficeSmokeApp() {
  const app = express();
  const repositories = buildSmokeRepositories();

  app.set("view engine", "ejs");
  app.set("views", path.join(PROJECT_ROOT, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(PROJECT_ROOT, "public")));
  app.use((request, _response, next) => {
    request.session = {
      user: request.path === "/login" ? null : {
        userId: 1,
        fullName: "System Administrator",
        username: "admin",
        role: "ADMIN"
      }
    };
    next();
  });

  app.use(createPrototypeRoutes());
  app.use(createReactAppRoutes({ routes: ["/login"] }));
  app.use(createApiRoutes({
    db: {},
    todayProvider: () => TODAY,
    repositories
  }));
  app.use(createPrototypeApiRoutes({
    db: {},
    todayProvider: () => TODAY,
    repositories: {
      createReservation: repositories.createReservation,
      createUser: repositories.createUser,
      findUserByUsername: repositories.findUserByUsername,
      getReservationById: repositories.getReservationById,
      listReservations: repositories.listReservations,
      listUsers: repositories.listUsers,
      updateReservation: repositories.updateReservation,
      updateReservationStatus: repositories.updateReservationStatus
    }
  }));
  app.use(createAuthRoutes({
    db: {},
    enableLegacyAccountUi: false,
    repositories: {
      createUser: repositories.createUser,
      findUserByUsername: repositories.findUserByUsername,
      listUsers: repositories.listUsers,
      updateUserAccountStatus: repositories.updateUserAccountStatus,
      updateUserPassword: repositories.updateUserPassword
    }
  }));
  app.use(requireSignedIn);
  app.use(createReactAppRoutes());
  app.use(createDashboardRoutes({
    db: {},
    todayProvider: () => TODAY,
    repositories: {
      getTimeSlots: repositories.getTimeSlots,
      listReservations: repositories.listReservations
    }
  }));
  app.use(createReservationRoutes({
    db: {},
    todayProvider: () => TODAY,
    repositories: {
      createReservation: repositories.createReservation,
      getReservationById: repositories.getReservationById,
      getReservationStatuses: repositories.getReservationStatuses,
      listReservations: repositories.listReservations,
      updateReservation: repositories.updateReservation,
      updateReservationStatus: repositories.updateReservationStatus
    }
  }));
  app.use(createScheduleRoutes({
    db: {},
    todayProvider: () => TODAY,
    repositories: {
      getTimeSlots: repositories.getTimeSlots,
      listReservations: repositories.listReservations
    }
  }));
  app.use(createActivityLogRoutes({
    db: {},
    repositories: {
      listActivityLogs: repositories.listActivityLogs
    }
  }));

  return app;
}

export async function fetchSmokePages(baseUrl, pages = buildSmokePages()) {
  const results = [];

  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page.path}`);
    const body = await response.text();

    if (response.status !== 200) {
      throw new Error(`UI smoke check failed for ${page.path}: expected HTTP 200, got ${response.status}.`);
    }

    if (!body.includes(page.expectedText)) {
      throw new Error(`UI smoke check failed for ${page.path}: expected page text "${page.expectedText}".`);
    }

    results.push({
      path: page.path,
      status: response.status
    });
  }

  return results;
}

export async function runUiSmokeVerification(output = console) {
  const app = buildOfficeSmokeApp();
  const server = app.listen(0);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const results = await fetchSmokePages(baseUrl);

    output.log(`UI smoke verification passed for ${results.length} office screens.`);
    return results;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function buildSmokeRepositories() {
  const timeSlots = [
    { slotId: 1, name: "7:00 AM - 8:00 AM", startTime: "07:00", endTime: "08:00" },
    { slotId: 2, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
    { slotId: 3, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" }
  ];
  const reservations = [
    {
      reservationId: 10,
      reservationDate: TODAY,
      startTime: "07:00",
      endTime: "08:00",
      purpose: "Practice",
      remarks: "Smoke verification record",
      statusCode: "RESERVED",
      statusName: "Reserved",
      representativeName: "Sto. Nino Youth Team",
      contactNo: "09171234567",
      address: "Purok 3, Barangay Sto. Nino",
      createdByName: "System Administrator"
    },
    {
      reservationId: 11,
      reservationDate: "2026-05-09",
      startTime: "08:00",
      endTime: "09:00",
      purpose: "Game",
      remarks: "",
      statusCode: "COMPLETED",
      statusName: "Completed",
      representativeName: "Saturday League",
      contactNo: "09170000000",
      address: "Barangay Sto. Nino",
      createdByName: "System Administrator"
    }
  ];
  const statuses = [
    { statusCode: "RESERVED", statusName: "Reserved" },
    { statusCode: "MISSED", statusName: "Missed" },
    { statusCode: "CANCELLED", statusName: "Cancelled" },
    { statusCode: "COMPLETED", statusName: "Completed" }
  ];
  const users = [
    {
      userId: 1,
      fullName: "System Administrator",
      username: "admin",
      role: "ADMIN",
      accountStatus: "ACTIVE",
      createdAt: "2026-05-08"
    },
    {
      userId: 2,
      fullName: "Court Staff",
      username: "staff",
      role: "STAFF",
      accountStatus: "ACTIVE",
      createdAt: "2026-05-08"
    }
  ];

  return {
    createReservation: async () => 99,
    createUser: async (_db, user) => ({ ...user, role: user.role }),
    findUserByUsername: async () => null,
    getReservationById: async (_db, reservationId) =>
      reservations.find((reservation) => Number(reservation.reservationId) === Number(reservationId)) || null,
    getReservationStatuses: async () => statuses,
    getTimeSlots: async () => timeSlots,
    listActivityLogs: async () => [
      {
        createdAt: "2026-05-08 08:00",
        action: "CREATE_RESERVATION",
        userName: "System Administrator",
        reservationId: 10,
        reservationDate: TODAY,
        reservationStartTime: "07:00",
        reservationEndTime: "08:00",
        details: "Created smoke verification reservation."
      }
    ],
    listReservations: async (_db, filters = {}) => {
      if (filters.reservationDate) {
        return reservations.filter((reservation) => reservation.reservationDate === filters.reservationDate);
      }

      return reservations;
    },
    listUsers: async () => users,
    updateReservation: async () => {},
    updateReservationStatus: async () => {},
    updateUserAccountStatus: async () => {},
    updateUserPassword: async () => {}
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runUiSmokeVerification().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
