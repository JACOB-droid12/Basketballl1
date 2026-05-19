export function sendValidationError(response, errors) {
  response.status(400).json({ errors });
}

export function sendLoginRequired(response) {
  response.status(401).json({ error: "Login required." });
}

export function sendAdminRequired(response) {
  response.status(403).json({ error: "Admin access required." });
}

export function sendDatabaseError(response, error) {
  response.status(503).json({ error: databaseErrorMessage(error) });
}

function databaseErrorMessage(error) {
  if (process.env.NODE_ENV === "development" && error?.message) {
    return `Database is unavailable: ${error.message}`;
  }

  return "Database is unavailable. Check that local MySQL is running and the database setup has been applied.";
}
