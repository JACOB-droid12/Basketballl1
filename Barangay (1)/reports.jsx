// Reports & utilization screen
const Reports = ({ reservations }) => {
  // Utilization by hour (across all dates)
  const hourCounts = window.HOURS.map(h => {
    return reservations.filter(r => r.status !== 'missed' && r.start <= h && r.end > h).length;
  });
  const maxHour = Math.max(...hourCounts, 1);

  // Purpose breakdown
  const purposeBuckets = { 'League / tournament': 0, 'Practice / training': 0, 'School / PE': 0, 'Community event': 0, 'Family / private': 0, 'Other': 0 };
  reservations.forEach(r => {
    const p = (r.purpose || '').toLowerCase();
    if (p.match(/league|tournament|finals|game|intramural/)) purposeBuckets['League / tournament']++;
    else if (p.match(/practice|training|drill/)) purposeBuckets['Practice / training']++;
    else if (p.match(/pe|school|class/)) purposeBuckets['School / PE']++;
    else if (p.match(/zumba|community|assembly|sunday|mother/)) purposeBuckets['Community event']++;
    else if (p.match(/family|birthday|reunion|wedding|friendly/)) purposeBuckets['Family / private']++;
    else purposeBuckets['Other']++;
  });
  const totalPurposes = Object.values(purposeBuckets).reduce((a,b)=>a+b, 0);

  // Heat grid: day-of-week × hour → weighted intensity
  const heatHours = [7, 10, 13, 16, 19];
  const heat = heatHours.map(h => window.DAYS_OF_WEEK.map((_, di) => {
    const count = reservations.filter(r => {
      const d = new Date(r.date);
      return d.getDay() === di && r.start <= h && r.end > h && r.status !== 'missed';
    }).length;
    return Math.min(5, count + (h === 16 || h === 19 ? 1 : 0) + (di === 0 || di === 6 ? 1 : 0));
  }));

  // Top requesters
  const grouped = {};
  reservations.forEach(r => {
    grouped[r.name] = (grouped[r.name] || 0) + (r.end - r.start);
  });
  const topRequesters = Object.entries(grouped).sort((a,b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">INSIGHTS · UTILIZATION</div>
          <h1 className="page-title">Reports</h1>
          <div className="page-subtitle">How the court is being used — at a glance.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" style={{ width: 140 }}><option>Last 30 days</option><option>This month</option><option>All time</option></select>
          <button className="btn">{window.icons.download} Export</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-mark">{window.icons.calendar}</div>
          <div className="stat-label">Total reservations</div>
          <div className="stat-value">{reservations.length}</div>
          <div className="stat-sub"><span className="trend-up">▲ 12%</span> vs. previous period</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.clock}</div>
          <div className="stat-label">Court-hours booked</div>
          <div className="stat-value">{reservations.reduce((s,r)=>s+(r.end-r.start),0)}h</div>
          <div className="stat-sub">48% of maximum capacity</div>
        </div>
        <div className="stat">
          <div className="stat-mark" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{window.icons.x}</div>
          <div className="stat-label">No-show rate</div>
          <div className="stat-value">{Math.round(reservations.filter(r => r.status==='missed').length / reservations.length * 100)}<span style={{ fontSize: 22, color: 'var(--ink-3)' }}>%</span></div>
          <div className="stat-sub"><span className="trend-down">▼ 3%</span> vs. last month</div>
        </div>
        <div className="stat">
          <div className="stat-mark">{window.icons.users}</div>
          <div className="stat-label">Unique groups</div>
          <div className="stat-value">{Object.keys(grouped).length}</div>
          <div className="stat-sub">served by the court</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Demand by hour</div></div>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'flex-end', gap: 4, height: 180, padding: '8px 0' }}>
              {hourCounts.map((c, i) => (
                <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${(c / maxHour) * 150}px`,
                    minHeight: 4,
                    background: c === maxHour ? 'var(--primary)' : 'var(--primary-soft)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 300ms'
                  }}/>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, color:'var(--ink-4)' }}>{window.fmtHourCompact(window.HOURS[i])}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
              <strong>Peak hours:</strong> 5pm–7pm (after work/school) is the most in-demand window.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Reservation types</div></div>
          <div className="card-body">
            {Object.entries(purposeBuckets).map(([label, n]) => (
              <div key={label} className="bar-row">
                <div className="label">{label}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(n / totalPurposes) * 100}%` }}/></div>
                <div className="val">{n}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Heat map — usage by day & hour</div></div>
          <div className="card-body">
            <div className="heat-grid" style={{ marginBottom: 10 }}>
              <div></div>
              {window.DAYS_OF_WEEK.map(d => <div key={d} className="hlabel" style={{ textAlign:'center' }}>{d}</div>)}
              {heatHours.map((h, hi) => (
                <React.Fragment key={h}>
                  <div className="hlabel">{window.fmtHourCompact(h)}</div>
                  {heat[hi].map((v, di) => <div key={di} className="hcell" data-v={v} title={`${window.DAYS_OF_WEEK[di]} ${window.fmtHourCompact(h)}: ${v}/5`}/>)}
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', display:'flex', gap: 6, alignItems:'center', fontFamily:'var(--font-mono)' }}>
              less
              {[1,2,3,4,5].map(v => <div key={v} className="hcell" data-v={v} style={{ width: 14, height: 14 }}/>)}
              more
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Top requesters</div></div>
          <div className="card-body">
            {topRequesters.map(([name, hours], i) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap: 12, padding: '10px 0', borderBottom: i === topRequesters.length - 1 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)', width: 20 }}>{i+1}</div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-softer)', color: 'var(--primary)', display:'grid', placeItems:'center', fontWeight: 600, fontSize: 12 }}>
                  {name.split(' ').slice(0,2).map(w => w[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{hours} court-hours booked</div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{hours}h</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

window.Reports = Reports;
