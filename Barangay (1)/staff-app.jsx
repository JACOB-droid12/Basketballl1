// Staff-friendly app shell
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "warm",
  "density": "comfortable"
}/*EDITMODE-END*/;

function StaffApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(() => localStorage.getItem('brgy_staff_page') || 'home');
  const [reservations, setReservations] = useState(window.SEED_RESERVATIONS);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [settings, setSettings] = useState(TWEAK_DEFAULTS);

  useEffect(() => localStorage.setItem('brgy_staff_page', page), [page]);

  useEffect(() => {
    const h = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', h);
  }, []);

  const openRes = (r) => setActive(r);

  const showToast = (msg) => {
    setToast({ msg, key: Date.now() });
    setTimeout(() => setToast(null), 3200);
  };

  const onAction = (r, action) => {
    const labels = { approve: 'approved', reject: 'declined', miss: 'marked as missed', complete: 'marked as done' };
    const statusMap = { approve: 'approved', reject: 'missed', miss: 'missed', complete: 'completed' };
    setReservations(list => list.map(x => x.id === r.id ? { ...x, status: statusMap[action], approvedBy: action === 'approve' ? 'Ms. Liza Dizon' : x.approvedBy } : x));
    setActive(null);
    showToast(`Reservation for ${r.name} ${labels[action]}.`);
  };

  const onCreate = (res) => {
    setReservations(list => [res, ...list]);
    showToast(`Reservation for ${res.name} saved as pending.`);
  };

  if (!user) return <window.StaffLogin onLogin={setUser} />;

  return (
    <>
      <window.StaffShell user={user} page={page} setPage={(p) => { setPage(p); setActive(null); }} onLogout={() => setUser(null)} reservations={reservations}>
        {page === 'home'     && <window.StaffHome reservations={reservations} openRes={openRes} setPage={setPage} />}
        {page === 'calendar' && <window.StaffCal  reservations={reservations} openRes={openRes} setPage={setPage} />}
        {page === 'new'      && <window.StaffNew  reservations={reservations} onCreate={onCreate} setPage={setPage} />}
        {page === 'list'     && <window.StaffList reservations={reservations} openRes={openRes} setPage={setPage} />}
        {page === 'summary'  && <window.StaffSummary reservations={reservations} />}
      </window.StaffShell>
      {active && <window.StaffDetail r={active} onClose={() => setActive(null)} onAction={onAction} />}
      {toast && (
        <div className="toast" key={toast.key}>
          {window.IC.check}
          <span>{toast.msg}</span>
        </div>
      )}
      {tweaksOpen && (
        <div className="tweaks">
          <div className="tweaks-head">
            <strong>Tweaks</strong>
            <button className="btn" style={{ minHeight: 36, padding: '6px 10px' }} onClick={() => setTweaksOpen(false)}>{window.IC.x}</button>
          </div>
          <div className="tweaks-body">
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              This is the <strong>staff-friendly</strong> version. It uses larger type, plain bilingual labels, and confirmation dialogs for every important action — designed for barangay personnel who are not daily computer users.
            </div>
            <div style={{ fontSize: 13, padding: 12, background: 'var(--primary-softer)', borderRadius: 8, color: 'var(--ink-2)' }}>
              Compare with the original "Barangay Court Scheduling.html" to see the difference in density, language, and pacing.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StaffApp />);
