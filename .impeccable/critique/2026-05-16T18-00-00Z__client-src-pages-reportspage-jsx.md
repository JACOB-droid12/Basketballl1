---
target: "client/src/pages/ReportsPage.jsx"
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-reportspage-jsx
---
# Reports — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error states present |
| 2 | Match System / Real World | 3 | Status names match domain |
| 3 | User Control and Freedom | 2 | No date-range filter, no drill-in, no comparison |
| 4 | Consistency and Standards | 3 | Tokens followed; serif used as data-display, not orientation |
| 5 | Error Prevention | n/a | Read-only |
| 6 | Recognition Rather Than Recall | 4 | Status pills as bar-row labels — semantic + visual |
| 7 | Flexibility and Efficiency | 2 | No CSV/PDF export beyond browser print, no date scope |
| 8 | Aesthetic and Minimalist Design | 2 | 7-card grid + 7 serif numbers = identical-card-grid anti-pattern |
| 9 | Error Recovery | 3 | Generic alert |
| 10 | Help and Documentation | 3 | "Cancelled rows excluded from booked hours" subtitle is honest |
| **Total** | | **25/40** | **Functional, but two anti-patterns and no scope control** |

## Anti-Patterns Verdict

**LLM assessment**: Trips two of DESIGN.md's named bans. (1) The 3-up `stats-grid` followed by the 4-up `status-summary-grid` is the "identical card grids, repeated endlessly" pattern — same `stat-card` class, same serif numbers, same helper-text recipe, 7 times. (2) The serif overload: every one of those 7 numbers uses Instrument Serif. The "Title Has a Job" rule says serif is for orientation moments, not for data display.

**Deterministic scan**: No glassmorphism, no gradients, no banned side-stripes. Skipped CLI scan.

## Overall Impression

The bones are right — totals at the top, breakdown by status as a horizontal bar chart, top requesters as a hours list — but the page mistakes "data" for "orientation." Every number is set in serif as if each one were a hero moment, and the same card primitive runs across 7 cells, two rows. A report should distinguish "headline" from "supporting data" through hierarchy, not repeat the same display 7 times.

## What's Working

- **Status pills as bar-row labels.** Each row of the breakdown chart uses the existing `StatusBadge` component as its left label. The color, the dot, and the text all carry over from the rest of the system — a resident reading this report sees the same vocabulary the calendar uses. Genuinely good systems thinking.
- **Print treatment.** `print-hidden` class on the page-header + a `.print-title` block that becomes visible only in print. Real attention to the printed artifact, which is what barangay reports actually live as.
- **Cancelled-rows-excluded methodology** is documented inline next to the metric — defensible math.

## Priority Issues

- **[P1] What**: Identical card grids, repeated endlessly.
- **Why it matters**: 3-card stats-grid (Total / Hours / Top requester) + 4-card status-summary-grid (Reserved / Did not show / Completed / Cancelled). Both rows use the same `stat-card`, same serif numbers, same kicker. The second row duplicates information that the bar chart below shows with proportions.
- **Fix**: Drop the 4-card status row entirely — the bar chart is the better representation. Keep the 3-card top row for headline metrics.
- **Suggested command**: `/impeccable distill client/src/pages/ReportsPage.jsx`

- **[P1] What**: Seven serif numbers stacked.
- **Why it matters**: DESIGN.md's "Title Has a Job" rule reserves Instrument Serif for orientation moments — page titles, hero numbers, card heads. A grid of 7 serif numbers, all the same size class, breaks the rule seven times and flattens the hierarchy that serif is supposed to create.
- **Fix**: Reserve serif for the page-head + the single most important number (likely "Total reservations" or "Court-hours booked"). The rest become Inter 700/40px and read more honestly as data.
- **Suggested command**: `/impeccable typeset client/src/pages/ReportsPage.jsx`

- **[P2] What**: No date-range scope.
- **Why it matters**: "Reports" implies a window — last week, last month, year-to-date. This page reads from `/api/reports` with no parameters and shows a single static blob. A clerk who needs "April numbers for the kapitan" can't filter; a year-end summary doesn't exist.
- **Fix**: Add a date-range control at the top (preset chips: This week / This month / This year / Custom). The card data flows from there.
- **Suggested command**: `/impeccable harden client/src/pages/ReportsPage.jsx`

- **[P3] What**: Bilingual sub-line repeats the page sub.
- **Why it matters**: "Current reservation totals from the local database" + "Ulat para sa mabilis na review ng staff" stack on the page-head. Two descriptions, neither adds info beyond the kicker + h1. Reports is a less-frequent screen — the bilingual hand-holding is helpful here, but only one sentence is needed.
- **Fix**: Drop the English `page-sub` ("Current totals...") and keep the Tagalog hint, or vice-versa.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Sees seven serif numbers and reads the first one as "the answer" — but which is the answer? Is the page asking her to read Total Reservations or Court Hours? With 7 equal-weight numbers, hierarchy is gone. She'd be helped by a single dominant figure.

**Kapitan (audience for the printed report)**: He receives the printout, sees a generous-looking page with two grids of numbers, scans for one number that says "is this month busy?" — and there isn't one. There's seven. He picks one and trusts it; the design didn't help him.

## Minor Observations

- The `bar-track` is a 12px-tall pill with the primary color filling — clean, no fake 3D, no gradient. Matches the system.
- "Top requesters" with `requester-row` separated by 1px borders is the right pattern — list, not card, list, not card.
- `formatHours` rounds to 2 decimals — fine for hours like 12.5; might display "12 hrs" awkwardly when whole numbers happen.

## Questions to Consider

- What's the office actually printing? If it's a monthly summary the kapitan signs, the page should default to "This month" and show a printable receipt-style layout, not a dashboard.
- Would a per-purpose breakdown (Practice / League / Birthday / Meeting) help more than per-status? Status answers "what state is the data in"; purpose answers "what is the court FOR."
- Is there a ceiling on `topRequesters`? An offline office with 200 different requesters over a year doesn't need all 200 listed.
