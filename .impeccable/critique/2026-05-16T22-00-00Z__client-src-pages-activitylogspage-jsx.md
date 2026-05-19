---
target: "client/src/pages/ActivityLogsPage.jsx"
total_score: 33
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T22-00-00Z
slug: client-src-pages-activitylogspage-jsx
---
# Activity Logs — Critique (run 3, browser-verified)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error + filter count |
| 2 | Match System / Real World | 4 | All actions now plain English sentences |
| 3 | User Control and Freedom | 4 | Apply/Clear explicit, three orthogonal filters |
| 4 | Consistency and Standards | 4 | Filter h2 demoted to Inter; one ceremonial moment per page |
| 5 | Error Prevention | 3 | Read-only |
| 6 | Recognition Rather Than Recall | 4 | "Created a reservation" not "CREATE_RESERVATION" |
| 7 | Flexibility and Efficiency | 3 | Three filters work; no presets like "last hour" |
| 8 | Aesthetic and Minimalist Design | 4 | Page-head h1 is the only ceremonial moment now |
| 9 | Error Recovery | 3 | error-state card with `role="alert"` |
| 10 | Help and Documentation | 4 | Audit framing intact, readable on tablet via card-stack |
| **Total** | | **33/40** | up from 31/40 |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440 and 820)**: I confirmed the action labels render as sentence-case English in both the result rows AND the dropdown options:
- Result rows: "Created a reservation", "Marked the booking done", "Cancelled the booking", "Deactivated an account", "Changed a password"
- Dropdown: "All actions", "Activated an account", "Changed a password", "Created an account", "Created a reservation", "Deactivated an account", "Cancelled the booking", "Marked the booking done", "Marked the booking missed", "Edited a reservation"

Schema-leaking-labels anti-pattern is fully resolved. The dropdown's alphabetic sort produces a slightly awkward order ("Activated", "Changed", "Created an account", "Created a reservation", "Deactivated", "Cancelled", "Marked the booking done"...) but each option is independently readable.

The filter h2 ("Find a recorded action") now renders Inter 700/22px instead of 28px serif — verified at the page-head level, the h1 "Activity logs" is now the only Instrument Serif moment on the page.

**Deterministic**: No banned patterns.

## What's Working

- **Sentence-case labels everywhere**: Both the action chip in result rows AND the filter dropdown speak human now. Run-1 schema leak fully closed.
- **Single ceremonial moment**: After typeset, the page-head h1 owns the serif role; everything else is Inter. "Title Has a Job" rule respected.
- **Card-stack at 820**: Date and time / User / Action / Details labels appear above each value. Details column finally has room (was clipping in run 1).

## Priority Issues

- **[P3] What**: Action dropdown sort is alphabetic across mixed verb tenses.
- **Why it matters**: "Created an account / Created a reservation / Deactivated an account / Cancelled the booking / Marked the booking done" mixes "Created..." and "Marked..." and "Cancelled..." with no grouping. A staff member scanning for "what booking actions exist?" has to read every option.
- **Fix**: Group options by domain (account actions / reservation actions / password actions) using `<optgroup>`.

- **[P3] What**: No "last hour" / "last shift" preset.
- **Why it matters**: Carried from run 1. Common audit query is "what changed in the last hour?"
- **Fix**: Small chip row above the form: "Last hour / Today / This week."

- **[P3] What**: No pagination or "load more" affordance.
- **Why it matters**: Carried from runs 1 and 2. A busy office could pile hundreds of log rows in a year.
- **Fix**: If the API caps results, surface the cap. If not, paginate at 50.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Resident asks "Bakit nawala yung reserbasyon?" She filters by name, sees "Cancelled the booking" — not "MARK CANCELLED." Reads, answers. Run-1 friction gone.

**Kapitan (audit reviewer)**: Quarterly scan is faster with sentence-case rows. Real efficiency win at scale.

## Minor Observations

- The "5 shown" count chip in the filter-head still reads cleanly.
- Filter `<select>` keeps uppercase values internally and shows formatted labels — good (filter logic doesn't break).
- Audit framing copy ("Use this when a resident asks what changed, who changed it, or when it happened") still names the use case. Keep.

## Trend for `client-src-pages-activitylogspage-jsx` (last 5 runs): 25 → 31 → **33**
