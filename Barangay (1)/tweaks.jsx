// Tweaks panel
const TweaksPanel = ({ visible, settings, setSettings, onClose }) => {
  if (!visible) return null;
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const accents = [
    { id: 'navy', label: 'Navy', color: 'oklch(0.42 0.12 250)' },
    { id: 'slate', label: 'Slate', color: 'oklch(0.42 0.05 240)' },
    { id: 'forest', label: 'Forest', color: 'oklch(0.42 0.1 160)' },
    { id: 'clay', label: 'Clay', color: 'oklch(0.52 0.13 35)' },
    { id: 'violet', label: 'Violet', color: 'oklch(0.48 0.14 290)' },
  ];

  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <strong>Tweaks</strong>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{window.icons.x}</button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Theme</label>
          <div className="tweak-seg">
            <button className={settings.theme === 'light' ? 'on' : ''} onClick={() => set('theme', 'light')}>Light</button>
            <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => set('theme', 'dark')}>Dark</button>
          </div>
        </div>
        <div className="tweak-row">
          <label>Accent</label>
          <div className="tweak-swatches">
            {accents.map(a => (
              <button key={a.id} className={settings.accent === a.id ? 'on' : ''} style={{ background: a.color }} onClick={() => set('accent', a.id)} title={a.label}/>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Density</label>
          <div className="tweak-seg">
            <button className={settings.density === 'comfortable' ? 'on' : ''} onClick={() => set('density', 'comfortable')}>Comfortable</button>
            <button className={settings.density === 'compact' ? 'on' : ''} onClick={() => set('density', 'compact')}>Compact</button>
          </div>
        </div>
        <div className="tweak-row">
          <label>Language</label>
          <div className="tweak-seg">
            <button className={settings.language === 'en' ? 'on' : ''} onClick={() => set('language', 'en')}>English</button>
            <button className={settings.language === 'fil' ? 'on' : ''} onClick={() => set('language', 'fil')}>Filipino</button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.TweaksPanel = TweaksPanel;
