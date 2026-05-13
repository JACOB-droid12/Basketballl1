import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabasePool } from "./config/database.js";
import { createApiRoutes } from "./features/api/apiRoutes.js";
import { createActivityLogRoutes } from "./features/activityLogs/activityLogRoutes.js";
import { createReactAppRoutes } from "./features/frontend/reactAppRoutes.js";
import { createPrototypeApiRoutes } from "./features/prototype/prototypeApiRoutes.js";
import { createPrototypeRoutes } from "./features/prototype/prototypeRoutes.js";
import { createReservationRoutes } from "./features/reservations/reservationRoutes.js";
import { createDashboardRoutes } from "./features/schedule/dashboardRoutes.js";
import { createScheduleRoutes } from "./features/schedule/scheduleRoutes.js";
import { createAuthRoutes } from "./features/users/authRoutes.js";
import { requireSignedIn } from "./features/users/sessionMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export function createApp(options = {}) {
  const app = express();
  const db = options.db || createDatabasePool();
  app.locals.db = db;

  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(projectRoot, "public")));
  app.use(
    options.sessionMiddleware || session({
      name: "barangay_scheduler_sid",
      secret: process.env.APP_SESSION_SECRET || "development-only-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax"
      }
    })
  );
  app.use((request, response, next) => {
    response.locals.currentUser = request.session?.user || null;
    next();
  });

  app.use(createPrototypeRoutes());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", milestone: "foundation" });
  });

  app.use(createAuthRoutes({ db, enableLegacyAccountUi: false }));
  app.use(createApiRoutes({ db }));
  app.use(createPrototypeApiRoutes({ db }));
  app.use(requireSignedIn);
  app.use(createReactAppRoutes());
  app.use(createDashboardRoutes({ db }));
  app.use(createReservationRoutes({ db }));
  app.use(createScheduleRoutes({ db }));
  app.use(createActivityLogRoutes({ db }));

  return app;
}
