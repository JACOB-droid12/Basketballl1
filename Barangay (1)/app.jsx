// Main app
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "navy",
  "density": "comfortable",
  "language": "en"
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  navy:   'oklch(0.42 0.12 250)',
  slate:  'oklch(0.42 0.05 240)',
  forest: 'oklch(0.42 0.1 160)',
  clay:   'oklch(0.52 0.13 35)',
  violet: 'oklch(0.48 0.14 290)',
};

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(() => localStorage.getItem('brgy_page') || 'dashboard');
  const [reservations, setReservations] = useState(window.SEED_RESERVATIONS);
  const [activeRes, setActiveRes] = useState(null);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => localStorage.setItem('brgy_page', page), [page]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-density', settings.density);
    document.documentElement.style.setProperty('--primary', ACCENT_MAP[settings.accent] || ACCENT_MAP.navy);
  }, [settings]);

  // Tweaks bridge
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateSettings = (updater) => {
    setSettings(s => {
      const next = typeof updater === 'function' ? updater(s) : updater;
      const edits = {};
      Object.keys(next).forEach(k => { if (s[k] !== next[k]) edits[k] = next[k]; });
      if (Object.keys(edits).length) window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
      return next;
    });
  };

  const openReservation = (r) => setActiveRes(r);
  const closeDrawer = () => setActiveRes(null);

  const showToast = (msg, icon) => {
    setToast({ msg, icon, key: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const onAction = (r, action) => {
    const labels = { approve: 'approved', reject: 'declined', miss: 'marked missed', complete: 'completed' };
    const statusMap = { approve: 'approved', reject: 'missed', miss: 'missed', complete: 'completed' };
    setReservations(list => list.map(x => x.id === r.id ? { ...x, status: statusMap[action], approvedBy: action === 'approve' ? 'Sec. L. Dizon' : x.approvedBy } : x));
    setActiveRes(null);
    showToast(`Reservation ${r.id} ${labels[action]}.`, action === 'approve' ? window.icons.check : window.icons.info);
  };

  const onCreate = (res) => {
    setReservations(list => [res, ...list]);
    showToast(`Reservation ${res.id} submitted.`, window.icons.check);
  };

  if (!user) return <window.LoginScreen onLogin={setUser} />;

  return (
    <>
      <window.Shell user={user} page={page} setPage={(p) => { setPage(p); closeDrawer(); }} onLogout={() => setUser(null)} reservations={reservations}>
        {page === 'dashboard' && <window.Dashboard reservations={reservations} openReservation={openReservation} setPage={setPage} />}
        {page === 'calendar' && <window.Calendar reservations={reservations} openReservation={openReservation} setPage={setPage} />}
        {page === 'new' && <window.NewReservation reservations={reservations} onCreate={onCreate} setPage={setPage} />}
        {page === 'list' && <window.ReservationsList reservations={reservations} openReservation={openReservation} setPage={setPage} />}
        {page === 'conflicts' && <window.ConflictsScreen reservations={reservations} openReservation={openReservation} setPage={setPage} />}
        {page === 'reports' && <window.Reports reservations={reservations} />}
      </window.Shell>
      <window.Drawer reservation={activeRes} onClose={closeDrawer} onAction={onAction} />
      <window.TweaksPanel visible={tweaksOpen} settings={settings} setSettings={updateSettings} onClose={() => setTweaksOpen(false)} />
      {toast && (
        <div className="toast" key={toast.key}>
          {toast.icon}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
