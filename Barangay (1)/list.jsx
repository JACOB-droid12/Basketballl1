// Reservations list with search & filters
const ReservationsList = ({ reservations, openReservation, setPage }) => {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  const filtered = reservations.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.name, r.purpose, r.id, r.contact].some(v => v.toLowerCase().includes(q));
  }).sort((a, b) => b.date.localeCompare(a.date) || a.start - b.start);

  const counts = {
    all: reservations.length,
    approved: reservations.filter(r => r.status === 'approved').length,
    pending: reservations.filter(r => r.status === 'pending').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    missed: reservations.filter(r => r.status === 'missed').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">RECORDS · ALL RESERVATIONS</div>
          <h1 className="page-title">Reservations</h1>
          <div className="page-subtitle">Searchable record of every court booking — past and upcoming.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">{window.icons.download} Export CSV</button>
          <button className="btn btn-primary" onClick={() => setPage('new')}>{window.icons.plus} New</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems:'center' }}>
          <div className="input-prefixed" style={{ flex: 1, maxWidth: 420 }}>
            {window.icons.search}
            <input className="input" placeholder="Search by group, purpose, contact, or ID…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'pending', 'approved', 'completed', 'missed'].map(f => (
              <button key={f}
                      className={`btn btn-sm ${filter === f ? '' : 'btn-ghost'}`}
                      style={filter === f ? { background: 'var(--primary-softer)', color: 'var(--primary)', borderColor: 'var(--primary-soft)'} : {}}
                      onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)} <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 88 }}>ID</th>
              <th>Requester</th>
              <th>Purpose</th>
              <th style={{ width: 140 }}>Date</th>
              <th style={{ width: 120 }}>Time</th>
              <th style={{ width: 60 }}>Party</th>
              <th style={{ width: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="clickable" onClick={() => openReservation(r)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{r.id}</td>
                <td><strong>{r.name}</strong><div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{r.contact}</div></td>
                <td style={{ color: 'var(--ink-2)' }}>{r.purpose}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.party}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign:'center', padding: 40, color:'var(--ink-3)' }}>No reservations match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

window.ReservationsList = ReservationsList;
