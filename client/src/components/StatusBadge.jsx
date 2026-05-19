import { STATUS_LABELS } from "../api/mappers.js";

export function StatusBadge({ statusCode }) {
  const code = String(statusCode || "AVAILABLE").toUpperCase();
  return <span className={`status-badge status-${code.toLowerCase()}`}>{STATUS_LABELS[code] || code}</span>;
}
