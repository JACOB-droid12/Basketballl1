// Login screen
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('••••••');
  const [loading, setLoading] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => onLogin({ name: 'Sec. L. Dizon', role: 'Barangay Secretary' }), 500);
  };

  return (
    <div className="login-wrap">
      <div className="login-art">
        <div className="art-seal">
          <div className="seal">N</div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', opacity: 0.8 }}>REPUBLIKA NG PILIPINAS</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Barangay Sto. Niño</div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', opacity: 0.85, marginBottom: 16 }}>COURT SCHEDULING SYSTEM · v1.0</div>
          <h1>The community<br/><em>court,</em> organized.</h1>
          <p>An offline, in-office reservation system for the barangay basketball court. Keep the schedule clear, prevent double bookings, and ensure every resident gets a fair turn.</p>
        </div>
        <div className="meta">
          <div>INSTALLATION · BRGY OFFICE TERMINAL 01</div>
          <div>OFFLINE MODE · LAST SYNC 04·18·2026 · 08:02</div>
        </div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow">Personnel Sign-in</div>
          <h2>Welcome back.</h2>
          <p className="sub">Sign in with your barangay-assigned credentials.</p>

          <div className="form-field">
            <label className="form-label">Username</label>
            <div className="input-prefixed">
              {window.icons.user}
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <div className="input-prefixed">
              {window.icons.lock}
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verifying…' : 'Sign in to terminal'}
          </button>

          <div className="foot">
            FOR AUTHORIZED BARANGAY PERSONNEL ONLY
          </div>
        </form>
      </div>
    </div>
  );
};

window.LoginScreen = LoginScreen;
