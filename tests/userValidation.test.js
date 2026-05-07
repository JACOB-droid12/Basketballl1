import assert from "node:assert/strict";
import test from "node:test";

import { validateCreateUserInput } from "../src/features/users/userValidation.js";

test("requires full name, username, password, and role when creating an account", () => {
  const result = validateCreateUserInput({});

  assert.equal(result.valid, false);
  assert.equal(result.errors.fullName, "Full name is required.");
  assert.equal(result.errors.username, "Username is required.");
  assert.equal(result.errors.password, "Password is required.");
  assert.equal(result.errors.role, "Role is required.");
});

test("rejects invalid account roles", () => {
  const result = validateCreateUserInput({
    fullName: "John Dela Cruz",
    username: "johndc",
    password: "secret123",
    role: "resident"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.role, "Role must be Admin or Staff.");
});

test("accepts and normalizes account creation fields", () => {
  const result = validateCreateUserInput({
    fullName: "  John Dela Cruz  ",
    username: "  JohnDC_Staff  ",
    password: "  secret123  ",
    role: "staff"
  });

  assert.deepEqual(result, {
    valid: true,
    value: {
      fullName: "John Dela Cruz",
      username: "johndc_staff",
      password: "secret123",
      role: "STAFF"
    },
    errors: {}
  });
});
