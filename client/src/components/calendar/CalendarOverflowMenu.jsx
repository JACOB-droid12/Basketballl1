import { useEffect, useRef, useState } from "react";

import { Icon } from "../Icon.jsx";

// Tertiary calendar actions live behind one "More actions" entry so the
// toolbar stays visually quiet on a normal day. The menu closes on
// outside-click, on Escape, and after any item fires.
export function CalendarOverflowMenu({ isAdmin, onDailyPrint, onAddMaintenance, onClearPublicUse }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function runItem(action) {
    setOpen(false);
    if (typeof action === "function") action();
  }

  return (
    <div className="calendar-more-menu" ref={containerRef}>
      <button
        className="btn btn-light calendar-more-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="calendar-more-list"
      >
        <span>More actions</span>
        <span className="calendar-more-caret" aria-hidden="true">▾</span>
      </button>
      <div id="calendar-more-list" className="calendar-more-list" hidden={!open}>
        <button
          className="calendar-more-item"
          type="button"
          onClick={() => runItem(onDailyPrint)}
        >
          <Icon name="print" size={16} />
          <span>Daily print</span>
        </button>
        {isAdmin && (
          <>
            <div className="calendar-more-divider" aria-hidden="true" />
            <button
              className="calendar-more-item"
              type="button"
              onClick={() => runItem(onAddMaintenance)}
            >
              <Icon name="warn" size={16} />
              <span>Add maintenance block</span>
            </button>
            <button
              className="calendar-more-item"
              type="button"
              onClick={() => runItem(onClearPublicUse)}
            >
              <Icon name="users" size={16} />
              <span>Clear for public use</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
