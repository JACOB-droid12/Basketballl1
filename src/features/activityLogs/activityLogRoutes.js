import { Router } from "express";

import { listActivityLogs } from "./activityLogRepository.js";

const defaultRepositories = {
  listActivityLogs
};

export function createActivityLogRoutes({ db, repositories = {} } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/activity-logs", async (request, response) => {
    const filters = cleanFilters(request.query);

    try {
      const logs = await repo.listActivityLogs(db, filters);

      response.render("activityLogs/index", {
        active: "activityLogs",
        filters,
        logs,
        errorMessage: ""
      });
    } catch (error) {
      response.status(503).render("activityLogs/index", {
        active: "activityLogs",
        filters,
        logs: [],
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  return router;
}

function cleanFilters(query) {
  return {
    action: clean(query.action).toUpperCase(),
    date: clean(query.date),
    search: clean(query.search)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}
