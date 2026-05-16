import bcrypt from "bcryptjs";
import { Router } from "express";

import {
  createReservation,
  getReservationById,
  listReservations,
  ReservationConflictError,
  ReservationNotFoundError,
  updateReservation,
  updateReservationStatus
} from "../reservations/reservationRepository.js";
import { validateReservationInput } from "../reservations/reservationValidation.js";
import {
  createUser,
  DuplicateUsernameError,
  findUserByUsername,
  listUsers
} from "../users/userRepository.js";
import { validateCreateUserInput } from "../users/userValidation.js";

const DEFAULT_ADDRESS = "Barangay Sto. Niño, Parañaque City";
const DEFAULT_PURPOSE = "Basketball court reservation";

const defaultRepositories = {
  createReservation,
  createUser,
  findUserByUsername,
  getReservationById,
  listReservations,
  listUsers,
  updateReservation,
  updateReservationStatus
};

export function createPrototypeApiRoutes({
  db,
  repositories = {},
  todayProvider = getTodayDate,
  currentTimeProvider = getCurrentManilaTime
} = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/api/prototype/session", (request, response) => {
    response.json({
      authenticated: Boolean(request.session?.user),
      user: request.session?.user ? toPrototypeUser(request.session.user) : null
    });
  });

  router.post("/api/prototype/login", async (request, response) => {
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
      response.json({ user: toPrototypeUser(request.session.user) });
    } catch (error) {
      response.status(503).json({ error: databaseErrorMessage(error) });
    }
  });

  router.post("/api/prototype/logout", (request, response) => {
    if (typeof request.session?.destroy === "function") {
      request.session.destroy(() => response.json({ ok: true }));
      return;
    }

    request.session.user = null;
    response.json({ ok: true });
  });

  router.use("/api/prototype", requirePrototypeSignedIn);

  router.get("/api/prototype/reservations", async (_request, response) => {
    try {
      const reservations = await repo.listReservations(db, {});
      response.json({ reservations });
    } catch (error) {
      response.status(503).json({ error: databaseErrorMessage(error) });
    }
  });

  router.post("/api/prototype/reservations", async (request, response) => {
    const result = validatePrototypeReservation(request.body, todayProvider(), currentTimeProvider());

    if (!result.valid) {
      response.status(400).json({ errors: result.errors });
      return;
    }

    try {
      const reservationId = await repo.createReservation(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, reservationId);
      response.status(201).json({ reservation });
    } catch (error) {
      response.status(error instanceof ReservationConflictError ? 409 : 503).json({
        error: error instanceof ReservationConflictError ? error.message : databaseErrorMessage(error)
      });
    }
  });

  router.put("/api/prototype/reservations/:reservationId", async (request, response) => {
    const result = validatePrototypeReservation(request.body, todayProvider(), currentTimeProvider());

    if (!result.valid) {
      response.status(400).json({ errors: result.errors });
      return;
    }

    try {
      await repo.updateReservation(db, request.params.reservationId, result.value, {
        userId: request.session.user.userId
      });
      const reservation = await repo.getReservationById(db, request.params.reservationId);
      response.json({ reservation });
    } catch (error) {
      const status = error instanceof ReservationConflictError ? 409 : error instanceof ReservationNotFoundError ? 404 : 503;
      response.status(status).json({
        error: error instanceof ReservationConflictError || error instanceof ReservationNotFoundError ?
          error.message :
          databaseErrorMessage(error)
      });
    }
  });

  router.post("/api/prototype/reservations/:reservationId/status", async (request, response) => {
    const statusCode = String(request.body.statusCode || "").trim().toUpperCase();

    if (!["MISSED", "CANCELLED", "COMPLETED"].includes(statusCode)) {
      response.status(400).json({ error: "Reservation status is invalid." });
      return;
    }

    try {
      await repo.updateReservationStatus(db, request.params.reservationId, statusCode, {
        userId: request.session.user.userId
      });
      response.json({ ok: true });
    } catch (error) {
      response.status(503).json({ error: databaseErrorMessage(error) });
    }
  });

  router.get("/api/prototype/accounts", requirePrototypeAdmin, async (_request, response) => {
    try {
      const users = await repo.listUsers(db);
      response.json({ accounts: users.map(toPrototypeAccount) });
    } catch (error) {
      response.status(503).json({ error: databaseErrorMessage(error) });
    }
  });

  router.post("/api/prototype/accounts", requirePrototypeAdmin, async (request, response) => {
    const result = validateCreateUserInput({
      fullName: request.body.fullName,
      username: request.body.username,
      password: request.body.password,
      role: String(request.body.role || "").toUpperCase()
    });

    if (!result.valid) {
      response.status(400).json({ errors: result.errors });
      return;
    }

    try {
      const account = await repo.createUser(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      response.status(201).json({ account: toPrototypeAccount(account) });
    } catch (error) {
      if (error instanceof DuplicateUsernameError) {
        response.status(409).json({ errors: { username: "Username already exists." } });
        return;
      }

      response.status(503).json({ error: databaseErrorMessage(error) });
    }
  });

  return router;
}

function validatePrototypeReservation(input, today, currentTime) {
  return validateReservationInput({
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
    representativeName: input.representativeName,
    contactNo: input.contactNo,
    address: input.address || DEFAULT_ADDRESS,
    purpose: input.purpose || DEFAULT_PURPOSE,
    remarks: input.remarks || "",
    statusCode: "RESERVED"
  }, {
    today,
    currentTime,
    requireTodayOrFuture: true
  });
}

function requirePrototypeSignedIn(request, response, next) {
  if (!request.session?.user) {
    response.status(401).json({ error: "Login required." });
    return;
  }

  next();
}

function requirePrototypeAdmin(request, response, next) {
  if (request.session?.user?.role !== "ADMIN") {
    response.status(403).json({ error: "Admin access required." });
    return;
  }

  next();
}

function toPrototypeUser(user) {
  return {
    userId: user.userId,
    fullname: user.fullName,
    username: user.username,
    role: toTitleRole(user.role)
  };
}

function toPrototypeAccount(user) {
  return {
    userId: user.userId,
    fullname: user.fullName,
    username: user.username,
    role: toTitleRole(user.role),
    status: user.accountStatus || "ACTIVE",
    lastLogin: user.createdAt || ""
  };
}

function toTitleRole(role) {
  return String(role || "").toUpperCase() === "ADMIN" ? "Admin" : "Staff";
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
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
