---
target: client/src/pages/CalendarPage.jsx
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T11-00-00Z
slug: client-src-pages-calendarpage-jsx
---
# Calendar — Critique (run 5, browser-verified, 1440 — post-fix)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Today marker, week label, alerts banner |
| 2 | Match System / Real World | 4 | English weekday + bilingual page-sub |
| 3 | User Control and Freedom | 4 | Segmented week-nav + jump-to-date + overflow menu |
| 4 | Consistency and Standards | 4 | Booking-block primitive stable |
| 5 | Error Prevention | 3 | Maintenance + Clear-public-use modals confirm |
| 6 | Recognition Rather Than Recall | 3 | Legend bar with 8 status pills |
| 7 | Flexibility and Efficiency | 4 | Segmented nav + overflow menu reads as one toolbar |
| 8 | Aesthetic and Minimalist Design | 4 | Was 8 same-weight buttons, now 1 segmented + jump-to-date + overflow |
| 9 | Error Recovery | 3 | Standard `.alert error` for both schedule + alerts fetch |
| 10 | Help and Documentation | 3 | Legend + page-sub bilingual |
| **Total** | | **36/40** | up from 32/40 (run 4) |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: The toolbar restructure landed cleanly. Three week-nav buttons collapsed into one segmented control with chevron icons + "This week" pressed-state when the visible week contains today. "Jump to date" stays visible as a discrete labeled control on the right edge. Daily print + admin-only Add maintenance block + Clear for public use moved into a "More actions ▾" overflow menu that opens on click and closes on outside-click or Escape. Verified open/close behavior in the live browser; menu items are role="menuitem" on a role="menu" container.

**Deterministic**: Detector clean for `CalendarPage.jsx` (verified run 5). The legend swatch's `border-left-width: 4px` is the only side-stripe finding, and it's the documented intentional mirror of the booking-block — override.

## What's Working

- **Segmented week-nav**: prev / this-week / next now reads as one control, not three same-weight buttons. The "This week" pill carries `aria-pressed=true` only when the visible week already contains today, doubling as a "you are here" indicator.
- **Overflow menu** opens with `aria-expanded` + `role=menu` and contains: Daily print (always), Add maintenance block (admin), Clear for public use (admin). A divider separates the public action from admin actions.
- **`weekIncludesDate`** helper checks all 7 day cells, not just the anchor date, so the "This week" pressed-state survives jump-to-date navigation that lands on the same week.

## Priority Issues

- **[P3] What**: The "Today's alerts" banner remains a full card width when nothing needs attention.
- **Why it matters**: Carried from run 4. Small surface, low priority for this round.
- **Fix**: Render a one-line muted strip when the alerts payload is empty.
- **Suggested command**: `quieter`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: The toolbar reads as 3 controls (week-nav + jump-to-date + more actions) instead of 8 buttons. She'll click "Daily print" inside More actions; the menu closes after the click.

**Carlo (assistant, 20s)**: At 820 the segmented control still wraps, but the chevron icons keep the prev/next pair tight. Overflow menu still positioned at right.

## Trend (5 runs): 30 → 33 → 31 → 34 → 32 → **36**
