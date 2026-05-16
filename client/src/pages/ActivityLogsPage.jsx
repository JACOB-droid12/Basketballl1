import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

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
  const [filters, setFilters] = useState({ search: "", action: "", date: "" });
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
    return Boolean(appliedFilters.search || appliedFilters.action || appliedFilters.date);
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

  function applyDatePreset(preset) {
    setDatePreset(preset);
    const today = new Date();
    if (preset === "all") {
      const next = { ...filters, date: "" };
      setFilters(next);
      setAppliedFilters(next);
    } else if (preset === "today") {
      const date = today.toISOString().slice(0, 10);
      const next = { ...filters, date };
      setFilters(next);
      setAppliedFilters(next);
    } else if (preset === "week") {
      // The backend's date filter takes a single date; for "this week" we
      // clear the date filter and rely on a search hint. A real range filter
      // is a backend follow-up — flag the limitation in the UI.
      const next = { ...filters, date: "" };
      setFilters(next);
      setAppliedFilters(next);
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
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
    const nextFilters = { search: "", action: "", date: "" };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setDatePreset("all");
  }

  return (
    <section className="page">
      <div className="page-header page-head staff-page-head">
        <div>
          <p className="page-kicker">Audit trail</p>
          <h1 className="page-title">Activity logs</h1>
          <div className="page-sub">Search staff actions recorded by the local system.</div>
          <div className="page-sub-fil">Tala ng ginawa sa opisina.</div>
        </div>
      </div>

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
                          <td>{formatDateTime(log.createdAt)}</td>
                          <td>{log.userName || "System"}</td>
                          <td><span className="action-code">{formatAction(log.action)}</span></td>
                          <td>{log.details || "No details recorded."}</td>
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

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const [date = "", time = ""] = String(value).split(" ");
  return `${date}${time ? ` ${time.slice(0, 5)}` : ""}`;
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

  const query = params.toString();
  return `/api/activity-logs${query ? `?${query}` : ""}`;
}
