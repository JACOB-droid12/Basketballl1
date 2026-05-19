import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatBackendDateTime } from "../api/mappers.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Field } from "../components/Field.jsx";
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
  const [pendingStatusAccount, setPendingStatusAccount] = useState(null);
  const [updatingUserIds, setUpdatingUserIds] = useState(() => new Set());

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
  const accountTotals = useMemo(() => {
    return state.accounts.reduce((totals, account) => {
      const status = String(account.accountStatus || "ACTIVE").toUpperCase();
      const role = String(account.role || "STAFF").toUpperCase();
      return {
        ...totals,
        active: totals.active + (status === "ACTIVE" ? 1 : 0),
        inactive: totals.inactive + (status === "INACTIVE" ? 1 : 0),
        admins: totals.admins + (role === "ADMIN" ? 1 : 0),
        staff: totals.staff + (role === "STAFF" ? 1 : 0)
      };
    }, { active: 0, inactive: 0, admins: 0, staff: 0 });
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

  async function handleConfirmStatusChange() {
    const account = pendingStatusAccount;
    if (!account) return;
    if (updatingUserIds.has(account.userId)) return;

    const nextStatus = account.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingUserIds((current) => new Set(current).add(account.userId));
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
      setPendingStatusAccount(null);
      setUpdatingUserIds((current) => {
        const next = new Set(current);
        next.delete(account.userId);
        return next;
      });
    }
  }

  if (!isAdmin) {
    return (
      <section className="page">
        <div className="page-header page-head staff-page-head">
          <div>
            <p className="page-kicker">Accounts</p>
            <h1 className="page-title">Admin access required</h1>
            <div className="page-sub">Only administrator accounts can create staff users or change account status.</div>
            <div className="page-sub-fil">Para sa administrator lang ang account management.</div>
          </div>
        </div>
        <div className="alert warning" role="alert">Sign in as an administrator to manage local staff accounts.</div>
      </section>
    );
  }

  if (state.loading) return <LoadingState label="Loading accounts..." />;

  return (
    <section className="page">
      <div className="page-header page-head staff-page-head">
        <div>
          <p className="page-kicker">Admin</p>
          <h1 className="page-title">Accounts</h1>
          <div className="page-sub">Create local logins and control who can use this office device.</div>
        </div>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {statusError && <div className="alert error" role="alert">{statusError}</div>}

      <div className="account-totals">
        {accountTotals.active} active staff{accountTotals.admins > 0 ? `, ${accountTotals.admins} admin${accountTotals.admins === 1 ? "" : "s"}` : ""}
        {accountTotals.inactive > 0 && ` · ${accountTotals.inactive} inactive`}
      </div>

      <div className="alert info current-account-note" role="status">
        Signed in as <strong>{user.fullName || user.username}</strong>. The current account cannot be deactivated from this screen.
      </div>

      <div className="admin-grid">
        <form className="form-card" onSubmit={handleCreateAccount} noValidate>
          <div>
            <p className="page-kicker">New account</p>
            <h2>Create local login</h2>
            <p className="form-copy">Use names staff recognize at the desk. Passwords stay local to this installation.</p>
          </div>

          {formError && <div className="alert error" role="alert">{formError}</div>}
          {formSuccess && <div className="alert success" role="status" aria-live="polite" aria-atomic="true">{formSuccess}</div>}

          <Field id="account-fullName" label="Full name" filipino="Buong pangalan" error={fieldErrors.fullName} wide>
            <input name="fullName" autoComplete="name" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
          </Field>

          <Field id="account-username" label="Username" filipino="Pangalan ng user" error={fieldErrors.username} wide>
            <input name="username" autoComplete="username" autoCapitalize="none" value={form.username} onChange={(event) => updateField("username", event.target.value)} />
          </Field>

          <Field id="account-password" label="Password" filipino="Password" hint="At least 8 characters, mixing letters and numbers." error={fieldErrors.password} wide>
            <input name="password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => updateField("password", event.target.value)} />
          </Field>

          <Field id="account-role" label="Role" filipino="Tungkulin" error={fieldErrors.role} wide>
            <select name="role" value={form.role} onChange={(event) => updateField("role", event.target.value)}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>

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
              <span>{sortedAccounts.length} account{sortedAccounts.length === 1 ? "" : "s"} saved on this system</span>
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
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((account) => (
                      <AccountRow
                        key={account.userId}
                        account={account}
                        currentUserId={user.userId}
                        isUpdating={updatingUserIds.has(account.userId)}
                        onStatusChange={setPendingStatusAccount}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {pendingStatusAccount && (
        <ConfirmDialog
          title={pendingStatusAccount.accountStatus === "ACTIVE" ? "Deactivate account?" : "Activate account?"}
          body={`${pendingStatusAccount.fullName} will ${pendingStatusAccount.accountStatus === "ACTIVE" ? "lose access to this local system" : "be able to sign in again"}.`}
          confirmLabel={pendingStatusAccount.accountStatus === "ACTIVE" ? "Deactivate account" : "Activate account"}
          danger={pendingStatusAccount.accountStatus === "ACTIVE"}
          busy={updatingUserIds.has(pendingStatusAccount.userId)}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setPendingStatusAccount(null)}
        />
      )}
    </section>
  );
}

function AccountRow({ account, currentUserId, isUpdating, onStatusChange }) {
  return (
    <tr>
      <td>{account.fullName}</td>
      <td>{account.username}</td>
      <td>{formatRole(account.role)}</td>
      <td><AccountStatus status={account.accountStatus} /></td>
      <td>{formatBackendDateTime(account.createdAt)}</td>
      <td>
        {Number(account.userId) === Number(currentUserId) ? (
          <span className="current-account-lock">Current account</span>
        ) : (
          <button
            className={account.accountStatus === "ACTIVE" ? "btn btn-danger" : "btn btn-primary"}
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(account)}
          >
            {isUpdating ? "Updating..." : account.accountStatus === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        )}
      </td>
    </tr>
  );
}

function AccountStatus({ status }) {
  const code = String(status || "ACTIVE").toUpperCase();
  return <span className={`status-badge account-status status-account-${code.toLowerCase()}`}>{code === "INACTIVE" ? "Inactive" : "Active"}</span>;
}

function formatRole(role) {
  return String(role || "").toUpperCase() === "ADMIN" ? "Admin" : "Staff";
}
