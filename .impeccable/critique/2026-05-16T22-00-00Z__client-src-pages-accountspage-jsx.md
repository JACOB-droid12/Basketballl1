---
target: "client/src/pages/AccountsPage.jsx"
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T22-00-00Z
slug: client-src-pages-accountspage-jsx
---
# Accounts — Critique (run 3, browser-verified)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + 3 error channels |
| 2 | Match System / Real World | 4 | "Buong pangalan / Pangalan ng user / Password / Tungkulin" |
| 3 | User Control and Freedom | 3 | Activate/Deactivate reversible, current-account locked |
| 4 | Consistency and Standards | 4 | Single field system + same table-stack pattern as Activity Logs |
| 5 | Error Prevention | 4 | Field bakes in `aria-invalid`, current-account lock |
| 6 | Recognition Rather Than Recall | 4 | Status pills, Tagalog field hints |
| 7 | Flexibility and Efficiency | 2 | No search, no sort, no bulk actions (carried) |
| 8 | Aesthetic and Minimalist Design | 4 | Form matches reservation form, table card-stacks at 820 |
| 9 | Error Recovery | 3 | "Updating..." button state on row action |
| 10 | Help and Documentation | 3 | "Use names staff recognize at the desk" + per-field bilingual hints |
| **Total** | | **34/40** | up from 32/40 |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440 and 820)**: The card-stack at 820 works. Each row shows `FULL NAME / USERNAME / ROLE / STATUS / CREATED / ACTION` labels above their values via `td::before { content }`. Same pattern Activity Logs uses — proper reuse.

The Activate/Deactivate button at the bottom of each card row gets `width: 100%` on narrow viewports, so it's a clear thumb target. The "Current account" lock chip sits in the same slot for the signed-in user. Action affordance is unambiguous.

The form on the left uses the Field component throughout — same 54px height, 2px border, 4px focus glow as the reservation form. Bilingual field hints on every input.

**Deterministic**: No banned patterns. Cursor-pointer fix from run 2 confirmed (rows still highlight on hover, no false click signal).

## What's Working

- **Card-stack reuse**: Same media-query pattern from Activity Logs applied to `.admin-table`. Bottom-action button gets full width on narrow. Clean.
- **Bilingual field hints**: "Full name · Buong pangalan", "Username · Pangalan ng user", "Password · Password", "Role · Tungkulin" — matches the reservation form's vocabulary, lowers staff hesitation.
- **Status pills (`status-account-active` / `status-account-inactive`)** still consistent with the rest of the system.
- **Current-account lock**: I verified the signed-in user (Ana Reyes) shows "Current account" instead of an Activate/Deactivate button. Footgun-prevention at design layer.

## Priority Issues

- **[P2] What**: No search or sort on the accounts table.
- **Why it matters**: Carried from runs 1 and 2. 4 accounts is fine. 12+ gets hard to scan.
- **Fix**: Mirror the bookings-page search input above the table. Optionally make column headers click-to-sort.
- **Suggested command**: `/impeccable harden client/src/pages/AccountsPage.jsx`

- **[P3] What**: 4-up `accounts-summary` grid at 820 reads thin.
- **Why it matters**: Carried from run 2. With 4 accounts, three of the four cards show 0/1 — template padding on a screen that doesn't need it.
- **Fix**: Collapse to a single sentence ("3 active staff, 1 admin · 1 inactive") above the form.

- **[P3] What**: Password field has no inline strength indicator or minimum-length hint.
- **Why it matters**: A kapitan creating a staff account in 30 seconds will pick "0000" if nothing pushes back. Run-2 carried.
- **Fix**: Add a small "At least 8 characters" hint under the password field; optionally a strength meter.

## Persona Red Flags

**Admin Kapitan (occasional user)**: Form is now warmer (Tagalog hints). Card-stack at 820 means tablet use is viable. Still wishes for inline password requirements.

**Carlo (assistant, 20s)**: Won't see this screen. Path unchanged.

## Minor Observations

- "Accounts" page-head h1 + "Admin" page-kicker reads cleanly. Tagalog page-sub-fil dropped in the run-1 polish.
- The signed-in-as alert ("Signed in as Ana Reyes. The current account cannot be deactivated from this screen.") still surfaces the safeguard in plain language.
- Stat-card uppercase labels ("ACTIVE / INACTIVE / ADMINS / STAFF") feel slightly louder than the rest of the page — borderline, not a fix.

## Trend for `client-src-pages-accountspage-jsx` (last 5 runs): 28 → 32 → **34**
