// Calendar status legend.
//
// Renders the eight status tokens that may appear on a `.staff-booking-block`
// inside a day-card body, mapping each one to a 12x12 swatch + label pair so
// staff can match the color and tint treatment they see inside a block back to the
// status word. The legend is a *mapping* surface, not a pill gallery — each
// item renders one `.legend-swatch` and zero `.status-badge` descendants
// (Property 5; Requirements 7.1–7.4).
//
// `LEGEND_STATUSES` is exported so other modules (tests, day-overflow drawer)
// can reuse the canonical design-order list without duplicating it.

export const LEGEND_STATUSES = [
  { code: "AVAILABLE", label: "Available", slug: "available" },
  { code: "RESERVED", label: "Reserved", slug: "reserved" },
  { code: "COMPLETED", label: "Completed", slug: "completed" },
  { code: "MISSED", label: "Did not show", slug: "missed" },
  { code: "CANCELLED", label: "Cancelled", slug: "cancelled" },
  { code: "MAINTENANCE", label: "Maintenance", slug: "maintenance" },
  { code: "BARANGAY_EVENT", label: "Barangay event", slug: "barangay" },
  { code: "CLEARED_PUBLIC_USE", label: "Cleared for public use", slug: "cleared" }
];

export function CalendarLegend() {
  return (
    <div className="calendar-legend" role="note" aria-label="Calendar status legend">
      <span className="calendar-legend-label">Status legend</span>
      {LEGEND_STATUSES.map((entry) => (
        <span className={`calendar-legend-item legend-${entry.slug}`} key={entry.code}>
          <span className="legend-swatch" aria-hidden="true" />
          <span>{entry.label}</span>
        </span>
      ))}
    </div>
  );
}
