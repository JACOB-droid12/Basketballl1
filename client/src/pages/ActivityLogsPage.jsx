import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatBackendDateTime, getManilaDateKey, getManilaDateRange } from "../api/mappers.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { CsvExportButton } from "../components/CsvExportButton.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { StaffPageHeader } from "../components/StaffPageHeader.jsx";

const ACTION_GROUPS = [
  {
    label: "Reservations",
    actions: ["CREATE_RESERVATION", "UPDATE_RESERVATION", "MARK_MISSED", "MARK_CANCELLED", "MARK_COMPLETED"]
  },
  {
    label: "Accounts",
    actions: ["CREATE_ACCOUNT", "ACTIVATE_ACCOUNT", "DEACTIVATE_ACCOUNT", "CHANGE_PASSWORD"]
  }
];

const COMMON_ACTIONS = ACTION_GROUPS.flatMap((group) => group.actions);

const DATE_PRESETS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" }
];

const ACTION_LABELS = {
  CREATE_RESERVATION: "Created a reservation",
  UPDATE_RESERVATION: "Edited a reservation",
  MARK_MISSED: "Marked the booking missed",
  MARK_CANCELLED: "Cancelled the booking",
  MARK_COMPLETED: "Marked the booking done",
  CREATE_ACCOUNT: "Created an account",
  ACTIVATE_ACCOUNT: "Activated an account",
  DEACTIVATE_ACCOUNT: "Deactivated an account",
  CHANGE_PASSWORD: "Changed a password"
};

export function ActivityLogsPage() {
  const [state, setState] = useState({ loading: true, logs: [], error: "" });
  const [filters, setFilters] = useState({ search: "", action: "", date: "", from: "", to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [datePreset, setDatePreset] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const VISIBLE_LIMIT = 50;

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const data = await apiRequest(buildLogsPath(appliedFilters));

        if (!active) return;
        setState({ loading: false, logs: Array.isArray(data.logs) ? data.logs : [], error: "" });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, logs: [], error: error.message });
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const hasFilters = useMemo(() => {
    return Boolean(appliedFilters.search || appliedFilters.action || appliedFilters.date || appliedFilters.from || appliedFilters.to);
  }, [appliedFilters]);
  const groupedActionOptions = useMemo(() => {
    const loadedActions = state.logs.map((log) => String(log.action || "").toUpperCase()).filter(Boolean);
    const known = new Set(COMMON_ACTIONS);
    const otherActions = [...new Set(loadedActions)].filter((action) => !known.has(action)).sort();
    return [
      ...ACTION_GROUPS,
      ...(otherActions.length ? [{ label: "Other", actions: otherActions }] : [])
    ];
  }, [state.logs]);

  // Mirror the trimmed filters that the activity-logs JSON request sends
  // so the CSV export downloads exactly what the staff sees on screen.
  // `buildCsvExportUrl` (called inside `CsvExportButton`) already skips
  // empty values, so no further conditional logic is needed.
  const exportParams = useMemo(() => ({
    action: appliedFilters.action.trim(),
    date: appliedFilters.date,
    from: appliedFilters.from,
    to: appliedFilters.to,
    search: appliedFilters.search.trim()
  }), [appliedFilters]);

  function applyDatePreset(preset) {
    setDatePreset(preset);
    if (preset === "all") {
      const next = { ...filters, date: "", from: "", to: "" };
      setFilters(next);
      setAppliedFilters(next);
    } else if (preset === "today") {
      const date = getManilaDateKey();
      const next = { ...filters, date, from: "", to: "" };
      setFilters(next);
      setAppliedFilters(next);
    } else if (preset === "week") {
      const range = getManilaDateRange("week");
      const next = { ...filters, date: "", from: range.from, to: range.to };
      setFilters(next);
      setAppliedFilters(next);
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => {
      if (field === "date") {
        return { ...current, date: value, from: "", to: "" };
      }

      return { ...current, [field]: value };
    });
    if (field === "date") {
      setDatePreset(value ? "custom" : "all");
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setShowAll(false);
  }

  function clearFilters() {
    const nextFilters = { search: "", action: "", date: "", from: "", to: "" };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setDatePreset("all");
  }

  return (
    <section className="page">
      <StaffPageHeader
        kicker="Audit trail"
        title="Activity logs"
        subtitle="Search staff actions recorded by the local system."
        filipino="Tala ng ginawa sa opisina."
      />

      <form className="card filter-card staff-filter-card" onSubmit={applyFilters}>
        <div className="staff-filter-head">
          <div>
            <h2>Find a recorded action</h2>
            <p>Use this when a resident asks what changed, who changed it, or when it happened.</p>
          </div>
          <strong>{state.logs.length} shown</strong>
        </div>
        <div className="logs-presets" role="radiogroup" aria-label="Quick date range">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`filter-tab ${datePreset === preset.id ? "on" : ""}`}
              onClick={() => applyDatePreset(preset.id)}
              role="radio"
              aria-checked={datePreset === preset.id}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="toolbar staff-filter-toolbar">
          <label className="field compact">
            <span>Search name, action, or details</span>
            <input id="activity-search" name="search" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="User, action, or details" />
          </label>
          <label className="field compact">
            <span>Action</span>
            <select id="activity-action" name="action" value={filters.action} onChange={(event) => updateFilter("action", event.target.value)}>
              <option value="">All actions</option>
              {groupedActionOptions.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.actions.map((action) => (
                    <option key={action} value={action}>{formatAction(action)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field compact">
            <span>Date recorded</span>
            <input id="activity-date" name="date" type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} />
          </label>
          <div className="button-row filter-actions">
            <button className="btn btn-primary" type="submit">Apply</button>
            <button className="btn btn-light" type="button" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </form>

      {state.error && (
        <div className="state-card error-state" role="alert">
          <span className="state-mark empty-mark">!</span>
          <h2>Could not load activity logs</h2>
          <p>{state.error}</p>
        </div>
      )}

      {state.loading ? (
        <LoadingState label="Loading activity logs..." />
      ) : (
        !state.error && (
          <div className="card activity-log-card">
            <div className="card-head">
              <div>
                <h2>Recorded actions</h2>
                <span>{state.logs.length} log row{state.logs.length === 1 ? "" : "s"} from the local audit table</span>
              </div>
              <CsvExportButton
                endpoint="activity-logs"
                params={exportParams}
                label="Export CSV"
              />
            </div>

            {state.logs.length === 0 ? (
              <EmptyState
                title={hasFilters ? "No matching logs" : "No activity logs yet"}
                body={hasFilters ? "Try a different search, action, or date filter." : "Actions will appear here once staff use the system."}
              />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table logs-table">
                    <thead>
                      <tr>
                        <th>Date and time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAll ? state.logs : state.logs.slice(0, VISIBLE_LIMIT)).map((log) => (
                        <tr key={log.logId}>
                          <td>{formatBackendDateTime(log.createdAt)}</td>
                          <td>{log.userName || "System"}</td>
                          <td><span className="action-code">{formatAction(log.action)}</span></td>
                          <td>
                            <span>{log.details || "No details recorded."}</span>
                            {hasReservationReference(log) && (
                              <small className="log-reference">
                                Reservation reference: {formatReferenceNo(log.referenceNo)}
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {state.logs.length > VISIBLE_LIMIT && !showAll && (
                  <div className="logs-load-more">
                    <span>Showing the latest {VISIBLE_LIMIT} of {state.logs.length} log rows. Refine the filter to narrow further.</span>
                    <button className="btn btn-light" type="button" onClick={() => setShowAll(true)}>
                      Show all {state.logs.length} rows
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}
    </section>
  );
}

function formatAction(value) {
  const code = String(value || "").toUpperCase();
  if (!code) return "Unknown action";
  if (ACTION_LABELS[code]) return ACTION_LABELS[code];
  // Fall back to title-cased words for unknown codes (e.g. EXPORT_REPORT -> "Export report").
  const words = code.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildLogsPath(filters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.action.trim()) params.set("action", filters.action.trim());
  if (filters.date) params.set("date", filters.date);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  return `/api/activity-logs${query ? `?${query}` : ""}`;
}

// An activity log row is considered to reference a reservation when the
// backend payload links it to one AND that link is a real reference
// the staff can read. The repository sets `reservationId` from the
// joined `activity_logs.reservation_id` column, but on existing rows
// the join may not surface a `referenceNo` — in that case the row
// would render "Reservation reference: No reference number", which
// is a fail-state repeated as noise. We only render the line when
// the referenceNo is present and non-empty; logs for non-reservation
// actions (account changes, password resets, etc.) keep the original
// details-only layout.
function hasReservationReference(log) {
  if (!log) return false;
  if (typeof log.referenceNo !== "string") return false;
  return log.referenceNo.trim() !== "";
}
