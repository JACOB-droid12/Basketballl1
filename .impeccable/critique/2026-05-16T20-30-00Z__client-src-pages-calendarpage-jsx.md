---
target: "client/src/pages/CalendarPage.jsx"
total_score: 31
p0_count: 0
p1_count: 1
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-calendarpage-jsx
---
# Calendar — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Today gets blue head, isLoading state inside a calendar-state-card |
| 2 | Match System / Real World | 4 | Weekly view, "Tingnan ang lahat", "Today" highlight |
| 3 | User Control and Freedom | 4 | Previous / Today / Next + jump-to-date — all paths open |
| 4 | Consistency and Standards | 3 | RESERVED and COMPLETED blocks now visually identical (regression from removing the pill) |
| 5 | Error Prevention | 3 | Read-only browse |
| 6 | Recognition Rather Than Recall | 3 | Today head unmistakable; status-by-color works for missed/cancelled |
| 7 | Flexibility and Efficiency | 3 | Jump-to-date is keyboard-accessible |
| 8 | Aesthetic and Minimalist Design | 3 | Block names wrap to 2 lines instead of truncating |
| 9 | Error Recovery | 3 | Generic error alert |
| 10 | Help and Documentation | 2 | No legend for left-bar / tint meaning, and now no pill to fall back on |
| **Total** | | **31/40** | up from 30/40 — small net gain, see regression below |

## Anti-Patterns Verdict

**LLM**: The 7→4→2→1 column collapse is the right kind of structural responsive thinking, and the 2-line `-webkit-line-clamp` solves the truncation that ran the at-a-glance scan into the wall in run 1. **But** the StatusBadge removal in the calendar block introduced a regression I missed in the action pass: with the pill gone, RESERVED and COMPLETED blocks render almost identically. Both use `--primary-softer` background, both have the 4px civic-blue left bar, both color the time text in `--primary`. The only difference is `border-color: --primary-soft` (vs `--border` on RESERVED). At 14-15px that 1px ring is invisible.

This is the failure mode of trimming visual signals: when one carrier disappears, the others have to step up. They didn't.

**Deterministic**: 4px border-left on `staff-booking-block` is the documented exception. No other banned patterns.

## What's Working

- **Responsive collapse** — at 1100px the 7-col grid was unusable in run 1; 4-col now gives each booking ~270px and names breathe. At 820px down to 2-col is honest tablet behavior. The 480px 1-col stack is what the smallest screenshot needed.
- **`-webkit-line-clamp: 2`** on name + purpose — at-a-glance scan works at every breakpoint now.
- **Today head with white text on civic blue** — still the most readable orientation cue in the app.

## Priority Issues

- **[P1] What**: RESERVED and COMPLETED blocks are visually indistinguishable.
- **Why it matters**: A clerk scanning the week can't tell which bookings have been marked done from those still upcoming. "Status Must Read" is broken for the COMPLETED variant. The system also can't claim a default-RESERVED look anymore — it's the same look as "already finished."
- **Fix**: Either re-add the StatusBadge for COMPLETED only (one-status exception, not all four), or distinguish COMPLETED with a dim treatment: opacity 0.7, line-through on time, faded border. The dim-and-faded approach matches MISSED/CANCELLED's visual language without adding back chrome.
- **Suggested command**: `/impeccable harden client/src/pages/CalendarPage.jsx`

- **[P3] What**: Per-day footer count duplicates information that's now visible.
- **Why it matters**: With names wrapping cleanly at 4-col, "3 bookings" footer is a third source of the same fact (visible bookings, day-head, footer). It's friendly chrome but it's chrome.
- **Fix**: Drop the footer when bookings.length > 0, keep only on empty days as part of the empty state.

- **[P3] What**: "Walang reserbasyon" in every empty day card.
- **Why it matters**: Carried from run 1. On a quiet week 6 of 7 cards repeat the same italic Tagalog.
- **Fix**: Use English-only inside the empty card; the page-sub already carries the bilingual context.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Names readable on her 1280px workstation now — that was the run-1 sticking point. New problem: "did this 4pm booking happen?" reads with the same color as "this 4pm booking is scheduled." She has to click in to see status. Slows her down.

**Carlo (assistant, 20s)**: 4-col is fine for him. Same status ambiguity affects him too.

**Resident at the counter**: Staff still turn the screen for visual reference. They can't say "see, Saturday already had 3 completed bookings" any more, because completed and reserved look the same.

## Minor Observations

- The hover `transform: translateY(-1px)` and 3px focus ring still feel right — confident, not twitchy.
- `staff-day-empty` 1px dashed border is the right register for "this slot exists but is unfilled."
- Aria-label on the booking-block now spells the status word for screen readers — that helps for the assistive case even though sighted users lost the visible signal.

## Trend for `client-src-pages-calendarpage-jsx` (last 5 runs): 30 → **31**
