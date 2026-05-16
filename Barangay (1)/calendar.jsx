// Calendar — week view with day nav
const Calendar = ({ reservations, openReservation, setPage }) => {
  const [anchor, setAnchor] = React.useState(new Date(window.TODAY));

  // Week start = Sunday of anchor's week
  const weekStart = React.useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0,0,0,0);
    return d;
  }, [anchor]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const move = (n) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + n * 7);
    setAnchor(d);
  };
  const goToday = () => setAnchor(new Date(window.TODAY));

  const todayKey = window.fmtDate(window.TODAY);
  const weekLabel = `${window.MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} — ${window.MONTH_NAMES[days[6].getMonth()]} ${days[6].getDate()}, ${days[6].getFullYear()}`;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">CALENDAR · WEEK VIEW</div>
          <h1 className="page-title">{weekLabel}</h1>
          <div className="page-subtitle">Basketball court · Barangay Sto. Niño</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-sm" onClick={() => move(-1)}>{window.icons.chevronL}</button>
          <button className="btn btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-sm" onClick={() => move(1)}>{window.icons.chevronR}</button>
          <span style={{ width: 12 }}/>
          <button className="btn btn-primary" onClick={() => setPage('new')}>{window.icons.plus} New</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="cal-head">
          <div></div>
          {days.map((d) => {
            const isToday = window.fmtDate(d) === todayKey;
            return (
              <div key={d.toISOString()} className={`day ${isToday ? 'today' : ''}`}>
                <div className="day-name">{window.DAYS_OF_WEEK[d.getDay()]}</div>
                <div className="day-num">{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="cal-grid">
          {window.HOURS.map((h) => (
            <React.Fragment key={h}>
              <div className="hour-label">{window.fmtHourCompact(h)}</div>
              {days.map((d) => {
                const key = window.fmtDate(d);
                const isToday = key === todayKey;
                const ev = reservations.find(r => r.date === key && r.start === h);
                return (
                  <div key={key + h} className={`cell ${isToday ? 'today' : ''}`}>
                    {ev && (
                      <div className={`cal-event ${ev.status}`}
                           style={{ top: 2, height: (ev.end - ev.start) * 56 - 4 }}
                           onClick={() => openReservation(ev)}>
                        <div className="t">{window.fmtHourCompact(ev.start)}–{window.fmtHourCompact(ev.end)}</div>
                        <div style={{ fontWeight: 600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</div>
                        {(ev.end - ev.start) > 1 && <div style={{ fontSize: 10, opacity: 0.75, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.purpose}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

window.Calendar = Calendar;
