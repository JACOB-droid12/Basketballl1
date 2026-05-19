export const MIN_SESSION_SECRET_LENGTH = 32;

const DEFAULT_SESSION_SECRET_PLACEHOLDERS = new Set([
  "development-only-change-me",
  "replace-with-a-long-random-local-secret"
]);

export function cleanSessionSecret(value) {
  return String(value ?? "").trim().replace(/^["']|["']$/g, "");
}

export function hasStrongSessionSecret(value) {
  const secret = cleanSessionSecret(value);
  return secret.length >= MIN_SESSION_SECRET_LENGTH && !DEFAULT_SESSION_SECRET_PLACEHOLDERS.has(secret);
}

export function getRequiredSessionSecret(env = process.env) {
  const secret = cleanSessionSecret(env.APP_SESSION_SECRET);

  if (!hasStrongSessionSecret(secret)) {
    throw new Error(
      `APP_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters and not use a public default. Run npm run setup:env to create a local .env file.`
    );
  }

  return secret;
}
