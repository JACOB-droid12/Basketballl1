---
target: "client/src/pages/AccountsPage.jsx"
total_score: 32
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-accountspage-jsx
---
# Accounts — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + 3 error channels (form, status, page) |
| 2 | Match System / Real World | 3 | "Local logins", "office device", added bilingual field hints |
| 3 | User Control and Freedom | 3 | Activate/Deactivate reversible, current-account locked |
| 4 | Consistency and Standards | 4 | Single field system now (Field component everywhere) |
| 5 | Error Prevention | 4 | Field bakes in `aria-invalid`, current-account lock |
| 6 | Recognition Rather Than Recall | 3 | Active/Inactive pills follow the system |
| 7 | Flexibility and Efficiency | 2 | No search, no sort, no bulk actions (carried) |
| 8 | Aesthetic and Minimalist Design | 4 | Form matches reservation form's vocabulary |
| 9 | Error Recovery | 3 | "Updating..." button state on row action |
| 10 | Help and Documentation | 3 | "Use names staff recognize at the desk" copy intact, plus Tagalog field hints |
| **Total** | | **32/40** | up from 28/40 |

## Anti-Patterns Verdict

**LLM**: Two-field-systems drift from run 1 is closed. The create-account form on the left now uses `<Field>` with `staff-field` styling — same 54px height, 2px border, 4px focus glow as the reservation form. Tagalog hints added to each field (Buong pangalan / Pangalan ng user / Password / Tungkulin) bring this form into the bilingual hand-holding pattern the rest of the app uses.

**Deterministic**: No banned patterns.

## What's Working

- **Single field system** — moved from `.field` to `.staff-field` via `<Field>`. Tab order, focus rings, and helper-italic placement now match the reservation form. A user moving between the two screens reads them as "same app."
- **Current-account lock** — still the kind of small smart move that prevents real footguns. "Current account" chip in the action column shows "you can't deactivate yourself from here" at design layer.
- **Non-admin access path** — still graceful. Warning alert + clear language, no 404, no broken UI.
- **Cursor-pointer on data-table rows removed** — global rule scoped down so rows no longer promise a click that doesn't happen.

## Priority Issues

- **[P2] What**: No search or sort on the accounts table.
- **Why it matters**: Carried from run 1. 4 accounts is fine. 12+ gets hard to scan.
- **Fix**: Mirror the bookings-page search input above the table. Optionally make column headers click-to-sort.
- **Suggested command**: `/impeccable adapt client/src/pages/AccountsPage.jsx`

- **[P2] What**: Below ~1024px the data-table still horizontal-scrolls.
- **Why it matters**: ActivityLogs got the table-card stack treatment in run 1. Accounts didn't, and it has the same `min-width: 860px` problem. The Action column (with Activate/Deactivate button) clips on tablet.
- **Fix**: Apply the same `display: block` per-row, `td::before` content-label pattern Activity Logs uses. Reuse, not duplicate.
- **Suggested command**: `/impeccable adapt client/src/pages/AccountsPage.jsx`

- **[P3] What**: 4-up `accounts-summary` (Active / Inactive / Admins / Staff) reads slightly thin.
- **Why it matters**: Each card is `compact-stat` with one line of label and one strong number. On a typical office (3-6 staff), three of the four cards show 0 or 1, which makes the row feel like template padding.
- **Fix**: Collapse to a single line ("3 active staff, 1 admin · 0 inactive") above the create-account section.

## Persona Red Flags

**Admin Kapitan (occasional user)**: Form is now warmer (Tagalog hints on each field). Still no inline password requirements during typing — same complaint as run 1.

**Carlo (assistant, 20s)**: Won't see this screen unless he's promoted to admin. Path is clean.

## Minor Observations

- "Para sa admin lang" Tagalog sub-line dropped — good, it was a fourth orientation line.
- `accountTotals` reduce in one pass is still clean code.
- The non-admin path still has the bilingual sub-line ("Para sa administrator lang ang account management") — keep, that's the screen non-admins land on.

## Trend for `client-src-pages-accountspage-jsx` (last 5 runs): 28 → **32**
