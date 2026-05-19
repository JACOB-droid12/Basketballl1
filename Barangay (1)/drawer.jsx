// Reservation detail drawer
const Drawer = ({ reservation, onClose, onAction }) => {
  const open = !!reservation;
  const r = reservation;

  return (
    <>
      <div className={`drawer-bg ${open ? 'open' : ''}`} onClick={onClose}/>
      <aside className={`drawer ${open ? 'open' : ''}`}>
        {r && (
          <>
            <div className="drawer-head">
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  RESERVATION · {r.id}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginTop: 2 }}>{r.name}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>{window.icons.x}</button>
            </div>
            <div className="drawer-body">
              <div style={{ marginBottom: 18 }}>
                <span className={`badge ${r.status}`}>{r.status}</span>
              </div>
              <div className={`res-block ${r.status}`} style={{ cursor: 'default', marginBottom: 18 }}>
                <div className="res-title">{r.purpose}</div>
                <div className="res-meta">{window.fmtLongDate(new Date(r.date))} · {window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)}</div>
              </div>
              <dl className="kv">
                <dt>Contact</dt><dd style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.contact}</dd>
                <dt>Party size</dt><dd>{r.party} people</dd>
                <dt>Date</dt><dd style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</dd>
                <dt>Time</dt><dd style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{window.fmtHour(r.start)} — {window.fmtHour(r.end)}</dd>
                <dt>Duration</dt><dd>{r.end - r.start} hour{r.end - r.start !== 1 ? 's' : ''}</dd>
                <dt>Approved by</dt><dd>{r.approvedBy || <em style={{ color: 'var(--ink-4)' }}>— not yet —</em>}</dd>
              </dl>
              {r.notes && (
                <div style={{ marginTop: 18, padding: 14, background: 'var(--surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display:'flex', gap: 6 }}>
                    {window.icons.note} Notes
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{r.notes}</div>
                </div>
              )}

              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Activity log</div>
                <div style={{ display: 'grid', gap: 10, fontSize: 12, color: 'var(--ink-2)' }}>
                  <div style={{ display:'flex', gap: 10 }}>
                    <div style={{ fontFamily:'var(--font-mono)', color:'var(--ink-4)', width: 70, flexShrink: 0 }}>08:12 AM</div>
                    <div>Request encoded by <strong>Sec. L. Dizon</strong></div>
                  </div>
                  {r.approvedBy && (
                    <div style={{ display:'flex', gap: 10 }}>
                      <div style={{ fontFamily:'var(--font-mono)', color:'var(--ink-4)', width: 70, flexShrink: 0 }}>08:34 AM</div>
                      <div>Approved by <strong>{r.approvedBy}</strong></div>
                    </div>
                  )}
                  {r.status === 'missed' && (
                    <div style={{ display:'flex', gap: 10 }}>
                      <div style={{ fontFamily:'var(--font-mono)', color:'var(--ink-4)', width: 70, flexShrink: 0 }}>14:15 PM</div>
                      <div style={{ color: 'var(--danger)' }}>Marked <strong>missed</strong> — group did not show up</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="drawer-foot">
              {r.status === 'pending' && (
                <>
                  <button className="btn" onClick={() => onAction(r, 'reject')}>{window.icons.x} Decline</button>
                  <button className="btn btn-primary" onClick={() => onAction(r, 'approve')}>{window.icons.check} Approve</button>
                </>
              )}
              {r.status === 'approved' && (
                <>
                  <button className="btn" onClick={() => onAction(r, 'miss')}>Mark as missed</button>
                  <button className="btn btn-primary" onClick={() => onAction(r, 'complete')}>Mark as complete</button>
                </>
              )}
              {(r.status === 'missed' || r.status === 'completed') && (
                <button className="btn" onClick={onClose}>Close</button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
};

window.Drawer = Drawer;
