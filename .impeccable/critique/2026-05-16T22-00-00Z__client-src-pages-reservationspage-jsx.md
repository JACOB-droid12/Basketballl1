---
target: "client/src/pages/ReservationsPage.jsx"
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T22-00-00Z
slug: client-src-pages-reservationspage-jsx
---
# All Bookings — Critique (run 3, browser-verified)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + actionError + todayKey refresh |
| 2 | Match System / Real World | 4 | "Needs attention", "Past", "Kailangang tingnan" |
| 3 | User Control and Freedom | 4 | Two orthogonal filters (scope + status), drawer 3-exit |
| 4 | Consistency and Standards | 4 | Toolbar pattern stable at all breakpoints |
| 5 | Error Prevention | 3 | Confirmation dialogs for status changes |
| 6 | Recognition Rather Than Recall | 4 | Search input + 3 scope tabs + status select |
| 7 | Flexibility and Efficiency | 3 | Two filters compose; no keyboard shortcut yet |
| 8 | Aesthetic and Minimalist Design | 3 | Search + 3 tabs + select reads as one toolbar, not chrome stack |
| 9 | Error Recovery | 3 | actionError as top-of-page alert |
| 10 | Help and Documentation | 3 | Attention-panel body explains the surface |
| **Total** | | **34/40** | up from 32/40 |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440px and 820px)**: The 3-scope-tabs + status-select layout is genuinely cleaner than the 6-flat-tab row from run 1. At 1440 it reads as "search box, scope toggle, status filter" — three orthogonal controls. At 820 it wraps gracefully (search full-width, scope row + select on subsequent rows). The conflated "what is the active set?" + "what is the status?" question is now properly split.

I also verified the "Past" tab logic by clicking it: 3 results appear (COMPLETED, CANCELLED, MISSED — the past bookings in my mock data). Logic is correct.

**Deterministic**: No banned patterns. Gradient surface fix from run 2 still in place.

## What's Working

- **Two-axis filtering**: "All / Needs attention / Past" answers "which set?" while "Any status / Reserved / Did not show / Cancelled / Completed" answers "which state?" These compose. A staff member can ask "show me past completed" or "show me attention items that are reserved" — both are now valid combinations.
- **Counts on scope tabs**: All (6), Needs attention (4), Past (3) — concrete, scannable, accurate.
- **Filter labels speak human**: "Did not show" instead of "MISSED" in the dropdown matches the language the rest of the app now uses (Activity Logs ACTION_LABELS) and the StatusBadge labels.
- **Attention-count button** still calls `setScope("attention")` and resets statusFilter — the deep-link-from-card behavior I designed in works.

## Priority Issues

- **[P3] What**: Print button alongside Export CSV.
- **Why it matters**: Carried from runs 1 and 2. CSV covers the share-with-Kapitan path; print of a long booking list is rare.
- **Fix**: Drop or move into a "More actions" menu so the primary row reads Export | New Reservation.

- **[P3] What**: `attention-reason` chip on the attention scope still stacks under each card.
- **Why it matters**: Carried from runs 1 and 2. Inside a 104px card, 4 stacked text rows feels crowded at 820px.
- **Fix**: Move the reason into the StatusBadge column or as a colored left tint on the card.

- **[P3] What**: Status filter `<select>` doesn't visually anchor to the scope tabs.
- **Why it matters**: At 1440 the select sits at the right edge of the row, separated by `flex-wrap` whitespace from the tabs. It's clear it belongs to the toolbar but not clear it's *narrowing* the active scope. A small "in:" or "showing:" label would help.
- **Fix**: Replace the sr-only "Filter by status" label with a visible, lightweight prefix: "Status:" inline before the select.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Path unchanged from run 2 — "Needs attention" still her morning destination. The new "Past" tab gives her a fast answer to "what happened last week?" — useful.

**Carlo (assistant, 20s)**: At 820px the toolbar wraps without crowding the search input. Run-2 complaint resolved.

## Minor Observations

- `aria-checked` on radiogroup buttons is correctly wired.
- The status filter sr-only label means the visible UI is "tab tab tab dropdown" with no visible "Status" prefix; screen readers get "Filter by status" but sighted users have to infer it from the dropdown options. Borderline; flagged in P3 above.
- "Did not show" vs "Did not show up" inconsistency: the dropdown says "Did not show", the booking-card status badge in my screenshot says "Did not show up". Worth aligning to one.

## Trend for `client-src-pages-reservationspage-jsx` (last 5 runs): 30 → 32 → **34**
