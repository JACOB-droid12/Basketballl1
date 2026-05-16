---
target: "client/src/pages/AccountsPage.jsx"
total_score: 33
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T19-30-00Z
slug: client-src-pages-accountspage-jsx
---
# Accounts — Critique (post-polish + harden)

Create-account form refactored to use the `Field` component + `staff-field` styling — the two-field-systems drift is now one. Global `cursor: pointer` on `.data-table tr` removed; rows still highlight on hover but no longer promise clickability that doesn't exist. Redundant "Para sa admin lang" Tagalog sub-line dropped (English sub already said it).

| # | Heuristic | Score | Note |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | unchanged |
| 2 | Match System / Real World | 3 | unchanged |
| 3 | User Control and Freedom | 3 | unchanged |
| 4 | Consistency and Standards | 4 | +2 — single field system, no false cursor signal |
| 5 | Error Prevention | 4 | +1 — Field component bakes in `aria-invalid` |
| 6 | Recognition Rather Than Recall | 3 | unchanged |
| 7 | Flexibility and Efficiency | 2 | still no search/sort |
| 8 | Aesthetic and Minimalist Design | 4 | +1 — form matches the rest of the app |
| 9 | Error Recovery | 3 | unchanged |
| 10 | Help and Documentation | 4 | +1 — fields gain Tagalog helper labels |
| **Total** | | **33/40** | up from 28/40 |

**Outstanding (P2):** no search/sort on the accounts table; below ~1024px the table still horizontal-scrolls (could share the same card-stack pattern Activity Logs now uses).
