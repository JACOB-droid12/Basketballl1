import { useEffect, useRef, useState } from "react";

import { login } from "../api/client.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await login(form);
      onLogin(data.user);
      window.history.replaceState({}, "", "/dashboard");
    } catch (loginError) {
      if (mountedRef.current) {
        setError(loginError.status === 401 ? "Invalid username or password. Please check the staff credentials and try again." : loginError.message);
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="brand-row seal-row">
          <div className="brand-seal">N</div>
          <div>
            <span className="login-republic">Republika ng Pilipinas</span>
            <strong>Barangay Sto. Niño</strong>
            <span>Basketball Court Office Terminal</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Court Scheduling System</p>
          <h1>The community court, organized.</h1>
          <p>Use this local office system to check open times, record walk-in requests, and keep court reservations clear for residents.</p>
          <p className="welcome-fil">Para sa maayos na pila, malinaw na oras, at iisang talaan ng court bookings.</p>
        </div>
        <div className="login-terminal-note">
          <span>Office use only</span>
          <span>Barangay staff terminal</span>
        </div>
      </section>
      <section className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Personnel Sign-in</p>
            <h2>Welcome back.</h2>
            <p className="login-subtitle">Sign in with your barangay-assigned staff account.</p>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <label className="field">
            <span>Username</span>
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn btn-primary btn-big" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Sign in to dashboard"}
          </button>
          <div className="login-hint">
            <strong>Authorized barangay personnel only.</strong>
            <span>Kung hindi ka naka-duty, huwag gamitin ang account ng ibang staff.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
