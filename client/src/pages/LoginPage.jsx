import { useState } from "react";

import { login } from "../api/client.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(form);
      onLogin(data.user);
      window.history.replaceState({}, "", "/dashboard");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="brand-row">
          <div className="brand-seal">N</div>
          <div>
            <strong>Barangay Sto. Niño</strong>
            <span>Local Office System</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Basketball Court Scheduling</p>
          <h1>Manage court reservations at the office.</h1>
          <p>Encode walk-in requests, check available slots, and keep reservation records updated on this local computer.</p>
        </div>
      </section>
      <section className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Personnel Sign In</h2>
          <p>For authorized barangay staff only.</p>
          {error && <div className="alert error">{error}</div>}
          <label className="field">
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <button className="btn btn-primary btn-big" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
