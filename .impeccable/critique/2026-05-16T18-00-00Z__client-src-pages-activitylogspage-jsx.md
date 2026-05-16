---
target: "client/src/pages/ActivityLogsPage.jsx"
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-activitylogspage-jsx
---
# Activity Logs — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading + error + filter count — covered |
| 2 | Match System / Real World | 2 | Action codes shown as SQL ("CREATE_RESERVATION"), not user language |
| 3 | User Control and Freedom | 4 | Apply/Clear is explicit; filters are honest |
| 4 | Consistency and Standards | 3 | Filter card has a serif h2 that competes with the page h1 |
| 5 | Error Prevention | n/a | Read-only |
| 6 | Recognition Rather Than Recall | 2 | Action codes require translation by the reader |
| 7 | Flexibility and Efficiency | 3 | Three orthogonal filters (search / action / date) |
| 8 | Aesthetic and Minimalist Design | 2 | Two h2 ceremonial moments + screaming uppercase chips |
| 9 | Error Recovery | n/a | Read-only |
| 10 | Help and Documentation | 3 | "Use this when a resident asks what changed..." copy is real help |
| **Total** | | **25/40** | **Useful filters, schema-leaking labels** |

## Anti-Patterns Verdict

**LLM assessment**: One leaky abstraction shaping the whole screen — the action column shows raw SQL action codes ("CREATE_RESERVATION", "DEACTIVATE_ACCOUNT") as small uppercase chips. That's the database vocabulary leaking into the UI. A resident asking "what changed?" wants "Created a reservation" or "Deactivated an account," not "CREATE_RESERVATION."

**Deterministic scan**: No banned patterns. Skipped CLI scan.

## Overall Impression

The filter UX is genuinely good — three orthogonal filters (search / action / date), an explicit Apply, and a Clear that resets all three. The audit framing in copy ("Use this when a resident asks what changed, who changed it, or when it happened") is exactly right for the page. What undercuts it is that the result table speaks SQL, not Tagalog or English. The data is correct; the language is the bug.

## What's Working

- **Audit framing in the filter card.** The body para tells staff *when* to use this screen. Most apps drop logs into a generic "Audit Trail" page; this one names the use case.
- **Filter Apply is explicit.** Doesn't fire on every keypress, which protects against slow-MariaDB scenarios. Form-submit on Apply is the right shape.
- **Action select pulls in any action codes seen in loaded data,** not only the COMMON_ACTIONS list. Future-proof against new server-side actions.
- **`role="alert"` on the error-state card** so the failure is announced.

## Priority Issues

- **[P1] What**: Action codes display as raw SQL identifiers.
- **Why it matters**: The action chip shows "CREATE RESERVATION" / "MARK MISSED" / "DEACTIVATE ACCOUNT" — uppercase, underscore-stripped, but otherwise the database column. PRODUCT.md anti-references "clunky government portals with dense bureaucratic UI." Screaming caps SQL codes are exactly that.
- **Fix**: Add a `formatAction` map: `{ "CREATE_RESERVATION": "Created a reservation", "MARK_MISSED": "Marked the booking missed", ... }`. Sentence case, plain verbs. Fall back to the underscore-stripped form for unknown actions.
- **Suggested command**: `/impeccable clarify client/src/pages/ActivityLogsPage.jsx`

- **[P1] What**: Same data-table issues as Accounts (table-row cursor, narrow-viewport horizontal scroll).
- **Why it matters**: The logs-table is `min-width: 760px`. On 820px screenshots the table forces horizontal scroll. The Details column gets cut off, which is the *most* useful column on this screen.
- **Fix**: Below ~1024px, collapse the 4 columns into a stacked card-row layout: top line shows date+time + user, second line is the action chip, third line is details. The card-list pattern from ReservationsPage already covers this.
- **Suggested command**: `/impeccable adapt client/src/pages/ActivityLogsPage.jsx`

- **[P2] What**: Filter card has a serif h2 ("Find a recorded action") at 28px.
- **Why it matters**: The page-head h1 ("Activity logs") is clamp(36-44px) serif. The filter h2 is 28px serif. Two ceremonial typographic moments stacked at the top of the page — both primary-dark, both Instrument Serif. The h1 is the orientation; the h2 is doing form-label work and shouldn't claim the same chrome.
- **Fix**: Demote the filter h2 to Inter 700/22px (same as `card-title` weight family but in sans). Keep the body para.
- **Suggested command**: `/impeccable typeset client/src/pages/ActivityLogsPage.jsx`

- **[P3] What**: No "load more" or pagination affordance.
- **Why it matters**: A busy office could pile hundreds of log rows in a year. Filters help narrow, but if a resident asks "what was changed last Friday?" and 80 rows match, the user has no way to tell whether they're seeing all 80 or the first N.
- **Fix**: If the API caps results, surface the cap ("Showing 50 of 80 — refine your filter to see fewer"). If it doesn't cap, paginate at 50.
- **Suggested command**: `/impeccable harden client/src/pages/ActivityLogsPage.jsx`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: A resident walks up and asks "Bakit nawala yung reserbasyon ng anak ko?" She filters by the resident's name. The result row shows "MARK CANCELLED" in screaming caps, with details "Reservation #45 cancelled by Tita Lulu". She has to translate "MARK CANCELLED" mentally before she can answer. That's an extra step that the design forces on her.

**Kapitan (audit reviewer)**: Once a quarter he wants to read what staff did. He scans 50+ rows. Uppercase action codes are visually shouty and slow him down. Sentence case would let him skim.

## Minor Observations

- The `error-state` card uses `state-mark empty-mark` with "!" content — fine, but the StatusBadge component could give a "Failure" pill instead.
- Filter `<select>` for actions includes `formatAction(action)` for display, but the underlying value stays uppercase — good (filter logic doesn't break) and bad (hover/focus shows internal state).
- The 60-second `todayKey` refresh that bookings has isn't mirrored here. Probably doesn't matter for logs (they're append-only), but worth noting for consistency.

## Questions to Consider

- Could a "show me what's changed in the last hour" preset chip be useful? It's a common "right after a shift change" question.
- Should certain high-stakes actions (DEACTIVATE_ACCOUNT, CHANGE_PASSWORD) get a colored emphasis in the row? They're the ones a kapitan most wants to see.
- Is there a retention policy? If logs accumulate forever the table eventually buckles; if there's an archival cut-off, surface it ("Showing logs from the last 6 months").
