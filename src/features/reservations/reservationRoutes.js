import { Router } from "express";

import {
  createReservation,
  getReservationById,
  getReservationStatuses,
  listReservations,
  ReservationConflictError,
  ReservationNotFoundError,
  updateReservation,
  updateReservationStatus
} from "./reservationRepository.js";
import { toReservationCsv } from "./reservationExport.js";
import { validateReservationInput } from "./reservationValidation.js";

const defaultRepositories = {
  createReservation,
  getReservationById,
  getReservationStatuses,
  listReservations,
  updateReservation,
  updateReservationStatus
};

export function createReservationRoutes({ db, todayProvider = getTodayDate, repositories = {} } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/reservations", async (request, response) => {
    const filters = cleanFilters(request.query);

    try {
      const [reservations, statuses] = await Promise.all([
        repo.listReservations(db, filters),
        repo.getReservationStatuses(db)
      ]);

      response.render("reservations/index", {
        active: "reservations",
        exportUrl: buildReservationExportUrl(filters),
        filters,
        reservations,
        statuses,
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("reservations/index", {
        active: "reservations",
        exportUrl: buildReservationExportUrl(filters),
        filters,
        reservations: [],
        statuses: [],
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  router.get("/reservations/export.csv", async (request, response) => {
    const filters = cleanFilters(request.query);

    try {
      const reservations = await repo.listReservations(db, filters);

      response.setHeader("content-type", "text/csv; charset=utf-8");
      response.setHeader("content-disposition", 'attachment; filename="reservations.csv"');
      response.send(toReservationCsv(reservations));
    } catch (error) {
      response.status(503).type("text/plain").send(databaseErrorMessage(error));
    }
  });

  router.get("/reservations/new", (request, response) => {
    response.render("reservations/new", {
      active: "reservations",
      form: {
        reservationDate: request.query.date || todayProvider(),
        startTime: request.query.startTime || "",
        endTime: request.query.endTime || "",
        representativeName: "",
        contactNo: "",
        address: "",
        purpose: "",
        remarks: ""
      },
      errors: {},
      errorMessage: ""
    });
  });

  router.get("/reservations/:reservationId/edit", async (request, response) => {
    try {
      const reservation = await repo.getReservationById(db, request.params.reservationId);

      if (!reservation) {
        response.status(404).render("reservations/show", {
          active: "reservations",
          reservation: null,
          errorMessage: "Reservation record was not found."
        });
        return;
      }

      response.render("reservations/edit", {
        active: "reservations",
        reservationId: request.params.reservationId,
        form: reservation,
        errors: {},
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("reservations/edit", {
        active: "reservations",
        reservationId: request.params.reservationId,
        form: {},
        errors: {},
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  router.get("/reservations/:reservationId", async (request, response) => {
    try {
      const reservation = await repo.getReservationById(db, request.params.reservationId);

      if (!reservation) {
        response.status(404).render("reservations/show", {
          active: "reservations",
          reservation: null,
          errorMessage: "Reservation record was not found."
        });
        return;
      }

      response.render("reservations/show", {
        active: "reservations",
        reservation,
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("reservations/show", {
        active: "reservations",
        reservation: null,
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  router.post("/reservations/:reservationId/edit", async (request, response) => {
    const result = validateReservationInput(request.body, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      response.status(400).render("reservations/edit", {
        active: "reservations",
        reservationId: request.params.reservationId,
        form: { ...request.body, statusCode: request.body.statusCode || "RESERVED" },
        errors: result.errors,
        errorMessage: ""
      });
      return;
    }

    try {
      await repo.updateReservation(db, request.params.reservationId, result.value, {
        userId: request.session?.user?.userId
      });
      response.redirect(`/reservations/${request.params.reservationId}`);
    } catch (error) {
      const status = error instanceof ReservationConflictError ? 409 : error instanceof ReservationNotFoundError ? 404 : 503;
      response.status(status).render("reservations/edit", {
        active: "reservations",
        reservationId: request.params.reservationId,
        form: result.value,
        errors: {},
        errorMessage: editErrorMessage(error)
      });
    }
  });

  router.post("/reservations", async (request, response) => {
    const result = validateReservationInput(request.body, {
      today: todayProvider(),
      requireTodayOrFuture: true
    });

    if (!result.valid) {
      response.status(400).render("reservations/new", {
        active: "reservations",
        form: { ...request.body, statusCode: request.body.statusCode || "RESERVED" },
        errors: result.errors,
        errorMessage: ""
      });
      return;
    }

    try {
      await repo.createReservation(db, result.value, {
        createdByUserId: request.session?.user?.userId
      });
      response.redirect(`/reservations?reservationDate=${encodeURIComponent(result.value.reservationDate)}`);
    } catch (error) {
      const status = error instanceof ReservationConflictError ? 409 : 503;
      response.status(status).render("reservations/new", {
        active: "reservations",
        form: result.value,
        errors: {},
        errorMessage: error instanceof ReservationConflictError ? error.message : databaseErrorMessage(error)
      });
    }
  });

  router.post("/reservations/:reservationId/status", async (request, response) => {
    const statusCode = String(request.body.statusCode || "").toUpperCase();
    const allowed = new Set(["MISSED", "CANCELLED", "COMPLETED"]);

    if (!allowed.has(statusCode)) {
      response.status(400).redirect("/reservations");
      return;
    }

    try {
      await repo.updateReservationStatus(db, request.params.reservationId, statusCode, {
        userId: request.session?.user?.userId
      });
      response.redirect(request.body.returnTo || "/reservations");
    } catch {
      response.status(503).redirect(request.body.returnTo || "/reservations");
    }
  });

  return router;
}

function cleanFilters(query) {
  return {
    reservationDate: clean(query.reservationDate),
    statusCode: clean(query.statusCode),
    search: clean(query.search),
    purpose: clean(query.purpose)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function buildReservationExportUrl(filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/reservations/export.csv?${query}` : "/reservations/export.csv";
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}

function editErrorMessage(error) {
  if (error instanceof ReservationConflictError || error instanceof ReservationNotFoundError) {
    return error.message;
  }

  return databaseErrorMessage(error);
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
