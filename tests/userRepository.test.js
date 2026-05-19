import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import test from "node:test";

import {
  createUser,
  buildUpdateUserPasswordQuery,
  buildUpdateUserStatusQuery,
  buildUserListQuery,
  mapAccountUserRow,
  updateUserAccountStatus,
  updateUserPassword
} from "../src/features/users/userRepository.js";

test("builds account user list query without password hashes", () => {
  const query = buildUserListQuery();

  assert.match(query.sql, /SELECT/);
  assert.match(query.sql, /user_id/);
  assert.match(query.sql, /account_status/);
  assert.doesNotMatch(query.sql, /password_hash/);
  assert.deepEqual(query.params, {});
});

test("builds user account status update query with parameters", () => {
  const query = buildUpdateUserStatusQuery(7, "INACTIVE");

  assert.match(query.sql, /UPDATE users/);
  assert.match(query.sql, /account_status = :accountStatus/);
  assert.deepEqual(query.params, {
    userId: 7,
    accountStatus: "INACTIVE"
  });
});

test("builds user password update query without plaintext password", () => {
  const query = buildUpdateUserPasswordQuery(1, "$2a$12$hashed");

  assert.match(query.sql, /password_hash = :passwordHash/);
  assert.doesNotMatch(query.sql, /new-local-password/);
  assert.deepEqual(query.params, {
    userId: 1,
    passwordHash: "$2a$12$hashed"
  });
});

test("createUser writes an account creation activity log without the plaintext password", async () => {
  const calls = [];
  const db = {
    execute: async (sql, params = {}) => {
      calls.push({ sql, params });

      if (sql.includes("SELECT user_id")) {
        return [[]];
      }

      if (sql.includes("INSERT INTO users")) {
        return [{ insertId: 7 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  const user = await createUser(db, {
    fullName: "Maria Santos",
    username: "maria",
    password: "plain-password",
    role: "STAFF"
  }, { createdByUserId: 1 });
  const logCall = calls.find((call) => call.sql.includes("INSERT INTO activity_logs"));

  assert.equal(user.userId, 7);
  assert.equal(logCall.params.reservationId, null);
  assert.equal(logCall.params.userId, 1);
  assert.equal(logCall.params.action, "CREATE_ACCOUNT");
  assert.match(logCall.params.details, /Maria Santos/);
  assert.match(logCall.params.details, /maria/);
  assert.doesNotMatch(logCall.params.details, /plain-password/);
});

test("createUser requires an explicit authenticated actor for the account activity log", async () => {
  const db = {
    execute: async () => {
      throw new Error("database should not be mutated without an actor user id");
    }
  };

  await assert.rejects(
    () => createUser(db, {
      fullName: "Maria Santos",
      username: "maria",
      password: "plain-password",
      role: "STAFF"
    }),
    /Authenticated user ID is required/
  );
});

test("updateUserAccountStatus writes activation and deactivation activity logs", async () => {
  const logParams = [];
  const db = {
    execute: async (sql, params = {}) => {
      if (sql.includes("UPDATE users")) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        logParams.push(params);
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await updateUserAccountStatus(db, 8, "INACTIVE", { userId: 1 });
  await updateUserAccountStatus(db, 8, "ACTIVE", { userId: 1 });

  assert.deepEqual(logParams.map((params) => params.action), ["DEACTIVATE_ACCOUNT", "ACTIVATE_ACCOUNT"]);
  assert.equal(logParams[0].reservationId, null);
  assert.equal(logParams[0].userId, 1);
  assert.match(logParams[0].details, /account #8/i);
  assert.match(logParams[1].details, /ACTIVE/);
});

test("updateUserAccountStatus requires an explicit authenticated actor", async () => {
  const db = {
    execute: async () => {
      throw new Error("database should not be mutated without an actor user id");
    }
  };

  await assert.rejects(
    () => updateUserAccountStatus(db, 8, "INACTIVE"),
    /Authenticated user ID is required/
  );
});

test("updateUserPassword stores a bcrypt hash", async () => {
  let savedParams = null;
  let logParams = null;
  const db = {
    execute: async (sql, params) => {
      if (sql.includes("UPDATE users")) {
        savedParams = params;
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        logParams = params;
        return [{ affectedRows: 1 }];
      }

      return [{ affectedRows: 1 }];
    }
  };

  await updateUserPassword(db, 1, "new-local-password", { userId: 1 });

  assert.notEqual(savedParams.passwordHash, "new-local-password");
  assert.equal(await bcrypt.compare("new-local-password", savedParams.passwordHash), true);
  assert.equal(logParams.reservationId, null);
  assert.equal(logParams.userId, 1);
  assert.equal(logParams.action, "CHANGE_PASSWORD");
  assert.match(logParams.details, /account #1/i);
  assert.doesNotMatch(logParams.details, /new-local-password/);
});

test("updateUserPassword requires an explicit authenticated actor", async () => {
  const db = {
    execute: async () => {
      throw new Error("database should not be mutated without an actor user id");
    }
  };

  await assert.rejects(
    () => updateUserPassword(db, 1, "new-local-password"),
    /Authenticated user ID is required/
  );
});

test("maps account user rows for the account management view", () => {
  const user = mapAccountUserRow({
    user_id: 7,
    full_name: "John Dela Cruz",
    username: "johndc_staff",
    role: "STAFF",
    account_status: "ACTIVE",
    created_at: "2026-05-08 09:15:00"
  });

  assert.deepEqual(user, {
    userId: 7,
    fullName: "John Dela Cruz",
    username: "johndc_staff",
    role: "STAFF",
    accountStatus: "ACTIVE",
    createdAt: "2026-05-08 09:15:00"
  });
});
