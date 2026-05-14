import assert from "node:assert/strict";
import express from "express";
import test from "node:test";

import {
  assertSeedData,
  buildMysqlConnectionConfig,
  buildMysqlVerificationConfig,
  buildVerificationReservation,
  isOverlapRejection,
  prepareSqlScriptForDatabase,
  splitMysqlScript,
  verifyLiveAppHttpSmoke,
  verifyRepositoryRoundTrip
} from "../scripts/verify-mysql.mjs";

test("builds MySQL connection config from environment with safe local defaults", () => {
  const config = buildMysqlConnectionConfig({
    DB_HOST: "localhost",
    DB_PORT: "3307",
    DB_USER: "barangay_user",
    DB_PASSWORD: "secret",
    DB_NAME: "barangay_test"
  });

  assert.deepEqual(config, {
    host: "localhost",
    port: 3307,
    user: "barangay_user",
    password: "secret",
    database: "barangay_test"
  });
});

test("builds MySQL verification config with configurable admin login", () => {
  const config = buildMysqlVerificationConfig({
    VERIFY_LOGIN_USERNAME: "admin",
    VERIFY_LOGIN_PASSWORD: "changed-password"
  });

  assert.deepEqual(config, {
    loginUsername: "admin",
    loginPassword: "changed-password"
  });
});

test("builds deterministic verification reservation data from marker and date", () => {
  const reservation = buildVerificationReservation("CHECK_123", "2099-05-08");

  assert.deepEqual(reservation, {
    reservationDate: "2099-05-08",
    startTime: "07:00",
    endTime: "08:00",
    representativeName: "MySQL Verification CHECK_123",
    contactNo: "09999999999",
    address: "Barangay Office Verification",
    purpose: "System verification",
    remarks: "Temporary record created by npm run verify:mysql.",
    statusCode: "RESERVED"
  });
});

test("recognizes expected MySQL overlap trigger rejections", () => {
  assert.equal(
    isOverlapRejection(new Error("Reservation overlaps an existing active reservation.")),
    true
  );
  assert.equal(isOverlapRejection(Object.assign(new Error("signal"), { errno: 1644 })), true);
  assert.equal(isOverlapRejection(new Error("Different failure")), false);
});

test("splits MySQL scripts while preserving DELIMITER trigger bodies", () => {
  const statements = splitMysqlScript(`
    CREATE TABLE sample (id INT);
    DELIMITER //
    CREATE TRIGGER sample_before_insert
    BEFORE INSERT ON sample
    FOR EACH ROW
    BEGIN
      SET NEW.id = NEW.id;
    END//
    DELIMITER ;
    INSERT INTO sample (id) VALUES (1);
  `);

  assert.equal(statements.length, 3);
  assert.equal(statements[0], "CREATE TABLE sample (id INT)");
  assert.match(statements[1], /^CREATE TRIGGER sample_before_insert/);
  assert.match(statements[1], /END$/);
  assert.equal(statements[2], "INSERT INTO sample (id) VALUES (1)");
});

test("prepares schema scripts for the configured database name", () => {
  const sql = prepareSqlScriptForDatabase(
    "CREATE DATABASE IF NOT EXISTS barangay_court_scheduler;\nUSE barangay_court_scheduler;",
    "barangay_test"
  );

  assert.equal(sql, "CREATE DATABASE IF NOT EXISTS barangay_test;\nUSE barangay_test;");
  assert.throws(() => prepareSqlScriptForDatabase("USE barangay_court_scheduler;", "bad-name"), {
    message: /DB_NAME may only contain/
  });
});

test("asserts configured active admin, starter admin hash, statuses, and time slots", async () => {
  const connection = {
    execute: async (sql, params = {}) => {
      if (sql.includes("COUNT(*) AS count_value") && sql.includes("FROM users")) {
        return [[{ count_value: 1 }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = 'admin'")) {
        return [[{
          username: "admin",
          password_hash: "$2a$12$hash",
          role: "ADMIN",
          account_status: "ACTIVE"
        }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = :loginUsername")) {
        assert.deepEqual(params, { loginUsername: "admin" });
        return [[{
          username: "admin",
          password_hash: "$2a$12$hash",
          role: "ADMIN",
          account_status: "ACTIVE"
        }]];
      }

      if (sql.includes("FROM reservation_statuses")) {
        return [[{ count_value: 5 }]];
      }

      if (sql.includes("FROM time_slots")) {
        return [[{ count_value: 14 }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await assertSeedData(connection, {
    comparePassword: async (plain, hash) => plain === "admin123" && hash === "$2a$12$hash",
    loginUsername: "admin",
    loginPassword: "admin123"
  });
});

test("assertSeedData accepts a configured starter admin password", async () => {
  const connection = {
    execute: async (sql, params = {}) => {
      if (sql.includes("COUNT(*) AS count_value") && sql.includes("FROM users")) {
        return [[{ count_value: 1 }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = 'admin'")) {
        return [[{
          username: "admin",
          password_hash: "$2a$12$hash",
          role: "ADMIN",
          account_status: "ACTIVE"
        }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = :loginUsername")) {
        assert.deepEqual(params, { loginUsername: "admin" });
        return [[{
          username: "admin",
          password_hash: "$2a$12$hash",
          role: "ADMIN",
          account_status: "ACTIVE"
        }]];
      }

      if (sql.includes("FROM reservation_statuses")) {
        return [[{ count_value: 5 }]];
      }

      if (sql.includes("FROM time_slots")) {
        return [[{ count_value: 14 }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await assertSeedData(connection, {
    loginUsername: "admin",
    loginPassword: "changed-password",
    comparePassword: async (plain, hash) => plain === "changed-password" && hash === "$2a$12$hash"
  });
});

test("assertSeedData allows a retired starter admin when another admin is active", async () => {
  const connection = {
    execute: async (sql, params = {}) => {
      if (sql.includes("COUNT(*) AS count_value") && sql.includes("FROM users")) {
        return [[{ count_value: 1 }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = :loginUsername")) {
        assert.deepEqual(params, { loginUsername: "office_admin" });
        return [[{
          username: "office_admin",
          password_hash: "$2a$12$officehash",
          role: "ADMIN",
          account_status: "ACTIVE"
        }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = 'admin'")) {
        return [[{
          username: "admin",
          password_hash: "$2a$12$hash",
          role: "ADMIN",
          account_status: "INACTIVE"
        }]];
      }

      if (sql.includes("FROM reservation_statuses")) {
        return [[{ count_value: 5 }]];
      }

      if (sql.includes("FROM time_slots")) {
        return [[{ count_value: 14 }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await assertSeedData(connection, {
    loginUsername: "office_admin",
    loginPassword: "office-password",
    comparePassword: async (plain, hash) => plain === "office-password" && hash === "$2a$12$officehash"
  });
});

test("assertSeedData rejects a configured verification login that is not active admin", async () => {
  const connection = {
    execute: async (sql) => {
      if (sql.includes("COUNT(*) AS count_value") && sql.includes("FROM users")) {
        return [[{ count_value: 1 }]];
      }

      if (sql.includes("FROM users") && sql.includes("username = :loginUsername")) {
        return [[{
          username: "staff_user",
          password_hash: "$2a$12$hash",
          role: "STAFF",
          account_status: "ACTIVE"
        }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await assert.rejects(
    assertSeedData(connection, {
      loginUsername: "staff_user",
      loginPassword: "staff-password",
      comparePassword: async () => true
    }),
    /configured verification login must be an ADMIN account/
  );
});

test("repository round trip creates, reads, completes, checks logs, and cleans up", async () => {
  const calls = [];
  const repository = {
    createReservation: async (_pool, reservation, options) => {
      calls.push(["create", reservation.representativeName, options.createdByUserId]);
      return 77;
    },
    getReservationById: async (_pool, reservationId) => {
      calls.push(["read", reservationId]);
      return {
        reservationId,
        representativeName: "MySQL Verification CHECK_123",
        statusCode: "RESERVED"
      };
    },
    updateReservationStatus: async (_pool, reservationId, statusCode, options) => {
      calls.push(["status", reservationId, statusCode, options.userId]);
    }
  };
  const pool = {
    execute: async (sql, params) => {
      calls.push(["execute", sql.replace(/\s+/g, " ").trim(), params]);
      if (sql.includes("COUNT(*) AS count_value")) {
        return [[{ count_value: 1 }]];
      }
      return [{ affectedRows: 1 }];
    }
  };

  await verifyRepositoryRoundTrip(pool, {
    marker: "CHECK_123",
    reservationDate: "2099-05-08",
    repository
  });

  assert.deepEqual(calls.slice(0, 3), [
    ["create", "MySQL Verification CHECK_123", 1],
    ["read", 77],
    ["status", 77, "COMPLETED", 1]
  ]);
  assert.ok(calls.some((call) => call[0] === "execute" && call[1].includes("DELETE FROM activity_logs")));
  assert.ok(calls.some((call) => call[0] === "execute" && call[1].includes("DELETE FROM residents")));
});

test("live app HTTP smoke logs in and checks authenticated office pages", async () => {
  const results = await verifyLiveAppHttpSmoke({
    createApp: () => buildFakeLiveApp()
  });

  assert.deepEqual(results.map((result) => result.path), [
    "/dashboard",
    "/schedule",
    "/reservations",
    "/activity-logs",
    "/reports"
  ]);
  assert.ok(results.every((result) => result.status === 200));
});

test("live app HTTP smoke can use configured login credentials", async () => {
  const results = await verifyLiveAppHttpSmoke({
    createApp: () => buildFakeLiveApp({ username: "office_admin", password: "changed-password" }),
    loginUsername: "office_admin",
    loginPassword: "changed-password"
  });

  assert.equal(results.length, 5);
});

test("live app HTTP smoke reports login failure clearly", async () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.post("/login", (_request, response) => response.status(401).send("Invalid"));

  await assert.rejects(
    verifyLiveAppHttpSmoke({ createApp: () => app }),
    /Live app HTTP smoke failed: expected login redirect to \/dashboard/
  );
});

function buildFakeLiveApp(options = {}) {
  const app = express();
  const expectedUsername = options.username || "admin";
  const expectedPassword = options.password || "admin123";

  app.use(express.urlencoded({ extended: false }));
  app.post("/login", (request, response) => {
    if (request.body.username !== expectedUsername || request.body.password !== expectedPassword) {
      response.status(401).send("Invalid");
      return;
    }

    response.setHeader("set-cookie", "barangay_scheduler_sid=test-session; HttpOnly");
    response.redirect("/dashboard");
  });

  for (const [path, text] of [
    ["/dashboard", "id=\"root\""],
    ["/schedule", "id=\"root\""],
    ["/reservations", "id=\"root\""],
    ["/activity-logs", "id=\"root\""],
    ["/reports", "id=\"root\""]
  ]) {
    app.get(path, (request, response) => {
      if (!String(request.headers.cookie || "").includes("barangay_scheduler_sid=test-session")) {
        response.status(401).send("Missing session");
        return;
      }

      response.send(text);
    });
  }

  return app;
}
