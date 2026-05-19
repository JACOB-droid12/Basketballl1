---
target: client/src/pages/ActivityLogsPage.jsx
total_score: 36
p0_count: 0
p1_count: 1
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-activitylogspage-jsx
---
# Activity Logs — Critique (run 4, browser-verified, 1440)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | "47 shown" + "47 log rows from the local audit table" |
| 2 | Match System / Real World | 4 | "Created a reservation", "Marked the booking missed" |
| 3 | User Control and Freedom | 4 | Search + action filter + date filter + Apply/Clear |
| 4 | Consistency and Standards | 4 | Filter card + table primitives reused |
| 5 | Error Prevention | 3 | Apply requires explicit submit, no accidental refilter |
| 6 | Recognition Rather Than Recall | 4 | Action labels are full English sentences |
| 7 | Flexibility and Efficiency | 3 | All / Today / This week presets + date input |
| 8 | Aesthetic and Minimalist Design | 3 | Three filter fields + presets reads as one toolbar |
| 9 | Error Recovery | 3 | "Could not load activity logs" state-card |
| 10 | Help and Documentation | 4 | "Use this when a resident asks what changed" |
| **Total** | | **36/40** | up from 33/40 |

## Anti-Patterns Verdict

**LLM (browser-verified)**: The action labels are the system's strongest copy work. "Created a reservation / Edited a reservation / Marked the booking missed / Cancelled the booking / Marked the booking done / Created an account / Activated an account / Deactivated an account / Changed a password / Login / Logout / Restore database / Clear public use / Deactivate schedule block." Each line reads like a sentence in a captain's log, not an enum. The user filter labels match the audit table content exactly.

**Deterministic**: Detector clean for `ActivityLogsPage.jsx`.

## What's Working

- **Action labels written as full sentences.** "Marked the booking missed" carries more semantic context than "MARK_MISSED" or even "Mark Missed". The audit table reads top-to-bottom as a story.
- **The grouped action select** (Reservations / Accounts / Other) maps to the categories staff actually search. The "Other" group only appears when there are unknown action codes — graceful degradation for backend additions.
- **The "47 shown" badge** in the filter card head + "47 log rows from the local audit table" in the table card head uses two different framings of the same number. Both useful; one anchors "what's currently filtered", the other anchors "what's in the database".

## Priority Issues

- **[P1] What**: Every reservation-linked log row renders "Reservation reference: **No reference number**" as a small line under the details.
- **Why it matters**: 16 of the 47 rows in this run carry that text. The phrase "No reference number" is the formatReferenceNo() fallback for null/empty referenceNo, but it appears as the row's secondary line for *every* historical reservation log row. Visually it's a 16-row column of "No reference number" labels — a fail-state repeated as noise.
- **Fix**: Either (a) backfill `referenceNo` on the `activity_logs` rows that have a `reservation_id` (the join is available), or (b) suppress the "Reservation reference: ..." line entirely when the formatted reference resolves to "No reference number" — keep the line only when there's a real value to show. Option (b) is the lower-risk fix.
- **Suggested command**: `harden`

- **[P3] What**: The "This week" preset doesn't actually filter by week.
- **Why it matters**: Code comment in `applyDatePreset` admits this: `// for "this week" we clear the date filter and rely on a search hint. A real range filter is a backend follow-up`. So the button is presented as a filter but doesn't work as one.
- **Fix**: Hide the "This week" preset until the backend supports a range, or replace it with "Last 7 days" that sets `date` to a single date a week ago (which is at least *more* selective than "All").
- **Suggested command**: `harden` or `distill`

- **[P3] What**: Login/Logout rows pile up. 11 of 47 rows in this run are "User logged in" — almost a quarter of the table.
- **Why it matters**: The audit table is a real audit log, but on a small office device with one or two staff, login/logout dominate the recent-activity view. A clerk asking "what changed today?" has to scroll past 8 login rows to find the booking actions.
- **Fix**: Add a "Hide login/logout" toggle in the filter card (default on?). Or auto-suppress login/logout rows from the default view, with a small "+ N login/logout events" affordance to expand them.
- **Suggested command**: `distill`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: She's the auditor. She'd type the resident's surname into "Search name, action, or details", press Apply. The Apply/Clear button pair is correct. She'll be confused by 16 "No reference number" rows.

**Carlo (assistant, 20s)**: He'll filter by "Created a reservation" or "Marked the booking missed" — the action select is exactly what he wants.

## Minor Observations

- `formatDateTime` on log rows renders "2026-05-18 02:51" — fine, but inconsistent with the rest of the system, which uses "Mon, May 18, 2026 · 2:51 AM" formatting in headers. Worth aligning the table cell to a slightly more readable form.
- The CSV export button mirrors the on-screen filters via `exportParams` — correct.
- The 50-row visible limit with a "Show all 47 rows" affordance only kicks in past 50 rows, so right now it's invisible. Future-proofing only.
- `aria-checked` on the date preset radiogroup is correct.
