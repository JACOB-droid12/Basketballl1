import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import test from "node:test";

import { createApiRoutes } from "../src/features/api/apiRoutes.js";
import { ReservationConflictError, ReservationNotFoundError, ReservationPolicyError, ReservationUnavailableError } from "../src/features/reservations/reservationRepository.js";
import { DuplicateResidentError } from "../src/features/residents/residentRepository.js";
import { ScheduleBlockReservationConflictError } from "../src/features/schedule/scheduleBlockRepository.js";
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
  let loginLog = null;
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
      },
      writeUserActivityLog: async (_db, entry) => {
        loginLog = entry;
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
    assert.deepEqual(loginLog, {
      userId: 12,
      action: "LOGIN",
      details: "User logged in."
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/logout records logout activity for the signed-in account", async () => {
  const session = buildSession({ userId: 12, role: "ADMIN" });
  let logoutLog = null;
  const app = buildApiTestApp({
    session,
    repositories: {
      writeUserActivityLog: async (_db, entry) => {
        logoutLog = entry;
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/logout", {});

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
    assert.deepEqual(logoutLog, {
      userId: 12,
      action: "LOGOUT",
      details: "User logged out."
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

test("POST /api/account/password returns validation errors as JSON for signed-in staff", async () => {
  const app = buildApiTestApp({ session: buildSession({ role: "STAFF" }) });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/account/password", {});

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        currentPassword: "Current password is required.",
        newPassword: "New password is required.",
        confirmPassword: "Confirm password is required."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/account/password rejects too-short new passwords for signed-in staff", async () => {
  const app = buildApiTestApp({ session: buildSession({ role: "STAFF" }) });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/account/password", {
      currentPassword: "current-password",
      newPassword: "short",
      confirmPassword: "short"
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        newPassword: "New password must be at least 8 characters."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/account/password rejects an incorrect current password for signed-in staff", async () => {
  const passwordHash = await bcrypt.hash("correct-password", 4);
  let updateCalled = false;
  const app = buildApiTestApp({
    session: buildSession({ role: "STAFF" }),
    repositories: {
      findUserByUsername: async (_db, username) => ({
        userId: 1,
        fullName: "Staff User",
        username,
        passwordHash,
        role: "STAFF"
      }),
      updateUserPassword: async () => {
        updateCalled = true;
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/account/password", {
      currentPassword: "wrong-password",
      newPassword: "new-local-password",
      confirmPassword: "new-local-password"
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: { currentPassword: "Current password is incorrect." }
    });
    assert.equal(updateCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/account/password updates the signed-in user's password on success", async () => {
  const passwordHash = await bcrypt.hash("old-local-password", 4);
  let updateArgs = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 44, role: "STAFF" }),
    repositories: {
      findUserByUsername: async (_db, username) => ({
        userId: 44,
        fullName: "Staff User",
        username,
        passwordHash,
        role: "STAFF"
      }),
      updateUserPassword: async (_db, userId, newPassword, options) => {
        updateArgs = { userId, newPassword, options };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/account/password", {
      currentPassword: "old-local-password",
      newPassword: "new-local-password",
      confirmPassword: "new-local-password"
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
    assert.deepEqual(updateArgs, {
      userId: 44,
      newPassword: "new-local-password",
      options: { userId: 44 }
    });
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
        referenceNo: "",
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

test("GET /api/reservations rejects invalid filter values before querying reservations", async () => {
  let listCalled = false;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => {
        listCalled = true;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations?date=2026-02-30&status=pending");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        date: "Date must use YYYY-MM-DD format.",
        status: "Status must be RESERVED, MISSED, CANCELLED, or COMPLETED."
      }
    });
    assert.equal(listCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations includes reservation reference numbers", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => [
        buildReservation({ referenceNo: "BCS-2026-000001" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations");

    assert.equal(response.status, 200);
    assert.equal(response.body.reservations[0].referenceNo, "BCS-2026-000001");
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

test("POST /api/reservations maps unavailable schedule blocks to 409 with block overlap", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      createReservation: async () => {
        throw new ReservationUnavailableError("Reservation overlaps an unavailable court range.", {
          blockId: 5,
          date: "2026-05-14",
          startTime: "08:00",
          endTime: "09:00",
          category: "PUBLIC_USE",
          type: "CLEARED_PUBLIC_USE",
          statusCode: "CLEARED_PUBLIC_USE",
          reason: "Cleared by admin"
        });
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", buildReservationInput());

    assert.equal(response.status, 409);
    assert.equal(response.body.error, "Reservation overlaps an unavailable court range.");
    assert.equal(response.body.overlap.statusCode, "CLEARED_PUBLIC_USE");
    assert.equal(response.body.overlap.reason, "Cleared by admin");
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations/:reservationId/slip returns database-backed printable slip data", async () => {
  let receivedReservationId = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getReservationSlipData: async (_db, reservationId, options) => {
        receivedReservationId = reservationId;
        return {
          reservationId,
          referenceNo: "BCS-2026-000077",
          representativeName: "Team Alpha",
          contactNo: "09171234567",
          address: "Purok 3",
          reservationDate: "2026-05-14",
          startTime: "08:00",
          endTime: "09:00",
          purpose: "Practice",
          statusCode: "CANCELLED",
          statusName: "Cancelled",
          staffEncoder: "Admin User",
          issuedAt: options.issuedAt,
          barangayName: "Barangay Sto. Niño, Parañaque City",
          courtName: "Barangay Basketball Court",
          notes: "Bring valid ID."
        };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations/77/slip");

    assert.equal(response.status, 200);
    assert.equal(receivedReservationId, 77);
    assert.equal(response.body.slip.referenceNo, "BCS-2026-000077");
    assert.equal(response.body.slip.statusCode, "CANCELLED");
    assert.equal(response.body.slip.statusName, "Cancelled");
    assert.equal(response.body.slip.issuedAt, "2026-05-13 06:00:00");
  } finally {
    await closeServer(server);
  }
});

test("GET /api/schedule/daily-print returns reservation references and print-ready slot data", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => [
        buildReservation({
          reservationId: 8,
          referenceNo: "BCS-2026-000008",
          reservationDate: "2026-05-14",
          startTime: "08:00",
          endTime: "09:00"
        }),
        buildReservation({
          reservationId: 9,
          referenceNo: "BCS-2026-000009",
          reservationDate: "2026-05-14",
          startTime: "09:00",
          endTime: "10:00",
          statusCode: "CANCELLED"
        })
      ],
      listScheduleBlocks: async () => []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/schedule/daily-print?date=2026-05-14");

    assert.equal(response.status, 200);
    assert.equal(response.body.date, "2026-05-14");
    assert.equal(response.body.slots[0].reservation.referenceNo, "BCS-2026-000008");
    assert.equal(response.body.slots[0].statusCode, "RESERVED");
    assert.equal(response.body.slots[1].statusCode, "CANCELLED");
    assert.equal(response.body.totals.reserved, 1);
    assert.equal(response.body.totals.cancelled, 1);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/dashboard/alerts returns reservation, backup, public-use, and maintenance alert data", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    todayProvider: () => "2026-05-14",
    currentTimeProvider: () => "07:30",
    repositories: {
      listReservations: async (_db, filters) => {
        if (filters.reservationDate !== "2026-05-14") {
          return [];
        }

        return [
          buildReservation({ reservationId: 20, reservationDate: "2026-05-14", startTime: "08:00", endTime: "09:00" }),
          buildReservation({ reservationId: 21, reservationDate: "2026-05-14", startTime: "10:00", endTime: "11:00", statusCode: "MISSED" })
        ];
      },
      listScheduleBlocks: async () => [
        {
          blockId: 3,
          date: "2026-05-14",
          startTime: "12:00",
          endTime: "13:00",
          category: "PUBLIC_USE",
          type: "CLEARED_PUBLIC_USE",
          statusCode: "CLEARED_PUBLIC_USE",
          reason: "Barangay public use"
        },
        {
          blockId: 4,
          date: "2026-05-14",
          startTime: "14:00",
          endTime: "15:00",
          category: "MAINTENANCE",
          type: "REPAIRS",
          statusCode: "MAINTENANCE",
          reason: "Ring repair"
        }
      ],
      getBackupStatus: async () => ({
        lastBackupAt: "2026-05-05 12:00:00",
        daysSinceBackup: 9,
        reminderThresholdDays: 7,
        backupDue: true
      })
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/dashboard/alerts");

    assert.equal(response.status, 200);
    assert.equal(response.body.metrics.todayReservationCount, 1);
    assert.equal(response.body.metrics.missedPendingCount, 1);
    assert.equal(response.body.metrics.nextReservation.startsInMinutes, 30);
    assert.equal(response.body.metrics.backupStatus.backupDue, true);
    assert.equal(response.body.metrics.publicUseActiveToday, true);
    assert.equal(response.body.metrics.maintenanceActiveToday, true);
    assert.ok(response.body.alerts.some((alert) => alert.type === "BACKUP_DUE"));
  } finally {
    await closeServer(server);
  }
});

test("GET /api/maintenance/backup-status exposes last successful backup metadata", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getBackupStatus: async () => ({
        lastBackupAt: "2026-05-16 22:00:00",
        daysSinceBackup: 1,
        reminderThresholdDays: 7,
        backupDue: false
      })
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/maintenance/backup-status");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.backupStatus, {
      lastBackupAt: "2026-05-16 22:00:00",
      daysSinceBackup: 1,
      reminderThresholdDays: 7,
      backupDue: false
    });
  } finally {
    await closeServer(server);
  }
});

test("court policy APIs allow staff read and admin updates", async () => {
  const staffApp = buildApiTestApp({
    session: buildSession({ role: "STAFF" }),
    repositories: {
      getCourtPolicySettings: async () => ({
        openingTime: "07:00",
        closingTime: "21:00",
        minimumReservationMinutes: 30,
        maximumReservationMinutes: 240,
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        blockedDays: [],
        gracePeriodBeforeMissedMinutes: 15,
        defaultSlotMinutes: 60
      })
    }
  });
  const staffServer = staffApp.listen(0);

  try {
    const readResponse = await getJson(staffServer, "/api/settings/court-policy");
    const updateResponse = await putJson(staffServer, "/api/settings/court-policy", { maximumReservationMinutes: 180 });

    assert.equal(readResponse.status, 200);
    assert.equal(readResponse.body.policy.maximumReservationMinutes, 240);
    assert.equal(updateResponse.status, 403);
  } finally {
    await closeServer(staffServer);
  }

  let receivedPatch = null;
  let receivedOptions = null;
  const adminApp = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      updateCourtPolicySettings: async (_db, patch, options) => {
        receivedPatch = patch;
        receivedOptions = options;
        return {
          openingTime: "07:00",
          closingTime: "21:00",
          minimumReservationMinutes: 30,
          maximumReservationMinutes: 180,
          allowedDays: [1, 2, 3, 4, 5],
          blockedDays: ["2026-05-20"],
          gracePeriodBeforeMissedMinutes: 20,
          defaultSlotMinutes: 60
        };
      }
    }
  });
  const adminServer = adminApp.listen(0);

  try {
    const response = await putJson(adminServer, "/api/settings/court-policy", {
      maximumReservationMinutes: 180,
      allowedDays: [1, 2, 3, 4, 5],
      blockedDays: ["2026-05-20"],
      gracePeriodBeforeMissedMinutes: 20
    });

    assert.equal(response.status, 200);
    assert.deepEqual(receivedPatch.allowedDays, [1, 2, 3, 4, 5]);
    assert.deepEqual(receivedOptions, { userId: 10 });
    assert.equal(response.body.policy.maximumReservationMinutes, 180);
  } finally {
    await closeServer(adminServer);
  }
});

test("reservation APIs map court policy violations to validation errors", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      createReservation: async () => {
        throw new ReservationPolicyError({
          duration: "Reservation duration must be no more than 120 minutes."
        });
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/reservations", buildReservationInput({
      startTime: "08:00",
      endTime: "12:00"
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        duration: "Reservation duration must be no more than 120 minutes."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("POST /api/schedule/blocks is admin-only and creates a maintenance block", async () => {
  let receivedPayload = null;
  let receivedOptions = null;
  const staffApp = buildApiTestApp({ session: buildSession({ role: "STAFF" }) });
  const adminApp = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      createScheduleBlock: async (_db, payload, options) => {
        receivedPayload = payload;
        receivedOptions = options;
        return {
          blockId: 9,
          ...payload,
          category: "MAINTENANCE",
          statusCode: "MAINTENANCE",
          createdByName: "Admin User",
          createdAt: "2026-05-13 06:00:00",
          isActive: true
        };
      }
    }
  });
  const staffServer = staffApp.listen(0);
  const adminServer = adminApp.listen(0);

  try {
    const forbidden = await postJson(staffServer, "/api/schedule/blocks", {
      date: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      blockType: "REPAIRS",
      reason: "Ring repair"
    });
    const created = await postJson(adminServer, "/api/schedule/blocks", {
      date: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      blockType: "REPAIRS",
      reason: "Ring repair"
    });

    assert.equal(forbidden.status, 403);
    assert.equal(created.status, 201);
    assert.deepEqual(receivedPayload, {
      date: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      category: "MAINTENANCE",
      type: "REPAIRS",
      mode: "TIME_RANGE",
      reason: "Ring repair"
    });
    assert.deepEqual(receivedOptions, { userId: 10 });
    assert.equal(created.body.block.statusCode, "MAINTENANCE");
  } finally {
    await closeServer(staffServer);
    await closeServer(adminServer);
  }
});

test("POST /api/schedule/blocks rejects overlong reasons before storage", async () => {
  let createCalled = false;
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      createScheduleBlock: async () => {
        createCalled = true;
        return {};
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/schedule/blocks", {
      date: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      blockType: "REPAIRS",
      reason: "x".repeat(256)
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        reason: "Reason must be 255 characters or fewer."
      }
    });
    assert.equal(createCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/schedule/blocks maps active reservation overlap to 409 with reservation details", async () => {
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      createScheduleBlock: async () => {
        throw new ScheduleBlockReservationConflictError(
          "Maintenance block overlaps an active reservation. Cancel or clear the reservation before blocking this time.",
          buildReservation({ reservationId: 88, referenceNo: "BCS-2026-000088" })
        );
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/schedule/blocks", {
      date: "2026-05-14",
      startTime: "08:00",
      endTime: "09:00",
      blockType: "REPAIRS",
      reason: "Ring repair"
    });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: "Maintenance block overlaps an active reservation. Cancel or clear the reservation before blocking this time.",
      overlap: {
        reservationId: 88,
        referenceNo: "BCS-2026-000088",
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
    });
  } finally {
    await closeServer(server);
  }
});

test("DELETE /api/schedule/blocks/:blockId deactivates a block as admin", async () => {
  let received = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      deactivateScheduleBlock: async (_db, blockId, options) => {
        received = { blockId, options };
        return {
          blockId,
          date: "2026-05-14",
          startTime: "08:00",
          endTime: "09:00",
          category: "MAINTENANCE",
          type: "REPAIRS",
          statusCode: "MAINTENANCE",
          reason: "Ring repair",
          isActive: false
        };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await deleteJson(server, "/api/schedule/blocks/9");

    assert.equal(response.status, 200);
    assert.deepEqual(received, { blockId: 9, options: { userId: 10 } });
    assert.equal(response.body.block.isActive, false);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/schedule/clear-public-use persists a clear range and returns cancelled reservations", async () => {
  let receivedPayload = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      clearPublicUseRange: async (_db, payload, options) => {
        receivedPayload = { payload, options };
        return {
          block: {
            blockId: 12,
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
            mode: payload.mode,
            category: "PUBLIC_USE",
            type: "CLEARED_PUBLIC_USE",
            statusCode: "CLEARED_PUBLIC_USE",
            reason: payload.reason,
            isActive: true
          },
          cancelledReservations: [
            buildReservation({ reservationId: 1, referenceNo: "BCS-2026-000001", statusCode: "CANCELLED" })
          ]
        };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/schedule/clear-public-use", {
      date: "2026-05-14",
      mode: "TIME_RANGE",
      startTime: "08:00",
      endTime: "10:00",
      reason: "Open public play"
    });

    assert.equal(response.status, 201);
    assert.deepEqual(receivedPayload.payload, {
      date: "2026-05-14",
      mode: "TIME_RANGE",
      startTime: "08:00",
      endTime: "10:00",
      reason: "Open public play"
    });
    assert.deepEqual(receivedPayload.options, { userId: 10 });
    assert.equal(response.body.block.statusCode, "CLEARED_PUBLIC_USE");
    assert.equal(response.body.cancelledReservations[0].referenceNo, "BCS-2026-000001");
  } finally {
    await closeServer(server);
  }
});

test("POST /api/schedule/clear-public-use rejects overlong reasons before storage", async () => {
  let clearCalled = false;
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "ADMIN" }),
    repositories: {
      clearPublicUseRange: async () => {
        clearCalled = true;
        return {};
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/schedule/clear-public-use", {
      date: "2026-05-14",
      mode: "WHOLE_DAY",
      reason: "x".repeat(256)
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        reason: "Reason must be 255 characters or fewer."
      }
    });
    assert.equal(clearCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/schedule includes maintenance and cleared public-use blocks in week cells", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => [],
      listScheduleBlocks: async () => [
        {
          blockId: 1,
          date: "2026-05-11",
          startTime: "08:00",
          endTime: "09:00",
          category: "PUBLIC_USE",
          type: "CLEARED_PUBLIC_USE",
          statusCode: "CLEARED_PUBLIC_USE",
          reason: "Public play",
          isActive: true
        },
        {
          blockId: 2,
          date: "2026-05-12",
          startTime: "09:00",
          endTime: "10:00",
          category: "MAINTENANCE",
          type: "REPAIRS",
          statusCode: "MAINTENANCE",
          reason: "Ring repair",
          isActive: true
        }
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/schedule?date=2026-05-11");

    assert.equal(response.status, 200);
    assert.equal(response.body.rows[0].cells[1].statusCode, "CLEARED_PUBLIC_USE");
    assert.equal(response.body.rows[0].cells[1].block.reason, "Public play");
    assert.equal(response.body.rows[1].cells[2].statusCode, "MAINTENANCE");
    assert.equal(response.body.rows[1].cells[2].block.reason, "Ring repair");
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
      reservationId: 7,
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
        reservationId: 7,
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

test("DELETE /api/reservations/:reservationId cancels with the signed-in user and maps the cancelled row", async () => {
  let statusCall = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 91 }),
    repositories: {
      updateReservationStatus: async (_db, reservationId, statusCode, options) => {
        statusCall = { reservationId, statusCode, options };
      },
      getReservationById: async (_db, reservationId) => buildReservation({
        reservationId: Number(reservationId),
        statusCode: "CANCELLED",
        statusName: "Cancelled"
      })
    }
  });
  const server = app.listen(0);

  try {
    const response = await deleteJson(server, "/api/reservations/7");

    assert.equal(response.status, 200);
    assert.deepEqual(statusCall, {
      reservationId: 7,
      statusCode: "CANCELLED",
      options: { userId: 91 }
    });
    assert.equal(response.body.reservation.reservationId, 7);
    assert.equal(response.body.reservation.statusCode, "CANCELLED");
    assert.equal(response.body.reservation.statusName, "Cancelled");
  } finally {
    await closeServer(server);
  }
});

test("DELETE /api/reservations/:reservationId returns 404 when the reservation is missing", async () => {
  const app = buildApiTestApp({
    session: buildSession({ userId: 91 }),
    repositories: {
      updateReservationStatus: async () => {
        throw new ReservationNotFoundError();
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await deleteJson(server, "/api/reservations/404");

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Reservation record was not found." });
  } finally {
    await closeServer(server);
  }
});

test("reservation mutation APIs reject invalid numeric path parameters", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      updateReservationStatus: async () => {
        throw new Error("invalid id should stop before repository call");
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await deleteJson(server, "/api/reservations/not-a-number");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Reservation ID must be a positive integer." });
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

test("GET /api/schedule validates invalid and non-real dates", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => {
        throw new Error("invalid date should stop before repository call");
      }
    }
  });
  const server = app.listen(0);

  try {
    const invalidFormat = await getJson(server, "/api/schedule?date=not-a-date");
    const nonRealDate = await getJson(server, "/api/schedule?date=2026-02-30");

    assert.equal(invalidFormat.status, 400);
    assert.deepEqual(invalidFormat.body, { errors: { date: "Date must use YYYY-MM-DD format." } });
    assert.equal(nonRealDate.status, 400);
    assert.deepEqual(nonRealDate.body, { errors: { date: "Date must use YYYY-MM-DD format." } });
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

test("GET /api/availability treats schedule blocks as conflicts and excludes them from suggestions", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" },
        { slotId: 3, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" }
      ]),
      listReservations: async () => [],
      listScheduleBlocks: async () => [
        {
          blockId: 6,
          date: "2026-05-14",
          startTime: "08:00",
          endTime: "10:00",
          category: "PUBLIC_USE",
          type: "CLEARED_PUBLIC_USE",
          statusCode: "CLEARED_PUBLIC_USE",
          reason: "Open public play",
          isActive: true
        }
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=09:00");

    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    assert.equal(response.body.conflict, null);
    assert.equal(response.body.block.statusCode, "CLEARED_PUBLIC_USE");
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

test("GET /api/availability can exclude the reservation being edited from conflicts and suggestions", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" },
        { slotId: 3, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" }
      ]),
      listReservations: async () => [
        buildReservation({ reservationId: 8, reservationDate: "2026-05-14", startTime: "08:00", endTime: "09:00" })
      ]
    }
  });
  const server = app.listen(0);

  try {
    const withoutExclusion = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=10:00");
    const withExclusion = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=10:00&reservationId=8");

    assert.equal(withoutExclusion.status, 200);
    assert.equal(withoutExclusion.body.available, false);
    assert.equal(withoutExclusion.body.conflict.reservationId, 8);
    assert.equal(withoutExclusion.body.suggestions.some((slot) => slot.date === "2026-05-14" && slot.startTime === "08:00"), false);

    assert.equal(withExclusion.status, 200);
    assert.equal(withExclusion.body.available, true);
    assert.equal(withExclusion.body.conflict, null);
    assert.deepEqual(withExclusion.body.suggestions[0], {
      date: "2026-05-14",
      slotId: 1,
      name: "8:00 AM - 10:00 AM",
      startTime: "08:00",
      endTime: "10:00"
    });
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
    const invalidReservationId = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=09:00&reservationId=abc");

    assert.equal(invalidDate.status, 400);
    assert.deepEqual(invalidDate.body, { errors: { date: "Date must use YYYY-MM-DD format." } });
    assert.equal(invalidTime.status, 400);
    assert.deepEqual(invalidTime.body, { errors: { startTime: "Start time must use HH:MM format." } });
    assert.equal(reversedRange.status, 400);
    assert.deepEqual(reversedRange.body, { errors: { endTime: "End time must be after start time." } });
    assert.equal(invalidReservationId.status, 400);
    assert.deepEqual(invalidReservationId.body, { errors: { reservationId: "Reservation ID must be a positive integer." } });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability rejects same-day slots that final reservation save would reject", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    todayProvider: () => "2026-05-14",
    currentTimeProvider: () => "08:30"
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=09:00");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        startTime: "Start time must be later than the current time for today's reservations."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability rejects ranges outside active court hours", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=02:00&endTime=03:00");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        timeRange: "Requested time must be covered by active court schedule slots."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability rejects partial-slot ranges not covered by active slots", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:30&endTime=09:30");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, {
      timeRange: "Requested time must be covered by active court schedule slots."
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/availability rejects ranges with broken active-slot contiguity", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" }
      ]),
      listReservations: async () => []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=10:00");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, {
      timeRange: "Requested time must be covered by contiguous active court schedule slots."
    });
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

test("GET /api/availability suggests contiguous free slots for multi-hour requests", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      getTimeSlots: async () => buildTimeSlots([
        { slotId: 1, name: "8:00 AM - 9:00 AM", startTime: "08:00", endTime: "09:00" },
        { slotId: 2, name: "9:00 AM - 10:00 AM", startTime: "09:00", endTime: "10:00" },
        { slotId: 3, name: "10:00 AM - 11:00 AM", startTime: "10:00", endTime: "11:00" },
        { slotId: 4, name: "11:00 AM - 12:00 PM", startTime: "11:00", endTime: "12:00" }
      ]),
      listReservations: async (_db, filters) => filters.reservationDate === "2026-05-14" ? [
        buildReservation({ reservationDate: "2026-05-14", startTime: "08:00", endTime: "10:00" })
      ] : []
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/availability?date=2026-05-14&startTime=08:00&endTime=10:00");

    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    assert.deepEqual(response.body.suggestions[0], {
      date: "2026-05-14",
      slotId: 3,
      name: "10:00 AM - 12:00 PM",
      startTime: "10:00",
      endTime: "12:00"
    });
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
      password: "secret123",
      role: "STAFF"
    });
    const selfChange = await postJson(adminServer, "/api/accounts/1/status", { accountStatus: "INACTIVE" });
    const badId = await postJson(adminServer, "/api/accounts/not-a-number/status", { accountStatus: "INACTIVE" });

    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, { errors: { username: "Username already exists." } });
    assert.equal(selfChange.status, 400);
    assert.deepEqual(selfChange.body, { error: "You cannot change your own account status." });
    assert.equal(badId.status, 400);
    assert.deepEqual(badId.body, { error: "User ID must be a positive integer." });
  } finally {
    await closeServer(adminServer);
  }
});

test("POST /api/accounts rejects too-short passwords before creating accounts", async () => {
  let createCalled = false;
  const app = buildApiTestApp({
    session: buildSession({ role: "ADMIN" }),
    repositories: {
      createUser: async () => {
        createCalled = true;
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/accounts", {
      fullName: "Maria Santos",
      username: "maria",
      password: "short",
      role: "STAFF"
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        password: "Password must be at least 8 characters."
      }
    });
    assert.equal(createCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("POST /api/accounts/:userId/status passes the signed-in admin user to account status updates", async () => {
  let updateCall = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 1, role: "ADMIN" }),
    repositories: {
      updateUserAccountStatus: async (_db, userId, accountStatus, options) => {
        updateCall = { userId, accountStatus, options };
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/accounts/2/status", { accountStatus: "INACTIVE" });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
    assert.deepEqual(updateCall, {
      userId: 2,
      accountStatus: "INACTIVE",
      options: { userId: 1 }
    });
  } finally {
    await closeServer(server);
  }
});

test("resident directory APIs search, create, and update local resident records", async () => {
  let searchFilters = null;
  let createdPayload = null;
  let updatedPayload = null;
  const app = buildApiTestApp({
    session: buildSession({ userId: 10, role: "STAFF" }),
    repositories: {
      listResidents: async (_db, filters) => {
        searchFilters = filters;
        return [
          {
            residentId: 5,
            name: "Team Alpha",
            contactNumber: "09171234567",
            address: "Purok 3",
            group: "Youth",
            notes: "",
            createdAt: "2026-05-14 08:00:00",
            updatedAt: "2026-05-14 08:00:00"
          }
        ];
      },
      createResidentDirectoryEntry: async (_db, payload, options) => {
        createdPayload = { payload, options };
        return { residentId: 6, ...payload, createdAt: "2026-05-14 08:00:00", updatedAt: "2026-05-14 08:00:00" };
      },
      updateResidentDirectoryEntry: async (_db, residentId, payload, options) => {
        updatedPayload = { residentId, payload, options };
        return { residentId, ...payload, createdAt: "2026-05-14 08:00:00", updatedAt: "2026-05-15 09:00:00" };
      }
    }
  });
  const server = app.listen(0);

  try {
    const search = await getJson(server, "/api/residents?search=Team&contactNumber=09171234567");
    const create = await postJson(server, "/api/residents", {
      name: "Team Beta",
      contactNumber: "09170000000",
      address: "Purok 4",
      group: "Seniors",
      notes: "Prefers evening"
    });
    const update = await putJson(server, "/api/residents/6", {
      name: "Team Beta Updated",
      contactNumber: "09170000000",
      address: "Purok 4",
      group: "Seniors",
      notes: ""
    });

    assert.equal(search.status, 200);
    assert.deepEqual(searchFilters, { search: "Team", contactNumber: "09171234567" });
    assert.equal(search.body.residents[0].residentId, 5);
    assert.equal(create.status, 201);
    assert.equal(createdPayload.payload.name, "Team Beta");
    assert.deepEqual(createdPayload.options, { userId: 10 });
    assert.equal(update.status, 200);
    assert.equal(updatedPayload.residentId, 6);
    assert.equal(updatedPayload.payload.name, "Team Beta Updated");
    assert.deepEqual(updatedPayload.options, { userId: 10 });
  } finally {
    await closeServer(server);
  }
});

test("resident directory API validates duplicate and malformed records", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      createResidentDirectoryEntry: async () => {
        throw new DuplicateResidentError();
      }
    }
  });
  const server = app.listen(0);

  try {
    const invalid = await postJson(server, "/api/residents", {
      name: "",
      contactNumber: "<script>",
      address: "",
      notes: "x".repeat(1001)
    });
    const duplicate = await postJson(server, "/api/residents", {
      name: "Team Alpha",
      contactNumber: "09171234567",
      address: "Purok 3"
    });

    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.errors.name, "Name is required.");
    assert.equal(invalid.body.errors.contactNumber, "Contact number must use digits or common phone symbols only.");
    assert.equal(invalid.body.errors.address, "Address is required.");
    assert.equal(invalid.body.errors.notes, "Notes must be 1000 characters or fewer.");
    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, { errors: { contactNumber: "A resident or group with this contact number already exists." } });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/activity-logs passes normalized filters and returns log rows", async () => {
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
    const response = await getJson(server, "/api/activity-logs?action=mark_missed&date=2026-05-13&search=%20Team%20");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {
      action: "MARK_MISSED",
      date: "2026-05-13",
      search: "Team"
    });
    assert.equal(response.body.logs[0].logId, 1);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/activity-logs passes inclusive from and to date filters", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listActivityLogs: async (_db, filters) => {
        receivedFilters = filters;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/activity-logs?from=2026-05-10&to=2026-05-16&search=%20Cruz%20");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {
      action: "",
      date: "",
      fromDate: "2026-05-10",
      toDate: "2026-05-16",
      search: "Cruz"
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/activity-logs rejects invalid date range filters before querying logs", async () => {
  let listCalled = false;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listActivityLogs: async () => {
        listCalled = true;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/activity-logs?from=2026-02-30&to=not-a-date");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        from: "From date must use YYYY-MM-DD format.",
        to: "To date must use YYYY-MM-DD format."
      }
    });
    assert.equal(listCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/activity-logs rejects reversed date ranges before querying logs", async () => {
  let listCalled = false;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listActivityLogs: async () => {
        listCalled = true;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/activity-logs?from=2026-05-16&to=2026-05-10");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        dateRange: "From date must be on or before to date."
      }
    });
    assert.equal(listCalled, false);
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

test("GET /api/reports returns post-deployment report sections from reservations and schedule blocks", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => [
        buildReservation({
          reservationId: 1,
          referenceNo: "BCS-2026-000001",
          reservationDate: "2026-05-11",
          startTime: "08:00",
          endTime: "09:00",
          purpose: "Practice",
          statusCode: "COMPLETED",
          createdByName: "Admin One"
        }),
        buildReservation({
          reservationId: 2,
          referenceNo: "BCS-2026-000002",
          reservationDate: "2026-05-18",
          startTime: "08:00",
          endTime: "10:00",
          purpose: "Tournament",
          statusCode: "MISSED",
          createdByName: "Staff Two"
        }),
        buildReservation({
          reservationId: 3,
          referenceNo: "BCS-2026-000003",
          reservationDate: "2026-06-01",
          startTime: "11:00",
          endTime: "12:00",
          purpose: "Practice",
          statusCode: "CANCELLED",
          createdByName: "Staff Two"
        })
      ],
      listScheduleBlocks: async () => [
        {
          blockId: 20,
          date: "2026-05-14",
          startTime: "07:00",
          endTime: "21:00",
          category: "PUBLIC_USE",
          type: "CLEARED_PUBLIC_USE",
          statusCode: "CLEARED_PUBLIC_USE",
          reason: "Public league day",
          isActive: true
        },
        {
          blockId: 21,
          date: "2026-05-15",
          startTime: "13:00",
          endTime: "15:00",
          category: "MAINTENANCE",
          type: "REPAIRS",
          statusCode: "MAINTENANCE",
          reason: "Backboard repair",
          isActive: true
        }
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.mostUsedDays[0], { day: "Monday", count: 2, hours: 3 });
    assert.deepEqual(response.body.mostUsedTimeSlots[0], { startTime: "08:00", endTime: "09:00", label: "08:00-09:00", count: 2, hours: 2 });
    assert.deepEqual(response.body.monthlyReservationCount, [
      { month: "2026-05", count: 2 },
      { month: "2026-06", count: 1 }
    ]);
    assert.equal(response.body.missedReservations[0].referenceNo, "BCS-2026-000002");
    assert.equal(response.body.cancelledReservations[0].referenceNo, "BCS-2026-000003");
    assert.deepEqual(response.body.reservationsByPurpose[0], { purpose: "Practice", count: 2, hours: 1 });
    assert.deepEqual(response.body.reservationsEncodedByStaff[0], { staffName: "Staff Two", count: 2 });
    assert.equal(response.body.clearedPublicUseRanges[0].reason, "Public league day");
    assert.equal(response.body.maintenanceBlocks[0].reason, "Backboard repair");
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

test("GET /api/reservations/history returns scoped reservation history by contact number", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    todayProvider: () => "2026-05-14",
    repositories: {
      listReservations: async (_db, filters) => {
        receivedFilters = filters;
        return [
          buildReservation({ reservationId: 1, reservationDate: "2026-05-10", statusCode: "COMPLETED" }),
          buildReservation({ reservationId: 2, reservationDate: "2026-05-14", statusCode: "RESERVED" }),
          buildReservation({ reservationId: 3, reservationDate: "2026-05-20", statusCode: "RESERVED" }),
          buildReservation({ reservationId: 4, reservationDate: "2026-05-08", statusCode: "MISSED" }),
          buildReservation({ reservationId: 5, reservationDate: "2026-05-09", statusCode: "CANCELLED" })
        ];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations/history?contactNumber=09171234567");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, { contactNumber: "09171234567" });
    assert.equal(response.body.summary.completedCount, 1);
    assert.equal(response.body.summary.activeReservationCount, 2);
    assert.equal(response.body.summary.missedCount, 1);
    assert.equal(response.body.summary.cancelledCount, 1);
    assert.equal(response.body.summary.lastReservationDate, "2026-05-20");
    assert.deepEqual(response.body.pastReservations.map((reservation) => reservation.reservationId), [1, 5, 4]);
    assert.deepEqual(response.body.upcomingReservations.map((reservation) => reservation.reservationId), [2, 3]);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reservations/history requires a contact number or name", async () => {
  const app = buildApiTestApp({ session: buildSession() });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reservations/history");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        lookup: "Provide contactNumber or name."
      }
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/exports/daily-schedule.csv downloads a timestamped CSV with schedule blocks", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    todayProvider: () => "2026-05-14",
    currentTimeProvider: () => "06:30",
    repositories: {
      getTimeSlots: async () => buildTimeSlots(),
      listReservations: async () => [
        buildReservation({ referenceNo: "BCS-2026-000008", reservationDate: "2026-05-14", startTime: "08:00", endTime: "09:00" })
      ],
      listScheduleBlocks: async () => [
        {
          blockId: 5,
          date: "2026-05-14",
          startTime: "09:00",
          endTime: "10:00",
          category: "MAINTENANCE",
          type: "REPAIRS",
          statusCode: "MAINTENANCE",
          reason: "Ring repair",
          isActive: true
        }
      ]
    }
  });
  const server = app.listen(0);

  try {
    const response = await getText(server, "/api/exports/daily-schedule.csv?date=2026-05-14");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
    assert.match(response.headers.get("content-disposition"), /daily-schedule-2026-05-14-20260514-063000\.csv/);
    assert.match(response.body, /BCS-2026-000008/);
    assert.match(response.body, /Ring repair/);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/exports/monthly-reservations.csv validates month and exports references", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    todayProvider: () => "2026-05-14",
    currentTimeProvider: () => "06:30",
    repositories: {
      listReservations: async (_db, filters) => {
        receivedFilters = filters;
        return [
          buildReservation({ referenceNo: "BCS-2026-000008", reservationDate: "2026-05-20" })
        ];
      }
    }
  });
  const server = app.listen(0);

  try {
    const valid = await getText(server, "/api/exports/monthly-reservations.csv?month=2026-05");
    const invalid = await getJson(server, "/api/exports/monthly-reservations.csv?month=2026-13");

    assert.equal(valid.status, 200);
    assert.deepEqual(receivedFilters, { fromDate: "2026-05-01", toDate: "2026-05-31" });
    assert.match(valid.body, /Reference No/);
    assert.match(valid.body, /BCS-2026-000008/);
    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body, { errors: { month: "Month must use YYYY-MM format." } });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports passes inclusive from and to date filters to reservation storage", async () => {
  let receivedFilters = null;
  let receivedBlockFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async (_db, filters) => {
        receivedFilters = filters;
        assert.deepEqual(filters, {
          fromDate: "2026-05-10",
          toDate: "2026-05-12"
        });
        return [
          buildReservation({ reservationId: 10, reservationDate: "2026-05-10", representativeName: "Range Start" }),
          buildReservation({ reservationId: 11, reservationDate: "2026-05-12", representativeName: "Range End" })
        ];
      },
      listScheduleBlocks: async (_db, filters) => {
        receivedBlockFilters = filters;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports?from=2026-05-10&to=2026-05-12");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {
      fromDate: "2026-05-10",
      toDate: "2026-05-12"
    });
    assert.deepEqual(receivedBlockFilters, {
      fromDate: "2026-05-10",
      toDate: "2026-05-12",
      activeOnly: false
    });
    assert.equal(response.body.summary.totalReservations, 2);
    assert.deepEqual(response.body.topRequesters.map((requester) => requester.name), ["Range End", "Range Start"]);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports range query does not fall back to all-time reservations", async () => {
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async (_db, filters) => {
        if (filters.fromDate === "2026-05-11" && filters.toDate === "2026-05-11") {
          return [
            buildReservation({ reservationId: 11, reservationDate: "2026-05-11", representativeName: "Only Inside Range" })
          ];
        }

        return [
          buildReservation({ reservationId: 9, reservationDate: "2026-05-09", representativeName: "Before Range" }),
          buildReservation({ reservationId: 11, reservationDate: "2026-05-11", representativeName: "Only Inside Range" }),
          buildReservation({ reservationId: 13, reservationDate: "2026-05-13", representativeName: "After Range" })
        ];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports?from=2026-05-11&to=2026-05-11");

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.totalReservations, 1);
    assert.deepEqual(response.body.topRequesters, [{ name: "Only Inside Range", hours: 1 }]);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports preserves all-time behavior without date filters", async () => {
  let receivedFilters = null;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async (_db, filters) => {
        receivedFilters = filters;
        return [
          buildReservation({ reservationId: 1, reservationDate: "2026-05-09" }),
          buildReservation({ reservationId: 2, reservationDate: "2026-05-12" })
        ];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports");

    assert.equal(response.status, 200);
    assert.deepEqual(receivedFilters, {});
    assert.equal(response.body.summary.totalReservations, 2);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports rejects invalid date filters before querying reservations", async () => {
  let listCalled = false;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => {
        listCalled = true;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports?from=2026-02-30&to=not-a-date");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        from: "From date must use YYYY-MM-DD format.",
        to: "To date must use YYYY-MM-DD format."
      }
    });
    assert.equal(listCalled, false);
  } finally {
    await closeServer(server);
  }
});

test("GET /api/reports rejects reversed date ranges before querying reservations", async () => {
  let listCalled = false;
  const app = buildApiTestApp({
    session: buildSession(),
    repositories: {
      listReservations: async () => {
        listCalled = true;
        return [];
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await getJson(server, "/api/reports?from=2026-05-16&to=2026-05-10");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      errors: {
        dateRange: "From date must be on or before to date."
      }
    });
    assert.equal(listCalled, false);
  } finally {
    await closeServer(server);
  }
});

function buildApiTestApp({
  session = {},
  repositories = {},
  todayProvider = () => "2026-05-13",
  currentTimeProvider = () => "06:00"
} = {}) {
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
      writeUserActivityLog: async () => {},
      getCourtPolicySettings: async () => ({
        openingTime: "07:00",
        closingTime: "21:00",
        minimumReservationMinutes: 30,
        maximumReservationMinutes: 240,
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        blockedDays: [],
        gracePeriodBeforeMissedMinutes: 15,
        defaultSlotMinutes: 60
      }),
      listScheduleBlocks: async () => [],
      listResidents: async () => [],
      ...repositories
    },
    todayProvider,
    currentTimeProvider
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

async function getText(server, pathName) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`);

  return {
    status: response.status,
    headers: response.headers,
    body: await response.text()
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

async function deleteJson(server, pathName) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${pathName}`, {
    method: "DELETE"
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
