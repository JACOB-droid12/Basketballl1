# Requirements Document

## Introduction

The calendar week view (`client/src/pages/CalendarPage.jsx`) is the screen barangay staff land on most often during a shift. The current rendering doubles up on orientation type, restates "this booking is cancelled" with three signals, lets the legend's pill chips clip at common widths, and mixes 40px and 54px controls inside one toolbar. This redesign keeps every existing capability — week navigation, jump-to-date, the More actions menu, the legend, today highlighting, status-aware booking blocks, admin maintenance and clear-public-use entry points — and changes only how each is presented. It removes one signal whenever two are doing the same job, picks one place for orientation type instead of two, and equalizes the toolbar so each control reads at the same height and weight.

These requirements derive from the approved `design.md` for this spec. They do not introduce any behaviour beyond what the design promises. They do not change the data layer (`/api/schedule`), the status taxonomy, the routing, the maintenance modal, the clear-public-use modal, or the offline-first staff-mediated workflow defined in `PRODUCT.md`.

The user is barangay staff working at an office computer. Residents do not reserve through this surface; staff do. Plain civic verbs ("Open day", "Jump to", "More actions") beat clever labels. Filipino italic helper text appears only where it lowers staff hesitation.

## Glossary

- **Calendar_Week_View**: The page rendered by `CalendarPage.jsx` — the toolbar, the legend, and the seven-day week grid as one screen.
- **Toolbar**: The `.calendar-toolbar` row containing the dateline, the segmented week-nav, the jump-to-date control, and the More actions trigger.
- **Week_Grid**: The `.staff-week-grid` container that holds seven Day_Card columns.
- **Day_Card**: One `.staff-day-card` column inside the Week_Grid, representing one calendar day.
- **Day_Head**: The `.staff-day-head` header inside a Day_Card, carrying the day-name eyebrow and the serif day number.
- **Day_Number**: The `.staff-day-head-num` element rendering the calendar day-of-month in Instrument Serif.
- **Booking_Block**: One `.staff-booking-block` element inside a Day_Card body — either a reservation block or a schedule block (maintenance, barangay event, cleared-public-use).
- **Empty_Day**: The `.staff-day-empty` element rendered inside a Day_Card body when the day has zero items.
- **Overflow_Tile**: The `.staff-day-overflow` button rendered inside a Day_Card body when more than four items exist for that day.
- **Legend**: The `.calendar-legend` row that maps each status code to a swatch and a label.
- **Today_Marker**: The `.staff-day-head.today` modifier applied to the Day_Head of the Day_Card whose date equals today in Asia/Manila.
- **getStatusDisplay**: The helper exported from `client/src/api/statusDisplay.js` that maps a `(statusCode, statusName)` pair to a `{ className, label }` object.
- **Roving_Tabindex**: A keyboard-navigation pattern in which exactly one descendant of a container carries `tabindex="0"` at any time and arrow keys move that focus inside the container.
- **WCAG_AA**: The Web Content Accessibility Guidelines 2.1 Level AA contrast thresholds — 4.5:1 for normal-weight text, 3:1 for large-weight text.

## Requirements

### Requirement 1: Single day-number per Day_Card

**User Story:** As barangay staff scanning the week grid, I want one orientation moment per day, so that I do not re-read the same date in two places on the same card.

#### Acceptance Criteria

1. THE Day_Card SHALL render exactly one Day_Number element (`.staff-day-head-num`) inside its Day_Head, displaying the calendar day-of-month as an integer from 1 to 31 without leading zeros.
2. THE Day_Number SHALL be set in Instrument Serif at the size declared by the existing `.staff-day-head-num` rule.
3. THE Day_Head SHALL render exactly one day-name eyebrow line in 13px caps Inter at 0.06em letter-spacing, using a three-letter uppercase day-name abbreviation from the set {MON, TUE, WED, THU, FRI, SAT, SUN}.
4. IF a Day_Card represents today in Asia/Manila, THEN THE Day_Head SHALL render the eyebrow line as `{DAY_NAME} · TODAY` (for example, `TUE · TODAY`).
5. IF a Day_Card does not represent today in Asia/Manila, THEN THE Day_Head SHALL render the eyebrow line as `{DAY_NAME}` only (for example, `TUE`), without the ` · TODAY` suffix.
6. THE Day_Head SHALL NOT render any `<small>` element duplicating the date as `{Month} {Day}` underneath the Day_Number.

### Requirement 2: One coherent cancelled or missed treatment

**User Story:** As barangay staff, I want a single coherent visual treatment for cancelled and missed bookings, so that "this is not happening" reads at a glance without three competing signals.

#### Acceptance Criteria

1. WHERE a Booking_Block carries `statusCode` `CANCELLED` or `MISSED`, THE Booking_Block SHALL render the `.staff-booking-name` text with a computed `text-decoration-line` whose value is non-empty and contains the token `line-through`.
2. WHERE a Booking_Block carries `statusCode` `CANCELLED` or `MISSED`, THE Booking_Block SHALL render the `.staff-booking-time` text with a computed color resolved from the `--danger` CSS custom property.
3. WHERE a Booking_Block carries `statusCode` `CANCELLED` or `MISSED`, THE Booking_Block SHALL render a left bar that is exactly 4px wide, spans the full height of the Booking_Block, and uses a color resolved from the `--danger` CSS custom property.
4. IF a Booking_Block carries a `statusCode` other than `CANCELLED` or `MISSED`, THEN THE Booking_Block SHALL render `.staff-booking-name` without `line-through` in its computed `text-decoration-line`, render `.staff-booking-time` without the `--danger` color, and render no `--danger` left bar.
5. THE Booking_Block SHALL contain zero `.status-badge` descendants regardless of `statusCode`.
6. THE Booking_Block SHALL include the `label` string returned by `getStatusDisplay(statusCode, statusName)` as a substring of its `aria-label` attribute value.

### Requirement 3: Reference number leaves the Day_Card block

**User Story:** As barangay staff scanning the week grid, I want the reservation reference number to surface only when I open a booking, so that the visible block keeps room for the time, the name, and the purpose I read at a glance.

#### Acceptance Criteria

1. THE Booking_Block SHALL NOT render any visible text line beginning with `Ref:`.
2. THE Booking_Block SHALL render the time, the representative name, and the purpose as the only visible text lines inside the block.
3. THE `.staff-booking-name` and `.staff-booking-purpose` elements SHALL each apply `-webkit-line-clamp: 2` and `overflow-wrap: anywhere`.
4. THE Booking_Block `aria-label` SHALL include the formatted reference number returned by `formatReferenceNo(reservation.referenceNo)` whenever the block represents a reservation.
5. WHERE a reservation is opened in the reservation drawer, the reservation detail page, or the daily print view, THE Calendar_Week_View SHALL still display the formatted reference number in those surfaces.

### Requirement 4: Quiet empty-day state

**User Story:** As barangay staff, I want an empty day to read as breathing room, so that an unbooked day does not compete with real bookings for my attention.

#### Acceptance Criteria

1. WHEN a day has zero items, THE Empty_Day SHALL render the visible string `Open day · Walang reserbasyon` on a single line at viewport widths of 820px or greater.
2. WHILE the viewport width is below 820px, THE Empty_Day SHALL render `Open day` on the first line and `Walang reserbasyon` on the second line.
3. THE Empty_Day SHALL render with computed `border-style` of `none` (no dashed border).
4. THE Empty_Day SHALL render with no `--primary-softer` background fill (the computed background SHALL match the parent Day_Card body).
5. THE Empty_Day SHALL contain zero `<strong>` descendants.
6. THE Empty_Day SHALL render the visible text in 13px Inter italic in `--ink-muted`, horizontally centered inside the Day_Card body.

### Requirement 5: Per-day overflow tile

**User Story:** As barangay staff viewing a busy day, I want a single `+ N more` affordance once a day exceeds four bookings, so that every visible block keeps its two-line breathing room.

#### Acceptance Criteria

1. WHEN a day's `items.length` is greater than 4, THE Day_Card SHALL render exactly four `.staff-booking-block` elements followed by exactly one `.staff-day-overflow` element.
2. WHEN a day's `items.length` is less than or equal to 4, THE Day_Card SHALL render zero `.staff-day-overflow` elements.
3. THE Overflow_Tile SHALL render visible text matching the regular expression `^\+\s*\d+\s+more$`, where the digit count equals `items.length - 4`.
4. THE Overflow_Tile SHALL carry an accessible name matching the regular expression `^\+\s*\d+\s+more bookings on `.
5. WHEN a user activates the Overflow_Tile, THE Day_Card SHALL open a per-day drawer listing every item for that day.

### Requirement 6: Toolbar at one rhythm

**User Story:** As barangay staff working through the toolbar, I want every interactive control to read at the same height, so that my eye does not recalibrate between zones.

#### Acceptance Criteria

1. THE Toolbar SHALL render exactly three zones in this left-to-right order: a dateline, a segmented week-nav, and a `Jump to date` plus More actions pair.
2. THE Toolbar SHALL render every interactive control matching the selectors `.calendar-week-nav-btn`, `.date-input`, or `.calendar-more-trigger` at a computed height of at least 48px.
3. THE Toolbar dateline eyebrow SHALL render the literal string `Week of` in 13px caps Inter in `--ink-muted`.
4. THE Toolbar dateline label SHALL render the formatted week range in 18px/700 Inter in `--ink`, never in Instrument Serif.
5. THE `Jump to date` control SHALL render its label as the literal string `Jump to` in 13px caps in `--ink-muted`, collapsed inline as a prefix to the left of the date input on the same baseline.

### Requirement 7: Legend swatches replace pills

**User Story:** As barangay staff reading the legend, I want each token to map to a Booking_Block's chrome at a glance, so that I do not relearn a second visual vocabulary just for the legend.

#### Acceptance Criteria

1. THE Legend SHALL render exactly one `.legend-swatch` element per `.calendar-legend-item`.
2. THE Legend SHALL render zero `.status-badge` descendants inside any `.calendar-legend-item`.
3. THE `.legend-swatch` SHALL render at 12px by 12px with a 1px border and a 4px colored left bar matching the corresponding Booking_Block left bar.
4. THE Legend SHALL render a 13px Inter label adjacent to each swatch.
5. WHILE the viewport width is at least 1280px, THE Legend SHALL satisfy `clientWidth >= scrollWidth - 1` so that all eight tokens fit on a single row without horizontal clipping.

### Requirement 8: Roving tabindex on the Week_Grid

**User Story:** As barangay staff using the keyboard during a phone-encode workflow, I want to enter the Week_Grid with one Tab and arrow keys to move inside it, so that I do not Tab through more than two dozen booking blocks to leave the grid.

#### Acceptance Criteria

1. THE Week_Grid SHALL contain at most one descendant element matching the selector `[tabindex="0"]` at any time.
2. WHILE focus is inside the Week_Grid, WHEN the user presses ArrowRight or ArrowLeft, THE Week_Grid SHALL move focus to the next or previous Day_Card column that contains at least one focusable Booking_Block, skipping columns whose body has zero focusable Booking_Blocks.
3. WHILE focus is inside the Week_Grid, WHEN the user presses ArrowDown or ArrowUp, THE Week_Grid SHALL move focus to the next or previous focusable Booking_Block within the current Day_Card column.
4. WHILE focus is inside the Week_Grid, WHEN the user presses Home, THE Week_Grid SHALL move focus to the first focusable Booking_Block in the first non-empty Day_Card column.
5. WHILE focus is inside the Week_Grid, WHEN the user presses End, THE Week_Grid SHALL move focus to the last focusable Booking_Block in the last non-empty Day_Card column.
6. WHILE focus is on a Booking_Block, WHEN the user presses Enter or Space, THE Booking_Block SHALL invoke its primary activation handler.

### Requirement 9: Today_Marker on the Day_Head

**User Story:** As barangay staff, I want exactly one Day_Card per visible week marked as today, so that I never lose my place in the grid.

#### Acceptance Criteria

1. WHEN the visible week includes today in Asia/Manila, THE Week_Grid SHALL contain exactly one `.staff-day-head.today` element.
2. WHEN the visible week does not include today in Asia/Manila, THE Week_Grid SHALL contain zero `.staff-day-head.today` elements.
3. THE today Day_Head SHALL render with a `--primary` background fill and `--paper-surface` (white) text.
4. THE today Day_Head SHALL append `· TODAY` to the day-name eyebrow line.
5. WHILE the visible week includes today in Asia/Manila, THE Toolbar `This week` segmented pill SHALL carry `aria-pressed="true"`.
6. WHILE the visible week does not include today in Asia/Manila, THE Toolbar `This week` segmented pill SHALL carry `aria-pressed="false"`.

### Requirement 10: Weekend Equality Rule

**User Story:** As barangay staff, I want Saturday and Sunday cards to render identically to weekday cards, so that the grid never falsely implies the court is closed on weekends.

#### Acceptance Criteria

1. WHERE a Day_Card represents Saturday or Sunday, THE Day_Card SHALL render with the same computed Day_Head background color as a weekday Day_Card in the same state.
2. WHERE a Day_Card represents Saturday or Sunday, THE Day_Card SHALL render the day-name eyebrow with the same computed `font-style` and `font-weight` as a weekday Day_Card.
3. WHERE a Day_Card represents Saturday or Sunday, THE Day_Card SHALL render at full opacity (computed `opacity` of `1`) with no `--surface-2` muted-paper fill on the card surface.

### Requirement 11: Status word reaches assistive technology

**User Story:** As barangay staff using a screen reader, I want every Booking_Block to announce its status word, so that removing the visible pill does not weaken the screen-reader path.

#### Acceptance Criteria

1. THE Booking_Block SHALL carry an `aria-label` attribute on every render.
2. THE `aria-label` SHALL contain the human status label string returned by `getStatusDisplay(statusCode, statusName).label` for the block's status code.
3. THE Booking_Block SHALL include the status label in `aria-label` regardless of whether a visible status pill renders inside the block.

### Requirement 12: Strict design-system adherence

**User Story:** As barangay staff, I want the Calendar_Week_View to read in the same visual vocabulary as the rest of the app, so that nothing on this screen looks like it came from another product.

#### Acceptance Criteria

1. THE Calendar_Week_View SHALL only reference colors, fonts, radii, shadows, and surface tints that are already declared as CSS custom properties or class rules in `client/src/styles.css`.
2. THE Calendar_Week_View SHALL NOT render any `border-left` greater than 1px outside the sanctioned 4px `--primary` or `--danger` bar on `.staff-booking-block` and the matching 4px bar on `.legend-swatch`.
3. THE Calendar_Week_View SHALL NOT render any element with a computed color or background-color equal to `--court-orange`, `--court-orange-soft`, `--court-orange-strong`, or `--court-orange-warm`.
4. THE Calendar_Week_View SHALL render every element with a computed `backdrop-filter` of `none`.
5. THE Calendar_Week_View SHALL render every element with a computed `background-clip` other than `text`.

### Requirement 13: WCAG AA contrast

**User Story:** As barangay staff working in varied office lighting, I want every text and background pair to read clearly, so that booking details remain legible whether the room is bright or dim.

#### Acceptance Criteria

1. THE Calendar_Week_View SHALL render every normal-weight text and background pair (text rendered smaller than 18pt regular or smaller than 14pt bold, equivalent to less than 24 CSS pixels regular or less than 18.66 CSS pixels bold) at a measured contrast ratio of at least 4.5:1, including each of: `--ink` on `--surface`, `--primary` on `--primary-softer`, `--paper-surface` on `--primary`, `--danger` on `--danger-soft`, `--alert-warning-text-strong` on `--alert-warning-bg`, `--ink-muted` on `--surface`, and `--ink-muted` on `--primary-softer`.
2. THE Calendar_Week_View SHALL render every large-weight text and background pair (text rendered at 18pt regular or larger, or at 14pt bold or larger, equivalent to at least 24 CSS pixels regular or at least 18.66 CSS pixels bold) appearing in the toolbar, the legend, or the seven-day week grid at a measured contrast ratio of at least 3:1.
3. WHEN a text element in the Calendar_Week_View enters a hover, focus, or active state, THE Calendar_Week_View SHALL maintain a measured contrast ratio of at least 4.5:1 for normal-weight text and at least 3:1 for large-weight text against the resulting background.

### Requirement 14: Bilingual italic moments

**User Story:** As barangay staff, I want Filipino italic helper text only where it lowers my hesitation, so that the screen acknowledges the language I work in without crowding the operational toolbar.

#### Acceptance Criteria

1. THE Calendar_Week_View page header SHALL preserve the existing `.page-sub-fil` Filipino italic line `Tingnan ang lahat ng reserbasyon ngayong linggo.` underneath the page title.
2. THE Empty_Day SHALL render the bilingual line `Open day · Walang reserbasyon` (or the stacked equivalent on widths below 820px) as the only new bilingual moment introduced by this redesign.
3. THE Toolbar SHALL render every label in English only, with no Filipino italic helper sibling.

### Requirement 15: No new error paths

**User Story:** As barangay staff, I want the calendar to fall back to the same error and empty primitives I already know, so that a bad fetch never surprises me with a new state I have to interpret.

#### Acceptance Criteria

1. IF the schedule fetch returns an error response, throws a network error, or does not complete within 10 seconds, THEN THE Calendar_Week_View SHALL render the existing `<div class="alert error" role="alert">` primitive containing an error message indicating that the schedule could not be loaded.
2. IF the schedule fetch completes successfully and returns zero schedule rows for the visible week, THEN THE Calendar_Week_View SHALL render the existing `<EmptyState>` component with the title `No schedule slots found` and SHALL NOT render the `<div class="alert error" role="alert">` primitive.
3. IF a Booking_Block item has a missing `startTime`, a missing `endTime`, or a `startTime` or `endTime` value that cannot be parsed as a valid time-of-day, THEN THE Booking_Block SHALL render the time line as the literal string `Time unavailable` and SHALL still render the remaining Booking_Block content.
4. THE Calendar_Week_View SHALL NOT render any error indicator or empty state element other than the `<div class="alert error" role="alert">` primitive defined in criterion 1, the `<EmptyState>` component defined in criterion 2, and the `Time unavailable` literal defined in criterion 3.
