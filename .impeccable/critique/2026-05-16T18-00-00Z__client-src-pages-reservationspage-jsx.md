---
target: "client/src/pages/ReservationsPage.jsx"
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-reservationspage-jsx
---
# All Bookings — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error + actionError, todayKey refresh every 60s |
| 2 | Match System / Real World | 4 | "Needs attention", "Today reserved - mark done or missed", "Kailangang tingnan" |
| 3 | User Control and Freedom | 3 | Drawer closes via backdrop / escape / button; ConfirmDialog for status changes |
| 4 | Consistency and Standards | 3 | Attention-panel uses a gradient surface — one rule drift |
| 5 | Error Prevention | 3 | Status changes require confirmation, error states surfaced |
| 6 | Recognition Rather Than Recall | 4 | Search input, filter pills, status badges all named |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut for "+ new", no quick "today" filter |
| 8 | Aesthetic and Minimalist Design | 2 | Six filter tabs + serif h2 stacked under page title |
| 9 | Error Recovery | 3 | Update fail surfaces actionError as a top-of-page alert |
| 10 | Help and Documentation | 3 | "Records staff may need to check today" body explains the panel |
| **Total** | | **30/40** | **Solid working surface; orientation chrome is heavy** |

## Anti-Patterns Verdict

**LLM assessment**: One quiet rule drift: the `attention-panel` uses `linear-gradient(135deg, surface, surface-2)` as its background. DESIGN.md says shadows are reserved for floating surfaces and gradients aren't part of the vocabulary. The two adjacent neutrals make it subtle — but it is a gradient surface in a system that explicitly bans gradient text and isn't supposed to use gradients as decorative chrome.

**Deterministic scan**: No glassmorphism, no banned side-stripes (the `border-left: 4px` on `staff-booking-block` is the documented exception, and it lives on the calendar, not here). Skipped CLI scan.

## Overall Impression

This is the page that does the most actual work and it earns it. The "Needs attention" filter is genuinely smart — a single click surfaces what staff should resolve today. But the orientation stack above the working area is too tall: by the time you reach the search input, you've passed page-kicker > h1 > sub > sub-fil > attention-h2 > attention-body > filter-tabs. Tighter chrome would let the search and filter do their job sooner.

## What's Working

- **The "Needs attention" filter as a first-class concept.** It groups MISSED, CANCELLED, and TODAY-RESERVED into one human bucket — that's how a clerk's mind works ("what do I need to handle?"), not how the database thinks ("which status code?").
- **`todayKey` refreshes every 60 seconds.** Means an attention count doesn't stale during a long shift. Real attention to the offline desk reality.
- **`role="radiogroup"` on the filter tabs with `aria-checked`.** Correct semantic, not just visual styling.

## Priority Issues

- **[P1] What**: Attention-panel uses a `linear-gradient` surface.
- **Why it matters**: DESIGN.md sets a "shadows for floating, tonal layers for normal structure" rule and says gradients aren't part of the vocabulary. This is a quiet drift — and the gradient adds no information; the panel is already framed by a 1px border-bottom.
- **Fix**: Replace `background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)` with a solid `var(--surface-2)` (or just `var(--surface)`). Test that it still reads as "this region is special."
- **Suggested command**: `/impeccable polish client/src/pages/ReservationsPage.jsx`

- **[P1] What**: Five-stack of orientation chrome before the working area.
- **Why it matters**: page-head (h1 + 2 subs) → attention-panel (serif h2 + body para + count) → bookings-toolbar (search + 6 filter tabs). The serif h2 inside the attention-panel is doing a second-page-title job. Two ceremonial moments back to back.
- **Fix**: Demote the attention-panel h2 to a sentence ("These need your attention.") in Inter 600/18px. Or remove the h2 entirely and let the count + body carry the panel.
- **Suggested command**: `/impeccable distill client/src/pages/ReservationsPage.jsx`

- **[P2] What**: Six filter tabs across one row.
- **Why it matters**: "All / Needs attention / Reserved / Missed / Cancelled / Completed" with counts is the cliché tabbed-filter pattern. Two of those are usually 0-1 in practice and they cause the row to wrap, eating space the search input wants.
- **Fix**: Three primary tabs (All / Needs attention / Past) plus a Status select for the rest. Or collapse to a primary toggle (Active / Past) with a status select inside each.
- **Suggested command**: `/impeccable layout client/src/pages/ReservationsPage.jsx`

- **[P3] What**: `attention-reason` chip stacks under each card on the attention filter.
- **Why it matters**: Inside a 104px card row, you already have time/date + name + purpose+contact+id. Adding a yellow attention-chip line makes 4 stacked text rows in one card. Crammed at 820px.
- **Fix**: Move the reason into the StatusBadge column (e.g., a small yellow dot on the status pill) or replace the chip with a colored left tint on the card itself.

- **[P3] What**: Print button on a list view.
- **Why it matters**: CSV export already covers the "share with kapitan" job. Print of a long booking list is rare; the button takes a primary-row slot.
- **Fix**: Drop the Print button, or move it inside a small "More actions" menu so the primary row is Export | New Reservation only.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: The "Needs attention" filter is the path she uses every morning. Once she's there, the attention-reason chip tells her exactly what to do ("Today reserved - mark done or missed when finished"). This is the right shape for her brain. The 6-tab row above can confuse — she only needs "All" and "Needs attention".

**Carlo (assistant, 20s)**: He'll use the search input, type a name, and want to act fast. The 280px-min search input + 6 tabs wraps on his 820px workstation, which means he keeps scrolling past the chrome to find the result. Less chrome = faster.

## Minor Observations

- The `aria-pressed` on selected booking-card is correct and pairs well with the visual selected state.
- "Walang reserbasyon ngayon" Filipino text in EmptyState — small and apt.
- The drawer closes via backdrop click, escape key, AND close button — three correct exits.

## Questions to Consider

- Does "All Bookings" need a date range filter? Right now you can search any string, but you can't say "show me last month."
- Is the attention-panel earning its place, or could the count badge live next to the "Needs attention" filter tab?
- Could the "Today reserved" attention items collapse into a single row that says "3 reservations from today are still pending"?
