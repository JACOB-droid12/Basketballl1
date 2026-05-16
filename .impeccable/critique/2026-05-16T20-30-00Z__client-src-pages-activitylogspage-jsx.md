---
target: "client/src/pages/ActivityLogsPage.jsx"
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-activitylogspage-jsx
---
# Activity Logs — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error + filter count |
| 2 | Match System / Real World | 4 | Sentence-case action labels — "Created a reservation" not "CREATE_RESERVATION" |
| 3 | User Control and Freedom | 4 | Apply/Clear explicit, three orthogonal filters |
| 4 | Consistency and Standards | 3 | Filter card serif h2 still competes with page-head h1 (carried) |
| 5 | Error Prevention | 3 | Read-only |
| 6 | Recognition Rather Than Recall | 4 | Sentence-case removes the schema-translation step |
| 7 | Flexibility and Efficiency | 3 | Three filters work; no presets like "last hour" |
| 8 | Aesthetic and Minimalist Design | 3 | Two h2 ceremonial moments at the top still |
| 9 | Error Recovery | 3 | error-state card with `role="alert"` |
| 10 | Help and Documentation | 4 | Audit framing + readable on tablet via card-stack |
| **Total** | | **31/40** | up from 25/40 |

## Anti-Patterns Verdict

**LLM**: Big jump. Schema-leaking-labels anti-pattern from run 1 is fully resolved. Action codes now say "Created a reservation" / "Cancelled the booking" / "Deactivated an account" — the database vocabulary stays in the database. Below 1024px the table stacks into card rows with `td::before` content-labels, so Details (the most useful column) no longer clips on tablet. Two run-1 P1 issues retired.

**Deterministic**: No banned patterns.

## What's Working

- **`ACTION_LABELS` map with sensible fallback** — known codes get pre-written sentences ("Marked the booking missed"), unknown codes auto-title-case ("Export report"). Future-proof.
- **Card-stack at 1024px** — `display: block` on tr/td, `td::before { content }` for column labels. The Details column finally has room.
- **Audit framing copy** — "Use this when a resident asks what changed, who changed it, or when it happened." Names the use case, not the feature.
- **Action chip styling adjusted** — 12px → 13px, dropped uppercase, allowed wrap. The chip stops shouting.

## Priority Issues

- **[P2] What**: Filter card has a 28px serif h2 ("Find a recorded action") below the page-head h1.
- **Why it matters**: Carried from run 1. Two ceremonial typographic moments stacked at the top of the page — both primary-dark, both Instrument Serif. The h2 is doing form-label work and shouldn't claim the same chrome.
- **Fix**: Demote the filter h2 to Inter 700/22px. Keep the body para and "N shown" count.
- **Suggested command**: `/impeccable typeset client/src/pages/ActivityLogsPage.jsx`

- **[P3] What**: No pagination or "load more" affordance.
- **Why it matters**: Carried from run 1. A busy office could pile hundreds of log rows in a year.
- **Fix**: If the API caps results, surface the cap. If not, paginate at 50.

- **[P3] What**: No "last hour" / "last shift" preset.
- **Why it matters**: A common audit query is "what's changed in the last hour after this person took over." Manual date-picking is slower than necessary.
- **Fix**: Add a small chip row above the form: "Last hour / Today / This week."

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Resident asks "Bakit nawala yung reserbasyon ng anak ko?" She filters by name. The result row says "Cancelled the booking" — not "MARK CANCELLED." She reads it once, answers. Run-1 friction gone.

**Kapitan (audit reviewer)**: Quarterly scan. Sentence-case rows skim faster than uppercase chips. Real efficiency win at scale.

## Minor Observations

- The error-state card uses `state-mark empty-mark` with "!" content — still functional, could be a Failure pill but low priority.
- Filter `<select>` for actions still keeps uppercase values internally and shows formatted labels — good (filter logic doesn't break).
- 60-second todayKey refresh isn't here (it's bookings-only). Logs are append-only; not needed.

## Trend for `client-src-pages-activitylogspage-jsx` (last 5 runs): 25 → **31**
