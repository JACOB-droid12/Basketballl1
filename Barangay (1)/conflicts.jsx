// Conflicts & missed handling screen
const ConflictsScreen = ({ reservations, openReservation, setPage }) => {
  const today = window.fmtDate(window.TODAY);
  const missed = reservations.filter(r => r.status === 'missed');

  // Detect overlaps
  const conflicts = [];
  const byDate = {};
  reservations.filter(r => r.status !== 'missed').forEach(r => {
    (byDate[r.date] = byDate[r.date] || []).push(r);
  });
  Object.values(byDate).forEach(arr => {
    arr.sort((a,b) => a.start - b.start);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i+1; j < arr.length; j++) {
        if (arr[i].end > arr[j].start && arr[i].start < arr[j].end) {
          conflicts.push([arr[i], arr[j]]);
        }
      }
    }
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">EXCEPTIONS · CONFLICTS &amp; MISSED</div>
          <h1 className="page-title">Needs your attention</h1>
          <div className="page-subtitle">Overlapping requests, missed bookings, and nearest-slot suggestions.</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat">
          <div className="stat-mark" style={{ background: 'var(--warning-soft)', color: 'oklch(0.48 0.15 75)' }}>{window.icons.alert}</div>
          <div className="stat-label">Active conflicts</div>
          <div className="stat-value">{conflicts.length}</div>
          <div className="stat-sub">unresolved overlaps</div>
        </div>
        <div className="stat">
          <div className="stat-mark" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{window.icons.x}</div>
          <div className="stat-label">Missed this month</div>
          <div className="stat-value">{missed.length}</div>
          <div className="stat-sub">groups that did not show up</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.sparkle}</div>
          <div className="stat-label">Slots reclaimed</div>
          <div className="stat-value">{missed.reduce((s,r) => s + (r.end - r.start), 0)}h</div>
          <div className="stat-sub">from missed bookings</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Scheduling conflicts</div></div>
          {conflicts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center' }}>{window.icons.check}</div>
              <strong>No conflicts detected.</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>All active reservations are non-overlapping.</div>
            </div>
          ) : conflicts.map(([a, b], i) => (
            <div key={i} style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                {a.date} · overlap detected
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
                <div className="res-block approved" style={{ cursor: 'pointer' }} onClick={() => openReservation(a)}>
                  <div className="res-title">{a.name}</div>
                  <div className="res-meta">{window.fmtHourCompact(a.start)}–{window.fmtHourCompact(a.end)}</div>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)' }}>vs</div>
                <div className="res-block pending" style={{ cursor: 'pointer' }} onClick={() => openReservation(b)}>
                  <div className="res-title">{b.name}</div>
                  <div className="res-meta">{window.fmtHourCompact(b.start)}–{window.fmtHourCompact(b.end)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Missed reservations</div></div>
          {missed.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No missed reservations.</div>}
          {missed.map(r => (
            <div key={r.id} style={{ padding: 14, borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => openReservation(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{r.name}</strong>
                <span className="badge missed">Missed</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                {r.date} · {window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)}
              </div>
              {r.notes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6 }}>{r.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

window.ConflictsScreen = ConflictsScreen;
