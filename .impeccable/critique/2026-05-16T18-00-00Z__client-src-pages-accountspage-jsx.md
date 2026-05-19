---
target: "client/src/pages/AccountsPage.jsx"
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-accountspage-jsx
---
# Accounts (Admin) — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + 3 error channels (form, status, page) |
| 2 | Match System / Real World | 3 | "Local logins", "office device" — grounded language |
| 3 | User Control and Freedom | 3 | Activate/Deactivate is reversible, current-account locked |
| 4 | Consistency and Standards | 2 | Two field systems live side by side; data-table cursor mismatch |
| 5 | Error Prevention | 3 | Current-account lock; server-side validation surfaces fieldErrors |
| 6 | Recognition Rather Than Recall | 3 | Active/Inactive pills follow the system |
| 7 | Flexibility and Efficiency | 2 | No search, no sort, no bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | 4-up summary works; form-vs-table style drift |
| 9 | Error Recovery | 3 | "Updating..." button state on row action |
| 10 | Help and Documentation | 3 | "Use names staff recognize at the desk" copy is real help |
| **Total** | | **28/40** | **Functional with a consistency drift** |

## Anti-Patterns Verdict

**LLM assessment**: Two consistency drifts — not anti-pattern violations per se, but they're the kind of detail that makes a project feel like one designer left and another arrived. (1) The form on the left uses the legacy `.field` styles (48px / 17px / 1px border / 8px radius) while the reservation form uses `.staff-field` (54px / 17px / 2px border / 10px radius). Two field systems in the same app. (2) `data-table tr { cursor: pointer }` is set globally, but rows here aren't clickable — only the action button in the last column is.

**Deterministic scan**: No banned patterns. Skipped CLI scan.

## Overall Impression

The functionality is correct and the safeguards are right (current-account locking is the kind of small smart move that prevents real footguns). But the implementation drifts from the rest of the app: inputs look smaller than the reservation form's inputs, table cells use the global 12px-uppercase header style, and the row hover hints at a clickability that isn't there. The screen does its job; it just doesn't feel like the same app as the form pages.

## What's Working

- **Non-admin access path is graceful.** Staff who land here see "Admin access required" with a warning alert. Doesn't 404, doesn't hide the link, doesn't expose admin data. Right shape for RBAC affordance.
- **Current-account lock as a chip in the action column.** Visually shows "you can't deactivate yourself from here" before the user tries — prevents the footgun at the design layer.
- **`status-account-active` / `status-account-inactive` pills** reuse the same primitive as reservation status pills, with sibling tokens. Consistent vocabulary.

## Priority Issues

- **[P1] What**: Two field systems coexist.
- **Why it matters**: The reservation form establishes `.staff-field` (54px / 2px border / 4px focus glow) as the project's primary control. The admin create-account form here uses the legacy `.field` (48px / 1px border / 3px focus outline). Both work; they look different. A user moving between the two screens reads it as "wait, did I just enter a different app?"
- **Fix**: Refactor the create-account form to use the `Field` component (the same one ReservationFormPage uses) and the `staff-field` class. About 40 lines of jsx.
- **Suggested command**: `/impeccable polish client/src/pages/AccountsPage.jsx`

- **[P1] What**: Data-table rows have `cursor: pointer` but aren't clickable.
- **Why it matters**: `.data-table tr { cursor: pointer }` is set at the global stylesheet level. On the accounts table, the row isn't a button — only the Activate/Deactivate cell is. The cursor signals an affordance that doesn't exist; a user clicks the row, nothing happens, friction.
- **Fix**: Either remove the global `cursor: pointer` on `.data-table tr` (and add it explicitly to `.bookings .data-table tr` if needed), or make accounts rows actually open a detail drawer. The second is more work but more useful.
- **Suggested command**: `/impeccable harden client/src/pages/AccountsPage.jsx`

- **[P2] What**: No search or sort on the accounts table.
- **Why it matters**: 4 accounts is fine. 12+ gets hard to scan, especially when the office grows or accounts accumulate (deactivated old staff, summer interns). The bookings page has search; this one doesn't.
- **Fix**: Mirror the bookings-page search input above the table. Optionally make column headers click-to-sort.
- **Suggested command**: `/impeccable adapt client/src/pages/AccountsPage.jsx`

- **[P3] What**: "Para sa admin lang" Filipino sub on the page-head.
- **Why it matters**: The page-kicker says "Admin", the h1 says "Accounts", the English sub says "Create local logins and control who can use this office device." That's three orientation lines saying the same thing. Adding "Para sa admin lang" is a fourth.
- **Fix**: Drop the Filipino sub on this page (the English sub already carries the same content). Reserve the bilingual stacking for staff-facing screens.

- **[P3] What**: Data-table cells use 12px uppercase column headers, 600-weight body.
- **Why it matters**: DESIGN.md's "Staff Can Read It" rule says working text stays 14px+ and data-table cells stay 15px+. Headers at 12px uppercase pass for column labels; body cells need to read at 15px for the rule.
- **Fix**: Verify computed font-size on `<td>` is 15px+ (the global `body { font-size: 17px }` should cascade, but check there's no override). Headers can stay at 12px uppercase as labels.

## Persona Red Flags

**Admin Kapitan (occasional user)**: Comes here once a quarter to add a new staff account. Sees the form on the left, fills it. Wonders why the password field doesn't tell him minimum length. The form-error appears only on submit, not during typing. Could be helped by inline character requirements.

**New staff member (target of account creation)**: Doesn't see this screen, but the kapitan has to type their full name correctly. A typeahead against an existing residents list (if one exists) would prevent the kapitan from creating "Juan Dela Cruz" when the resident is "Juan dela Cruz."

## Minor Observations

- The "Signed in as X. The current account cannot be deactivated from this screen." alert is honest and correctly placed. Keep it.
- `accountTotals` reduces in one pass; small but clean code.
- Activate/Deactivate uses btn-danger / btn-primary correctly per intent — destructive vs constructive.

## Questions to Consider

- Should account creation require admin re-authentication? Right now an admin who walks away from the desk leaves the create-account form open.
- Is there a need for an "audit" subview here showing which actions each user has taken? Or is that what /activity-logs is for?
- Should deactivated accounts be visually de-emphasized (50% opacity, line-through)? Right now the only signal is the status pill.
