---
target: client/src/pages/ReportsPage.jsx
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T11-00-00Z
slug: client-src-pages-reportspage-jsx
---
# Summary / Reports — Critique (run 5, browser-verified, 1440 — post-fix)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Range presets pressed-state, loading inline |
| 2 | Match System / Real World | 4 | Captions rewritten to staff-facing directives |
| 3 | User Control and Freedom | 3 | Tabbed detail tables let staff jump to one |
| 4 | Consistency and Standards | 4 | Tabs reuse `.filter-tab` primitive |
| 5 | Error Prevention | 3 | Custom range fields validate, debounce request |
| 6 | Recognition Rather Than Recall | 4 | Counts on each detail tab |
| 7 | Flexibility and Efficiency | 3 | Range presets + custom + CSV; print expands all 4 tables |
| 8 | Aesthetic and Minimalist Design | 3 | 4 stacked cards became 4 grids + 1 tabbed card; less weight |
| 9 | Error Recovery | 3 | Standard alert |
| 10 | Help and Documentation | 4 | Each section caption is now a question or directive |
| **Total** | | **34/40** | up from 26/40 (run 4) |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: Both P0 leaks fixed and confirmed in the live DOM:
- Status breakdown caption now reads "How reservations broke down across statuses." (was: "Counts come from `statusCounts` exactly as returned.")
- Monthly reservation count row label renders "May 2026" (was: "2026-05")

The four detail tables (Missed / Cancelled / Cleared for public use / Maintenance) now share one bordered card with a tab strip at the top showing per-tab counts. Default tab is "Missed" — the resident-question this surface most often answers. Print stylesheet expands all four into a single printable column so the office-PDF still carries the full audit.

**Deterministic**: Detector clean for `ReportsPage.jsx` (verified run 5).

## What's Working

- **Tabbed detail card with counts.** "Missed (2) | Cancelled (1) | Cleared for public use (0) | Maintenance (0)" — staff see at a glance which detail sections actually have rows before they switch.
- **Captions are now staff-facing directives or questions**: "Who books the most court hours.", "Which weekdays the court is busiest.", "Which times of day fill up first.", "What kinds of bookings are most common.", "How many bookings each month carried.", "Who encoded the most reservations this period." Each caption tells the staff member *what to do* with the section, not what data structure produced it.
- **Print path preserved.** The print stylesheet hides the on-screen tabbed panel and renders all four detail sections in full, headed by their h3 titles. No regression on the "print and hand to the Kapitan" workflow.

## Priority Issues

- **[P3] What**: Status filter combobox at the top of Bookings still lacks a tightly anchored "Status:" prefix.
- **Why it matters**: Carried; not fixed this round (small-tweaks scope).
- **Fix**: Render a visible 12px/700 muted "Status" word inline before the combobox.
- **Suggested command**: `clarify`

- **[P3] What**: "Top requester" headline still renders the literal `representativeName` (e.g., "3434343434") for junk data.
- **Why it matters**: Data-quality issue, surfaced because the report has no defense against it.
- **Fix**: Truncate the requester name at 32 chars + ellipsis. Out of scope for small-tweaks.
- **Suggested command**: `harden`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: She'll print first, scroll second. The print preview now expands all four detail tables in full — same audit she had before, less on-screen scrolling. The "Top requester" still shows "3434343434" for one of the test rows; she'll roll her eyes at the data, not the UI.

**Carlo (assistant, 20s)**: He'll switch between tabs to answer specific questions ("any cancelled rows last week?"). Counts on the tabs let him skip empty ones.

## Trend (5 runs): 25 → 32 → 32 → 32 → 26 → **34**
