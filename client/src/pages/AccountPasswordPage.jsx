import { useState } from "react";

import { apiRequest } from "../api/client.js";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export function AccountPasswordPage({ user }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
    setFormSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");

    try {
      await apiRequest("/api/account/password", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm(INITIAL_FORM);
      setFormSuccess("Password updated. Use the new password the next time you sign in.");
    } catch (error) {
      setFieldErrors(error.data?.errors || {});
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page account-password-page">
      <div className="page-header page-head staff-page-head">
        <div>
          <p className="page-kicker">Account access</p>
          <h1 className="page-title">Change password</h1>
          <div className="page-sub">Update your own staff login for this barangay office device.</div>
          <div className="page-sub-fil">Hindi nito binabago ang password ng ibang staff.</div>
        </div>
      </div>

      <div className="alert info current-account-note" role="status">
        Signed in as <strong>{user?.fullName || user?.username}</strong>. Enter your current password before saving a new one.
      </div>

      <form className="form-card password-form-card" onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={user?.username || ""}
          readOnly
          hidden
        />
        <div>
          <p className="page-kicker">Password</p>
          <h2>Secure this account</h2>
          <p className="form-copy">Use a password staff can type reliably at the desk, but do not share it with another user.</p>
        </div>

        {formError && <div className="alert error" role="alert">{formError}</div>}
        {formSuccess && <div className="alert success" role="alert">{formSuccess}</div>}

        <label className="field">
          <span>Current password</span>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={(event) => updateField("currentPassword", event.target.value)}
            aria-invalid={Boolean(fieldErrors.currentPassword)}
            autoComplete="current-password"
          />
          {fieldErrors.currentPassword && <span className="field-error">{fieldErrors.currentPassword}</span>}
        </label>

        <label className="field">
          <span>New password</span>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={(event) => updateField("newPassword", event.target.value)}
            aria-invalid={Boolean(fieldErrors.newPassword)}
            autoComplete="new-password"
          />
          {fieldErrors.newPassword && <span className="field-error">{fieldErrors.newPassword}</span>}
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
        </label>

        <div className="button-row form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}
