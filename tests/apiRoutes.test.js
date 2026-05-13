import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import test from "node:test";

import { createApiRoutes } from "../src/features/api/apiRoutes.js";
import { ReservationConflictError, ReservationNotFoundError } from "../src/features/reservations/reservationRepository.js";
import { DuplicateUsernameError } from "../src/features/users/userRepository.js";

test("GET /api/session returns signed-out state", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/session");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      authenticated: false,
      user: null
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/login verifies a hashed password, normalizes username, stores session user, and returns API user", async () => {
  const session = {};
  const passwordHash = await bcrypt.hash("admin123", 4);
  let receivedUsername = null;
  const app = buildApiTestApp({
    session,
    repositories: {
      findUserByUsername: async (_db, username) => {
        receivedUsername = username;
        return {
          userId: 12,
          fullName: "System Administrator",
          username: "admin",
          passwordHash,
          role: "admin"
        };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/login", {
      username: "  ADMIN  ",
      password: "admin123"
    });

    assert.equal(response.status, 200);
    assert.equal(receivedUsername, "admin");
    assert.deepEqual(session.user, {
      userId: 12,
      fullName: "System Administrator",
      username: "admin",
      role: "admin"
    });
    assert.deepEqual(response.body, {
      user: {
        userId: 12,
        fullName: "System Administrator",
        username: "admin",
        role: "ADMIN"
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations returns 401 JSON when signed out", async () => {
  const app = buildApiTestApp();
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations");

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "Login required." });
  } finally {
    await closeServer(server);
  }
});

test("API protection allows existing prototype API routes to remain available", async () => {
  const app = buildApiTestApp();
  app.get("/api/prototype/session", (_request, response) => {
    response.status(209).json({ ok: true });
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/prototype/session");

    assert.equal(response.status, 209);
    assert.deepEqual(response.body, { ok: true });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations passes cleaned filters and maps reservation rows", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async (_db, filters) => {
        receivedFilters = filters;
        return [buildReservation({ reservationId: 7, representativeName: "Team Alpha" })];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(
      server,
      "/api/reservations?date=2026-05-14&status=reserved&search=%20Alpha%20&purpose=%20Practice%20"
    );

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {
      reservationDate: "2026-05-14",
      statusCode: "RESERVED",
      search: "Alpha",
      purpose: "Practice"
    });
    assert.deepEqual(response.body.reservations, [
      {
        reservationId: 7,
        reservationDate: "2026-05-14",
        startTime: "08:00",
        endTime: "09:00",
        representativeName: "Team Alpha",
        contactNo: "09171234567",
        address: "Purok 3",
        purpose: "Practice",
        remarks: "",
        statusCode: "RESERVED",
        statusName: "Reserved",
        createdByName: "Admin User"
      }
    ]);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations creates a RESERVED reservation with the signed-in creator", async () => {
  let createCall = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 42 }),
    repositories: {
      createReservation: async (_db, reservation, options) => {
        createCall = { reservation, options };
        return 55;
      },
      getReservationById: async (_db, reservationId) => buildReservation({ reservationId: Number(reservationId) })
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", {
      reservationDate: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      representativeName: "Team Alpha",
      contactNo: "09171234567",
      address: "Purok 3",
      purpose: "Practice",
      statusCode: "COMPLETED"
    });

    assert.equal(response.status, 201);
    assert.equal(createCall.options.createdByUserId, 42);
    assert.equal(createCall.reservation.statusCode, "RESERVED");
    assert.equal(response.body.reservation.reservationId, 55);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations returns validation errors as JSON", async () => {
  const app = buildApiTestApp({ session: buildSession() });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", {});

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, {
      reservationDate: "Reservation date is required.",
      startTime: "Start time is required.",
      endTime: "End time is required.",
      representativeName: "Resident or group representative name is required.",
      contactNo: "Contact number is required.",
      address: "Address is required.",
      purpose: "Purpose is required."
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations maps conflict errors to 409 with overlap", async () => {
  const overlap = buildReservation({ reservationId: 9, representativeName: "Existing Team" });
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      createReservation: async () => {
        throw new ReservationConflictError("Reservation overlaps an existing active reservation.", overlap);
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", buildReservationInput());

    assert.equal(response.status, 409);
    assert.equal(response.body.error, "Reservation overlaps an existing active reservation.");
    assert.equal(response.body.overlap.reservationId, 9);
    assert.equal(response.body.overlap.representativeName, "Existing Team");
  } finally {
    await closeServer(server);
  }
});

test("PUT /api/reservations/:reservationId updates with the signed-in user and maps the updated row", async () => {
  let updateCall = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 77 }),
    repositories: {
      updateReservation: async (_db, reservationId, reservation, options) => {
        updateCall = { reservationId, reservation, options };
      },
      getReservationById: async (_db, reservationId) => buildReservation({
        reservationId: Number(reservationId),
        representativeName: "Updated Team"
      })
    }
  });
  const server = app.listen(0);

  try {
    const response = await putJson(server, "/api/reservations/7", buildReservationInput({
      representativeName: "Updated Team"
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(updateCall, {
      reservationId: "7",
      reservation: {
        reservationDate: "2026-05-14",
        startTime: "08:00",
        endTime: "09:00",
        representativeName: "Updated Team",
        contactNo: "09171234567",
        address: "Purok 3",
        purpose: "Practice",
        remarks: "",
        statusCode: "RESERVED"
      },
      options: { userId: 77 }
    });
    assert.equal(response.body.reservation.representativeName, "Updated Team");
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations/:reservationId/status rejects invalid and PENDING status codes and accepts MISSED", async () => {
  const statusCalls = [];
  const app = buildApiTestApp({
    session: buildSession({ userId: 84 }),
    repositories: {
      updateReservationStatus: async (_db, reservationId, statusCode, options) => {
        statusCalls.push({ reservationId, statusCode, options });
      },
      getReservationById: async (_db, reservationId) => buildReservation({
        reservationId: Number(reservationId),
        statusCode: "MISSED"
      })
    }
  });
  const server = app.listen(0);

  try {
    const invalid = await postJson(server, "/api/reservations/7/status", { statusCode: "PENDING" });
    const missed = await postJson(server, "/api/reservations/7/status", { statusCode: "MISSED" });

    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body, { error: "Reservation status is invalid." });
    assert.equal(missed.status, 200);
    assert.deepEqual(statusCalls, [
      {
        reservationId: "7",
        statusCode: "MISSED",
        options: { userId: 84 }
      }
    ]);
    assert.equal(missed.body.reservation.statusCode, "MISSED");
  } finally {
    await closeServer(server);
  }
});

test("POST /api/reservations/:reservationId/status returns 404 when the reservation is missing", async () => {
  const app = buildApiTestApp({
    session: buildSession({ userId: 84 }),
    repositories: {
      updateReservationStatus: async () => {
        throw new ReservationNotFoundError();
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations/404/status", { statusCode: "MISSED" });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Reservation record was not found." });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/dashboard returns today schedule and nearest available slot", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async (_db, filters) => filters.reservationDate === "2026-05-13" ?
        [buildReservation({ reservationDate: "2026-05-13", startTime: "08:00", endTime: "09:00" })] :
        []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/dashboard");

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.today, "2026-05-13");
    assert.equal(response.body.todaySchedule.length, 2);
    assert.equal(response.body.todaySchedule[0].statusCode, "RESERVED");
    assert.deepEqual(response.body.nearestAvailableSlot, {
      date: "2026-05-13",
      slotId: 2,
      name: "9:00 AM - 10:00 AM",
      startTime: "09:00",
      endTime: "10:00"
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/schedule returns week rows with mapped cells", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => [
        buildReservation({ reservationDate: "2026-05-13", startTime: "08:00", endTime: "09:00" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/schedule?date=2026-05-13");

    assert.equal(response.status, 200);
    assert.equal(response.body.weekStartDate, "2026-05-10");
    assert.equal(response.body.days.length, 7);
    assert.equal(response.body.rows.length, 2);
    assert.equal(response.body.rows[0].cells[3].statusCode, "RESERVED");
    assert.equal(response.body.rows[0].cells[3].reservation.reservationId, 1);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability reports conflicts and same-day suggestions", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" },
        { slotId: 3, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" }
      ]),
      listReservations: async () => [
        buildReservation({ reservationId: 8, reservationDate: "2026-05-14", startTime: "08:30", endTime: "09:30" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=09:00");

    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    assert.equal(response.body.conflict.reservationId, 8);
    assert.deepEqual(response.body.suggestions, [
      {
        date: "2026-05-14",
        slotId: 3,
        name: "10:00 AM - 11:00 AM",
        startTime: "10:00",
        endTime: "11:00"
      }
    ]);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability validates date, time, and requested range", async () => {
  const app = buildApiTestApp({ session: buildSession() });
  const server = app.listen(0);

  try {
    const invalidDate = await getJson(server, "/api/availability?date=2026-02-30&startTime=08:00&endTime=09:00");
    const invalidTime = await getJson(server, "/api/availability?date=2026-05-14&startTime=99:99&endTime=09:00");
    const reversedRange = await getJson(server, "/api/availability?date=2026-05-14&startTime=10:00&endTime=09:00");

    assert.equal(invalidDate.status, 400);
    assert.deepEqual(invalidDate.body, { errors: { date: "Date must use YYYY-MM-DD format." } });
    assert.equal(invalidTime.status, 400);
    assert.deepEqual(invalidTime.body, { errors: { startTime: "Start time must use HH:MM format." } });
    assert.equal(reversedRange.status, 400);
    assert.deepEqual(reversedRange.body, { errors: { endTime: "End time must be after start time." } });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability avoids earlier same-day suggestions and searches future days", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "3:00 PM - 4:00 PM", startTime: "15:00", endTime: "16:00" }
      ]),
      listReservations: async (_db, filters) => filters.reservationDate === "2026-05-14" ?
        [buildReservation({ reservationDate: "2026-05-14", startTime: "15:00", endTime: "16:00" })] :
        []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=15:00&endTime=16:00");

    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    assert.deepEqual(response.body.suggestions[0], {
      date: "2026-05-15",
      slotId: 1,
      name: "8:00 AM - 9:00 AM",
      startTime: "08:00",
      endTime: "09:00"
    });
    assert.equal(response.body.suggestions.some((slot) => slot.date === "2026-05-14" && slot.startTime === "08:00"), false);
  } finally {
    await closeServer(server);
  }
});

test("accounts APIs require admin, map duplicate username, and block self status changes", async () => {
  const staffApp = buildApiTestApp({ session: buildSession({ role: "STAFF" }) });
  const staffServer = staffApp.listen(0);
  try {
    const response = await getJson(staffServer, "/api/accounts");
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: "Admin access required." });
  } finally {
    await closeServer(staffServer);
  }

  const adminApp = buildApiTestApp({
    session: buildSession({ userId: 1, role: "ADMIN" }),
    repositories: {
      createUser: async () => {
        throw new DuplicateUsernameError();
      },
      updateUserAccountStatus: async () => {
        throw new Error("self-change should stop before repository call");
      }
    }
  });
  const adminServer = adminApp.listen(0);
  try {
    const duplicate = await postJson(adminServer, "/api/accounts", {
      fullName: "Maria Santos",
      username: "maria",
      password: "secret",
      role: "STAFF"
    });
    const selfChange = await postJson(adminServer, "/api/accounts/1/status", { accountStatus: "INACTIVE" });

    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, { errors: { username: "Username already exists." } });
    assert.equal(selfChange.status, 400);
    assert.deepEqual(selfChange.body, { error: "You cannot change your own account status." });
  } finally {
    await closeServer(adminServer);
  }
});

test("GET /api/activity-logs passes filters and returns log rows", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listActivityLogs: async (_db, filters) => {
        receivedFilters = filters;
        return [
          {
            logId: 1,
            action: "CREATE_RESERVATION",
            details: "Created reservation.",
            createdAt: "2026-05-13 08:00:00",
            userName: "Admin User"
          }
        ];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/activity-logs?action=CREATE_RESERVATION&date=2026-05-13&search=%20Team%20");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {
      action: "CREATE_RESERVATION",
      date: "2026-05-13",
      search: "Team"
    });
    assert.equal(response.body.logs[0].logId, 1);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports computes summary from reservation objects", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => [
        buildReservation({ representativeName: "Team Alpha", statusCode: "RESERVED", startTime: "08:00", endTime: "10:00" }),
        buildReservation({ reservationId: 2, representativeName: "Team Alpha", statusCode: "COMPLETED", startTime: "10:00", endTime: "11:30" }),
        buildReservation({ reservationId: 3, representativeName: "Team Beta", statusCode: "MISSED", startTime: "12:00", endTime: "13:00" }),
        buildReservation({ reservationId: 4, representativeName: "Team Gamma", statusCode: "CANCELLED", startTime: "14:00", endTime: "15:00" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.summary, {
      totalReservations: 4,
      courtHoursBooked: 4.5,
      missedCount: 1,
      completedCount: 1,
      reservedCount: 1,
      cancelledCount: 1
    });
    assert.deepEqual(response.body.statusCounts, {
      RESERVED: 1,
      COMPLETED: 1,
      MISSED: 1,
      CANCELLED: 1
    });
    assert.deepEqual(response.body.topRequesters[0], { name: "Team Alpha", hours: 3.5 });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports excludes cancelled hours and returns stable zero status keys", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => [
        buildReservation({ representativeName: "Team Alpha", statusCode: "CANCELLED", startTime: "08:00", endTime: "10:00" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.summary, {
      totalReservations: 1,
      courtHoursBooked: 0,
      missedCount: 0,
      completedCount: 0,
      reservedCount: 0,
      cancelledCount: 1
    });
    assert.deepEqual(response.body.statusCounts, {
      RESERVED: 0,
      MISSED: 0,
      COMPLETED: 0,
      CANCELLED: 1
    });
    assert.deepEqual(response.body.topRequesters, []);
  } finally {
    await closeServer(server);
  }
});

function buildApiTestApp({ session = {}, repositories = {}, todayProvider = () => "2026-05-13" } = {}) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.session = session;
    next();
  });
  app.use(createApiRoutes({
    db: {},
    repositories: {
      findUserByUsername: async () => null,
      ...repositories
    },
    todayProvider
  }));
  return app;
}

async function getJson(server, pathName) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function postJson(server, pathName, payload) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function putJson(server, pathName, payload) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function buildSession({ userId = 1, role = "ADMIN" } = {}) {
  return {
    user: {
      userId,
      fullName: "Admin User",
      username: "admin",
      role
    }
  };
}

function buildReservation(overrides = {}) {
  return {
    reservationId: 1,
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Team Alpha",
    contactNo: "09171234567",
    address: "Purok 3",
    purpose: "Practice",
    remarks: "",
    statusCode: "RESERVED",
    statusName: "Reserved",
    createdByName: "Admin User",
    ...overrides
  };
}

function buildReservationInput(overrides = {}) {
  return {
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Team Alpha",
    contactNo: "09171234567",
    address: "Purok 3",
    purpose: "Practice",
    remarks: "",
    ...overrides
  };
}

function buildTimeSlots(overrides = null) {
  return overrides || [
    { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
    { slotId: 2, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" }
  ];
}
