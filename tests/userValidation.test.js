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

test("rejects too-short passwords when creating an account", () => {
  const result = validateCreateUserInput({
    fullName: "John Dela Cruz",
    username: "johndc",
    password: "short",
    role: "STAFF"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.password, "Password must be at least 8 characters.");
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

test("rejects too-short new passwords when changing password", () => {
  const result = validateChangePasswordInput({
    currentPassword: "admin123",
    newPassword: "short",
    confirmPassword: "short"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.newPassword, "New password must be at least 8 characters.");
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

test("rejects overlong and unsafe account creation fields", () => {
  const result = validateCreateUserInput({
    fullName: "A".repeat(121),
    username: "bad<script>",
    password: "B".repeat(73),
    role: "STAFF"
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    fullName: "Full name must be 120 characters or fewer.",
    username: "Username may only use letters, numbers, dots, underscores, and hyphens.",
    password: "Password must be 72 characters or fewer."
  });
});

test("rejects too-short usernames before creating accounts", () => {
  const result = validateCreateUserInput({
    fullName: "Maria Santos",
    username: "ms",
    password: "local-password",
    role: "STAFF"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.username, "Username must be at least 3 characters.");
});

test("rejects overlong password changes to avoid bcrypt truncation surprises", () => {
  const result = validateChangePasswordInput({
    currentPassword: "old-password",
    newPassword: "N".repeat(73),
    confirmPassword: "N".repeat(73)
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.newPassword, "New password must be 72 characters or fewer.");
});
