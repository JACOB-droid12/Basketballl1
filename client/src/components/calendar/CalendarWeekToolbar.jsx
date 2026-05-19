import { Icon } from "../Icon.jsx";

import { CalendarOverflowMenu } from "./CalendarOverflowMenu.jsx";

// Three-zone calendar toolbar: dateline (left), segmented week-nav
// (center-right), and a right-aligned cluster carrying the inline
// `Jump to` date combo + the More actions overflow trigger. Every
// interactive control reads at the same 48px staff-control height so
// the staff eye never recalibrates between zones.
//
// Toolbar text is English-only — orientational Filipino italic helpers
// belong on the page header and on the empty-day card, not inside the
// operational toolbar.
export function CalendarWeekToolbar({
  weekLabel,
  isCurrent,
  isAdmin,
  date,
  onPrev,
  onNext,
  onJumpToToday,
  onSelectDate,
  onDailyPrint,
  onAddMaintenance,
  onClearPublicUse
}) {
  function handleSelectDate(event) {
    if (typeof onSelectDate === "function") {
      onSelectDate(event.target.value);
    }
  }

  return (
    <div className="calendar-toolbar" aria-label="Calendar week controls">
      <div className="calendar-week-label">
        <span>Week of</span>
        <strong>{weekLabel}</strong>
      </div>

      {/* Segmented week-nav: prev / this-week / next read as one
        control instead of three same-weight buttons. The "This week"
        pill carries `aria-pressed` when the visible week already
        includes today, so it doubles as an "already on the current
        week" indicator. */}
      <div className="calendar-week-nav" role="group" aria-label="Move week">
        <button
          className="calendar-week-nav-btn"
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <button
          className={`calendar-week-nav-btn calendar-week-nav-today ${isCurrent ? "is-current" : ""}`}
          type="button"
          onClick={onJumpToToday}
          aria-pressed={isCurrent}
        >
          This week
        </button>
        <button
          className="calendar-week-nav-btn"
          type="button"
          onClick={onNext}
          aria-label="Next week"
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="calendar-actions">
        <label className="date-field compact-date">
          <span>Jump to</span>
          <input
            id="schedule-jump-date"
            name="date"
            className="date-input"
            type="date"
            value={date}
            onChange={handleSelectDate}
          />
        </label>

        <button className="btn btn-light calendar-print-action" type="button" onClick={onDailyPrint}>
          <Icon name="print" size={16} />
          <span>Daily print</span>
        </button>

        {/* "More actions" now carries admin-only exceptions. Daily print
          stays directly visible because it is a routine staff task. */}
        <CalendarOverflowMenu
          isAdmin={isAdmin}
          onAddMaintenance={onAddMaintenance}
          onClearPublicUse={onClearPublicUse}
        />
      </div>
    </div>
  );
}

// Re-export the colocated overflow menu so consumers that only import
// the toolbar module still have access to the trigger primitive
// (helpful for direct standalone tests of the overflow menu).
export { CalendarOverflowMenu };
