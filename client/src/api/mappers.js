export const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Did not show up",
  CANCELLED: "Cancelled",
  COMPLETED: "Done"
};

export function formatTime(time) {
  const [hoursText, minutes = "00"] = String(time || "").split(":");
  let hours = Number(hoursText);
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

export function initials(name) {
  return String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
