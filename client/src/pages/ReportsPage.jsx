import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDateShort, formatTimeRangeFriendly, getManilaDateRange } from "../api/mappers.js";
import { OFFICIAL_HEADER } from "../api/officialHeader.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { CardSectionHeader } from "../components/CardSectionHeader.jsx";
import { CsvExportButton } from "../components/CsvExportButton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StaffPageHeader } from "../components/StaffPageHeader.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

/**
 * Reports page wired to the expanded `GET /api/reports?from=&to=` endpoint.
 *
 * The page renders the twelve sections returned by the backend (Req. 5.1):
 *   summary, statusCounts, topRequesters, mostUsedDays, mostUsedTimeSlots,
 *   monthlyReservationCount, missedReservations, cancelledReservations,
 *   reservationsByPurpose, reservationsEncodedByStaff,
 *   clearedPublicUseRanges, and maintenanceBlocks.
 *
 * - A single fetch fires whenever the date filter selection changes; the
 *   useEffect runs synchronously on the change so the request is dispatched
 *   well within the 500ms budget defined by Req. 5.2.
 * - Each section renders only fields the backend returned; no synthetic
 *   totals are computed (Req. 5.3).
 * - Empty arrays render the existing `EmptyState` component (Req. 5.4,
 *   17.4).
 * - On 4xx/5xx the backend message is surfaced through the existing
 *   `.alert.error` style, and no partial mock data is rendered (Req. 5.5,
 *   17.2, 17.6).
 * - The CSV export action uses `CsvExportButton` with the same
 *   `from`/`to` parameters as the current view (Req. 6.1, 6.2, 6.3, 15.1,
 *   15.2). PDF / XLSX / JSON variants are intentionally absent.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 15.1, 15.2, 17.1,
 * 17.2, 17.4, 17.5, 17.6, 18.1
 */

const STATUS_BREAKDOWN = [
  { code: "RESERVED", label: "Reserved" },
  { code: "MISSED", label: "Did not show up" },
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

// Task-led report views. The QA pass found that exposing every report
// section at once read like a "long data dump" rather than an answer
// to a staff question. We split the same backend payload into four
// staff-friendly groups and render only the active group's cards
// (Req. OPUS-UI-003). Each view still uses existing card / table
// patterns, so no new dashboard style is introduced.
//   - Usage: court-hours, status mix, busy days, busy time slots,
//     monthly counts, purpose mix.
//   - Status: status counts, missed and cancelled detail tables.
//   - Staff: top requesters, encoded-by-staff totals.
//   - Records: cleared-public-use ranges, maintenance closures.
const REPORT_VIEWS = [
  { id: "usage", label: "Usage" },
  { id: "status", label: "Status" },
  { id: "staff", label: "Staff & activity" },
  { id: "records", label: "Maintenance & public use" }
];

export function ReportsPage() {
  const [state, setState] = useState({ loading: true, report: null, error: "" });
  const [range, setRange] = useState("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [view, setView] = useState("usage");

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

  // Mirror the JSON request's query parameters so the CSV download covers
  // the same window the staff is viewing on screen. `buildCsvExportUrl`
  // (called inside `CsvExportButton`) discards empty values, so the
  // params object can include both keys unconditionally.
  const exportParams = useMemo(
    () => buildReportsParams(range, customRange),
    [range, customRange.from, customRange.to]
  );

  const summary = state.report?.summary || {};
  const statusCounts = state.report?.statusCounts || {};
  const statusRows = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const status of STATUS_BREAKDOWN) {
      seen.add(status.code);
      rows.push({ code: status.code, label: status.label, count: Number(statusCounts[status.code] || 0) });
    }
    // Surface any extra status codes the backend returns (e.g. AVAILABLE
    // counted on schedule cells in future expansions) without renaming them.
    for (const [code, count] of Object.entries(statusCounts)) {
      if (seen.has(code)) continue;
      rows.push({ code, label: code, count: Number(count || 0) });
    }
    return rows;
  }, [statusCounts]);

  const topRequesters = Array.isArray(state.report?.topRequesters) ? state.report.topRequesters : [];
  const mostUsedDays = Array.isArray(state.report?.mostUsedDays) ? state.report.mostUsedDays : [];
  const mostUsedTimeSlots = Array.isArray(state.report?.mostUsedTimeSlots) ? state.report.mostUsedTimeSlots : [];
  const monthlyReservationCount = Array.isArray(state.report?.monthlyReservationCount)
    ? state.report.monthlyReservationCount
    : [];
  const missedReservations = Array.isArray(state.report?.missedReservations)
    ? state.report.missedReservations
    : [];
  const cancelledReservations = Array.isArray(state.report?.cancelledReservations)
    ? state.report.cancelledReservations
    : [];
  const reservationsByPurpose = Array.isArray(state.report?.reservationsByPurpose)
    ? state.report.reservationsByPurpose
    : [];
  const reservationsEncodedByStaff = Array.isArray(state.report?.reservationsEncodedByStaff)
    ? state.report.reservationsEncodedByStaff
    : [];
  const clearedPublicUseRanges = Array.isArray(state.report?.clearedPublicUseRanges)
    ? state.report.clearedPublicUseRanges
    : [];
  const maintenanceBlocks = Array.isArray(state.report?.maintenanceBlocks)
    ? state.report.maintenanceBlocks
    : [];

  const busiestRequester = topRequesters[0];

  if (state.loading) return <LoadingState label="Loading reports..." />;

  return (
    <section className="page report-page">
      <StaffPageHeader
        kicker="Reports"
        title="Office report"
        subtitle="Reservation totals from this office's local records. "
        filipino="Ulat para sa mabilis na review ng staff."
        filipinoInline
        className="print-hidden"
        actions={
        <div className="button-row">
          <CsvExportButton endpoint="reports" params={exportParams} label="Export CSV" />
          <button className="btn btn-primary btn-big" type="button" onClick={() => window.print()}>Print</button>
        </div>
        }
      />

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
            <label className="date-field compact-date" htmlFor="reports-range-from">
              <span>From</span>
              <input
                id="reports-range-from"
                name="rangeFrom"
                className="date-input"
                type="date"
                value={customRange.from}
                onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="date-field compact-date" htmlFor="reports-range-to">
              <span>To</span>
              <input
                id="reports-range-to"
                name="rangeTo"
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
          <div className="page-stack">
            <div className="print-title">
              <p className="page-kicker">{OFFICIAL_HEADER.barangayName}</p>
              <h1>{`${OFFICIAL_HEADER.courtName} Reservation Report`}</h1>
            </div>

            <SummarySection summary={summary} busiestRequester={busiestRequester} />

            <div className="report-view-tabs print-hidden" role="group" aria-label="Report views">
              {REPORT_VIEWS.map((entry) => {
                const selected = entry.id === view;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    id={`report-view-tab-${entry.id}`}
                    className={`filter-tab ${selected ? "on" : ""}`}
                    onClick={() => setView(entry.id)}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>

            {/* Task-led views — only the active one is visible on screen.
              On print, the `.report-view` class flips every view to
              visible so the printed report still shows the full set
              of cards regardless of which on-screen tab is active. */}
            <div
              id="report-view-usage"
              aria-labelledby="report-view-tab-usage"
              className={`report-view ${view === "usage" ? "is-active" : ""}`}
              hidden={view !== "usage"}
            >
              <div className="page-stack">
                <h2 className="report-view-heading print-only">Usage</h2>
                <div className="report-grid">
                  <MostUsedDaysSection rows={mostUsedDays} />
                  <MostUsedTimeSlotsSection rows={mostUsedTimeSlots} />
                </div>
                <div className="report-grid">
                  <MonthlyReservationCountSection rows={monthlyReservationCount} />
                  <ReservationsByPurposeSection rows={reservationsByPurpose} />
                </div>
              </div>
            </div>

            <div
              id="report-view-status"
              aria-labelledby="report-view-tab-status"
              className={`report-view ${view === "status" ? "is-active" : ""}`}
              hidden={view !== "status"}
            >
              <div className="page-stack">
                <h2 className="report-view-heading print-only">Status</h2>
                <StatusCountsSection statusRows={statusRows} />
                <ReportDetailTabs
                  missedReservations={missedReservations}
                  cancelledReservations={cancelledReservations}
                  onlyKinds={["missed", "cancelled"]}
                />
              </div>
            </div>

            <div
              id="report-view-staff"
              aria-labelledby="report-view-tab-staff"
              className={`report-view ${view === "staff" ? "is-active" : ""}`}
              hidden={view !== "staff"}
            >
              <div className="page-stack">
                <h2 className="report-view-heading print-only">Staff and activity</h2>
                <div className="report-grid">
                  <TopRequestersSection topRequesters={topRequesters} />
                  <ReservationsEncodedByStaffSection rows={reservationsEncodedByStaff} />
                </div>
              </div>
            </div>

            <div
              id="report-view-records"
              aria-labelledby="report-view-tab-records"
              className={`report-view ${view === "records" ? "is-active" : ""}`}
              hidden={view !== "records"}
            >
              <div className="page-stack">
                <h2 className="report-view-heading print-only">Maintenance and public use</h2>
                <ReportDetailTabs
                  clearedPublicUseRanges={clearedPublicUseRanges}
                  maintenanceBlocks={maintenanceBlocks}
                  onlyKinds={["cleared", "maintenance"]}
                />
              </div>
            </div>
          </div>
        )
      )}
    </section>
  );
}

function SummarySection({ summary, busiestRequester }) {
  return (
    <div className="report-headline">
      <div className="report-headline-main">
        <span className="report-headline-label">Court-hours booked <span className="fil">· Oras na ginamit</span></span>
        <strong>{formatHours(summary.courtHoursBooked)}</strong>
        <small>Cancelled reservations are excluded.</small>
      </div>
      <dl className="report-headline-side">
        <div className="report-stat-row">
          <dt>Total reservations</dt>
          <dd>{summary.totalReservations ?? 0}</dd>
        </div>
        <div className="report-stat-row">
          <dt>Reserved</dt>
          <dd>{summary.reservedCount ?? 0}</dd>
        </div>
        <div className="report-stat-row">
          <dt>Completed</dt>
          <dd>{summary.completedCount ?? 0}</dd>
        </div>
        <div className="report-stat-row">
          <dt>Did not show up</dt>
          <dd>{summary.missedCount ?? 0}</dd>
        </div>
        <div className="report-stat-row">
          <dt>Cancelled</dt>
          <dd>{summary.cancelledCount ?? 0}</dd>
        </div>
        <div className="report-stat-row">
          <dt>Top requester</dt>
          <dd>
            {busiestRequester?.name || "None yet"}
            {busiestRequester && <span className="report-stat-note"> · {formatHours(busiestRequester.hours)} booked</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function StatusCountsSection({ statusRows }) {
  const max = statusRows.reduce((highest, row) => (row.count > highest ? row.count : highest), 0);
  const hasAny = statusRows.some((row) => row.count > 0);

  return (
    <div className="card padded-card">
      <CardSectionHeader
        title="Status breakdown"
        caption="How reservations broke down across statuses."
      />

      {!hasAny ? (
        <EmptyState title="No status totals" body="Reservation status totals are not available yet." />
      ) : (
        <div className="bar-list">
          {statusRows.map((row) => (
            <BarRow
              key={row.code}
              label={<StatusBadge statusCode={row.code} />}
              value={row.count}
              max={Math.max(max, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopRequestersSection({ topRequesters }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Top requesters" caption="Who books the most court hours." />

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
  );
}

function MostUsedDaysSection({ rows }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Most used days" caption="Which weekdays the court is busiest." />

      {rows.length === 0 ? (
        <EmptyState title="No day totals" body="Most-used days appear once reservations have been recorded." />
      ) : (
        <div className="requester-list">
          {rows.map((row) => (
            <div className="requester-row" key={row.day}>
              <span>{row.day}</span>
              <strong>{row.count} · {formatHours(row.hours)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MostUsedTimeSlotsSection({ rows }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Most used time slots" caption="Which times of day fill up first." />

      {rows.length === 0 ? (
        <EmptyState title="No time-slot totals" body="Most-used time slots appear once reservations have been recorded." />
      ) : (
        <div className="requester-list">
          {rows.map((row) => (
            <div className="requester-row" key={row.label}>
              <span>{formatTimeRangeFriendly(row.startTime, row.endTime) || row.label}</span>
              <strong>{row.count} · {formatHours(row.hours)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthlyReservationCountSection({ rows }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Reservations per month" caption="How many reservations were recorded each month." />

      {rows.length === 0 ? (
        <EmptyState title="No monthly totals" body="Per-month totals appear once reservations have been recorded in this range." />
      ) : (
        <div className="requester-list">
          {rows.map((row) => (
            <div className="requester-row" key={row.month}>
              <span>{formatMonthLabel(row.month)}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationsByPurposeSection({ rows }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Reservations by purpose" caption="What kinds of bookings are most common." />

      {rows.length === 0 ? (
        <EmptyState title="No purpose totals" body="Reservation purpose totals appear once reservations have been recorded." />
      ) : (
        <div className="requester-list">
          {rows.map((row) => (
            <div className="requester-row" key={row.purpose}>
              <span>{row.purpose}</span>
              <strong>{row.count} · {formatHours(row.hours)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationsEncodedByStaffSection({ rows }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title="Reservations encoded by staff" caption="Who encoded the most reservations this period." />

      {rows.length === 0 ? (
        <EmptyState title="No staff totals" body="Staff encoder totals appear once reservations have been recorded." />
      ) : (
        <div className="requester-list">
          {rows.map((row) => (
            <div className="requester-row" key={row.staffName}>
              <span>{row.staffName}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationListSection({ title, caption, rows, emptyTitle, emptyBody }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title={title} caption={caption} />

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="table-wrap">
          <table className="data-table" aria-label={title}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Time</th>
                <th>Requester</th>
                <th>Contact</th>
                <th>Purpose</th>
                <th>Encoded by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.reservationId}>
                  <td>{formatReferenceNo(row.referenceNo)}</td>
                  <td>{formatDateShort(row.reservationDate)}</td>
                  <td>{formatTimeRange(row.startTime, row.endTime)}</td>
                  <td>{row.representativeName || ""}</td>
                  <td>{row.contactNo || ""}</td>
                  <td>{row.purpose || ""}</td>
                  <td>{row.createdByName || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BlockListSection({ title, caption, rows, emptyTitle, emptyBody }) {
  return (
    <div className="card padded-card">
      <CardSectionHeader title={title} caption={caption} />

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="table-wrap">
          <table className="data-table" aria-label={title}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Recorded by</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.blockId}>
                  <td>{formatDateShort(row.date)}</td>
                  <td>{formatTimeRange(row.startTime, row.endTime)}</td>
                  <td>{row.mode || ""}</td>
                  <td>{row.type || row.category || ""}</td>
                  <td>{row.reason || ""}</td>
                  <td>{row.createdByName || ""}</td>
                  <td>{row.isActive === false ? "Deactivated" : "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function ReportDetailTabs({ missedReservations, cancelledReservations, clearedPublicUseRanges, maintenanceBlocks, onlyKinds }) {
  // Four low-frequency detail tables share one card. Staff land on
  // "Missed" by default — that's the resident-question this surface
  // most often answers ("did Liga ng Kabataan show up last Tuesday?"
  // and similar). Counts on the tabs let staff see which detail
  // section actually has rows before opening it; the tab order
  // mirrors the workflow priority: missed > cancelled > cleared >
  // maintenance.
  //
  // `onlyKinds` lets a parent task-led view restrict which detail
  // tables are exposed (e.g. the Status view shows missed/cancelled
  // only, while the Records view shows cleared/maintenance only).
  // When omitted, every kind renders so the print mirror keeps the
  // existing "all four tables" behaviour.
  const ALL_TABS = [
    {
      id: "missed",
      label: "Missed",
      count: (missedReservations || []).length,
      caption: "Bookings marked as did-not-show in this period.",
      kind: "reservations",
      rows: missedReservations || [],
      emptyTitle: "No missed reservations",
      emptyBody: "No reservations in this range were marked missed."
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: (cancelledReservations || []).length,
      caption: "Bookings cancelled in this period.",
      kind: "reservations",
      rows: cancelledReservations || [],
      emptyTitle: "No cancelled reservations",
      emptyBody: "No reservations in this range were cancelled."
    },
    {
      id: "cleared",
      label: "Cleared for public use",
      count: (clearedPublicUseRanges || []).length,
      caption: "Days the court was opened for public use in this period.",
      kind: "blocks",
      rows: clearedPublicUseRanges || [],
      emptyTitle: "No cleared public-use ranges",
      emptyBody: "No public-use clear actions were recorded for this range."
    },
    {
      id: "maintenance",
      label: "Maintenance",
      count: (maintenanceBlocks || []).length,
      caption: "Closures for maintenance or unavailability in this period.",
      kind: "blocks",
      rows: maintenanceBlocks || [],
      emptyTitle: "No maintenance blocks",
      emptyBody: "No maintenance or unavailable blocks were recorded for this range."
    }
  ];

  const TABS = Array.isArray(onlyKinds) && onlyKinds.length > 0
    ? ALL_TABS.filter((tab) => onlyKinds.includes(tab.id))
    : ALL_TABS;

  const initialTab = TABS[0]?.id || "missed";
  const [activeId, setActiveId] = useState(initialTab);
  const active = TABS.find((tab) => tab.id === activeId) || TABS[0];

  if (!active) return null;

  return (
    <div className="card padded-card report-detail-card">
      <CardSectionHeader
        title="Detail tables"
        caption="Bookings, public-use days, and maintenance closures recorded in this period."
      />

      <div className="filter-tabs report-detail-tabs print-hidden" role="group" aria-label="Report detail tables">
        {TABS.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              id={`report-detail-tab-${tab.id}`}
              className={`filter-tab ${selected ? "on" : ""}`}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
              <span>({tab.count})</span>
            </button>
          );
        })}
      </div>

      <div
        id={`report-detail-${active.id}`}
        aria-labelledby={`report-detail-tab-${active.id}`}
        className="report-detail-panel"
      >
        <p className="report-detail-caption">{active.caption}</p>
        {active.kind === "reservations"
          ? <ReservationDetailTable rows={active.rows} title={active.label} emptyTitle={active.emptyTitle} emptyBody={active.emptyBody} />
          : <BlockDetailTable rows={active.rows} title={active.label} emptyTitle={active.emptyTitle} emptyBody={active.emptyBody} />}
      </div>

      {/* Print fallback: print preview should show every detail
        table in full, not just the selected tab. The .print-only
        class flips visibility in the print stylesheet. */}
      <div className="print-only report-detail-print">
        {TABS.map((tab) => (
          <div key={`print-${tab.id}`} className="report-detail-print-section">
            <h3>{tab.label}</h3>
            <p className="report-detail-caption">{tab.caption}</p>
            {tab.kind === "reservations"
              ? <ReservationDetailTable rows={tab.rows} title={tab.label} emptyTitle={tab.emptyTitle} emptyBody={tab.emptyBody} />
              : <BlockDetailTable rows={tab.rows} title={tab.label} emptyTitle={tab.emptyTitle} emptyBody={tab.emptyBody} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservationDetailTable({ rows, title, emptyTitle, emptyBody }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table" aria-label={title}>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Date</th>
            <th>Time</th>
            <th>Requester</th>
            <th>Contact</th>
            <th>Purpose</th>
            <th>Encoded by</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.reservationId}>
              <td>{formatReferenceNo(row.referenceNo)}</td>
              <td>{formatDateShort(row.reservationDate)}</td>
              <td>{formatTimeRange(row.startTime, row.endTime)}</td>
              <td>{row.representativeName || ""}</td>
              <td>{row.contactNo || ""}</td>
              <td>{row.purpose || ""}</td>
              <td>{row.createdByName || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockDetailTable({ rows, title, emptyTitle, emptyBody }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table" aria-label={title}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Mode</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Recorded by</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.blockId}>
              <td>{formatDateShort(row.date)}</td>
              <td>{formatTimeRange(row.startTime, row.endTime)}</td>
              <td>{row.mode || ""}</td>
              <td>{row.type || row.category || ""}</td>
              <td>{row.reason || ""}</td>
              <td>{row.createdByName || ""}</td>
              <td>{row.isActive === false ? "Deactivated" : "Active"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatHours(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })} hr${number === 1 ? "" : "s"}`;
}

function formatMonthLabel(value) {
  // Backend returns calendar months as ISO `YYYY-MM`. Render them as
  // human-readable "Month YYYY" so a barangay clerk reading the report
  // sees "May 2026", not "2026-05". If the value is missing or doesn't
  // parse, fall back to whatever was returned so the row still renders.
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return text;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return text;

  const reference = new Date(Date.UTC(year, monthIndex, 1));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(reference);
}

function formatTimeRange(startTime, endTime) {
  // Render the backend "HH:MM" pair using the friendly office wording
  // ("9:00 AM to 11:00 AM") on every Reports surface that emits a
  // time-range string. The shared `formatTimeRangeFriendly` helper
  // keeps the literal " to " separator and 12-hour formatting
  // consistent across the most-used time slot tile and the detail
  // tables (Req. 10.1, 10.2, 10.3, 10.7). The slip print view
  // continues to call the en-dash variant in `mappers.js` to preserve
  // the printed permit's typography.
  const text = formatTimeRangeFriendly(startTime, endTime);
  if (text) return text;

  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  if (!start && !end) return "";
  if (!end) return start;
  if (!start) return end;
  return `${start}-${end}`;
}

function buildReportsParams(range, customRange) {
  if (range === "all") return {};

  if (["week", "month", "year"].includes(range)) {
    return getManilaDateRange(range);
  }

  if (range === "custom") {
    const params = {};
    if (customRange.from) params.from = customRange.from;
    if (customRange.to) params.to = customRange.to;
    return params;
  }

  return {};
}

function buildReportsPath(range, customRange) {
  const params = buildReportsParams(range, customRange);
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }

  const query = search.toString();
  return query ? `/api/reports?${query}` : "/api/reports";
}
