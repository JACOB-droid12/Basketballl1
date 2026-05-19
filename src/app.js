import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabasePool } from "./config/database.js";
import { getRequiredSessionSecret } from "./config/sessionSecret.js";
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
  const env = options.env || process.env;
  app.locals.db = db;

  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "views"));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(projectRoot, "public")));
  app.use("/app/assets", (_request, response) => {
    response.status(404).type("text/plain").send("React asset not found.");
  });
  app.use(
    options.sessionMiddleware || session({
      name: "barangay_scheduler_sid",
      secret: getRequiredSessionSecret(env),
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

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", milestone: "foundation" });
  });
  app.get("/favicon.ico", (_request, response) => {
    response.status(204).end();
  });

  app.use(createAuthRoutes({ db, enableLegacyAccountUi: false, enableLegacyLoginUi: false }));
  app.use(createApiRoutes({ db }));
  app.use(createPrototypeApiRoutes({ db }));
  app.use(createReactAppRoutes());
  app.use(createPrototypeRoutes());
  app.use(requireSignedIn);
  app.use(createDashboardRoutes({ db }));
  app.use(createReservationRoutes({ db }));
  app.use(createScheduleRoutes({ db }));
  app.use(createActivityLogRoutes({ db }));

  return app;
}
