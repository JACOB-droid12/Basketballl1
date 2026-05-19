// Dashboard — today view
const Dashboard = ({ reservations, openReservation, setPage }) => {
  const today = window.fmtDate(window.TODAY);
  const todays = reservations.filter(r => r.date === today).sort((a,b) => a.start - b.start);
  const upcoming = reservations.filter(r => r.date > today && r.status !== 'missed').sort((a,b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 5);

  const total = reservations.length;
  const approved = reservations.filter(r => r.status === 'approved').length;
  const pending = reservations.filter(r => r.status === 'pending').length;
  const utilization = Math.round((todays.reduce((s,r) => s + (r.end - r.start), 0) / 16) * 100);

  // current hour for "now" indicator
  const now = new Date();
  const nowHr = now.getHours() + now.getMinutes()/60;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">OVERVIEW · {window.fmtLongDate(window.TODAY).toUpperCase()}</div>
          <h1 className="page-title">Today at the court</h1>
          <div className="page-subtitle">{todays.length} reservation{todays.length !== 1 ? 's' : ''} scheduled · {pending} awaiting approval</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setPage('calendar')}>{window.icons.calendar} Open calendar</button>
          <button className="btn btn-primary" onClick={() => setPage('new')}>{window.icons.plus} New reservation</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-mark">{window.icons.calendar}</div>
          <div className="stat-label">Today</div>
          <div className="stat-value">{todays.length}</div>
          <div className="stat-sub">of 8 max slots</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.clock}</div>
          <div className="stat-label">Utilization</div>
          <div className="stat-value">{utilization}<span style={{ fontSize: 22, color: 'var(--ink-3)' }}>%</span></div>
          <div className="stat-sub"><span className="trend-up">▲ 8%</span> vs. last Sat</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.bell}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pending}</div>
          <div className="stat-sub">awaiting Kap. approval</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.users}</div>
          <div className="stat-label">Approved this week</div>
          <div className="stat-value">{approved}</div>
          <div className="stat-sub">across {total} total records</div>
        </div>
      </div>

      <div className="today-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's timeline</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>6:00 AM — 10:00 PM · Tap a block to manage</div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-3)' }}>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--primary-soft)', borderLeft:'3px solid var(--primary)', marginRight:4, verticalAlign:'-1px'}}/>Approved</span>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--warning-soft)', borderLeft:'3px solid var(--warning)', marginRight:4, verticalAlign:'-1px'}}/>Pending</span>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--danger-soft)', borderLeft:'3px solid var(--danger)', marginRight:4, verticalAlign:'-1px'}}/>Missed</span>
            </div>
          </div>
          <div style={{ padding: '8px 18px 18px', position: 'relative' }}>
            <div className="timeline">
              {window.HOURS.map(h => {
                const reses = todays.filter(r => r.start <= h && r.end > h);
                return (
                  <div key={h} className="timeline-row">
                    <div className="timeline-hour">{window.fmtHourCompact(h)}</div>
                    <div className="timeline-slot">
                      {reses.map(r => r.start === h && (
                        <div key={r.id}
                             className={`res-block ${r.status}`}
                             style={{ height: `calc(${r.end - r.start} * var(--row-h) - 4px)` }}
                             onClick={() => openReservation(r)}>
                          <div className="res-title">{r.name}</div>
                          <div className="res-meta">{window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)} · {r.party} ppl</div>
                          {r.status === 'pending' && <div style={{ position: 'absolute', top: 8, right: 8 }}><span className="badge pending">Pending</span></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {nowHr >= 6 && nowHr <= 22 && (
                <div className="timeline-now" style={{ top: `${(nowHr - 6) * 40 + 8}px` }}>
                  <span className="timeline-now-label">NOW</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pending approvals</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setPage('list')}>View all</button>
            </div>
            <div>
              {reservations.filter(r => r.status === 'pending').slice(0,3).map(r => (
                <div key={r.id} style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => openReservation(r)}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13 }}>{r.name}</strong>
                    <span className="badge pending">Pending</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {r.date === today ? 'Today' : r.date} · {window.fmtHourCompact(r.start)}–{window.fmtHourCompact(r.end)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{r.purpose}</div>
                </div>
              ))}
              {pending === 0 && <div style={{ padding: 24, textAlign:'center', color:'var(--ink-3)', fontSize: 13 }}>No pending requests.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Upcoming this week</div>
            </div>
            <div>
              {upcoming.map(r => (
                <div key={r.id} style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => openReservation(r)}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', width: 70 }}>
                    {new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}<br/>
                    {window.fmtHourCompact(r.start)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.party} people</div>
                  </div>
                  <span className={`badge ${r.status}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

window.Dashboard = Dashboard;
