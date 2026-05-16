import assert from "node:assert/strict";
import express from "express";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReservationRoutes } from "../src/features/reservations/reservationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("POST /reservations returns validation messages for missing required fields", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    createReservationRoutes({
      db: {},
      todayProvider: () => "2026-05-07"
    })
  );

  const server = app.listen(0);
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/reservations`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: ""
    });
    const body = await response.text();

    assert.equal(response.status, 400);
    assert.match(body, /Reservation date is required\./);
    assert.match(body, /Resident or group representative name is required\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /reservations passes the signed-in user id as the reservation creator", async () => {
  let createCall = null;
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use((request, _response, next) => {
    request.session = { user: { userId: 42 } };
    next();
  });
  app.use(
    createReservationRoutes({
      db: {},
      todayProvider: () => "2026-05-07",
      repositories: {
        createReservation: async (_db, reservation, options) => {
          createCall = { reservation, options };
        }
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        reservationDate: "2026-05-08",
        startTime: "07:00",
        endTime: "08:00",
        representativeName: "Sto. Niño Youth Team",
        contactNo: "09171234567",
        address: "Purok 3",
        purpose: "Practice"
      })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/reservations?reservationDate=2026-05-08");
    assert.equal(createCall.options.createdByUserId, 42);
    assert.equal(createCall.reservation.representativeName, "Sto. Niño Youth Team");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /reservations renders an export link that preserves filters", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        listReservations: async () => [],
        getReservationStatuses: async () => [
          {
            statusCode: "RESERVED",
            statusName: "Reserved"
          }
        ]
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/reservations?reservationDate=2026-05-08&statusCode=RESERVED&purpose=Practice`
    );
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Export CSV/);
    assert.match(body, /Print Records/);
    assert.match(body, /onclick="window\.print\(\)"/);
    assert.match(
      body,
      /href="\/reservations\/export\.csv\?reservationDate=2026-05-08&amp;statusCode=RESERVED&amp;purpose=Practice"/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /reservations/:reservationId renders representative detail information", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        getReservationById: async () => ({
          reservationId: 7,
          reservationDate: "2026-05-08",
          startTime: "07:00",
          endTime: "08:00",
          representativeName: "Sto. Niño Youth Team",
          contactNo: "09171234567",
          address: "Purok 3",
          purpose: "Practice",
          remarks: "Bring barangay ID.",
          statusCode: "RESERVED",
          statusName: "Reserved",
          createdByName: "Admin User"
        })
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/7`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Representative Personal information/);
    assert.match(body, /Sto\. Niño Youth Team/);
    assert.match(body, /09171234567/);
    assert.match(body, /Purok 3/);
    assert.match(body, /Practice/);
    assert.match(body, /return confirm\('Mark this reservation as missed\?'\)/);
    assert.match(body, /return confirm\('Mark this reservation as completed\?'\)/);
    assert.match(body, /return confirm\('Cancel this reservation\?'\)/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /reservations/export.csv downloads filtered reservation records", async () => {
  let receivedFilters = null;
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        listReservations: async (_db, filters) => {
          receivedFilters = filters;
          return [
            {
              reservationDate: "2026-05-08",
              startTime: "07:00",
              endTime: "08:00",
              representativeName: "Sto. Niño Youth Team",
              contactNo: "09171234567",
              address: "Purok 3",
              purpose: "Practice",
              statusName: "Reserved",
              createdByName: "Admin User"
            }
          ];
        }
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/reservations/export.csv?reservationDate=2026-05-08&statusCode=RESERVED`
    );
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/csv/);
    assert.match(response.headers.get("content-disposition"), /attachment; filename="reservations.csv"/);
    assert.deepEqual(receivedFilters, {
      reservationDate: "2026-05-08",
      statusCode: "RESERVED",
      search: "",
      purpose: ""
    });
    assert.match(body, /Reservation Date,Start Time,End Time,Representative/);
    assert.match(body, /2026-05-08,07:00,08:00,Sto\. Niño Youth Team/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /reservations/:reservationId returns 404 when the reservation is missing", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        getReservationById: async () => null
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/999`);
    const body = await response.text();

    assert.equal(response.status, 404);
    assert.match(body, /Reservation record was not found/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /reservations/:reservationId/edit renders a populated edit form", async () => {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        getReservationById: async () => ({
          reservationId: 7,
          reservationDate: "2026-05-08",
          startTime: "07:00",
          endTime: "08:00",
          representativeName: "Sto. Niño Youth Team",
          contactNo: "09171234567",
          address: "Purok 3",
          purpose: "Practice",
          remarks: "Bring barangay ID.",
          statusCode: "RESERVED",
          statusName: "Reserved",
          createdByName: "Admin User"
        })
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/7/edit`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Edit Reservation/);
    assert.match(body, /Sto\. Niño Youth Team/);
    assert.match(body, /Bring barangay ID\./);
    assert.match(body, /action="\/reservations\/7\/edit"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /reservations/:reservationId/edit updates a reservation and redirects to detail", async () => {
  let updatedReservation = null;
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    createReservationRoutes({
      db: {},
      todayProvider: () => "2026-05-08",
      currentTimeProvider: () => "06:00",
      repositories: {
        updateReservation: async (_db, reservationId, reservation) => {
          updatedReservation = { reservationId, reservation };
        }
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/7/edit`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        reservationDate: "2026-05-08",
        startTime: "07:00",
        endTime: "08:00",
        representativeName: "Sto. Niño Youth Team Updated",
        contactNo: "09170000000",
        address: "Purok 4",
        purpose: "Game",
        remarks: "Updated remarks"
      })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/reservations/7");
    assert.deepEqual(updatedReservation, {
      reservationId: "7",
      reservation: {
        reservationDate: "2026-05-08",
        startTime: "07:00",
        endTime: "08:00",
        representativeName: "Sto. Niño Youth Team Updated",
        contactNo: "09170000000",
        address: "Purok 4",
        purpose: "Game",
        remarks: "Updated remarks",
        statusCode: "RESERVED"
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /reservations/:reservationId/status passes the signed-in user id to the activity log path", async () => {
  let statusCall = null;
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));
  app.use(express.urlencoded({ extended: false }));
  app.use((request, _response, next) => {
    request.session = { user: { userId: 84 } };
    next();
  });
  app.use(
    createReservationRoutes({
      db: {},
      repositories: {
        updateReservationStatus: async (_db, reservationId, statusCode, options) => {
          statusCall = { reservationId, statusCode, options };
        }
      }
    })
  );

  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/reservations/7/status`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        statusCode: "COMPLETED",
        returnTo: "/reservations/7"
      })
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/reservations/7");
    assert.deepEqual(statusCall, {
      reservationId: "7",
      statusCode: "COMPLETED",
      options: { userId: 84 }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
