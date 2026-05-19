---
target: client/src/pages/DashboardPage.jsx
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-dashboardpage-jsx
---
# Home / Dashboard — Critique (run 4, browser-verified, 1440 + 820)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Loading state, hero counts, nearest-available banner |
| 2 | Match System / Real World | 2 | Hero greeting reads "Good day, System." |
| 3 | User Control and Freedom | 4 | Three quick actions + back-to-list patterns |
| 4 | Consistency and Standards | 4 | Hero card + booking-row primitives reused |
| 5 | Error Prevention | 3 | Offline copy is direct; no "are you sure" needed here |
| 6 | Recognition Rather Than Recall | 3 | Quick-action labels + descriptions |
| 7 | Flexibility and Efficiency | 3 | New Reservation accessible from page header AND tile |
| 8 | Aesthetic and Minimalist Design | 4 | Civic blue hero + tile column + list, no chrome stack |
| 9 | Error Recovery | 3 | Offline message names the cause |
| 10 | Help and Documentation | 2 | No "what is this dashboard for" beyond the title |
| **Total** | | **32/40** | down from prior because of P1 hero copy |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: Layout is calm. The big civic-blue hero with the 80px serif "0" is the right answer for staff who need to see "is today busy or quiet" in one glance, and the system avoids the Glance-able SaaS Cliché by pairing the number with two contextual lines (`bookings listed` and `That's 0 hours of court time today`). The three quick-action tiles are vertically stacked with full copy ("Make a reservation · Someone came to the office to book") instead of icon-only ambiguity. Today's Schedule list is empty in this run (no bookings on May 18) and renders the proper EmptyState card.

**Deterministic**: Detector clean for `DashboardPage.jsx`.

## What's Working

- **Hero number is a number, not a metric.** The 80px serif "0" tells you "no bookings today" without the standard SaaS dashboard "↑ +12% vs last week" decoration. Restraint matches the surface — barangay staff don't need trend arrows, they need a count.
- **The two information rows under the hero are written, not bulleted.** "That's 0 hours of court time today. **14 open slots still available for staff encoding.**" The bold is on the number that matters; the rest is sentence prose. No card-grid-of-stats.
- **Quick actions read as English imperatives, not labels.** "Make a reservation / Check the calendar / Find a booking" is verb-led; the secondary line says *who* does it ("Someone came to the office to book"). Civic register intact.

## Priority Issues

- **[P1] What**: The hero greeting reads "Good day, System." instead of "Good day, System Administrator." or a real first name.
- **Why it matters**: `getStaffFirstName()` splits the user's full name on whitespace and takes index 0. For the seeded admin whose `fullName` is `"System Administrator"`, that returns `"System"`. The rendered greeting "Good day, System." is wrong, and unintentionally robotic — the surface that's *supposed* to humanize the dashboard does the opposite.
- **Fix**: For accounts whose full name contains the word "System" or that are flagged role=ADMIN with the seed username, fall back to the role label ("Good day, Admin.") or to the username. Simpler: render the full name verbatim ("Good day, System Administrator.") at this size; serif at 32px handles two words gracefully. Best long-term: make staff change the seed admin's display name during first-run onboarding.
- **Suggested command**: `clarify` (copy fix) or `harden` (first-run nudge to rename seed admin)

- **[P3] What**: "Today's Schedule" empty-state title is a sentence (`No reservations today.`) but the body uses "Walang reserbasyon ngayon. Staff can still check the calendar for available court time."
- **Why it matters**: Cosmetic. Title carries a period, body opens with a period-ending fragment. Reads slightly off.
- **Fix**: Drop the trailing period from the title. The bilingual body reads cleanly without it.
- **Suggested command**: `clarify`

- **[P3] What**: The "info-banner" for Nearest Available reads "**Nearest available:** Mon, May 18, 2026, 7:00 AM - 8:00 AM" — three commas in a row before the dash.
- **Why it matters**: It's a comma sandwich. The date already includes commas, then we add another one before the time, then a hyphen for the time range. Hard to scan.
- **Fix**: Use middot or space between the date and the time: "Mon, May 18, 2026 · 7:00 AM – 8:00 AM" (with a real en-dash for the time range, since en-dash is allowed for ranges per typographic convention; em-dashes remain banned).
- **Suggested command**: `clarify` or `typeset`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: 64px primary "New Reservation" button at the top right matches the design's Big Action rule. The hero "Good day, System." line will read as a system error to her — she will likely ignore it. **Fix this.**

**Carlo (assistant, 20s)**: Quick actions stack at 820 (verified). His morning workflow ("see what's today, encode walk-ins as they arrive") maps directly to the page.

## Minor Observations

- `formatHourCount(0)` renders "0 hours" — fine. Only worth tightening to "no bookings today" if the line stops being a sentence. Currently the sentence carries it.
- The card-head "Today's Schedule" pairs serif title with a 17px helper "Click a booking to see details" on the right. With 0 bookings the helper still renders. Hide the helper when there's nothing to click.
