// Staff-friendly components — single big file for simplicity

// ============ ICONS ============
const Ic = ({ d, f = 'none', size }) => (
  <svg width={size || 22} height={size || 22} viewBox="0 0 24 24" fill={f} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const IC = {
  home: <Ic d={<><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></>} />,
  calendar: <Ic d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />,
  plus: <Ic d={<><path d="M12 5v14M5 12h14"/></>} />,
  list: <Ic d={<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>} />,
  chart: <Ic d={<><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/></>} />,
  search: <Ic d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>} />,
  check: <Ic d={<><path d="M20 6 9 17l-5-5"/></>} />,
  x: <Ic d={<><path d="M18 6 6 18M6 6l12 12"/></>} />,
  user: <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />,
  users: <Ic d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
  phone: <Ic d={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>} />,
  clock: <Ic d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>} />,
  warn: <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>} />,
  info: <Ic d={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>} />,
  lock: <Ic d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />,
  logout: <Ic d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>} />,
  cl: <Ic d={<path d="m15 18-6-6 6-6"/>} />,
  cr: <Ic d={<path d="m9 18 6-6-6-6"/>} />,
  print: <Ic d={<><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>} />,
  question: <Ic d={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></>} />,
};

// ============ LOGIN ============
const StaffLogin = ({ onLogin }) => {
  const [u, setU] = React.useState('admin');
  const [p, setP] = React.useState('••••••');
  const [loading, setLoading] = React.useState(false);
  const go = (e) => { e.preventDefault(); setLoading(true); setTimeout(() => onLogin({ name: 'Ms. Liza Dizon', role: 'Barangay Secretary' }), 400); };
  return (
    <div className="login-page">
      <div className="login-side">
        <div className="seal-row">
          <div className="seal">N</div>
          <div>
            <div style={{ fontSize: 13, letterSpacing: '0.12em', opacity: 0.85 }}>REPUBLIKA NG PILIPINAS</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Barangay Sto. Niño</div>
          </div>
        </div>
        <div>
          <h1>Welcome.<br/><em>Maligayang pagdating.</em></h1>
          <p>This is the basketball court reservation system. Please sign in to start.</p>
          <p className="welcome-fil">Ito ang sistema para sa reserbasyon ng basketball court. Mag-sign in upang magsimula.</p>
        </div>
        <div style={{ fontSize: 14, opacity: 0.75 }}>Installed at the Barangay Office · Version 1.0</div>
      </div>
      <div className="login-form-side">
        <form className="login-form-card" onSubmit={go}>
          <h2>Sign in</h2>
          <div className="sub">Mag-sign in gamit ang iyong account.</div>
          <div className="field">
            <label className="field-label">Username <span className="fil">· Pangalan ng user</span></label>
            <input className="input" value={u} onChange={e => setU(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Password <span className="fil">· Password</span></label>
            <input type="password" className="input" value={p} onChange={e => setP(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-big" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="login-hint">
            {IC.info}
            <div>Only barangay personnel can use this system. If you forgot your password, please see the Kapitan.</div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ SHELL ============
const Shell = ({ user, page, setPage, onLogout, reservations, children }) => {
  const pending = reservations.filter(r => r.status === 'pending').length;
  const now = new Date();
  const navs = [
    { id: 'home',      icon: IC.home,     l1: 'Home',               l2: 'Today\u2019s schedule' },
    { id: 'calendar',  icon: IC.calendar, l1: 'Calendar',           l2: 'See the whole week' },
    { id: 'new',       icon: IC.plus,     l1: 'New Reservation',    l2: 'Encode a walk-in' },
    { id: 'list',      icon: IC.list,     l1: 'All Bookings',       l2: 'Search past records', badge: pending || null },
    { id: 'summary',   icon: IC.chart,    l1: 'Summary',            l2: 'Monthly report' },
  ];
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-seal">N</div>
          <div className="brand-text">
            <div className="t1">Basketball Court Reservation</div>
            <div className="t2">Barangay Sto. Niño · Office Computer</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-clock">
            <div className="d1">{window.fmtLongDate(window.TODAY)}</div>
            <div className="d2">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="user-chip">
            <div className="avatar">LD</div>
            <div className="name"><strong>{user.name}</strong><small>{user.role}</small></div>
          </div>
          <button className="logout-btn" onClick={onLogout}>{IC.logout}<span>Sign out</span></button>
        </div>
      </div>
      <aside className="sidebar">
        {navs.map(n => (
          <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <div className="nav-ic">{n.icon}</div>
            <div className="nav-text">
              <div className="l1">{n.l1}</div>
              <div className="l2">{n.l2}</div>
            </div>
            {n.badge && <span className="nav-badge">{n.badge}</span>}
          </button>
        ))}
        <div className="sidebar-help">
          {IC.question}
          <strong style={{ marginTop: 8 }}>Need help?</strong>
          Call the IT volunteer at the office, or press the <strong>Help</strong> button inside any screen.
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
};

// ============ HOME ============
const Home = ({ reservations, openRes, setPage }) => {
  const today = window.fmtDate(window.TODAY);
  const todays = reservations.filter(r => r.date === today).sort((a,b) => a.start - b.start);
  const pending = reservations.filter(r => r.status === 'pending');
  const hours = todays.reduce((s,r) => s + (r.end - r.start), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Today</h1>
          <div className="page-sub">{window.fmtLongDate(window.TODAY)}</div>
          <div className="page-sub-fil">Ngayong araw</div>
        </div>
        <button className="btn btn-primary btn-big" onClick={() => setPage('new')}>
          {IC.plus} <span>New Reservation<span className="btn-fil">Magpa-reserba</span></span>
        </button>
      </div>

      <div className="home-hero">
        <div className="hero-card">
          <h2>Good morning, Ms. Liza.</h2>
          <div className="hero-date">Here is what's happening at the court today.</div>
          <div className="hero-stat">
            <div className="num">{todays.length}</div>
            <div className="unit">reservation{todays.length !== 1 ? 's' : ''} booked</div>
          </div>
          <div className="hero-note">That's {hours} hour{hours!==1?'s':''} of court time today. {pending.length > 0 && <><br/><strong>{pending.length} request{pending.length!==1?'s':''} waiting for approval.</strong></>}</div>
        </div>
        <div className="quick-actions">
          <div className="quick-action" onClick={() => setPage('new')}>
            <div className="qa-ic">{IC.plus}</div>
            <div className="qa-label">
              <div className="l1">Make a reservation</div>
              <div className="l2">Someone came to the office to book</div>
            </div>
            <div className="qa-arrow">{IC.cr}</div>
          </div>
          <div className="quick-action" onClick={() => setPage('calendar')}>
            <div className="qa-ic">{IC.calendar}</div>
            <div className="qa-label">
              <div className="l1">Check the calendar</div>
              <div className="l2">See which days are free</div>
            </div>
            <div className="qa-arrow">{IC.cr}</div>
          </div>
          <div className="quick-action" onClick={() => setPage('list')}>
            <div className="qa-ic">{IC.search}</div>
            <div className="qa-label">
              <div className="l1">Find a booking</div>
              <div className="l2">Search by name or date</div>
            </div>
            <div className="qa-arrow">{IC.cr}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            Today's Schedule
            <span className="fil">Iskedyul ngayong araw</span>
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>Click a booking to see details</div>
        </div>
        {todays.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--ink-3)' }}>{IC.calendar}</div>
            <div style={{ fontSize: 18, color: 'var(--ink-2)' }}>No reservations today.</div>
            <div style={{ fontSize: 15, marginTop: 4 }}>Walang reserbasyon ngayon.</div>
          </div>
        ) : todays.map(r => (
          <div key={r.id} className={`booking-row ${r.status}`} onClick={() => openRes(r)}>
            <div className="b-time">
              {window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)}
              <span className="b-dur">{r.end - r.start} hour{r.end - r.start !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <div className="b-name">{r.name}</div>
              <div className="b-purpose">{r.purpose}</div>
              <div className="b-meta">{r.party} people · Contact: {r.contact}</div>
            </div>
            <span className={`pill ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="banner banner-warn">
            <div className="b-ic">{IC.warn}</div>
            <div style={{ flex: 1 }}>
              <h4>{pending.length} request{pending.length!==1?'s':''} waiting for your approval</h4>
              <p>Please review and approve or decline these booking requests.</p>
            </div>
            <button className="btn" onClick={() => setPage('list')}>Review now</button>
          </div>
        </div>
      )}
    </>
  );
};

// ============ CALENDAR ============
const CalendarScreen = ({ reservations, openRes, setPage }) => {
  const [anchor, setAnchor] = React.useState(new Date(window.TODAY));
  const weekStart = React.useMemo(() => {
    const d = new Date(anchor); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d;
  }, [anchor]);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const move = (n) => { const d = new Date(anchor); d.setDate(d.getDate() + n*7); setAnchor(d); };
  const today = window.fmtDate(window.TODAY);
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendar</h1>
          <div className="page-sub">See every reservation for the week.</div>
          <div className="page-sub-fil">Tingnan ang lahat ng reserbasyon sa linggong ito.</div>
        </div>
        <button className="btn btn-primary btn-big" onClick={() => setPage('new')}>{IC.plus}<span>New Reservation</span></button>
      </div>
      <div className="cal-nav">
        <div className="month-label">
          {window.MONTH_NAMES[weekStart.getMonth()]} {weekStart.getDate()}–{days[6].getDate()}, {days[6].getFullYear()}
        </div>
        <button className="btn" onClick={() => move(-1)}>{IC.cl}<span>Previous week</span></button>
        <button className="btn" onClick={() => setAnchor(new Date(window.TODAY))}>This week</button>
        <button className="btn" onClick={() => move(1)}><span>Next week</span>{IC.cr}</button>
      </div>
      <div className="week-grid">
        {days.map((d) => {
          const key = window.fmtDate(d);
          const isToday = key === today;
          const events = reservations.filter(r => r.date === key).sort((a,b) => a.start - b.start);
          return (
            <div key={key} className="day-col">
              <div className={`day-head ${isToday ? 'today' : ''}`}>
                <div className="dname">{window.DAYS_OF_WEEK[d.getDay()]}{isToday ? ' · Today' : ''}</div>
                <div className="dnum">{d.getDate()}</div>
              </div>
              <div className="day-body">
                {events.length === 0 && <div className="day-empty">No bookings<br/><small>Walang reserbasyon</small></div>}
                {events.map(ev => (
                  <div key={ev.id} className={`day-event ${ev.status}`} onClick={() => openRes(ev)}>
                    <div className="de-time">{window.fmtHourCompact(ev.start)}–{window.fmtHourCompact(ev.end)}</div>
                    <div className="de-name">{ev.name}</div>
                    <div className="de-purpose">{ev.purpose}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ============ NEW RESERVATION (single page) ============
const NewRes = ({ reservations, onCreate, setPage }) => {
  const [f, setF] = React.useState({
    name: '', purpose: '', contact: '', party: 10,
    date: window.fmtDate(window.TODAY), start: null, duration: 2, notes: ''
  });
  const [err, setErr] = React.useState(null);
  const [confirm, setConfirm] = React.useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const dayRes = reservations.filter(r => r.date === f.date && r.status !== 'missed').sort((a,b) => a.start - b.start);
  const slotBusy = (h) => reservations.some(r =>
    r.date === f.date && r.status !== 'missed' &&
    !(r.end <= h || r.start >= h + f.duration)
  );

  const conflict = f.start != null && reservations.find(r =>
    r.date === f.date && r.status !== 'missed' &&
    !(r.end <= f.start || r.start >= f.start + f.duration)
  );

  // suggest next free slots
  const suggestions = [];
  let cursor = 6;
  for (const r of dayRes) {
    if (r.start - cursor >= f.duration) suggestions.push(cursor);
    cursor = Math.max(cursor, r.end);
  }
  if (22 - cursor >= f.duration) suggestions.push(cursor);

  const submit = () => {
    if (!f.name.trim() || !f.purpose.trim() || !f.contact.trim()) { setErr('Please complete the resident\u2019s name, purpose, and contact number.'); return; }
    if (f.start == null) { setErr('Please pick a start time.'); return; }
    if (conflict) { setErr('That time is already booked. Please pick a different time.'); return; }
    setErr(null);
    setConfirm(true);
  };

  const finalize = () => {
    onCreate({
      id: 'R-' + (2060 + Math.floor(Math.random()*100)),
      name: f.name, purpose: f.purpose, contact: f.contact, party: +f.party,
      date: f.date, start: f.start, end: f.start + f.duration,
      notes: f.notes, status: 'pending', approvedBy: null
    });
    setConfirm(false);
    setPage('list');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">New Reservation</h1>
          <div className="page-sub">Fill this out while the resident is at the counter.</div>
          <div className="page-sub-fil">Punan habang nasa counter ang residente.</div>
        </div>
        <button className="btn btn-big" onClick={() => setPage('home')}>{IC.x}<span>Cancel</span></button>
      </div>

      <div className="banner banner-info" style={{ marginBottom: 24 }}>
        <div className="b-ic">{IC.info}</div>
        <div>
          <h4>How this works</h4>
          <p>1. Ask the resident for the details below. 2. Pick a free time on the schedule. 3. Click <strong>Save Reservation</strong>. The Kapitan will approve it later.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {/* Section 1 */}
        <div className="form-section">
          <h3><span className="section-num">1</span> Who is booking?</h3>
          <div className="section-hint">Sino ang magpapa-reserba?</div>
          <div className="field">
            <label className="field-label">Name or group <span className="fil">· Pangalan</span><span className="req">*</span></label>
            <div className="field-hint">Example: Liga ng Kabataan, Rodriguez Family, Purok 3 Youth</div>
            <input className="input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Type the name here" />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Contact number <span className="fil">· Cellphone number</span><span className="req">*</span></label>
              <input className="input" value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="0917-000-0000" />
            </div>
            <div className="field">
              <label className="field-label">How many people? <span className="fil">· Ilan sila</span><span className="req">*</span></label>
              <input type="number" min="1" className="input" value={f.party} onChange={e => set('party', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">What is it for? <span className="fil">· Para saan</span><span className="req">*</span></label>
            <div className="field-hint">Example: League game, practice, birthday, wedding reception</div>
            <input className="input" value={f.purpose} onChange={e => set('purpose', e.target.value)} />
          </div>
        </div>

        {/* Section 2 */}
        <div className="form-section">
          <h3><span className="section-num">2</span> When do they want to use the court?</h3>
          <div className="section-hint">Kailan nila gustong gamitin?</div>
          <div className="field-row" style={{ marginBottom: 20 }}>
            <div className="field">
              <label className="field-label">Date <span className="fil">· Petsa</span></label>
              <input type="date" className="input" value={f.date} onChange={e => { set('date', e.target.value); set('start', null); }} />
            </div>
            <div className="field">
              <label className="field-label">How long? <span className="fil">· Gaano katagal</span></label>
              <div className="duration-pick">
                {[1,2,3,4].map(d => (
                  <button key={d} type="button" className={f.duration === d ? 'on' : ''} onClick={() => { set('duration', d); set('start', null); }}>{d}h</button>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Pick a start time <span className="fil">· Anong oras magsisimula</span><span className="req">*</span></label>
            <div className="field-hint">Grey (dashed) slots are already booked.</div>
            <div className="time-grid">
              {window.HOURS.slice(0, -1).map(h => {
                const busy = slotBusy(h);
                const sel = f.start === h;
                return (
                  <button key={h} type="button"
                          className={`time-chip ${busy && !sel ? 'busy' : ''} ${sel ? 'selected' : ''}`}
                          disabled={busy && !sel}
                          onClick={() => set('start', h)}>
                    {window.fmtHour(h)}
                  </button>
                );
              })}
            </div>
          </div>

          {conflict && (
            <div className="banner banner-warn" style={{ marginTop: 18 }}>
              <div className="b-ic">{IC.warn}</div>
              <div style={{ flex: 1 }}>
                <h4>This time is already booked</h4>
                <p><strong>{conflict.name}</strong> already reserved {window.fmtHour(conflict.start)}–{window.fmtHour(conflict.end)}. Try one of these open times:</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {suggestions.slice(0, 4).map(s => (
                    <button key={s} type="button" className="btn" onClick={() => set('start', s)}>
                      {window.fmtHour(s)}
                    </button>
                  ))}
                  {suggestions.length === 0 && <span style={{ color: 'var(--ink-3)' }}>No open times left today. Please pick another date.</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3 */}
        <div className="form-section">
          <h3><span className="section-num">3</span> Any notes? <span style={{ fontSize: 15, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 8 }}>(optional)</span></h3>
          <div className="section-hint">Mga paalala</div>
          <textarea className="textarea" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Example: They will decorate the court for a birthday." />
        </div>

        <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          {err && <div style={{ color: 'var(--danger)', fontWeight: 500, flex: 1 }}>{IC.warn} {err}</div>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <button className="btn btn-big" onClick={() => setPage('home')}>Cancel</button>
            <button className="btn btn-primary btn-big" onClick={submit}>{IC.check}<span>Save Reservation</span></button>
          </div>
        </div>
      </div>

      {confirm && (
        <div className="dialog-bg open">
          <div className="dialog">
            <div className="confirm-body">
              <div className="confirm-icon ok">{IC.check}</div>
              <h2>Save this reservation?</h2>
              <p>
                <strong>{f.name}</strong> · {f.party} people<br/>
                {new Date(f.date).toDateString()}, {window.fmtHour(f.start)} to {window.fmtHour(f.start + f.duration)}<br/>
                For: {f.purpose}
              </p>
              <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-3)' }}>It will be saved as <strong>Pending</strong> until approved by the Kapitan.</p>
            </div>
            <div className="dialog-foot">
              <button className="btn" onClick={() => setConfirm(false)}>Go back</button>
              <button className="btn btn-primary" onClick={finalize}>Yes, save it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============ BOOKINGS LIST ============
const BookingsList = ({ reservations, openRes, setPage }) => {
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('all');
  const filtered = reservations.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [r.name, r.purpose, r.contact, r.id].some(v => v.toLowerCase().includes(s));
  }).sort((a,b) => b.date.localeCompare(a.date) || a.start - b.start);
  const counts = {
    all: reservations.length,
    pending: reservations.filter(r=>r.status==='pending').length,
    approved: reservations.filter(r=>r.status==='approved').length,
    completed: reservations.filter(r=>r.status==='completed').length,
    missed: reservations.filter(r=>r.status==='missed').length,
  };
  const labels = { all: 'All', pending: 'Waiting', approved: 'Approved', completed: 'Done', missed: 'Missed' };
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">All Bookings</h1>
          <div className="page-sub">Search any reservation, past or upcoming.</div>
          <div className="page-sub-fil">Lahat ng reserbasyon — nakaraan at paparating.</div>
        </div>
        <button className="btn btn-primary btn-big" onClick={() => setPage('new')}>{IC.plus}<span>New Reservation</span></button>
      </div>
      <div className="card">
        <div className="bookings-toolbar">
          <div className="search-input">
            {IC.search}
            <input className="input" placeholder="Search by name, purpose, or phone number…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="filter-tabs">
            {Object.keys(counts).map(k => (
              <button key={k} className={`filter-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
                {labels[k]} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[k]})</span>
              </button>
            ))}
          </div>
        </div>
        <table className="book-table">
          <thead>
            <tr>
              <th>Name</th><th>Purpose</th><th>Date</th><th>Time</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="clickable" onClick={() => openRes(r)}>
                <td><strong>{r.name}</strong><div style={{ color: 'var(--ink-3)', fontSize: 14 }}>{r.contact}</div></td>
                <td style={{ color: 'var(--ink-2)' }}>{r.purpose}</td>
                <td>{new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>{window.fmtHour(r.start)} – {window.fmtHour(r.end)}</td>
                <td><span className={`pill ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)', fontSize: 17 }}>No bookings match your search.<br/><small style={{ fontSize: 14 }}>Walang natagpuan.</small></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ============ SUMMARY (simple, printable) ============
const Summary = ({ reservations }) => {
  const total = reservations.length;
  const hours = reservations.reduce((s,r) => s + (r.end - r.start), 0);
  const pending = reservations.filter(r => r.status === 'pending').length;
  const approved = reservations.filter(r => r.status === 'approved').length;
  const missed = reservations.filter(r => r.status === 'missed').length;
  const done = reservations.filter(r => r.status === 'completed').length;

  // group by name
  const byName = {};
  reservations.forEach(r => { byName[r.name] = (byName[r.name] || 0) + (r.end - r.start); });
  const top = Object.entries(byName).sort((a,b) => b[1] - a[1]).slice(0, 6);

  // morning / afternoon / evening
  const timeOfDay = { Morning: 0, Afternoon: 0, Evening: 0 };
  reservations.forEach(r => {
    if (r.start < 12) timeOfDay.Morning += (r.end - r.start);
    else if (r.start < 17) timeOfDay.Afternoon += (r.end - r.start);
    else timeOfDay.Evening += (r.end - r.start);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Summary</h1>
          <div className="page-sub">A simple monthly report you can show to the Kapitan.</div>
          <div className="page-sub-fil">Simpleng buod na pwedeng ipakita sa Kapitan.</div>
        </div>
        <button className="btn btn-big" onClick={() => window.print()}>{IC.print}<span>Print</span></button>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="s-label">Total reservations<small>Kabuuang bilang</small></div>
          <div className="s-value">{total}</div>
          <div className="s-note">This month, across all groups</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Court hours booked<small>Oras na ginamit</small></div>
          <div className="s-value">{hours}<span style={{ fontSize: 24, color: 'var(--ink-3)', marginLeft: 6 }}>hrs</span></div>
          <div className="s-note">Out of 240 possible hours</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Did not show up<small>Hindi sumipot</small></div>
          <div className="s-value" style={{ color: 'var(--danger)' }}>{missed}</div>
          <div className="s-note">Groups that missed their reservation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Status breakdown</div></div>
          <div className="card-body">
            {[
              { k: 'Waiting for approval', v: pending, c: 'var(--warning)' },
              { k: 'Approved', v: approved, c: 'var(--success)' },
              { k: 'Done', v: done, c: 'var(--primary)' },
              { k: 'Missed', v: missed, c: 'var(--danger)' },
            ].map(s => {
              const pct = total ? (s.v / total) * 100 : 0;
              return (
                <div key={s.k} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 15 }}>
                    <span>{s.k}</span><strong>{s.v}</strong>
                  </div>
                  <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.c, borderRadius: 5 }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">When is the court used most?</div></div>
          <div className="card-body">
            {Object.entries(timeOfDay).map(([k, v]) => {
              const max = Math.max(...Object.values(timeOfDay), 1);
              return (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 15 }}>
                    <span>{k} {k === 'Morning' ? '(6am–12nn)' : k === 'Afternoon' ? '(12nn–5pm)' : '(5pm–10pm)'}</span>
                    <strong>{v} hrs</strong>
                  </div>
                  <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(v/max)*100}%`, background: 'var(--primary)', borderRadius: 5 }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 16, padding: 14, background: 'var(--primary-softer)', borderRadius: 10, fontSize: 15, color: 'var(--ink-2)' }}>
              <strong>Evenings are busiest.</strong> Most groups book after 5pm when work and school are done.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head"><div className="card-title">Groups who use the court most</div></div>
        <div>
          {top.map(([name, hrs], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 600 }}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{name}</div>
              </div>
              <div style={{ fontSize: 17, color: 'var(--primary)', fontWeight: 600 }}>{hrs} hours</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ============ DETAIL DIALOG ============
const DetailDialog = ({ r, onClose, onAction }) => {
  const [confirm, setConfirm] = React.useState(null);
  if (!r) return null;
  const doAction = (action) => {
    setConfirm(null);
    onAction(r, action);
  };
  const actionLabels = {
    approve: { title: 'Approve this reservation?', body: `Approve ${r.name}'s booking on ${window.fmtLongDate(new Date(r.date))}?`, btn: 'Yes, approve', cls: 'btn-success', ic: 'ok' },
    reject: { title: 'Decline this request?', body: `Are you sure you want to decline ${r.name}'s request?`, btn: 'Yes, decline', cls: 'btn-danger', ic: 'danger' },
    miss: { title: 'Mark as missed?', body: `${r.name} did not show up for their reservation?`, btn: 'Yes, mark as missed', cls: 'btn-danger', ic: 'warn' },
    complete: { title: 'Mark as done?', body: `${r.name}'s reservation is finished?`, btn: 'Yes, mark as done', cls: 'btn-primary', ic: 'ok' },
  };
  return (
    <div className={`dialog-bg open`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <h2>{r.name}</h2>
            <div className="d-sub">{r.purpose}</div>
          </div>
          <button className="dialog-close" onClick={onClose}>{IC.x}</button>
        </div>
        <div className="dialog-body">
          <div style={{ marginBottom: 20 }}>
            <span className={`pill ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
          </div>
          <dl className="detail-grid">
            <div className="detail-row"><dt>Date</dt><dd>{window.fmtLongDate(new Date(r.date))}</dd></div>
            <div className="detail-row"><dt>Time</dt><dd>{window.fmtHour(r.start)} – {window.fmtHour(r.end)} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({r.end - r.start} hour{r.end-r.start!==1?'s':''})</span></dd></div>
            <div className="detail-row"><dt>People</dt><dd>{r.party}</dd></div>
            <div className="detail-row"><dt>Contact</dt><dd>{r.contact}</dd></div>
            <div className="detail-row"><dt>Approved by</dt><dd>{r.approvedBy || <em style={{ color: 'var(--ink-3)' }}>Not yet</em>}</dd></div>
            {r.notes && <div className="detail-row"><dt>Notes</dt><dd>{r.notes}</dd></div>}
          </dl>
        </div>
        <div className="dialog-foot">
          {r.status === 'pending' && <>
            <button className="btn btn-danger" onClick={() => setConfirm('reject')}>{IC.x}<span>Decline</span></button>
            <button className="btn btn-success" onClick={() => setConfirm('approve')}>{IC.check}<span>Approve</span></button>
          </>}
          {r.status === 'approved' && <>
            <button className="btn btn-danger" onClick={() => setConfirm('miss')}>Did not show up</button>
            <button className="btn btn-primary" onClick={() => setConfirm('complete')}>Mark as done</button>
          </>}
          {(r.status === 'completed' || r.status === 'missed') && (
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          )}
        </div>
      </div>

      {confirm && (
        <div className="dialog-bg open" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="dialog" style={{ maxWidth: 480 }}>
            <div className="confirm-body">
              <div className={`confirm-icon ${actionLabels[confirm].ic}`}>{confirm === 'approve' || confirm === 'complete' ? IC.check : IC.warn}</div>
              <h2>{actionLabels[confirm].title}</h2>
              <p>{actionLabels[confirm].body}</p>
            </div>
            <div className="dialog-foot">
              <button className="btn" onClick={() => setConfirm(null)}>Go back</button>
              <button className={`btn ${actionLabels[confirm].cls}`} onClick={() => doAction(confirm)}>{actionLabels[confirm].btn}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { StaffLogin, StaffShell: Shell, StaffHome: Home, StaffCal: CalendarScreen, StaffNew: NewRes, StaffList: BookingsList, StaffSummary: Summary, StaffDetail: DetailDialog, IC });
