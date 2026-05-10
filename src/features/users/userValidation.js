export function validateCreateUserInput(input = {}) {
  const fullName = clean(input.fullName);
  const username = clean(input.username).toLowerCase();
  const password = clean(input.password);
  const role = clean(input.role).toUpperCase();
  const errors = {};

  if (!fullName) {
    errors.fullName = "Full name is required.";
  }

  if (!username) {
    errors.username = "Username is required.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (!role) {
    errors.role = "Role is required.";
  } else if (!["ADMIN", "STAFF"].includes(role)) {
    errors.role = "Role must be Admin or Staff.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: { fullName, username, password, role },
    errors: {}
  };
}

export function validateChangePasswordInput(input = {}) {
  const currentPassword = clean(input.currentPassword);
  const newPassword = clean(input.newPassword);
  const confirmPassword = clean(input.confirmPassword);
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (newPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = "Confirm password must match the new password.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: { currentPassword, newPassword },
    errors: {}
  };
}

function clean(value) {
  return String(value || "").trim();
}
