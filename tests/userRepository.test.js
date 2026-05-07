import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUpdateUserStatusQuery,
  buildUserListQuery,
  mapAccountUserRow
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
