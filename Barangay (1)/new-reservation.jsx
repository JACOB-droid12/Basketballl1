// New reservation form + conflict handling
const NewReservation = ({ reservations, onCreate, setPage, prefill }) => {
  const [form, setForm] = React.useState(() => ({
    name: prefill?.name || '',
    purpose: prefill?.purpose || '',
    contact: prefill?.contact || '',
    party: prefill?.party || 10,
    date: prefill?.date || window.fmtDate(window.TODAY),
    start: prefill?.start || 10,
    end: prefill?.end || 12,
    notes: prefill?.notes || '',
  }));
  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Find conflict for the chosen date/time
  const conflict = reservations.find(r =>
    r.date === form.date &&
    r.status !== 'missed' &&
    !(r.end <= form.start || r.start >= form.end)
  );

  // Compute suggested nearest slots for that date
  const dayRes = reservations.filter(r => r.date === form.date && r.status !== 'missed').sort((a,b) => a.start - b.start);
  const suggestions = [];
  let cursor = 6;
  const dur = form.end - form.start;
  for (const r of dayRes) {
    if (r.start - cursor >= dur) suggestions.push({ start: cursor, end: cursor + dur });
    cursor = Math.max(cursor, r.end);
  }
  if (22 - cursor >= dur) suggestions.push({ start: cursor, end: cursor + dur });

  const valid = form.name.trim() && form.purpose.trim() && form.contact.trim() && form.start < form.end;

  const submit = () => {
    if (!valid) { setError('Please complete all required fields.'); return; }
    if (conflict) { setError('Resolve the scheduling conflict before submitting.'); return; }
    onCreate({ ...form, id: 'R-' + (2060 + Math.floor(Math.random()*100)), status: 'pending', approvedBy: null });
    setStep(3);
  };

  // time slot chips for chosen date
  const slotChips = window.HOURS.slice(0, -1).map(h => {
    const busy = dayRes.some(r => r.start <= h && r.end > h);
    return { h, busy };
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">WALK-IN REQUEST · ENCODE</div>
          <h1 className="page-title">New reservation</h1>
          <div className="page-subtitle">Encode a walk-in request brought by a resident at the barangay office.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setPage('dashboard')}>Cancel</button>
        </div>
      </div>

      {step !== 3 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {['Requester', 'Schedule', 'Review'].map((label, i) => {
            const n = i + 1;
            return (
              <div key={n} style={{
                padding: '6px 12px',
                borderRadius: 100,
                background: step === n ? 'var(--primary)' : step > n ? 'var(--primary-softer)' : 'var(--surface-2)',
                color: step === n ? 'var(--primary-ink)' : step > n ? 'var(--primary)' : 'var(--ink-3)',
                border: '1px solid ' + (step >= n ? 'var(--primary-soft)' : 'var(--border)'),
                letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500,
              }}>
                {n}. {label}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div className="card">
          <div className="card-body">
            {step === 1 && (
              <div className="form-grid">
                <div className="form-field full">
                  <label className="form-label">Requester name / group <span className="req">*</span></label>
                  <input className="input" placeholder="e.g. Liga ng Kabataan, Rodriguez Family" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-field full">
                  <label className="form-label">Purpose <span className="req">*</span></label>
                  <input className="input" placeholder="e.g. Practice, league game, birthday party" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Contact number <span className="req">*</span></label>
                  <div className="input-prefixed">
                    {window.icons.phone}
                    <input className="input" placeholder="0917-XXX-XXXX" value={form.contact} onChange={e => set('contact', e.target.value)} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Party size <span className="req">*</span></label>
                  <div className="input-prefixed">
                    {window.icons.users}
                    <input className="input" type="number" min="1" value={form.party} onChange={e => set('party', +e.target.value)} />
                  </div>
                </div>
                <div className="form-field full">
                  <label className="form-label">Notes <span className="hint">optional</span></label>
                  <textarea className="textarea" placeholder="Special arrangements, equipment needed, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="form-grid" style={{ marginBottom: 18 }}>
                  <div className="form-field">
                    <label className="form-label">Date <span className="req">*</span></label>
                    <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Duration</label>
                    <select className="select" value={form.end - form.start} onChange={e => set('end', form.start + +e.target.value)}>
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="3">3 hours</option>
                      <option value="4">4 hours</option>
                    </select>
                  </div>
                </div>

                <div className="form-label" style={{ marginBottom: 10 }}>Select start time <span className="req">*</span></div>
                <div className="slot-grid" style={{ marginBottom: 16 }}>
                  {slotChips.map(({h, busy}) => {
                    const wouldConflict = reservations.some(r =>
                      r.date === form.date && r.status !== 'missed' &&
                      !(r.end <= h || r.start >= h + (form.end - form.start))
                    );
                    const sel = form.start === h;
                    return (
                      <button key={h}
                              className={`slot-chip ${wouldConflict ? 'busy' : ''} ${sel ? 'selected' : ''}`}
                              disabled={wouldConflict && !sel}
                              onClick={() => setForm(f => ({ ...f, start: h, end: h + (f.end - f.start) }))}>
                        {window.fmtHourCompact(h)}
                      </button>
                    );
                  })}
                </div>

                {conflict && (
                  <div className="conflict-box">
                    <div className="ic">{window.icons.alert}</div>
                    <div style={{ flex: 1 }}>
                      <h4>Scheduling conflict detected</h4>
                      <p>This slot overlaps with <strong>{conflict.name}</strong> ({window.fmtHourCompact(conflict.start)}–{window.fmtHourCompact(conflict.end)}). Per system rules, we recommend the nearest available slot:</p>
                      <div className="suggest">
                        {suggestions.slice(0,3).map((s, i) => (
                          <button key={i} className="btn btn-sm"
                                  onClick={() => setForm(f => ({ ...f, start: s.start, end: s.end }))}>
                            {window.icons.sparkle} {window.fmtHourCompact(s.start)}–{window.fmtHourCompact(s.end)}
                          </button>
                        ))}
                        {suggestions.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No available slots today — try another date or mark as Missed if the resident can't wait.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign:'center', padding: '32px 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                  {window.icons.check}
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: '0 0 6px' }}>Request submitted</h2>
                <p style={{ color: 'var(--ink-3)', maxWidth: 420, margin: '0 auto 20px' }}>
                  Reservation for <strong>{form.name}</strong> on {form.date}, {window.fmtHourCompact(form.start)}–{window.fmtHourCompact(form.end)} has been logged as <strong>pending</strong>. Awaiting approval from Kap. Mendoza.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn" onClick={() => { setStep(1); setForm(f => ({...f, name:'', purpose:'', contact:'', party: 10, notes: ''})); }}>Encode another</button>
                  <button className="btn btn-primary" onClick={() => setPage('list')}>Go to reservations</button>
                </div>
              </div>
            )}
          </div>
          {step !== 3 && (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
              {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
              <div style={{ marginLeft: 'auto', display:'flex', gap: 8 }}>
                {step > 1 && <button className="btn" onClick={() => { setStep(step - 1); setError(null); }}>Back</button>}
                {step < 2 && <button className="btn btn-primary" onClick={() => { if (!form.name || !form.purpose || !form.contact) { setError('Please fill all required fields.'); return; } setError(null); setStep(2); }}>Continue</button>}
                {step === 2 && <button className="btn btn-primary" onClick={submit}>Submit request</button>}
              </div>
            </div>
          )}
        </div>

        {step !== 3 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Live preview</div></div>
            <div className="card-body">
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform:'uppercase', marginBottom: 10 }}>Reservation card</div>
              <div className={`res-block ${conflict ? 'pending' : 'approved'}`} style={{ position: 'relative', minHeight: 90 }}>
                <div className="res-title">{form.name || 'Requester name'}</div>
                <div className="res-meta">{window.fmtHourCompact(form.start)}–{window.fmtHourCompact(form.end)} · {form.party} ppl</div>
                <div style={{ fontSize: 12, marginTop: 6, color: 'var(--ink-2)' }}>{form.purpose || <em style={{ color: 'var(--ink-4)' }}>Purpose…</em>}</div>
              </div>
              <dl className="kv" style={{ marginTop: 16 }}>
                <dt>Date</dt><dd>{form.date}</dd>
                <dt>Time</dt><dd>{window.fmtHourCompact(form.start)}–{window.fmtHourCompact(form.end)} ({form.end - form.start}h)</dd>
                <dt>Contact</dt><dd>{form.contact || '—'}</dd>
                <dt>Party</dt><dd>{form.party} people</dd>
                <dt>Status</dt><dd><span className={`badge ${conflict ? 'pending' : 'pending'}`}>Pending approval</span></dd>
              </dl>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
                {window.icons.info}
                <div>All walk-in requests are saved as <strong>pending</strong> until a barangay official approves.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

window.NewReservation = NewReservation;
