import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import test from "node:test";

import {
  buildUpdateUserPasswordQuery,
  buildUpdateUserStatusQuery,
  buildUserListQuery,
  mapAccountUserRow,
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

test("updateUserPassword stores a bcrypt hash", async () => {
  let savedParams = null;
  const db = {
    execute: async (_sql, params) => {
      savedParams = params;
      return [{ affectedRows: 1 }];
    }
  };

  await updateUserPassword(db, 1, "new-local-password");

  assert.notEqual(savedParams.passwordHash, "new-local-password");
  assert.equal(await bcrypt.compare("new-local-password", savedParams.passwordHash), true);
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
