import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

const INITIAL_FORM = {
  fullName: "",
  username: "",
  password: "",
  role: "STAFF"
};

export function AccountsPage({ user }) {
  const isAdmin = user?.role === "ADMIN";
  const [state, setState] = useState({ loading: isAdmin, accounts: [], error: "" });
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setState({ loading: false, accounts: [], error: "" });
      return;
    }

    loadAccounts();
  }, [isAdmin]);

  const sortedAccounts = useMemo(() => {
    return [...state.accounts].sort((a, b) => {
      const statusSort = String(a.accountStatus).localeCompare(String(b.accountStatus));
      if (statusSort !== 0) return statusSort;
      return String(a.fullName).localeCompare(String(b.fullName));
    });
  }, [state.accounts]);

  async function loadAccounts() {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await apiRequest("/api/accounts");
      setState({ loading: false, accounts: Array.isArray(data.accounts) ? data.accounts : [], error: "" });
    } catch (error) {
      setState({ loading: false, accounts: [], error: error.message });
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
    setFormSuccess("");
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");

    try {
      await apiRequest("/api/accounts", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm(INITIAL_FORM);
      setFormSuccess("Account created.");
      await loadAccounts();
    } catch (error) {
      setFieldErrors(error.data?.errors || {});
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(account) {
    const nextStatus = account.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingUserId(account.userId);
    setStatusError("");

    try {
      await apiRequest(`/api/accounts/${account.userId}/status`, {
        method: "POST",
        body: JSON.stringify({ accountStatus: nextStatus })
      });
      setState((current) => ({
        ...current,
        accounts: current.accounts.map((item) => (
          item.userId === account.userId ? { ...item, accountStatus: nextStatus } : item
        ))
      }));
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="page">
        <div className="page-header">
          <div>
            <p className="page-kicker">Accounts</p>
            <h1>Admin access required</h1>
            <p className="page-subtitle">Only administrator accounts can create staff users or change account status.</p>
          </div>
        </div>
        <div className="alert warning" role="alert">Sign in as an administrator to manage local staff accounts.</div>
      </section>
    );
  }

  if (state.loading) return <LoadingState label="Loading accounts..." />;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Admin</p>
          <h1>Accounts</h1>
          <p className="page-subtitle">Create local staff accounts and activate or deactivate users for this office device.</p>
        </div>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {statusError && <div className="alert error" role="alert">{statusError}</div>}

      <div className="admin-grid">
        <form className="form-card" onSubmit={handleCreateAccount} noValidate>
          <div>
            <p className="page-kicker">New account</p>
            <h2>Create local login</h2>
          </div>

          {formError && <div className="alert error" role="alert">{formError}</div>}
          {formSuccess && <div className="alert success" role="alert">{formSuccess}</div>}

          <label className="field">
            <span>Full name</span>
            <input
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
          </label>

          <label className="field">
            <span>Username</span>
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              aria-invalid={Boolean(fieldErrors.username)}
              autoCapitalize="none"
            />
            {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </label>

          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(event) => updateField("role", event.target.value)} aria-invalid={Boolean(fieldErrors.role)}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            {fieldErrors.role && <span className="field-error">{fieldErrors.role}</span>}
          </label>

          <div className="button-row form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Local users</h2>
              <span>{sortedAccounts.length} account{sortedAccounts.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {!state.error && sortedAccounts.length === 0 ? (
            <EmptyState title="No accounts found" body="Create the first staff account for this local system." />
          ) : (
            !state.error && (
              <div className="table-wrap">
                <table className="data-table admin-table">
                  <thead>
                    <tr>
                      <th>Full name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((account) => (
                      <tr key={account.userId}>
                        <td>{account.fullName}</td>
                        <td>{account.username}</td>
                        <td>{formatRole(account.role)}</td>
                        <td><AccountStatus status={account.accountStatus} /></td>
                        <td>
                          {Number(account.userId) === Number(user.userId) ? (
                            <span className="muted">Current account</span>
                          ) : (
                            <button
                              className={account.accountStatus === "ACTIVE" ? "btn btn-danger" : "btn btn-primary"}
                              type="button"
                              disabled={updatingUserId === account.userId}
                              onClick={() => handleStatusChange(account)}
                            >
                              {updatingUserId === account.userId
                                ? "Updating..."
                                : account.accountStatus === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function AccountStatus({ status }) {
  const code = String(status || "ACTIVE").toUpperCase();
  return <span className={`status-badge account-status status-account-${code.toLowerCase()}`}>{code === "INACTIVE" ? "Inactive" : "Active"}</span>;
}

function formatRole(role) {
  return String(role || "").toUpperCase() === "ADMIN" ? "Admin" : "Staff";
}
