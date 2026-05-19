/**
 * Convert any day-name input ("Sun", "Sunday", "monday", "MON") into the
 * 3-letter uppercase abbreviation used by the calendar week header
 * (MON, TUE, WED, THU, FRI, SAT, SUN). Falls back to an empty string
 * for nullish input.
 */
export function toThreeLetterDay(name) {
  if (name == null) return "";
  return String(name).trim().slice(0, 3).toUpperCase();
}

export function CalendarWeekdayHeader({ name, dayNumber, isToday }) {
  const abbr = toThreeLetterDay(name);
  return (
    <header className={`staff-day-head${isToday ? " today" : ""}`}>
      <span className="staff-day-head-name">{abbr}{isToday ? " · TODAY" : ""}</span>
      <strong className="staff-day-head-num">{dayNumber}</strong>
    </header>
  );
}
