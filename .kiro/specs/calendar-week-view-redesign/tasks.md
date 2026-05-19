# Implementation Plan: Calendar Week View Redesign

## Overview

This plan converts the approved design into a series of small, ordered, dependency-aware coding tasks. Each task is independently testable and references the requirement IDs it satisfies plus the correctness property it validates (where applicable).

The implementation extracts six presentational components (`CalendarEmptyDay`, `CalendarWeekdayHeader`, `StaffBookingBlock`, `CalendarLegend`, `CalendarWeekToolbar`, `CalendarDayColumn`) into `client/src/components/calendar/`, stages CSS rule changes in `client/src/styles.css` so each chrome change is independently testable, and wires the new components into `client/src/pages/CalendarPage.jsx` only after every part has shipped. The 12 correctness properties from the design translate one-to-one into `@testing-library/react` assertions in `tests/reactCalendarWeek*.test.js`, matching the project's `node:test` runner convention.

> Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The implementation language is JavaScript (React 18, JSX), matching the design's concrete code references and the existing `client/src/pages/CalendarPage.jsx` source.

## Tasks

- [x] 1. Wire a JSX-capable test harness for `@testing-library/react`
  - [x] 1.1 Install React testing dev dependencies and add a JSX loader for `node:test`
    - Add `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `jsdom@^25`, and `tsx@^4` to `devDependencies` in `package.json`
    - Run `npm install` so the lockfile and `node_modules` reflect the new dev deps
    - Update `scripts/run-tests.mjs` to spawn the child with `["--import", "tsx", "--test", "--experimental-test-isolation=none", ...testFiles]` so test files can import `.jsx` modules under `node:test`
    - Create `tests/helpers/reactDomHarness.js` that exports `setupDom()` and `teardownDom()` helpers using `jsdom`, attaches `window`, `document`, `navigator`, `HTMLElement`, `Node`, `getComputedStyle`, and `matchMedia` shims to `globalThis`, and wires `afterEach` cleanup via `@testing-library/react`'s `cleanup`
    - Create `tests/helpers/calendarFixtures.js` exporting `makeWeekDays(anchorDate)`, `makeReservationItem(overrides)`, `makeBlockItem(overrides)`, and `mountCalendarPage({ scheduleResponse, sessionResponse, today })` helpers that stub `apiRequest` and `getSession` for the page under test
    - _Validates: Requirements 1.1–15.4 (enables every property test below). Touches: `package.json`, `scripts/run-tests.mjs`, new `tests/helpers/reactDomHarness.js`, new `tests/helpers/calendarFixtures.js`_

- [x] 2. Extract the six presentational components
  - [x] 2.1 Create `CalendarEmptyDay` component
    - Create `client/src/components/calendar/CalendarEmptyDay.jsx` rendering `<div className="staff-day-empty"><span className="staff-day-empty-en">Open day</span><span className="staff-day-empty-fil"> · Walang reserbasyon</span></div>`
    - Export as a named export `CalendarEmptyDay`
    - Component takes no props and contains zero `<strong>` descendants
    - _Validates: Requirements 4.1, 4.2, 4.5, 4.6, 14.2 — Property 9_

  - [x] 2.2 Create `CalendarWeekdayHeader` component
    - Create `client/src/components/calendar/CalendarWeekdayHeader.jsx` rendering `<header className={`staff-day-head${isToday ? " today" : ""}`}>` with two children only: `<span className="staff-day-head-name">{NAME_3LETTER}{isToday ? " · TODAY" : ""}</span>` and `<strong className="staff-day-head-num">{dayNumber}</strong>`
    - Accept props `{ name, dayNumber, isToday }` where `name` is a 3-letter uppercase abbreviation derived from the input day name (`MON`, `TUE`, … `SUN`); export a small `toThreeLetterDay(name)` helper used only by this component
    - Render zero `<small>` elements; render exactly one `.staff-day-head-num` element
    - _Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4, 10.2 — Properties 1, 12_

  - [x] 2.3 Create `StaffBookingBlock` component
    - Create `client/src/components/calendar/StaffBookingBlock.jsx` exporting `StaffBookingBlock`
    - Accept props `{ kind, range, name, purpose, statusCode, statusLabel, statusClassName, referenceLabel, onActivate, adminAction }`
    - When `kind === "reservation"`, render `<button type="button" className={`staff-booking-block ${statusClassName}`} onClick={onActivate} aria-label={`${name}, ${range}, ${statusLabel}, reference ${referenceLabel}`}>` with three children only: `.staff-booking-time` (range), `.staff-booking-name` (name), `.staff-booking-purpose` (purpose)
    - When `kind === "block"`, render `<div role="group" className={`staff-booking-block ${statusClassName}`} aria-label={…}>` with the same three text children plus an optional `<button className="btn btn-light staff-booking-block__action">` when `adminAction` is provided
    - The `aria-label` MUST always include `statusLabel`; for reservations it MUST also include the formatted `referenceLabel`; for blocks it MUST include the reason when truthy
    - Render zero `.status-badge` descendants and zero text starting with `Ref:`
    - _Validates: Requirements 2.1–2.6, 3.1, 3.2, 3.4, 11.1, 11.2, 11.3 — Properties 2, 3, 4, 10_

  - [x] 2.4 Create `CalendarLegend` component
    - Create `client/src/components/calendar/CalendarLegend.jsx` exporting `CalendarLegend` and a colocated `LEGEND_STATUSES` constant of the eight statuses in design order: AVAILABLE, RESERVED, COMPLETED, MISSED, CANCELLED, MAINTENANCE, BARANGAY_EVENT, CLEARED_PUBLIC_USE
    - Render `<div className="calendar-legend" role="note" aria-label="Calendar status legend"><span className="calendar-legend-label">Status legend</span>{…items}</div>`
    - For each entry render `<span className="calendar-legend-item legend-{slug}"><span className="legend-swatch" aria-hidden="true" /><span>{label}</span></span>` where `{slug}` maps `AVAILABLE→available`, `RESERVED→reserved`, `COMPLETED→completed`, `MISSED→missed`, `CANCELLED→cancelled`, `MAINTENANCE→maintenance`, `BARANGAY_EVENT→barangay`, `CLEARED_PUBLIC_USE→cleared`
    - Render zero `.status-badge` descendants
    - _Validates: Requirements 7.1, 7.2, 7.3, 7.4 — Property 5_

  - [x] 2.5 Create `CalendarWeekToolbar` component
    - Create `client/src/components/calendar/CalendarWeekToolbar.jsx` exporting `CalendarWeekToolbar`
    - Move `CalendarOverflowMenu` (currently inside `client/src/pages/CalendarPage.jsx`) into a colocated module `client/src/components/calendar/CalendarOverflowMenu.jsx` and re-export it from the toolbar file
    - The toolbar renders `<div className="calendar-toolbar" aria-label="Calendar week controls">` with three zones in this exact left-to-right order: `.calendar-week-label` (eyebrow `Week of` + bold week range, never serif), the existing segmented `.calendar-week-nav` group with `aria-label="Move week"` (prev / `This week` button with `aria-pressed={isCurrent}` / next), and a right-aligned cluster containing `<label className="date-field compact-date"><span>Jump to</span><input … className="date-input" /></label>` followed by `<CalendarOverflowMenu … />`
    - Accept props `{ weekLabel, isCurrent, isAdmin, date, onPrev, onNext, onJumpToToday, onSelectDate, onDailyPrint, onAddMaintenance, onClearPublicUse }`
    - Toolbar text is English-only — no Filipino italic helper siblings inside `.calendar-toolbar`
    - _Validates: Requirements 6.1, 6.3, 6.4, 6.5, 9.5, 9.6, 14.3 — Property 7 (height assertion lives in CSS, verified by tests)_

- [x] 3. Compose the day column with the visible-block cap and the overflow tile
  - [x] 3.1 Create `CalendarDayColumn` component
    - Create `client/src/components/calendar/CalendarDayColumn.jsx` exporting `CalendarDayColumn` and a `MAX_VISIBLE_BLOCKS = 4` constant
    - Accept props `{ day, items, isToday, isAdmin, onOpenReservation, onDeactivateBlock, onOpenDay }`
    - Render `<article className="staff-day-card">` containing `<CalendarWeekdayHeader name={day.name} dayNumber={…} isToday={isToday} />` and `<div className="staff-day-body">…</div>`
    - When `items.length === 0` render `<CalendarEmptyDay />`
    - When `items.length >= 1`: render the first `Math.min(items.length, MAX_VISIBLE_BLOCKS)` items as `<StaffBookingBlock />`s (mapping reservation vs block kinds to the right props, including `referenceLabel = formatReferenceNo(reservation.referenceNo)`, `range = displayRange(item.startTime, item.endTime)`, `statusClassName/statusLabel = getStatusDisplay(item.statusCode, item.statusName)`)
    - When `items.length > MAX_VISIBLE_BLOCKS` append `<button type="button" className="staff-day-overflow" aria-label={`+ ${hidden} more bookings on ${day.name}, ${formatLongDate(day.date)}`} onClick={() => onOpenDay(day, items)}>+ {hidden} more</button>`
    - Day-card contains exactly one `.staff-day-head-num` regardless of state
    - Import the helpers (`displayRange`, `humanizeBlockType`, `formatReferenceNo`, `getStatusDisplay`, `formatLongDate`) from their existing modules; do not re-implement
    - _Validates: Requirements 1.1, 4.1–4.6, 5.1, 5.2, 5.3, 5.4 — Properties 1, 8, 9_

  - [x] 3.2 Create `CalendarDayDrawer` component for the per-day overflow drawer
    - Create `client/src/components/calendar/CalendarDayDrawer.jsx` exporting `CalendarDayDrawer`
    - Render an existing-pattern drawer (`<div className="reservation-drawer">…</div>` matching the project's reservation-drawer chrome) with a header (`day.name`, formatted long date) and a vertical list of every item in `items` rendered through `<StaffBookingBlock />`
    - Trap focus inside the drawer while open and return focus to `triggerRef.current` on close (use the existing focus-trap pattern from `ReservationDetailDrawer.jsx`)
    - Accept props `{ open, day, items, onClose, onOpenReservation, onDeactivateBlock, isAdmin, triggerRef }`
    - _Validates: Requirements 5.5_

- [x] 4. Update `client/src/styles.css` to match the redesigned chrome
  - [x] 4.1 Update day-card head, empty, and overflow rules
    - Tighten `.staff-day-head { min-height: 80px; padding: … }` (down from 104px)
    - Add `.staff-day-head-name { font: 600 13px/1.2 var(--font-sans); letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); }` plus a `.staff-day-head.today .staff-day-head-name { color: var(--paper-surface); }` override
    - Add `.staff-day-head-num { font: 400 30px/1 var(--font-serif); color: var(--ink-2); display: block; }` plus the same `.today` override flipping the color to `var(--paper-surface)`
    - Drop `.staff-day-head small { … }` and `.staff-day-head.today small { … }` rules entirely
    - Replace `.staff-day-empty` rule body so it carries `border: 0; background: transparent; min-height: 0; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 8px; font: italic 400 13px/1.4 var(--font-sans); color: var(--ink-muted);`
    - Add `@media (max-width: 819.98px) { .staff-day-empty { flex-direction: column; gap: 0; } .staff-day-empty-fil { padding-left: 0; } }` so the bilingual line stacks below 820px
    - Drop `.staff-day-empty strong` rule
    - Add `.staff-day-overflow { display: block; width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px dashed var(--border); background: transparent; color: var(--ink-muted); font: 600 13px/1.2 var(--font-sans); cursor: pointer; }` plus `:hover { background: var(--surface-2); }` and `:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }`
    - Add explicit weekend-equality guards: `.staff-day-card[data-weekend="true"] { opacity: 1; background: var(--surface); } .staff-day-card[data-weekend="true"] .staff-day-head { background: inherit; } .staff-day-card[data-weekend="true"] .staff-day-head-name { font-style: normal; }` (these are no-op against the current rules but lock the contract against future drift)
    - _Validates: Requirements 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.6, 9.3, 10.1, 10.2, 10.3, 12.4, 12.5 — Properties 1, 9, 12_

  - [x] 4.2 Equalize toolbar control heights to 48px
    - Update `.calendar-week-nav-btn { height: 48px; padding: 0 16px; }` (up from 40px / 0 14px)
    - Add `.calendar-toolbar .date-input { min-height: 48px; }`
    - Confirm `.calendar-more-trigger` inherits 48px from `.btn` — if the existing `.btn` rule does not guarantee it, add `.calendar-more-trigger { min-height: 48px; }`
    - Update the responsive stack rule so the three zones still meet 48px each at ≤820px
    - _Validates: Requirements 6.2 — Property 7_

  - [x] 4.3 Add the four new legend swatch modifiers
    - Add `.calendar-legend-item.legend-available .legend-swatch { border-left-color: var(--success); background: var(--success-soft); }`
    - Add `.calendar-legend-item.legend-maintenance .legend-swatch { border-left-color: var(--warning); background: var(--alert-warning-bg); }`
    - Add `.calendar-legend-item.legend-barangay .legend-swatch { border-left-color: var(--primary); background: var(--primary-softer); }`
    - Add `.calendar-legend-item.legend-cleared .legend-swatch { border-left-color: var(--border-strong); background: var(--surface-2); }`
    - Confirm `.legend-swatch` resolves to a 12×12 box with a 4px left bar (the design notes the existing rule is 14×14 — adjust to `width: 12px; height: 12px; border-left-width: 4px;` if not already)
    - Add `.calendar-legend { flex-wrap: wrap; }` (or confirm existing) so eight tokens fit one row at ≥1280px without horizontal scroll
    - _Validates: Requirements 7.1, 7.3, 7.4, 7.5 — Properties 5, 6_

  - [x] 4.4 Add booking-block status variants for blocks (Maintenance, Barangay event, Cleared for public use)
    - Add `.staff-booking-block.status-maintenance { border-color: var(--alert-warning-border); background: var(--alert-warning-bg); border-left: 4px solid var(--warning); }` plus `.staff-booking-block.status-maintenance .staff-booking-time { color: var(--alert-warning-text-strong); }` and `.staff-booking-block.status-maintenance .staff-booking-name, … .staff-booking-purpose { color: var(--alert-warning-text-strong); }`
    - Add `.staff-booking-block.status-barangay-event { background: var(--primary-softer); border-left: 4px solid var(--primary); }` with `--primary` time color
    - Add `.staff-booking-block.status-cleared-public-use { background: var(--surface-2); border-left: 4px solid var(--border-strong); } .staff-booking-block.status-cleared-public-use .staff-booking-time { color: var(--ink-muted); }`
    - Add `.staff-booking-block.status-cancelled .staff-booking-name, .staff-booking-block.status-missed .staff-booking-name { text-decoration-line: line-through; }` and `.staff-booking-block.status-cancelled .staff-booking-time, .staff-booking-block.status-missed .staff-booking-time { color: var(--danger); }` and `.staff-booking-block.status-cancelled, .staff-booking-block.status-missed { border-left: 4px solid var(--danger); background: var(--danger-soft); }` (reaffirm if not already)
    - Add `.staff-booking-block__action { margin-top: 8px; align-self: flex-start; }`
    - Do NOT introduce any color, font, radius, shadow, or surface tint that is not already a `--*` custom property in `styles.css`; do NOT reference `--court-orange*`; do NOT add `backdrop-filter` or `background-clip: text`
    - _Validates: Requirements 2.1, 2.2, 2.3, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2 — Properties 3_

- [x] 5. Wire `client/src/pages/CalendarPage.jsx` to use the six new components
  - [x] 5.1 Replace inline JSX with the six extracted components and add the supporting state
    - Import `CalendarWeekToolbar`, `CalendarLegend`, `CalendarDayColumn`, `CalendarDayDrawer` from `client/src/components/calendar/`
    - Remove the inline `CalendarOverflowMenu`, `ReservationBookingBlock`, `ScheduleBlockEntry`, `LEGEND_STATUSES`, and the toolbar / legend / day-card JSX from this file (each now lives in the corresponding new component)
    - Replace the toolbar markup with `<CalendarWeekToolbar weekLabel={weekLabel} isCurrent={weekIncludesDate(weekDays, today)} isAdmin={isAdmin} date={date} onPrev={…} onNext={…} onJumpToToday={() => setDate(today)} onSelectDate={…} onDailyPrint={…} onAddMaintenance={…} onClearPublicUse={…} />`
    - Replace the legend markup with `<CalendarLegend />`
    - Replace the day-grid `weekDays.map(...)` body with `<CalendarDayColumn key={day.date} day={day} items={items} isToday={day.date === today} isAdmin={isAdmin} onOpenReservation={(id) => onNavigate(`/reservations/${id}`)} onDeactivateBlock={(block) => setMaintenanceModal({ open: true, blockToDeactivate: block })} onOpenDay={openDayDrawer} />`
    - Add a `dayDrawer` state slot `{ open, day, items, triggerRef }` and an `openDayDrawer(day, items)` handler that captures `document.activeElement` into `triggerRef`
    - Mount `<CalendarDayDrawer open={dayDrawer.open} day={dayDrawer.day} items={dayDrawer.items} triggerRef={dayDrawer.triggerRef} onClose={() => setDayDrawer({ open: false, day: null, items: [], triggerRef: null })} onOpenReservation={…} onDeactivateBlock={…} isAdmin={isAdmin} />` next to the existing modals
    - Update `displayRange(start, end)` so it returns the literal string `"Time unavailable"` whenever `start` or `end` is missing OR fails `parseTimeOfDay()` (treat any value not matching `^\d{1,2}:\d{2}$` and not in the range 0..23:0..59 as invalid); the booking block must still render the remaining content when this branch fires
    - Pass `data-weekend="true"` on `<article className="staff-day-card">` for Saturday/Sunday so the CSS weekend-equality guards have a hook (set in `CalendarDayColumn` based on `day.name`)
    - Add `useRovingTabindex(gridRef)` — see 5.2 — and attach it to the grid via a ref
    - Keep the loading / error / empty primitives exactly as today (do not introduce new error or empty UIs)
    - _Validates: Requirements 6.1, 7.1, 9.1, 9.2, 9.5, 9.6, 14.1, 14.3, 15.1, 15.2, 15.3, 15.4_

  - [x] 5.2 Implement the `useRovingTabindex` hook for the week grid
    - Create `client/src/components/calendar/useRovingTabindex.js` exporting `useRovingTabindex(gridRef)` that:
      - On mount, finds all `.staff-booking-block, .staff-day-overflow` descendants of `gridRef.current`, sets every match to `tabindex="-1"`, and sets the first focusable child of the first non-empty `.staff-day-card` to `tabindex="0"`
      - On `keydown` events targeting any matching descendant, handles `ArrowLeft`/`ArrowRight` (move to previous/next non-empty column's first focusable child), `ArrowUp`/`ArrowDown` (move within the same column), `Home`/`End` (first/last block in the focused column), and `Enter`/`Space` (let native button click flow run)
      - Always re-runs the tabindex sweep when `gridRef.current` re-renders (use a `MutationObserver` or `useEffect` keyed off the items list)
    - The hook MUST guarantee the grid contains at most one `[tabindex="0"]` descendant at any time
    - _Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 — Property 11_

- [x] 6. Translate the 12 correctness properties into `@testing-library/react` tests
  - [x] 6.1 Test Property 1 — single day-number per Day_Card
    - Create `tests/reactCalendarWeekDayNumber.test.js`
    - Render `CalendarPage` with a fixture week where today is Wednesday; assert `getAllByRole("article")` returns 7, each `article.querySelectorAll(".staff-day-head-num").length === 1`, and `article.querySelectorAll(".staff-day-head small").length === 0`
    - Assert each `.staff-day-head-name` text matches `/^(MON|TUE|WED|THU|FRI|SAT|SUN)( · TODAY)?$/`
    - Assert exactly one card carries the ` · TODAY` suffix and that card also carries the `.today` class (Property 9 spillover)
    - _Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4 — Property 1_

  - [x] 6.2 Test Property 2 + Property 3 — no in-block pill, cancelled/missed strikethrough
    - Create `tests/reactCalendarWeekStatusChrome.test.js`
    - Render `CalendarPage` with one CANCELLED reservation, one MISSED reservation, and one COMPLETED reservation in the visible week
    - Assert every `.staff-booking-block` has zero `.status-badge` descendants
    - Assert the CANCELLED block's `.staff-booking-name` has `getComputedStyle(name).textDecorationLine.includes("line-through")` (and the same for MISSED)
    - Assert the CANCELLED and MISSED `.staff-booking-time` carries `getComputedStyle(time).color === computed --danger`
    - Assert a default RESERVED block has no `line-through` and no `--danger` color
    - _Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5 — Properties 2, 3_

  - [x] 6.3 Test Property 4 — no `Ref:` line in any block, ref present in aria-label
    - Create `tests/reactCalendarWeekReference.test.js`
    - Render `CalendarPage` with three reservations carrying real reference numbers
    - Assert no `.staff-booking-block` contains text matching `/^Ref:/m` (use `screen.queryByText(/^Ref:/m)` returns `null`)
    - Assert each reservation block's `aria-label` contains the formatted reference returned by `formatReferenceNo(...)`
    - Assert the only visible text lines inside the block are the time, name, and purpose (three text spans, three classes: `.staff-booking-time`, `.staff-booking-name`, `.staff-booking-purpose`)
    - _Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5 — Property 4_

  - [x] 6.4 Test Property 5 + Property 6 — legend renders swatches and does not clip at 1280px
    - Create `tests/reactCalendarWeekLegend.test.js`
    - Resize the jsdom viewport to 1280×800
    - Render `CalendarLegend` standalone; assert it carries `role="note"` with name `"Calendar status legend"`
    - Assert the legend contains exactly 8 `.calendar-legend-item` children
    - Assert each item contains exactly one `.legend-swatch` and zero `.status-badge` descendants
    - Assert `legend.clientWidth >= legend.scrollWidth - 1` so no token clips on the right edge
    - Assert each item's text label matches the design's English label (`Available`, `Reserved`, `Completed`, `Did not show`, `Cancelled`, `Maintenance`, `Barangay event`, `Cleared for public use`)
    - _Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5 — Properties 5, 6_

  - [x] 6.5 Test Property 7 — toolbar control height is at least 48px
    - Create `tests/reactCalendarWeekToolbarHeight.test.js`
    - Render `CalendarWeekToolbar` standalone with mock handlers
    - Assert each match of `.calendar-toolbar .calendar-week-nav-btn`, `.calendar-toolbar .date-input`, `.calendar-toolbar .calendar-more-trigger` has `parseFloat(getComputedStyle(node).height) >= 48`
    - Assert the dateline eyebrow text is the literal `Week of` and the bold label uses Inter (computed `font-family` matches `var(--font-sans)`, never `var(--font-serif)`)
    - Assert the date input's preceding label span text is the literal `Jump to`
    - _Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5 — Property 7_

  - [x] 6.6 Test Property 8 — per-day overflow tile beyond 4 bookings
    - Create `tests/reactCalendarWeekOverflow.test.js`
    - Render `CalendarPage` with a fixture where Wednesday has 6 reservations and Thursday has 4 reservations
    - Assert Wednesday's article contains exactly 4 `.staff-booking-block` elements followed by exactly one `.staff-day-overflow`
    - Assert the overflow tile's visible text matches `/^\+\s*\d+\s+more$/` and accessible name matches `/^\+\s*\d+\s+more bookings on /`
    - Assert Thursday's article contains 4 `.staff-booking-block` elements and zero `.staff-day-overflow` elements
    - Click the Wednesday overflow tile via `userEvent.click`; assert a `CalendarDayDrawer` opens listing all 6 items
    - _Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5 — Property 8_

  - [x] 6.7 Test Property 9 — empty days render the quiet "Open day" line
    - Create `tests/reactCalendarWeekEmptyDay.test.js`
    - Render `CalendarPage` with two days carrying zero items
    - Assert each empty day's `.staff-day-empty` contains the visible string `Open day · Walang reserbasyon` at viewport width 1280px and contains both `Open day` and `Walang reserbasyon` (stacked) at viewport width 819px
    - Assert `getComputedStyle(empty).borderStyle === "none"` and `getComputedStyle(empty).backgroundColor === "rgba(0, 0, 0, 0)"` (or matches the parent body)
    - Assert `empty.querySelectorAll("strong").length === 0`
    - Assert the visible text is rendered in italic (`getComputedStyle(empty).fontStyle === "italic"`) and uses `var(--ink-muted)`
    - _Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 14.2 — Property 9_

  - [x] 6.8 Test Property 10 — status word reaches assistive technology
    - Create `tests/reactCalendarWeekStatusAria.test.js`
    - Render `CalendarPage` with one reservation per status code (RESERVED, CANCELLED, MISSED, COMPLETED) and one block per block type (MAINTENANCE, BARANGAY_EVENT, CLEARED_PUBLIC_USE)
    - For every `.staff-booking-block`, assert its `aria-label` contains the human label returned by `getStatusDisplay(code, name).label`
    - Assert this holds even though no `.status-badge` renders inside any block
    - _Validates: Requirements 11.1, 11.2, 11.3 — Property 10_

  - [x] 6.9 Test Property 11 — single roving tabindex inside `.staff-week-grid`
    - Create `tests/reactCalendarWeekRovingTab.test.js`
    - Render `CalendarPage` with at least three days carrying bookings
    - Assert `grid.querySelectorAll('[tabindex="0"]').length === 1` on initial render
    - Tab into the grid; press `ArrowRight` and assert focus moves to the first focusable child of the next non-empty column; press `ArrowDown` and assert focus moves to the next block in the same column; press `Home`/`End` and assert focus jumps to first/last block in the column; press `Enter` on a block and assert the reservation navigation handler fires
    - Assert at every step `grid.querySelectorAll('[tabindex="0"]').length === 1`
    - _Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 — Property 11_

  - [x] 6.10 Test Property 12 — weekend cards render identically to weekday cards
    - Create `tests/reactCalendarWeekWeekendEquality.test.js`
    - Render `CalendarPage` with a week where Saturday and Sunday both carry one reservation each and Monday carries one reservation
    - For each pair (Sat vs Mon, Sun vs Mon) assert `getComputedStyle(satHead).backgroundColor === getComputedStyle(monHead).backgroundColor`, `getComputedStyle(satEyebrow).fontStyle === getComputedStyle(monEyebrow).fontStyle`, `getComputedStyle(satEyebrow).fontWeight === getComputedStyle(monEyebrow).fontWeight`, and `getComputedStyle(satCard).opacity === "1"`
    - Assert the weekend card's `.staff-day-card` background color does not equal `var(--surface-2)`
    - _Validates: Requirements 10.1, 10.2, 10.3, 12.1 — Property 12_

  - [x] 6.11 Test today-marker semantics (Requirement 9) and toolbar `aria-pressed`
    - Create `tests/reactCalendarWeekTodayMarker.test.js`
    - Render `CalendarPage` with a week that includes today; assert exactly one `.staff-day-head.today` exists and the toolbar's `This week` button carries `aria-pressed="true"`
    - Render `CalendarPage` with a week one week ahead; assert zero `.staff-day-head.today` exist and the `This week` button carries `aria-pressed="false"`
    - Assert the today head's eyebrow text ends with ` · TODAY` and the head's computed background equals `var(--primary)` and computed text color equals `var(--paper-surface)`
    - _Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 6.12 Test no-new-error-paths and time-unavailable fallback (Requirement 15)
    - Create `tests/reactCalendarWeekErrorPaths.test.js`
    - Test 1: stub `apiRequest` to reject; render `CalendarPage`; assert `<div class="alert error" role="alert">` renders with the error message and no other error UI exists
    - Test 2: stub `apiRequest` to resolve with `{ rows: [], days: [...] }`; render `CalendarPage`; assert `EmptyState` with title `No schedule slots found` renders and `<div class="alert error">` does not render
    - Test 3: render `CalendarPage` with a reservation whose `startTime` is `""`; assert that block's `.staff-booking-time` reads exactly `Time unavailable` and the `.staff-booking-name` and `.staff-booking-purpose` still render
    - Test 4: assert no element in the rendered tree has `getComputedStyle(el).backdropFilter` other than `"none"` and no element has `backgroundClip === "text"`
    - _Validates: Requirements 12.4, 12.5, 13.1, 13.2, 15.1, 15.2, 15.3, 15.4_

- [x] 7. Final verification — run the full test suite
  - [x] 7.1 Run `npm test` and confirm every test passes
    - Execute `npm test` from the repository root
    - Confirm every existing test in `tests/` and every new `tests/reactCalendarWeek*.test.js` passes
    - If any test fails, diagnose the failure against the requirement it validates and fix the implementation (not the test) unless the test itself misreads the requirement
    - _Validates: Requirements 1.1–15.4 (full coverage)_

## Notes

- Implementation language is JavaScript (React 18, JSX), matching the existing `client/src/pages/CalendarPage.jsx` source.
- Tests use the project's `node:test` runner inside `tests/reactCalendarWeek*.test.js` files, with `@testing-library/react` driving rendered DOM assertions on top of a `jsdom` window provisioned by `tests/helpers/reactDomHarness.js` (set up in task 1.1).
- The six extracted components live under `client/src/components/calendar/`. `CalendarPage.jsx` keeps fetch-and-derive (state, `weekDays`, `itemsByDay`, modal toggles); the components own their visual contracts.
- CSS rule changes are split across four tasks (4.1–4.4) so each chrome change is independently verifiable. They all touch `client/src/styles.css` and therefore execute serially — the dependency graph schedules them in successive waves.
- No task is marked optional. Every test directly validates a numbered correctness property which itself validates one or more requirement IDs.
- The redesign introduces zero new colors, fonts, radii, shadows, or surface tints. Every visual choice references a `--*` custom property already declared in `styles.css`. Tests in tasks 6.4 and 6.12 enforce this contract.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "4.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.2"] },
    { "id": 3, "tasks": ["4.3"] },
    { "id": 4, "tasks": ["4.4"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12"] },
    { "id": 8, "tasks": ["7.1"] }
  ]
}
```
