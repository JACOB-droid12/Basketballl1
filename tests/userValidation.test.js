import assert from "node:assert/strict";
import test from "node:test";

import {
  validateChangePasswordInput,
  validateCreateUserInput
} from "../src/features/users/userValidation.js";

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

test("requires current, new, and confirmation passwords when changing password", () => {
  const result = validateChangePasswordInput({});

  assert.equal(result.valid, false);
  assert.equal(result.errors.currentPassword, "Current password is required.");
  assert.equal(result.errors.newPassword, "New password is required.");
  assert.equal(result.errors.confirmPassword, "Confirm password is required.");
});

test("rejects mismatched password confirmation", () => {
  const result = validateChangePasswordInput({
    currentPassword: "admin123",
    newPassword: "new-password",
    confirmPassword: "different-password"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.confirmPassword, "Confirm password must match the new password.");
});

test("accepts password change fields", () => {
  const result = validateChangePasswordInput({
    currentPassword: " admin123 ",
    newPassword: " new-local-password ",
    confirmPassword: " new-local-password "
  });

  assert.deepEqual(result, {
    valid: true,
    value: {
      currentPassword: "admin123",
      newPassword: "new-local-password"
    },
    errors: {}
  });
});
