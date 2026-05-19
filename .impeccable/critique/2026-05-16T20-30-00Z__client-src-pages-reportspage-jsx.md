---
target: "client/src/pages/ReportsPage.jsx"
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-reportspage-jsx
---
# Reports — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error states present, range refresh visible |
| 2 | Match System / Real World | 3 | Status names match, "Court-hours booked" + Tagalog `Oras na ginamit` |
| 3 | User Control and Freedom | 4 | Date-range presets + custom from/to |
| 4 | Consistency and Standards | 4 | Single serif moment, supporting figures in Inter |
| 5 | Error Prevention | 3 | Read-only |
| 6 | Recognition Rather Than Recall | 4 | Status pills as bar-row labels |
| 7 | Flexibility and Efficiency | 3 | Preset chips + custom range |
| 8 | Aesthetic and Minimalist Design | 4 | Identical-card-grid anti-pattern resolved, 7 serif numbers down to 1 |
| 9 | Error Recovery | 3 | Generic alert |
| 10 | Help and Documentation | 2 | Range presets land on UI but backend doesn't honor `from`/`to` yet (server returns same data) |
| **Total** | | **32/40** | up from 25/40 — biggest jump |

## Anti-Patterns Verdict

**LLM**: Both anti-patterns from run 1 are resolved. The "identical card grids, repeated endlessly" trap is gone — there's now one distinguished surface (`.report-headline`) with a single 64px serif moment, two supporting figures in Inter 22/700, and the bar chart leads the page. The "Title Has a Job" rule is honored: serif appears at the page-head and the one headline metric, nowhere else.

**Deterministic**: No banned patterns.

## What's Working

- **Single-headline composition** — Court-hours booked is *the* number. Total reservations and Top requester sit beside it as supporting data, separated by a 1px border. Reads like a real report opener instead of a SaaS dashboard grid.
- **Status pills as bar-row labels** — still the system's smartest reuse. The breakdown chart speaks the same vocabulary as the calendar and list views.
- **Range presets** — "All time / Week / Month / Year / Custom" is the right shape. The custom from/to inputs only render when needed.
- **Print treatment intact** — `print-hidden` on header + range row, `.print-title` block becomes visible. Still the only screen that took print seriously.

## Priority Issues

- **[P1] What**: UI passes `from`/`to` query params, backend ignores them.
- **Why it matters**: The user flips to "This month" and the same numbers come back. That's worse than no filter — it implies the filter is broken. From a polish perspective the UI lies.
- **Fix**: Either (a) wire the backend to honor the params (out of frontend scope), or (b) add a "Filter coming soon" inline hint when range !== "all", or (c) remove the range row until the backend ships.
- **Suggested command**: This is a backend follow-up. The frontend can flag it with a banner.

- **[P3] What**: `.report-headline` left column dominates the right column.
- **Why it matters**: Court-hours booked at 64px serif visually outweighs Total reservations (22px Inter) by a factor that's possibly too aggressive. The right column reads as a footnote, not a peer.
- **Fix**: Either bring Total reservations up to 36px (still less than the headline), or shrink the headline to 48px so the contrast is 2.2:1 instead of 2.9:1.

- **[P3] What**: Tagalog `Oras na ginamit` lives inside the headline label as a `<span class="fil">`.
- **Why it matters**: Reads cleanly at 1440px; on narrow screens the inline italic fight crowds the kicker.
- **Fix**: At < 720px stack the Tagalog onto its own line.

## Persona Red Flags

**Kapitan (audience for the printed report)**: Sees one big number now and instantly reads "this is the answer" — that's the hierarchy fix. **But**: he selects "This month" expecting filtered numbers. Same numbers come back. Suspicion of system correctness.

**Tita Marisol (clerk, 50s)**: Doesn't usually open Reports. When she does (year-end summary task), the range presets give her a fast path to "show me 2025."

## Minor Observations

- The bar-track is still 12px clean pill — no fake 3D, no gradient. Matches.
- Top requesters list still uses `requester-row` with 1px borders — list, not card.
- `formatHours` shows "12.5 hrs" cleanly but "0 hrs" reads slightly off; consider "No hours yet" as the zero-state.

## Trend for `client-src-pages-reportspage-jsx` (last 5 runs): 25 → **32**
