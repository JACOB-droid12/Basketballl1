import { formatTime } from "../../api/mappers.js";

/**
 * Helpers shared by the redesigned Calendar week-view components
 * (`CalendarDayColumn`, `CalendarDayDrawer`). The implementations are
 * lifted verbatim from `CalendarPage.jsx` so the extraction is a pure
 * relocation — no behaviour change — and so the same canonical strings
 * ("Time unavailable", capitalized block-type labels, the long-date
 * `Wednesday, May 20, 2026` form) flow through every surface.
 *
 * `displayRange(startTime, endTime)` — render an "HH:MM" / "HH:MM"
 * pair as e.g. "7:00 AM - 8:00 AM" via the shared `formatTime()`
 * helper. Returns the literal `"Time unavailable"` whenever either
 * bound is missing OR fails the `isValidTimeOfDay()` check (any
 * value not matching `^\d{1,2}:\d{2}$` and not in the range
 * 0..23:0..59 is treated as invalid). The booking block still
 * renders the remaining content when this branch fires (Req. 15.3).
 *
 * `humanizeBlockType(value)` — normalize a backend block-type code
 * (`MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`) into a
 * sentence-cased label ("Maintenance", "Barangay event", "Cleared
 * public use"). Returns `""` for missing input so the caller can
 * substitute a default ("Schedule block").
 *
 * `formatLongDate(date)` — render a `YYYY-MM-DD` Manila-zone date as
 * the long human form `"Wednesday, May 20, 2026"`. Returns the input
 * verbatim on parse failure so a malformed date never blanks out a
 * heading.
 */

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

function isValidTimeOfDay(value) {
  if (typeof value !== "string") return false;
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;
  return true;
}

export function humanizeBlockType(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase().replace(/_/g, " ");
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

export function displayRange(startTime, endTime) {
  if (!isValidTimeOfDay(startTime) || !isValidTimeOfDay(endTime)) {
    return "Time unavailable";
  }
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function formatLongDate(date) {
  if (!date) return "";
  const text = String(date);
  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return text;
  try {
    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return text;
  }
}
