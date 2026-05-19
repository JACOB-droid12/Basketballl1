/**
 * Status display helper.
 *
 * Maps a backend reservation/cell status to:
 *   - `label`      readable text (prefers backend `statusName`, falls back to a
 *                  humanized `statusCode`, never empty)
 *   - `className`  CSS class that pairs with the existing `.status-*` rules
 *                  in `client/src/styles.css` (e.g. `.status-cancelled`,
 *                  `.status-completed`)
 *   - `paletteKey` abstract soft-color token from the Barangay_Visual_Language;
 *                  one of `neutral`, `positive`, `info`, `warning`, `danger`,
 *                  `muted` -- no new color tokens are introduced
 *
 * Covered status codes:
 *   AVAILABLE, RESERVED, MISSED, CANCELLED, COMPLETED,
 *   MAINTENANCE, BARANGAY_EVENT, CLEARED_PUBLIC_USE.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 18.2
 */

const STATUS_DISPLAY = {
  AVAILABLE: { className: "status-available", paletteKey: "positive" },
  RESERVED: { className: "status-reserved", paletteKey: "info" },
  MISSED: { className: "status-missed", paletteKey: "danger" },
  CANCELLED: { className: "status-cancelled", paletteKey: "danger" },
  COMPLETED: { className: "status-completed", paletteKey: "muted" },
  MAINTENANCE: { className: "status-maintenance", paletteKey: "warning" },
  BARANGAY_EVENT: { className: "status-barangay_event", paletteKey: "info" },
  CLEARED_PUBLIC_USE: { className: "status-cleared_public_use", paletteKey: "neutral" }
};

const FALLBACK_LABEL = "Status unknown";
const FALLBACK_CLASS = "status-unknown";
const FALLBACK_PALETTE = "muted";

export function getStatusDisplay(statusCode, statusName) {
  const code = normalizeCode(statusCode);
  const known = code ? STATUS_DISPLAY[code] : null;

  const className = known
    ? known.className
    : code
      ? `status-${code.toLowerCase()}`
      : FALLBACK_CLASS;

  const paletteKey = known ? known.paletteKey : FALLBACK_PALETTE;
  const label = pickLabel(statusName, code);

  return { label, className, paletteKey };
}

function normalizeCode(statusCode) {
  if (statusCode === null || statusCode === undefined) return "";
  return String(statusCode).trim().toUpperCase();
}

function pickLabel(statusName, code) {
  const fromName = statusName === null || statusName === undefined
    ? ""
    : String(statusName).trim();
  if (fromName !== "") return fromName;

  const humanized = humanize(code);
  if (humanized !== "") return humanized;

  return FALLBACK_LABEL;
}

function humanize(code) {
  if (!code) return "";
  const lowered = code.toLowerCase().replace(/_/g, " ").trim();
  if (lowered === "") return "";
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}
