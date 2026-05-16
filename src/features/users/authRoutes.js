import bcrypt from "bcryptjs";
import { Router } from "express";

import {
  createUser,
  DuplicateUsernameError,
  findUserByUsername,
  listUsers,
  updateUserAccountStatus,
  updateUserPassword,
  UserNotFoundError
} from "./userRepository.js";
import { validateChangePasswordInput, validateCreateUserInput } from "./userValidation.js";

const defaultRepositories = {
  createUser,
  findUserByUsername,
  listUsers,
  updateUserAccountStatus,
  updateUserPassword
};

export function createAuthRoutes({
  db,
  repositories = {},
  enableLegacyAccountUi = true,
  enableLegacyLoginUi = true
} = {}) {
  const repo = { ...defaultRepositories, ...repositories };
  const router = Router();

  if (enableLegacyLoginUi) {
    router.get("/login", (request, response) => {
      if (request.session?.user) {
        response.redirect("/dashboard");
        return;
      }

      renderLogin(response);
    });
  }

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

  if (enableLegacyAccountUi) {
    router.get("/account/password", requireSignedIn, (request, response) => {
      renderChangePassword(response, {
        currentUser: request.session.user,
        successMessage: request.query.updated === "1" ? "Password updated successfully." : ""
      });
    });
  }

  router.post("/account/password", requireSignedIn, async (request, response) => {
    const result = validateChangePasswordInput(request.body);

    if (!result.valid) {
      renderChangePassword(response.status(400), {
        currentUser: request.session.user,
        errors: result.errors
      });
      return;
    }

    try {
      const user = await repo.findUserByUsername(db, request.session.user.username);
      const currentPasswordMatches = user ?
        await bcrypt.compare(result.value.currentPassword, user.passwordHash) :
        false;

      if (!currentPasswordMatches) {
        renderChangePassword(response.status(400), {
          currentUser: request.session.user,
          errors: { currentPassword: "Current password is incorrect." }
        });
        return;
      }

      await repo.updateUserPassword(db, request.session.user.userId, result.value.newPassword, {
        userId: request.session.user.userId
      });
      response.redirect("/account/password?updated=1");
    } catch (error) {
      renderChangePassword(response.status(503), {
        currentUser: request.session.user,
        errorMessage: databaseErrorMessage(error)
      });
    }
  });

  if (enableLegacyAccountUi) {
    router.get("/account", requireAdmin, async (request, response) => {
      try {
        const users = await repo.listUsers(db);

        response.render("account/index", {
          active: "account",
          currentUserId: request.session.user.userId,
          users,
          errorMessage: ""
        });
      } catch (error) {
        response.status(503).render("account/index", {
          active: "account",
          currentUserId: request.session.user.userId,
          users: [],
          errorMessage: databaseErrorMessage(error)
        });
      }
    });
  }

  router.get("/account/create", requireAdmin, (_request, response) => {
    if (enableLegacyAccountUi) {
      renderCreateAccount(response);
      return;
    }

    response.redirect("/account");
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

  router.post("/account/:userId/status", requireAdmin, async (request, response) => {
    const accountStatus = String(request.body.accountStatus || "").trim().toUpperCase();

    if (!["ACTIVE", "INACTIVE"].includes(accountStatus)) {
      response.status(400).send("Account status is invalid.");
      return;
    }

    if (Number(request.params.userId) === Number(request.session.user.userId)) {
      response.status(400).send("You cannot change your own account status.");
      return;
    }

    try {
      await repo.updateUserAccountStatus(db, request.params.userId, accountStatus, {
        userId: request.session.user.userId
      });
      response.redirect("/account");
    } catch (error) {
      const status = error instanceof UserNotFoundError ? 404 : 503;
      response.status(status).send(accountStatusErrorMessage(error));
    }
  });

  return router;
}

function requireAdmin(request, response, next) {
  if (!isSignedIn(request)) {
    response.redirect("/login");
    return;
  }

  if (request.session.user.role !== "ADMIN") {
    response.status(403).send("Admin access required.");
    return;
  }

  next();
}

function requireSignedIn(request, response, next) {
  if (!isSignedIn(request)) {
    response.redirect("/login");
    return;
  }

  next();
}

function isSignedIn(request) {
  return Boolean(request.session?.user);
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

function renderChangePassword(response, options = {}) {
  response.render("account/password", {
    active: "account",
    currentUser: options.currentUser || null,
    errors: options.errors || {},
    errorMessage: options.errorMessage || "",
    successMessage: options.successMessage || ""
  });
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}

function accountStatusErrorMessage(error) {
  if (error instanceof UserNotFoundError) {
    return error.message;
  }

  return databaseErrorMessage(error);
}
