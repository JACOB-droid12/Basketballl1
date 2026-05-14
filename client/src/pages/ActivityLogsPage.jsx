import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

export function ActivityLogsPage() {
  const [state, setState] = useState({ loading: true, logs: [], error: "" });
  const [filters, setFilters] = useState({ search: "", action: "", date: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);

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

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const nextFilters = { search: "", action: "", date: "" };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Audit trail</p>
          <h1>Activity logs</h1>
          <p className="page-subtitle">Review staff actions recorded by the local scheduling system.</p>
        </div>
      </div>

      <form className="card filter-card" onSubmit={applyFilters}>
        <div className="toolbar">
          <label className="field compact">
            <span>Search</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="User, action, or details" />
          </label>
          <label className="field compact">
            <span>Action</span>
            <input value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} placeholder="Example: MARK_MISSED" />
          </label>
          <label className="field compact">
            <span>Date</span>
            <input type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} />
          </label>
          <div className="button-row filter-actions">
            <button className="btn btn-primary" type="submit">Apply</button>
            <button className="btn btn-light" type="button" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </form>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      {state.loading ? (
        <LoadingState label="Loading activity logs..." />
      ) : (
        !state.error && (
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Recorded actions</h2>
                <span>{state.logs.length} log row{state.logs.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            {state.logs.length === 0 ? (
              <EmptyState
                title={hasFilters ? "No matching logs" : "No activity logs yet"}
                body={hasFilters ? "Try a different search, action, or date filter." : "Actions will appear here once staff use the system."}
              />
            ) : (
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
                    {state.logs.map((log) => (
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
  return String(value || "UNKNOWN").replaceAll("_", " ");
}

function buildLogsPath(filters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.action.trim()) params.set("action", filters.action.trim());
  if (filters.date) params.set("date", filters.date);

  const query = params.toString();
  return `/api/activity-logs${query ? `?${query}` : ""}`;
}
