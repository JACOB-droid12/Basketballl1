import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import test from "node:test";

import { createPrototypeApiRoutes } from "../src/features/prototype/prototypeApiRoutes.js";
import { ReservationConflictError } from "../src/features/reservations/reservationRepository.js";
import { DuplicateUsernameError } from "../src/features/users/userRepository.js";

const TODAY = "2026-05-10";

test("prototype login verifies hashed passwords and stores a prototype-compatible session", async () => {
  const session = {};
  const passwordHash = await bcrypt.hash("secret123", 4);
  const app = buildPrototypeApiTestApp({
    session,
    repositories: {
      findUserByUsername: async (_db, username) => {
        assert.equal(username, "admin");
        return {
          userId: 7,
          fullName: "System Administrator",
          username: "admin",
          passwordHash,
          role: "ADMIN"
        };
      }
    }
  });

  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/prototype/login", {
      username: "ADMIN",
      password: "secret123"
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.user, {
      userId: 7,
      fullname: "System Administrator",
      username: "admin",
      role: "Admin"
    });
    assert.equal(session.user.userId, 7);
    assert.equal(session.user.role, "ADMIN");
  } finally {
    await closeServer(server);
  }
});

test("prototype reservation API validates input and uses hidden office defaults", async () => {
  const session = {
    user: {
      userId: 3,
      fullName: "Court Staff",
      username: "staff",
      role: "STAFF"
    }
  };
  let createdReservation = null;
  let createdOptions = null;
  const app = buildPrototypeApiTestApp({
    session,
    repositories: {
      createReservation: async (_db, reservation, options) => {
        createdReservation = reservation;
        createdOptions = options;
        return 44;
      },
      getReservationById: async () => ({
        reservationId: 44,
        reservationDate: TODAY,
        startTime: "07:00",
        endTime: "08:00",
        representativeName: "Sto. Nino Youth",
        contactNo: "09171234567",
        address: "Barangay Sto. Niño, Parañaque City",
        purpose: "Basketball court reservation",
        remarks: "",
        statusCode: "RESERVED",
        statusName: "Reserved",
        createdByName: "Court Staff"
      })
    }
  });

  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/prototype/reservations", {
      reservationDate: TODAY,
      startTime: "07:00",
      endTime: "08:00",
      representativeName: "Sto. Nino Youth",
      contactNo: "09171234567"
    });

    assert.equal(response.status, 201);
    assert.equal(createdOptions.createdByUserId, 3);
    assert.equal(createdReservation.address, "Barangay Sto. Niño, Parañaque City");
    assert.equal(createdReservation.purpose, "Basketball court reservation");
    assert.equal(createdReservation.statusCode, "RESERVED");
    assert.equal(response.body.reservation.reservationId, 44);
  } finally {
    await closeServer(server);
  }
});

test("prototype reservation API returns conflict when backend overlap prevention rejects a slot", async () => {
  const app = buildPrototypeApiTestApp({
    session: signedInStaffSession(),
    repositories: {
      createReservation: async () => {
        throw new ReservationConflictError("Reservation overlaps an existing active reservation.");
      }
    }
  });
  const server = app.listen(0);

  try {
    const response = await postJson(server, "/api/prototype/reservations", {
      reservationDate: TODAY,
      startTime: "07:00",
      endTime: "08:00",
      representativeName: "Sto. Nino Youth",
      contactNo: "09171234567"
    });

    assert.equal(response.status, 409);
    assert.match(response.body.error, /overlaps/);
  } finally {
    await closeServer(server);
  }
});

test("prototype clear public-use API is admin-only and persists a whole-day clear range", async () => {
  const staffApp = buildPrototypeApiTestApp({ session: signedInStaffSession() });
  const staffServer = staffApp.listen(0);

  try {
    const staffResponse = await postJson(staffServer, "/api/prototype/clear-public-use", {
      date: TODAY,
      mode: "WHOLE_DAY",
      reason: "Prototype day header clear"
    });

    assert.equal(staffResponse.status, 403);
  } finally {
    await closeServer(staffServer);
  }

  let receivedPayload = null;
  let receivedOptions = null;
  const adminApp = buildPrototypeApiTestApp({
    session: signedInAdminSession(),
    repositories: {
      clearPublicUseRange: async (_db, payload, options) => {
        receivedPayload = payload;
        receivedOptions = options;
        return {
          block: {
            blockId: 22,
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
            category: "PUBLIC_USE",
            type: "CLEARED_PUBLIC_USE",
            statusCode: "CLEARED_PUBLIC_USE",
            reason: payload.reason,
            isActive: true
          },
          cancelledReservations: [
            {
              reservationId: 7,
              referenceNo: "BCS-2026-000007",
              reservationDate: payload.date,
              startTime: "08:00",
              endTime: "09:00",
              representativeName: "Team Alpha",
              contactNo: "09171234567",
              address: "Purok 3",
              purpose: "Practice",
              remarks: "",
              statusCode: "CANCELLED",
              statusName: "Cancelled",
              createdByName: "System Administrator"
            }
          ]
        };
      }
    }
  });
  const adminServer = adminApp.listen(0);

  try {
    const response = await postJson(adminServer, "/api/prototype/clear-public-use", {
      date: TODAY,
      mode: "WHOLE_DAY",
      reason: "Prototype day header clear"
    });

    assert.equal(response.status, 201);
    assert.deepEqual(receivedPayload, {
      date: TODAY,
      mode: "WHOLE_DAY",
      startTime: "07:00",
      endTime: "21:00",
      reason: "Prototype day header clear"
    });
    assert.deepEqual(receivedOptions, { userId: 1 });
    assert.equal(response.body.block.statusCode, "CLEARED_PUBLIC_USE");
    assert.equal(response.body.cancelledReservations[0].referenceNo, "BCS-2026-000007");
  } finally {
    await closeServer(adminServer);
  }
});

test("prototype account API is admin-only and maps duplicate username errors", async () => {
  const staffApp = buildPrototypeApiTestApp({ session: signedInStaffSession() });
  const staffServer = staffApp.listen(0);

  try {
    const staffResponse = await postJson(staffServer, "/api/prototype/accounts", {
      fullName: "New Staff",
      username: "newstaff",
      password: "staff123",
      role: "STAFF"
    });

    assert.equal(staffResponse.status, 403);
  } finally {
    await closeServer(staffServer);
  }

  let receivedUser = null;
  const adminApp = buildPrototypeApiTestApp({
    session: signedInAdminSession(),
    repositories: {
      createUser: async (_db, user, options) => {
        receivedUser = user;
        assert.deepEqual(options, { createdByUserId: 1 });
        return {
          userId: 9,
          fullName: user.fullName,
          username: user.username,
          role: user.role
        };
      }
    }
  });
  const adminServer = adminApp.listen(0);

  try {
    const response = await postJson(adminServer, "/api/prototype/accounts", {
      fullName: "New Staff",
      username: "newstaff",
      password: "staff123",
      role: "staff"
    });

    assert.equal(response.status, 201);
    assert.equal(receivedUser.role, "STAFF");
    assert.equal(response.body.account.role, "Staff");
  } finally {
    await closeServer(adminServer);
  }

  const duplicateApp = buildPrototypeApiTestApp({
    session: signedInAdminSession(),
    repositories: {
      createUser: async () => {
        throw new DuplicateUsernameError();
      }
    }
  });
  const duplicateServer = duplicateApp.listen(0);

  try {
    const response = await postJson(duplicateServer, "/api/prototype/accounts", {
      fullName: "Existing Staff",
      username: "staff",
      password: "staff123",
      role: "STAFF"
    });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body.errors, { username: "Username already exists." });
  } finally {
    await closeServer(duplicateServer);
  }
});

function buildPrototypeApiTestApp({ session = {}, repositories = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.session = session;
    next();
  });
  app.use(createPrototypeApiRoutes({
    db: {},
    repositories: {
      findUserByUsername: async () => null,
      clearPublicUseRange: async () => ({ block: null, cancelledReservations: [] }),
      listScheduleBlocks: async () => [],
      listReservations: async () => [],
      listUsers: async () => [],
      updateReservationStatus: async () => {},
      ...repositories
    },
    todayProvider: () => TODAY,
    currentTimeProvider: () => "06:00"
  }));
  return app;
}

function signedInStaffSession() {
  return {
    user: {
      userId: 4,
      fullName: "Court Staff",
      username: "staff",
      role: "STAFF"
    }
  };
}

function signedInAdminSession() {
  return {
    user: {
      userId: 1,
      fullName: "System Administrator",
      username: "admin",
      role: "ADMIN"
    }
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

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}
