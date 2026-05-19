export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

const MAX_FULL_NAME_LENGTH = 120;
const MAX_USERNAME_LENGTH = 60;
const MIN_USERNAME_LENGTH = 3;
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export function validateCreateUserInput(input = {}) {
  const fullName = clean(input.fullName);
  const username = clean(input.username).toLowerCase();
  const password = clean(input.password);
  const role = clean(input.role).toUpperCase();
  const errors = {};

  if (!fullName) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.fullName = "Full name must be 120 characters or fewer.";
  }

  if (!username) {
    errors.username = "Username is required.";
  } else if (username.length < MIN_USERNAME_LENGTH) {
    errors.username = "Username must be at least 3 characters.";
  } else if (username.length > MAX_USERNAME_LENGTH) {
    errors.username = "Username must be 60 characters or fewer.";
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Username may only use letters, numbers, dots, underscores, and hyphens.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = "Password must be 72 characters or fewer.";
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
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
    errors.newPassword = "New password must be 72 characters or fewer.";
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
