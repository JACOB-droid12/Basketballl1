---
target: client/src/pages/ReportsPage.jsx
total_score: 26
p0_count: 2
p1_count: 1
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-reportspage-jsx
---
# Summary / Reports — Critique (run 4, browser-verified, 1440)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Range presets pressed-state correct; loading state inline |
| 2 | Match System / Real World | 2 | "Counts come from `statusCounts` exactly as returned" leaks |
| 3 | User Control and Freedom | 3 | All time / Week / Month / Year / Custom + CSV + Print |
| 4 | Consistency and Standards | 3 | Card + table primitives reused |
| 5 | Error Prevention | 3 | Custom range fields validate, debounce request |
| 6 | Recognition Rather Than Recall | 3 | Section heads are clear |
| 7 | Flexibility and Efficiency | 3 | Range presets + custom + CSV |
| 8 | Aesthetic and Minimalist Design | 2 | 11 sections stacked, ISO month label "2026-05" raw |
| 9 | Error Recovery | 3 | Standard alert |
| 10 | Help and Documentation | 1 | Section captions are dev-facing prose |
| **Total** | | **26/40** | the noisiest page |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: The reports page reads like a backend developer's print-of-the-payload more than a barangay summary. Eleven sections (Status breakdown, Top requesters, Most used days, Most used time slots, Monthly count, Reservations by purpose, Reservations encoded by staff, Missed reservations, Cancelled reservations, Cleared public use, Maintenance blocks) all open with a card-section-head + descriptor pair. The descriptors are the problem.

Two clear leaks of internal state into user-facing copy:
- Status breakdown caption: **"Counts come from `statusCounts` exactly as returned."** The backticks are HTML-escaped in the snapshot output, but the string makes it to the DOM. That's a developer comment, not a staff-facing caption.
- Monthly reservation count rows render the raw ISO month: **"2026-05"** with count "6". Staff read "2026-05" as "twenty twenty-six dash zero five", which is gibberish.

These are the textbook AI-slop tell: the system is showing the user a structure that mirrors the JSON response. Real reports look at the JSON and write user-facing copy on top.

**Deterministic**: Detector clean for `ReportsPage.jsx`.

## What's Working

- **Range preset bar reads cleanly.** "All time / This week / This month / This year / Custom" with a pressed-state on the active preset. Custom expands to a from/to date pair only when selected — progressive disclosure done right.
- **The summary headline section** with the big "7 hrs" court-hours-booked number is the right anchor for the page. Everything else is supporting detail.
- **Empty-state cards** for the various sections fall back to the standard `EmptyState` primitive ("No cleared public-use ranges · No public-use clear actions were recorded for this range") — consistent voice with the rest of the system.

## Priority Issues

- **[P0] What**: "Counts come from `statusCounts` exactly as returned." appears as the visible Status breakdown caption.
- **Why it matters**: This is a developer-only line. It mentions a JSON key name. It's the kind of copy a code reviewer would catch immediately, and on a public-facing screen it makes the system look unfinished.
- **Fix**: Replace with a user-facing caption: "How reservations broke down across statuses." or drop the caption entirely; the section head "Status breakdown" is enough.
- **Suggested command**: `clarify`

- **[P0] What**: Monthly reservation count renders raw ISO month strings ("2026-05") as the row label.
- **Why it matters**: Carried from a deeper code path. Staff don't read ISO months. The bar-list visualization is right, the data is right, the *label* is wrong.
- **Fix**: Format `row.month` through a `formatMonth(value)` helper that returns "May 2026" (or "Mayo 2026" depending on register). The `Intl.DateTimeFormat` call already exists elsewhere in the codebase; reuse it.
- **Suggested command**: `clarify` or `harden`

- **[P1] What**: All eleven sections stack vertically with `card padded-card` containers. Same shape, same padding, same head pattern, same emptiness.
- **Why it matters**: From the snapshot, the Reports page is the longest page in the system. After the headline summary, the user has to scroll past 8+ identical cards to reach Missed / Cancelled / Cleared / Maintenance. There's no visual scanning pattern. Each card body is interesting; collectively they're monotony.
- **Fix**: Three changes. (1) Use the `report-grid` two-column pattern (already declared in JSX) consistently — Status + Top requesters / Most used days + Most used time slots / Monthly count + Reservations by purpose. (2) Move "Reservations encoded by staff" into the same grid pair, paired with itself or with Top requesters. (3) Pull Missed / Cancelled / Cleared / Maintenance into a tabbed surface ("Detail tables: Missed | Cancelled | Cleared | Maintenance") to reduce vertical weight.
- **Suggested command**: `layout`

- **[P2] What**: Section captions across the page are written from the developer's POV.
  - "Reservations encoded by staff" caption: "Number of reservations created by each staff encoder."
  - "Reservations by purpose" caption: "Counts and booked hours per purpose label."
  - "Most used time slots" caption: "One-hour buckets across active reservations."
- **Why it matters**: They explain *what data this section contains*, not *what to do with it*. A barangay clerk doesn't need "one-hour buckets" — they need "Which times of day are busiest?" The voice across the page should be a question or a directive, not a schema description.
- **Fix**: Rewrite each caption as a question or staff-facing directive. Examples:
  - "Reservations encoded by staff" → "Who encoded the most this period?"
  - "Most used time slots" → "Which times of day fill up first?"
  - "Reservations by purpose" → "What kinds of bookings are most common?"
- **Suggested command**: `clarify`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: She wants to print the report and hand it to the Kapitan. The Print button at the top right works (window.print). But the on-screen layout is so long she'll get to the print preview only to discover most of it is dev-facing prose.

**Carlo (assistant, 20s)**: He'll spot "2026-05" immediately. He'd assume it's a UI bug.

## Minor Observations

- `formatHours(value)` says "0 hrs" for zero, "1 hr" for one, "2 hrs" for two. Pluralization correct. Good.
- Top requesters rendering "3434343434" as a name (because that string is in `representativeName` for one of the test rows) is a data-quality issue, not a UI issue. But the report has no defense against junk: the `requester-row` renders any string at full body weight. A truncate-with-tooltip pattern would help.
- The print stylesheet already exists (`.print-hidden` class on the toolbar). Worth confirming the print output suppresses the bar list visualizations and renders tables only. (Out of scope for this run; flag for `harden`.)
