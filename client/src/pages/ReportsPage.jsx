import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUS_BREAKDOWN = [
  { code: "RESERVED", label: "Reserved" },
  { code: "MISSED", label: "Did not show" },
  { code: "COMPLETED", label: "Completed" },
  { code: "CANCELLED", label: "Cancelled" }
];

const RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" }
];

export function ReportsPage() {
  const [state, setState] = useState({ loading: true, report: null, error: "" });
  const [range, setRange] = useState("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, loading: true, error: "" }));
    apiRequest(buildReportsPath(range, customRange))
      .then((data) => {
        if (!active) return;
        setState({ loading: false, report: data, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, report: null, error: error.message });
      });

    return () => {
      active = false;
    };
  }, [range, customRange.from, customRange.to]);

  const summary = state.report?.summary || {};
  const statusRows = useMemo(() => {
    const counts = state.report?.statusCounts || {};
    return STATUS_BREAKDOWN.map((status) => [status.code, Number(counts[status.code] || 0)]);
  }, [state.report]);
  const topRequesters = Array.isArray(state.report?.topRequesters) ? state.report.topRequesters : [];
  const totalStatusCount = statusRows.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const busiestRequester = topRequesters[0];

  if (state.loading) return <LoadingState label="Loading reports..." />;

  return (
    <section className="page report-page">
      <div className="page-header page-head staff-page-head print-hidden">
        <div>
          <p className="page-kicker">Reports</p>
          <h1 className="page-title">Office report</h1>
          <div className="page-sub">Reservation totals from this office's local records. <span className="page-sub-fil-inline">Ulat para sa mabilis na review ng staff.</span></div>
        </div>
        <button className="btn btn-primary btn-big" type="button" onClick={() => window.print()}>Print</button>
      </div>

      <div className="report-range print-hidden" role="group" aria-label="Report date range">
        <div className="report-range-presets">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`filter-tab ${range === preset.id ? "on" : ""}`}
              onClick={() => setRange(preset.id)}
              aria-pressed={range === preset.id}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="report-range-custom">
            <label className="date-field compact-date">
              <span>From</span>
              <input
                className="date-input"
                type="date"
                value={customRange.from}
                onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="date-field compact-date">
              <span>To</span>
              <input
                className="date-input"
                type="date"
                value={customRange.to}
                onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
          </div>
        )}
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      {!state.error && !state.report ? (
        <EmptyState title="No report data" body="The reports API did not return summary data." />
      ) : (
        !state.error && (
          <>
            <div className="print-title">
              <p className="page-kicker">Barangay Sto. Nino</p>
              <h1>Basketball Court Reservation Report</h1>
            </div>

            <div className="report-headline">
              <div className="report-headline-main">
                <span className="report-headline-label">Court-hours booked <span className="fil">· Oras na ginamit</span></span>
                <strong>{formatHours(summary.courtHoursBooked)}</strong>
                <small>Cancelled reservations are excluded.</small>
              </div>
              <dl className="report-headline-side">
                <div>
                  <dt>Total reservations</dt>
                  <dd>{summary.totalReservations ?? 0}</dd>
                </div>
                <div>
                  <dt>Top requester</dt>
                  <dd>{busiestRequester?.name || "None yet"}</dd>
                  {busiestRequester && <small>{formatHours(busiestRequester.hours)} booked</small>}
                </div>
              </dl>
            </div>

            <div className="report-grid">
              <div className="card padded-card">
                <div className="card-section-head">
                  <h2>Status breakdown</h2>
                  <span>{totalStatusCount} reservation{totalStatusCount === 1 ? "" : "s"} counted</span>
                </div>

                {totalStatusCount === 0 ? (
                  <EmptyState title="No status totals" body="Reservation status totals are not available yet." />
                ) : (
                  <div className="bar-list">
                    {statusRows.map(([statusCode, count]) => (
                      <BarRow
                        key={statusCode}
                        label={<StatusBadge statusCode={statusCode} />}
                        value={Number(count || 0)}
                        max={Math.max(totalStatusCount, 1)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="card padded-card">
                <div className="card-section-head">
                  <h2>Top requesters</h2>
                  <span>Booked hours, cancelled rows excluded</span>
                </div>

                {topRequesters.length === 0 ? (
                  <EmptyState title="No requester hours" body="Requester totals will appear once active reservations have booked hours." />
                ) : (
                  <div className="requester-list">
                    {topRequesters.map((requester) => (
                      <div className="requester-row" key={requester.name}>
                        <span>{requester.name}</span>
                        <strong>{formatHours(requester.hours)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </section>
  );
}

function BarRow({ label, value, max }) {
  const width = value === 0 ? "0%" : `${Math.round((value / max) * 100)}%`;

  return (
    <div className="bar-row">
      <div className="bar-label">
        {label}
        <strong>{value}</strong>
      </div>
      <div className="bar-track" aria-hidden="true">
        <span style={{ width, minWidth: value === 0 ? 0 : undefined }} />
      </div>
    </div>
  );
}

function formatHours(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })} hr${number === 1 ? "" : "s"}`;
}

function buildReportsPath(range, customRange) {
  if (range === "all") return "/api/reports";
  const params = new URLSearchParams();
  const today = new Date();

  if (range === "week") {
    const day = today.getUTCDay();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - day));
    params.set("from", isoDate(start));
    params.set("to", isoDate(today));
  } else if (range === "month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    params.set("from", isoDate(start));
    params.set("to", isoDate(today));
  } else if (range === "year") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    params.set("from", isoDate(start));
    params.set("to", isoDate(today));
  } else if (range === "custom") {
    if (customRange.from) params.set("from", customRange.from);
    if (customRange.to) params.set("to", customRange.to);
  }

  const query = params.toString();
  return query ? `/api/reports?${query}` : "/api/reports";
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}
