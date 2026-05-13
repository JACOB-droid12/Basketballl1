import bcrypt from "bcryptjs";
import { Router } from "express";

import {
  getReservationStatuses,
  getTimeSlots,
  listReservations
} from "../reservations/reservationRepository.js";
import { findUserByUsername, listUsers } from "../users/userRepository.js";
import { sendDatabaseError, sendLoginRequired } from "./apiErrors.js";
import { toApiUser } from "./apiMappers.js";

const defaultRepositories = {
  findUserByUsername,
  getReservationStatuses,
  getTimeSlots,
  listReservations,
  listUsers
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

  router.get("/api/reservations", (_request, response) => {
    response.json({ reservations: [] });
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
