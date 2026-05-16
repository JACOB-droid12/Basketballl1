import { useEffect, useRef, useState } from "react";

import { login } from "../api/client.js";
import { Icon } from "../components/Icon.jsx";

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
        <div className="seal-row">
          <div className="seal">N</div>
          <div>
            <span className="login-republic">Republika ng Pilipinas</span>
            <strong>Barangay Sto. Niño</strong>
          </div>
        </div>
        <div>
          <h1>Welcome.<br /><em>Maligayang pagdating.</em></h1>
          <p>This is the basketball court reservation system. Please sign in to start.</p>
          <p className="welcome-fil">Ito ang sistema para sa reserbasyon ng basketball court. Mag-sign in upang magsimula.</p>
        </div>
        <div className="login-install-note">Installed at the Barangay Office · Version 1.0</div>
      </section>
      <section className="login-form-side">
        <form className="login-form-card" onSubmit={handleSubmit}>
          <div>
            <h2>Sign in</h2>
            <p className="sub">Mag-sign in gamit ang iyong account.</p>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <label className="field">
            <span className="field-label">Username <span className="fil">· Pangalan ng user</span></span>
            <input
              className="input"
              id="login-username"
              name="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password <span className="fil">· Password</span></span>
            <input
              className="input"
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn btn-primary btn-big" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="login-hint">
            <Icon name="info" />
            <span>Only barangay personnel can use this system. If you forgot your password, please see the Kapitan.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
