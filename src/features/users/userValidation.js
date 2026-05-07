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

function clean(value) {
  return String(value || "").trim();
}
