// Shell — sidebar + topbar
const Shell = ({ user, page, setPage, onLogout, reservations, children }) => {
  const today = window.fmtDate(window.TODAY);
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const todayCount = reservations.filter(r => r.date === today).length;

  const navs = [
    { id: 'dashboard', label: 'Dashboard', icon: window.icons.dashboard },
    { id: 'calendar', label: 'Calendar', icon: window.icons.calendar },
    { id: 'new', label: 'New reservation', icon: window.icons.plus },
    { id: 'list', label: 'Reservations', icon: window.icons.list, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'conflicts', label: 'Conflicts & missed', icon: window.icons.alert },
    { id: 'reports', label: 'Reports', icon: window.icons.chart },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = window.fmtLongDate(window.TODAY);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-seal">N</div>
          <div className="brand-text">
            <div>Barangay Sto. Niño</div>
            <small>Court Scheduling · Terminal 01</small>
          </div>
        </div>
        <div className="topbar-right">
          <span>{window.icons.offline}<span style={{ marginLeft: 6 }}><span className="status-dot"></span>Offline · Local</span></span>
          <span className="divider"></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{dateStr} · {timeStr}</span>
          <span className="divider"></span>
          <div className="user-chip">
            <div className="avatar">LD</div>
            <span>{user.name}</span>
          </div>
          <button className="btn-ghost btn btn-sm" onClick={onLogout} title="Sign out">{window.icons.logout}</button>
        </div>
      </div>
      <aside className="sidebar">
        <div className="nav-section">Workspace</div>
        {navs.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            {n.icon}
            <span>{n.label}</span>
            {n.badge && <span className="badge">{n.badge}</span>}
          </button>
        ))}
        <div className="nav-section">Settings</div>
        <button className="nav-item"><span>{window.icons.settings}</span>Preferences</button>
        <div className="sidebar-footer">
          BUILD 1.0.4 · OFFLINE<br/>
          DB · local · {reservations.length} records
        </div>
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  );
};

window.Shell = Shell;
