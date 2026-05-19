---
target: client/src/pages/AccountsPage.jsx
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-accountspage-jsx
---
# Accounts — Critique (run 4, browser-verified, 1440 + 820)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | "1 active staff, 1 admin · 1 inactive" totals visible |
| 2 | Match System / Real World | 4 | "Local users", "Saved on this system", "Office device" |
| 3 | User Control and Freedom | 3 | Activate / Deactivate per row, no Edit |
| 4 | Consistency and Standards | 4 | Field + form-card + admin-table primitives reused |
| 5 | Error Prevention | 4 | Current account explicitly locked from deactivation |
| 6 | Recognition Rather Than Recall | 4 | Status badges + role labels + creation timestamps |
| 7 | Flexibility and Efficiency | 3 | No bulk action, no rename |
| 8 | Aesthetic and Minimalist Design | 4 | Two-column grid: form + table, balanced |
| 9 | Error Recovery | 3 | Inline alerts on save and on status change |
| 10 | Help and Documentation | 3 | "Use names staff recognize at the desk" inline form copy |
| **Total** | | **36/40** | up from 32/40 |

## Anti-Patterns Verdict

**LLM (browser-verified)**: This page is doing its job. The two-column admin grid splits "create new account" (left) from "see existing accounts" (right) cleanly at 1440. The form copy ("Use names staff recognize at the desk. Passwords stay local to this installation.") is the kind of plain-English context that a developer-only screen would skip. The current-account note ("Signed in as System Administrator. The current account cannot be deactivated from this screen.") is a real preventive affordance, not an afterthought.

**Deterministic**: Detector clean for `AccountsPage.jsx`.

## What's Working

- **The "Local users" table renders with a clear column set**: Full name / Username / Role / Status / Created / Action. Status uses the system's `status-badge` primitive (status-account-active, status-account-inactive). The "Current account" lock displays as a visible label, not a disabled button — staff understand at a glance why they can't deactivate themselves.
- **Status totals line under the page heading** ("1 active staff, 1 admin · 1 inactive") is concise. It uses commas and a middot dot for separation, no card-grid-of-stats.
- **Form sequencing matches the cognitive flow**: Full name → Username → Password (with hint "At least 8 characters, mixing letters and numbers.") → Role. Each field is the standard `Field` primitive with bilingual italic.

## Priority Issues

- **[P3] What**: Activate / Deactivate is the only per-row action. No edit, no rename.
- **Why it matters**: An admin who fat-fingered a username at create time has no recovery path other than deactivate-and-recreate. For a barangay-office shared device, that's plausible.
- **Fix**: Add an "Edit" button next to Activate / Deactivate that opens a small modal (the form pattern already exists). Edit should allow renaming the full name and changing role; username and password remain immutable to keep the audit trail clean.
- **Suggested command**: `harden`

- **[P3] What**: The page-kicker "Admin" + page-title "Accounts" pairing reads correctly, but at 1440 the "1 active staff, 1 admin · 1 inactive" totals line sits below the page-sub on its own row. It could anchor the right edge of the header instead of stacking.
- **Why it matters**: Cosmetic. The header occupies more vertical space than it needs.
- **Fix**: Move `.account-totals` into the `.page-header` flex row's right side, paired with the existing right-side button slot (when one is added). Or render it as a small badge on the page title.
- **Suggested command**: `layout`

## Persona Red Flags

**Tita Marisol (admin, 50s)**: She'd be the one creating Carlo's account on day one. The form copy ("Use names staff recognize at the desk") is exactly the kind of confidence she needs. The Role select labels match the words she'd say out loud ("Staff" / "Admin").

**Future-staff Carlo (staff, 20s, after his account is created)**: He won't see this page — `isAdmin` gate. Correct.

## Minor Observations

- `account-status status-account-active` / `status-account-inactive` are wired correctly through `StatusBadge`.
- The form's "Create Account" submit button doesn't carry `btn-big`. Inconsistent with other primary submit actions in the system; not a P0 because the form itself is small. Consider promoting the form footer to use `btn-big` for symmetry with the reservation form.
- The Inactive row's "Activate" button is a `btn-primary` rather than a `btn-light` — that's intentional (it's the call-to-action for reactivation) but at scale (10+ inactive rows) the page would have 10 primary buttons stacked. Not a problem at current scale.
