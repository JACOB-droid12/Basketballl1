export const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Did not show",
  CANCELLED: "Cancelled",
  // Canonical label for the COMPLETED status code. Every consumer that
  // surfaces this status (reservation list, detail drawer, calendar
  // legend, reports, etc.) reads this single string so the UI never
  // shows two different words ("Done" vs "Completed") for the same
  // backend status. The backend `statusName` continues to win when the
  // server returns one (`statusDisplay.js` prefers it before falling
  // back here), so localized server copy still works (Req. 16.1–16.4).
  COMPLETED: "Completed"
};

const MANILA_TIME_ZONE = "Asia/Manila";

export function formatTime(time) {
  const [hoursText, minutes = "00"] = String(time || "").split(":");
  let hours = Number(hoursText);
  if (Number.isNaN(hours)) return "";
  const suffix = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${dateString}T00:00:00Z`));
}

// Compact human-readable date for tables and rows where the slim
// "May 18, 2026" form reads better than the longer "Mon, May 18, 2026"
// produced by `formatDate`. Used in activity logs and report tables so
// timestamp columns match the friendly office style instead of the
// raw `YYYY-MM-DD` string the backend returns.
export function formatDateShort(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${dateString}T00:00:00Z`));
}

// Render an "HH:MM" - "HH:MM" backend pair as "1:00 PM – 2:00 PM" using
// the en-dash favoured on the printed slips. Falls back to whichever
// piece is present so a single-bound row still renders.
export function formatTimeRange(startTime, endTime) {
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  if (!start && !end) return "";
  if (!start) return formatTime(end);
  if (!end) return formatTime(start);
  return `${formatTime(start)} \u2013 ${formatTime(end)}`;
}

// Render an "HH:MM" - "HH:MM" backend pair as "9:00 AM to 11:00 AM"
// using the friendly literal " to " separator the office prefers on
// non-print surfaces (Reports tiles, "most-used time slot", etc.).
// Falls back to whichever bound is present so a single-bound row still
// renders. The slip print view continues to call `formatTimeRange`
// (en-dash variant) to preserve the printed permit's typography
// (Req. 10.1, 10.2).
export function formatTimeRangeFriendly(startTime, endTime) {
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  if (!start && !end) return "";
  if (!start) return formatTime(end);
  if (!end) return formatTime(start);
  return `${formatTime(start)} to ${formatTime(end)}`;
}

// Render a backend SQL date-time (`YYYY-MM-DD HH:MM:SS` or ISO 8601) as
// the friendly office form `May 18, 2026, 1:30 PM`. Used in activity
// logs, account lists, and the printed slip's "Issued on" line so all
// visible date-time cells match the rest of the app.
//
// The backend stores office-local Manila timestamps in plain SQL form
// (no trailing `Z`). The previous version of this helper parsed those
// strings as ISO local time but then formatted them with `timeZone:
// "UTC"`, which dropped the Manila offset and shifted every visible
// timestamp by 8 hours. We now parse the wall-clock components
// directly and format them as Manila time so the printed slip,
// activity log, and account list all match the value the backend
// recorded (UI-AUD-003).
//
// The CSV export endpoints continue to receive raw timestamps from the
// backend; this helper only changes how the value is shown on screen
// or in print.
export function formatDateTimeHuman(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";

  // Try the local-wall-clock form first: `YYYY-MM-DD HH:MM[:SS]` or
  // `YYYY-MM-DDTHH:MM[:SS]` with no timezone suffix. These are the
  // shapes the local SQLite layer emits (office-local Manila time).
  // We construct a UTC reference Date from the parts so Intl can
  // format it through the Manila zone without re-shifting it.
  const localMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    const [, y, mo, d, h, mi, s] = localMatch;
    const reference = new Date(Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s || 0)
    ));
    if (!Number.isNaN(reference.getTime())) {
      const datePart = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      }).format(reference);
      const timePart = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC"
      }).format(reference);
      return `${datePart}, ${timePart}`;
    }
  }

  // Fall back for full ISO strings with a Z/offset suffix: parse and
  // format through the Manila timezone so the rendered value matches
  // what the office clock would read.
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: MANILA_TIME_ZONE
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MANILA_TIME_ZONE
  }).format(parsed);

  return `${datePart}, ${timePart}`;
}

// Render a backend-provided timestamp value as the Manila wall-clock
// date and time the backend stored, or render the placeholder "—" when
// the value is missing or cannot be parsed (UI-AUD-003 / Req. 2.1–2.4).
//
// This is the single shared formatter every consumer should call for a
// backend `createdAt` / `updatedAt` / `issuedAt` / `loggedAt` field, so
// the activity logs page, accounts page, slip print view, and daily
// print all read the same wall-clock the backend recorded regardless
// of the browser's local timezone (Req. 2.1, 2.2, 2.3).
//
// Implementation note: this delegates to `formatDateTimeHuman`, which
// already preserves Manila wall-clock through Intl with
// `timeZone: "UTC"` for the local-SQL form (`YYYY-MM-DD HH:MM[:SS]`)
// and `timeZone: "Asia/Manila"` for full ISO 8601 strings. When
// `formatDateTimeHuman` cannot parse its input it falls back to
// returning the raw text; we treat that case as unparseable and render
// the placeholder "—" instead so audit rows never blank out and never
// raise an uncaught render exception (Req. 2.4).
export function formatBackendDateTime(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  if (!text) return "—";
  const formatted = formatDateTimeHuman(text);
  if (!formatted || formatted === text) return "—";
  return formatted;
}

export function initials(name) {
  return String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function getManilaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getManilaDateRange(range, date = new Date()) {
  const today = getManilaDateKey(date);

  if (range === "today") {
    return { from: today, to: today };
  }

  if (range === "week") {
    return { from: addDateDays(today, -getUtcDay(today)), to: today };
  }

  if (range === "month") {
    return { from: `${today.slice(0, 8)}01`, to: today };
  }

  if (range === "year") {
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }

  return {};
}

function getUtcDay(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function addDateDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
