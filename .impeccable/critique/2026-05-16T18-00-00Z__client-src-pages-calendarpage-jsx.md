---
target: "client/src/pages/CalendarPage.jsx"
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-calendarpage-jsx
---
# Calendar (Weekly) — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading inside calendar-state-card, today gets blue head |
| 2 | Match System / Real World | 4 | Weekly view, "Tingnan ang lahat", "Today" highlight |
| 3 | User Control and Freedom | 4 | Previous / Today / Next + jump-to-date — every path is open |
| 4 | Consistency and Standards | 3 | Booking block has 5 simultaneous status carriers |
| 5 | Error Prevention | 3 | Read-only browse; safe |
| 6 | Recognition Rather Than Recall | 3 | Today head is unmistakable |
| 7 | Flexibility and Efficiency | 3 | Jump-to-date is keyboard-accessible |
| 8 | Aesthetic and Minimalist Design | 2 | 7-col truncation on narrow viewports |
| 9 | Error Recovery | 3 | Generic error alert |
| 10 | Help and Documentation | 2 | No legend for left-bar / tint meaning |
| **Total** | | **30/40** | **Strong navigation; rendering breaks at narrow widths** |

## Anti-Patterns Verdict

**LLM assessment**: This is the screen where the documented design rules are tested most. The 4px civic-blue left bar on the booking block is DESIGN.md's single sanctioned border-left exception, and it's earning its place — the bar carries status without color-only signaling. But the same block also tints background, colors the time text, strikes through the name, AND shows a status pill — that's belt-and-suspenders-and-a-second-belt.

**Deterministic scan**: Sanctioned border-left exception accepted. No banned patterns elsewhere. Skipped CLI scan.

## Overall Impression

The week navigation is excellent — three buttons + a date jump cover every way a clerk thinks about "what week am I looking at." But the rendering breaks at common breakpoints. At 1100px the 7 columns squeeze hard and booking names truncate to "Liga ng Kab…", which kills at-a-glance scanning, which is what calendars are FOR.

## What's Working

- **Today gets a solid blue head with white text** — instantly readable across the week. No legend needed for "where am I now."
- **`jump-to-date` keyboard input** alongside Previous/Today/Next means staff can both browse and target. Good belt + suspenders.
- **Per-day footer count** ("3 bookings") gives a one-glance load reading per day without scanning every block.
- **Bookings sort by start time** within a day — the obvious right thing, done right.

## Priority Issues

- **[P1] What**: 7-column grid truncates booking names at 1100-1300px.
- **Why it matters**: `staff-week-grid` is `repeat(7, minmax(132px, 1fr))`. At 1100px viewport minus sidebar minus padding, each column is ~140px, and the booking name is `white-space: nowrap; text-overflow: ellipsis` at 15px/700. Names like "Liga ng Kabataan Practice" become "Liga ng Kab…". Hover reveals the full name only on the drawer; at-a-glance scan fails.
- **Fix**: Below ~1280px, drop to a 4×2 layout (Mon-Thu top, Fri-Sun bottom + a soft "next week" footer slot). Or allow 2-line booking names with a `-webkit-line-clamp: 2` cap.
- **Suggested command**: `/impeccable adapt client/src/pages/CalendarPage.jsx`

- **[P1] What**: Five simultaneous status indicators inside a single booking block.
- **Why it matters**: Color-coded left bar + background tint + time-text color + name strikethrough (for missed/cancelled) + a status pill. That's overkill — the staff brain reads ONE of these and the rest become noise. Visual hierarchy collapses.
- **Fix**: Inside the calendar block, drop the status pill (the bar + tint + strike already signal enough and pass the "Status Must Read" rule because the time text reads in danger color and the strikethrough is unmistakable). Reserve the pill for list views and the drawer.
- **Suggested command**: `/impeccable distill client/src/pages/CalendarPage.jsx`

- **[P2] What**: `calendar-week-label` carries a serif "Current week / May 11 - 17" alongside the page-head h1 "Calendar."
- **Why it matters**: Two orientation moments in a row, both serif, both primary-dark. The h1 says "Calendar"; the label says "the week of …" The label is doing useful work, but doesn't need ceremonial type.
- **Fix**: Demote the week label to Inter 600/16px and drop the "Current week" eyebrow above it. Or invert: keep the week-range as the page-head's `page-sub`, and the toolbar shows only navigation.
- **Suggested command**: `/impeccable typeset client/src/pages/CalendarPage.jsx`

- **[P3] What**: "Walang reserbasyon" Filipino italic in every empty day.
- **Why it matters**: On a quiet week, 6 of 7 cards repeat the same italic Tagalog phrase. Helper service text turns into chrome when it repeats.
- **Fix**: Use the Filipino italic once at the page-sub level ("Tingnan ang lahat ng reserbasyon ngayong linggo." already does this). Inside the per-day empty state, English alone is fine.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Lands on the calendar to check "is Saturday open?" Today is highlighted, which is reassuring. But on a Saturday with multiple long bookings, the truncation at her 1280px workstation hides the requester names — she has to click each one. That's the failure mode: a calendar that can't be skim-read.

**Resident at the counter (visual reference, not user)**: Staff sometimes turn the screen to show a resident "look, see, Saturday is full." If names truncate, the resident can't verify; trust drops.

## Minor Observations

- The hover lift `transform: translateY(-1px)` + 3px focus ring on `staff-booking-block` is well-tuned — confident without being twitchy.
- `border-color: var(--primary-soft)` on `.staff-day-head.today` is a small touch that completes the today-isolation effect.
- `staff-day-empty` uses a 1px dashed border, which is the correct register: "this slot exists but is unfilled," not "this slot is broken."

## Questions to Consider

- Could a "Day view" toggle exist for the most-used day (today)? On busy days the week view is too dense; a day view at full width would let purposes and notes breathe.
- Should the Sunday column be visually shorter / dimmer if the office is closed Sundays? Right now it's identical chrome carrying potentially zero data.
- Is there a "month view" planned? Or is week-only the deliberate scope?
