// Staff-friendly components — all in one file for simplicity

const { useState, useEffect } = React;

// --- Bilingual labels ---
const L = {
  en: {
    dashboard: 'Home', dashboardSub: "Today's schedule",
    newRes: 'Make a Reservation', newResSub: 'Add a new booking',
    calendar: 'Calendar', calendarSub: 'See the week ahead',
    list: 'All Bookings', listSub: 'Search past reservations',
    conflicts: 'No-Shows', conflictsSub: 'People who didn\'t come',
    signout: 'Sign Out',
    welcome: 'Good day', today: 'Today',
    noToday: 'No reservations for today.', noTodaySub: 'The court is free all day.',
    upcoming: 'Upcoming this week',
    pending: 'Pending', approved: 'Approved', missed: 'No-show', completed: 'Done', now: 'HAPPENING NOW',
  },
  fil: {
    dashboard: 'Home', dashboardSub: 'Iskedyul ngayon',
    newRes: 'Magpareserba', newResSub: 'Magdagdag ng booking',
    calendar: 'Kalendaryo', calendarSub: 'Linggo pasulong',
    list: 'Lahat ng Reserba', listSub: 'Maghanap ng record',
    conflicts: 'Hindi Dumating', conflictsSub: 'Walang pumunta',
    signout: 'Mag-sign out',
    welcome: 'Magandang araw', today: 'Ngayong araw',
    noToday: 'Walang reserba ngayong araw.', noTodaySub: 'Libre ang court buong maghapon.',
    upcoming: 'Susunod na araw',
    pending: 'Naghihintay', approved: 'OK na', missed: 'Hindi dumating', completed: 'Tapos na', now: 'KASALUKUYANG NAGLALARO',
  },
};

// --- Icons (simpler, bigger) ---
const I = (d, extra = {}) => <svg width={extra.size || 22} height={extra.size || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ico = {
  home: I(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>),
  plus: I(<><path d="M12 5v14M5 12h14"/></>),
  cal: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  list: I(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>),
  alert: I(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>),
  check: I(<><path d="M20 6 9 17l-5-5"/></>),
  x: I(<><path d="M18 6 6 18M6 6l12 12"/></>),
  search: I(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>),
  user: I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
  users: I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>),
  clock: I(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>),
  phone: I(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>),
  chevL: I(<><path d="m15 18-6-6 6-6"/></>),
  chevR: I(<><path d="m9 18 6-6-6-6"/></>),
  info: I(<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>),
  out: I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
  help: I(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></>),
  note: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>),
};

// --- Login (very simple) ---
const StaffLogin = ({ onLogin, lang }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="seal">N</div>
        <h1>Barangay Sto. Niño</h1>
        <p className="fil">{lang === 'fil' ? 'Sistema ng Reserba sa Basketball Court' : 'Basketball Court Scheduling'}</p>
        <form onSubmit={(e) => { e.preventDefault(); onLogin({ name: 'Sec. L. Dizon' }); }}>
          <div className="form-field">
            <label className="form-label">{lang === 'fil' ? 'Username' : 'Username'}</label>
            <input className="input" value={u} onChange={e=>setU(e.target.value)} placeholder="e.g. ldizon" autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">{lang === 'fil' ? 'Password' : 'Password'}</label>
            <input type="password" className="input" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••"/>
          </div>
          <button type="submit" className="btn btn-primary btn-big">
            {ico.check} {lang === 'fil' ? 'Mag-sign in' : 'Sign In'}
          </button>
        </form>
        <div className="login-help">
          {lang === 'fil'
            ? 'Para sa barangay staff lamang. Kung nakalimutan ang password, tawagan si Kap. Mendoza.'
            : 'For barangay staff only. If you forgot your password, ask Kap. Mendoza.'}
        </div>
      </div>
    </div>
  );
};

// --- Shell ---
const StaffShell = ({ user, page, setPage, onLogout, reservations, lang, children }) => {
  const t = L[lang];
  const today = window.fmtDate(window.TODAY);
  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  const navs = [
    { id: 'dashboard', label: t.dashboard, sub: t.dashboardSub, icon: ico.home },
    { id: 'new', label: t.newRes, sub: t.newResSub, icon: ico.plus },
    { id: 'calendar', label: t.calendar, sub: t.calendarSub, icon: ico.cal },
    { id: 'list', label: t.list, sub: t.listSub, icon: ico.list },
    { id: 'conflicts', label: t.conflicts, sub: t.conflictsSub, icon: ico.alert, count: pendingCount },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = window.fmtLongDate(window.TODAY);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-seal">N</div>
          <div>
            <div>Barangay Sto. Niño</div>
            <div className="brand-sub">{lang === 'fil' ? 'Basketball Court' : 'Basketball Court'}</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-time">
            {timeStr}
            <small>{dateStr}</small>
          </div>
          <div className="user-pill">
            <div className="avatar">LD</div>
            <div>
              <strong>{user.name}</strong>
              <small>{lang === 'fil' ? 'Barangay Secretary' : 'Barangay Secretary'}</small>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>{ico.out} {t.signout}</button>
        </div>
      </div>

      <aside className="sidebar">
        {navs.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <span className="ic">{n.icon}</span>
            <span>
              {n.label}
              <span className="sub">{n.sub}</span>
            </span>
            {n.count > 0 && <span className="count">{n.count}</span>}
          </button>
        ))}
        <div className="sidebar-help">
          <strong>{ico.help} {lang === 'fil' ? 'Kailangan ng tulong?' : 'Need help?'}</strong>
          {lang === 'fil' ? 'Tawagan ang IT Support: 0917-442-0081' : 'Call IT Support: 0917-442-0081'}
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
};

window.StaffLogin = StaffLogin;
window.StaffShell = StaffShell;
window.staffIcons = ico;
window.staffLabels = L;
