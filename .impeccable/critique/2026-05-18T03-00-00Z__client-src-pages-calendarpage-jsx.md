---
target: client/src/pages/CalendarPage.jsx
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-calendarpage-jsx
---
# Calendar — Critique (run 4, browser-verified, 1440)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Today marker, week label, today's-alerts banner |
| 2 | Match System / Real World | 4 | English weekday + bilingual page-sub |
| 3 | User Control and Freedom | 4 | Prev/This/Next + Jump-to-date + Daily print |
| 4 | Consistency and Standards | 3 | Toolbar pattern reused; admin actions stack inline |
| 5 | Error Prevention | 3 | Maintenance + Clear-public-use modals confirm |
| 6 | Recognition Rather Than Recall | 3 | Legend bar with 8 status pills |
| 7 | Flexibility and Efficiency | 3 | Daily-print + add-block + clear shortcut |
| 8 | Aesthetic and Minimalist Design | 2 | Toolbar carries 6 buttons + 1 date input + 1 link; reads as a chrome stack |
| 9 | Error Recovery | 3 | Standard `.alert error` for both schedule + alerts fetch |
| 10 | Help and Documentation | 3 | Legend + page-sub bilingual |
| **Total** | | **32/40** | The toolbar is the bottleneck |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: The seven-day grid is the right answer for an offline barangay desk: a single page, one screen wide, 7 cards across. Each card carries a date head with a 24px serif day number and the booking blocks below. The Today card uses the civic-blue accented head. The "No bookings" empty rows are typographic only — no decorative SVG illustrations, no "create your first reservation" empty-state CTA noise. That restraint is exactly right.

The toolbar above the grid is the weak point. At 1440 it carries: "Current week / May 17 - May 23, 2026", "Previous week", "This week", "Next week", "Jump to date / [date input]", "Daily print", "Add maintenance block", "Clear for public use". Eight controls in one row. The visual is a chrome stack — three pill buttons, a date field, and three light buttons, all the same height, all the same weight.

**Deterministic**: Detector clean for `CalendarPage.jsx`.

## What's Working

- **The 7-card week grid scales to the office monitor.** Each day card has a clear head (weekday + day number), a body slot for bookings or "No bookings", and uses tonal layering (paper surface on warm-office-bg) for separation. No card-grid-of-stats trap.
- **Booking blocks carry the sanctioned 4px civic-blue left border** (per DESIGN.md exception). Status variants tint the bar and background — missed/cancelled go to danger-red bar + danger-soft surface. That's the only surface in the system that carries a colored stripe, and it's sanctioned.
- **Legend with 8 status pills** (Available, Reserved, Completed, Did not show, Cancelled, Maintenance, Barangay event, Cleared for public use) is a real reference, not decoration. The pill primitive matches what's rendered on the day cards.

## Priority Issues

- **[P1] What**: Toolbar at 1440 reads as a chrome stack with 8 controls competing for visual weight.
- **Why it matters**: Three week-navigation buttons (Previous / This / Next) + a Jump-to-date field + Daily print + (admin only) Add maintenance block + Clear for public use. All same height, all `btn-light`, all in one flex-wrap row. The user has to decode the button row before they can navigate. Visual hierarchy collapses.
- **Fix**: Three changes. (1) Group the three week nav buttons in a single bordered control (segmented row of 3, arrow-arrow-pill). (2) Move "Daily print" + "Add maintenance block" + "Clear for public use" into a "More actions ▾" overflow menu that opens a small popover; admin-only items live there too. (3) Promote "Jump to date" to a discrete labeled control on the right edge, separated by a `flex: 1` spacer.
- **Suggested command**: `layout` (toolbar restructure) followed by `distill` if the overflow menu is preferable

- **[P3] What**: The "Today's alerts" banner sits between the toolbar and the legend.
- **Why it matters**: It's labeled "Today's alerts · Mga babala ngayong araw" with content "Nothing needs attention today. Walang kailangang aksyunin ngayong araw." On a clean morning the banner reads as a passive empty-state that isn't doing work. Staff scan past it.
- **Fix**: When the alerts payload has nothing actionable, render the banner as a one-line muted strip ("All clear today") instead of the full card. When alerts *do* exist, the existing card pops out.
- **Suggested command**: `quieter` or `distill`

- **[P3] What**: The week-anchored date input uses a native `<input type="date">` with no visible "/" formatting label.
- **Why it matters**: Browser default UX is fine, but the field's visible value reads as three spinbuttons (DD / MM / YYYY) with no above-field guide. New staff have to click into it to see how it parses.
- **Fix**: A small "DD/MM/YYYY" or "Year–Month–Day" hint next to the field would close the gap. Or stop using the native control here and switch to the `Field` primitive used on the reservation form.
- **Suggested command**: `clarify`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: She'll click "Daily print" on the toolbar. The 6 same-height same-color buttons make her hesitate; the print action is the third in a row of three secondary buttons.

**Carlo (assistant, 20s)**: He'll appreciate "Previous week / This week / Next week" but won't realize "This week" snaps to today (vs. "Next week" relative to current view). A small underline or subdued state on "This week" when already viewing it would help.

## Minor Observations

- The week label inside `.calendar-week-label` is the right typographic anchor (small "Current week" eyebrow + bold week range).
- `aria-label="Calendar week controls"` on the toolbar is correct.
- The legend's `border-left-width: 4px` on the legend swatch (line 2020 of `styles.css`) flagged by the deterministic detector is intentional — it mirrors the calendar `staff-booking-block` so the legend visually matches the cells. Override the detector finding.
