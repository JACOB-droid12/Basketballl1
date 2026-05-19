export const CSV_EXPORT_ENDPOINTS = [
  "daily-schedule",
  "weekly-schedule",
  "monthly-reservations",
  "activity-logs",
  "missed-reservations",
  "cancelled-reservations",
  "reports"
];

const ALLOWED_ENDPOINTS = new Set(CSV_EXPORT_ENDPOINTS);

export function buildCsvExportUrl(endpoint, params) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    throw new Error(`Unknown CSV export endpoint: ${endpoint}`);
  }

  const base = `/api/exports/${endpoint}.csv`;
  const search = new URLSearchParams();

  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      const stringValue = String(value);
      if (stringValue === "") continue;
      search.append(key, stringValue);
    }
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
