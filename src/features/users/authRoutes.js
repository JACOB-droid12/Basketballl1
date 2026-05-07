import bcrypt from "bcryptjs";
import { Router } from "express";

import { createUser, DuplicateUsernameError, findUserByUsername } from "./userRepository.js";
import { validateCreateUserInput } from "./userValidation.js";

const defaultRepositories = { createUser, findUserByUsername };

export function createAuthRoutes({ db, repositories = {} } = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  router.get("/login", (request, response) => {
    if (request.session?.user) {
      response.redirect("/dashboard");
      return;
    }

    renderLogin(response);
  });

  router.post("/login", async (request, response) => {
    const username = String(request.body.username || "").trim().toLowerCase();
    const password = String(request.body.password || "");

    try {
      const user = username ? await repo.findUserByUsername(db, username) : null;
      const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

      if (!user || !passwordMatches) {
        renderLogin(response.status(401), {
          form: { username },
          errorMessage: "Invalid username or password."
        });
        return;
      }

      request.session.user = {
        userId: user.userId,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      };
      response.redirect("/dashboard");
    } catch (error) {
      renderLogin(response.status(503), {
        form: { username },
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  router.post("/logout", (request, response) => {
    if (typeof request.session?.destroy === "function") {
      request.session.destroy(() => response.redirect("/login"));
      return;
    }

    request.session.user = null;
    response.redirect("/login");
  });

  router.get("/account", requireAdmin, (_request, response) => {
    response.render("account/index", { active: "account" });
  });

  router.get("/account/create", requireAdmin, (_request, response) => {
    renderCreateAccount(response);
  });

  router.post("/account/create", requireAdmin, async (request, response) => {
    const result = validateCreateUserInput(request.body);

    if (!result.valid) {
      renderCreateAccount(response.status(400), {
        form: request.body,
        errors: result.errors
      });
      return;
    }

    try {
      const createdUser = await repo.createUser(db, result.value, {
        createdByUserId: request.session.user.userId
      });
      response.status(201).render("account/success", {
        active: "account",
        createdUser
      });
    } catch (error) {
      if (error instanceof DuplicateUsernameError) {
        renderCreateAccount(response.status(409), {
          form: { ...result.value, password: "" },
          errors: { username: "Username already exists." }
        });
        return;
      }

      renderCreateAccount(response.status(503), {
        form: { ...result.value, password: "" },
        errors: {},
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  return router;
}

function requireAdmin(request, response, next) {
  if (!request.session?.user) {
    response.redirect("/login");
    return;
  }

  if (request.session.user.role !== "ADMIN") {
    response.status(403).send("Admin access required.");
    return;
  }

  next();
}

function renderLogin(response, options = {}) {
  response.render("login", {
    appName: process.env.APP_NAME || "Barangay Sto. Niño Court Scheduler",
    form: options.form || {},
    errorMessage: options.errorMessage || ""
  });
}

function renderCreateAccount(response, options = {}) {
  response.render("account/create", {
    active: "account",
    form: options.form || {},
    errors: options.errors || {},
    errorMessage: options.errorMessage || ""
  });
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}
