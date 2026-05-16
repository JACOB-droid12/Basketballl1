import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUS_SUMMARY = [
  { code: "RESERVED", label: "Reserved", helper: "Still booked on the court calendar." },
  { code: "MISSED", label: "Did not show", helper: "Needs follow-up if the resident asks." },
  { code: "COMPLETED", label: "Completed", helper: "Finished court use." },
  { code: "CANCELLED", label: "Cancelled", helper: "Kept for office reference." }
];

export function ReportsPage() {
  const [state, setState] = useState({ loading: true, report: null, error: "" });

  useEffect(() => {
    let active = true;

    apiRequest("/api/reports")
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
  }, []);

  const summary = state.report?.summary || {};
  const statusRows = useMemo(() => {
    const counts = state.report?.statusCounts || {};
    return STATUS_SUMMARY.map((status) => [status.code, Number(counts[status.code] || 0)]);
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
          <div className="page-sub">Current reservation totals from the local database.</div>
          <div className="page-sub-fil">Ulat para sa mabilis na review ng staff.</div>
        </div>
        <button className="btn btn-primary btn-big" type="button" onClick={() => window.print()}>Print</button>
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

            <div className="stats-grid report-summary">
              <SummaryCard label="Total reservations" value={summary.totalReservations ?? 0} helper="All records included in this local report." />
              <SummaryCard label="Court-hours booked" value={formatHours(summary.courtHoursBooked)} helper="Cancelled reservations are excluded from booked hours." />
              <SummaryCard label="Top requester" value={busiestRequester?.name || "None yet"} helper={busiestRequester ? `${formatHours(busiestRequester.hours)} booked` : "Appears once active bookings exist."} />
            </div>

            <div className="status-summary-grid">
              {STATUS_SUMMARY.map((status) => (
                <SummaryCard
                  key={status.code}
                  label={status.label}
                  value={getSummaryCount(summary, status.code)}
                  helper={status.helper}
                />
              ))}
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

function SummaryCard({ label, value, helper }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
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

function getSummaryCount(summary, statusCode) {
  const key = `${statusCode.toLowerCase()}Count`;
  return summary[key] ?? 0;
}
