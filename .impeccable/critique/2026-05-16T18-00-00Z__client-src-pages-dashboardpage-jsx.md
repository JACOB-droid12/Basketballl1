---
target: "client/src/pages/DashboardPage.jsx"
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-dashboardpage-jsx
---
# Today (Dashboard) — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading state present, "nearest available" updates from API |
| 2 | Match System / Real World | 4 | "New Reservation / Magpa-reserba", "Today / Ngayong araw" |
| 3 | User Control and Freedom | 3 | Quick actions cover all paths; nothing dismissible |
| 4 | Consistency and Standards | 3 | Status badges consistent, but three competing serif heads |
| 5 | Error Prevention | 3 | Read-only screen, error path covered |
| 6 | Recognition Rather Than Recall | 3 | Compact time format ("8a-9a") is fast to scan |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut for "+ new"; tab order is reasonable |
| 8 | Aesthetic and Minimalist Design | 2 | Hero-card hits the metric-template anti-pattern |
| 9 | Error Recovery | 3 | Generic alert error if dashboard fails |
| 10 | Help and Documentation | 3 | Quick-action `l2` lines explain *why* in plain language |
| **Total** | | **29/40** | **Competent, but the hero is performing** |

## Anti-Patterns Verdict

**LLM assessment**: This is the screen most at risk of looking AI-generated. The hero-card is the textbook hero-metric template DESIGN.md explicitly bans: big serif number + decorative blue card with two pseudo-circles + "Good day, FirstName" greeting + "what's happening at the court today" subhead. The fact that the headline number is "1" (or "0" most mornings) sharpens the cliché — the canonical SaaS hero shows 247 active users, this one shows 1 booking.

**Deterministic scan**: Decorative circles repeat the login pattern. No gradient text, no glassmorphism. Status badges land. Skipped CLI scan.

## Overall Impression

The right ideas are here — show today, surface the next free slot, give three named paths into the app — but the chrome is louder than the work. Three serifs compete (page title, hero greeting, card title), and the giant "1" wants to be a corporate KPI when it's just "one booking is on the court today." The single biggest opportunity: trade the hero-card for a typographic moment that shows what's happening, not how much.

## What's Working

- **Quick-action cards with two-line labels.** "Make a reservation / Someone came to the office to book" is real help copy. The l2 line tells low-literacy staff *when* to use this button. Keep this pattern.
- **The Nearest available banner.** A concrete, scannable answer to the most common counter question. Plain language.
- **Compact time format** ("8a-9a") in booking rows reads faster than full hh:mm — appropriate for at-a-glance.

## Priority Issues

- **[P1] What**: Hero-card hits the hero-metric template.
- **Why it matters**: Decorative blue card + 80px serif number + "Good day, name" + decorative circles is the canonical SaaS dashboard cliché. PRODUCT.md explicitly anti-references "templated SaaS dashboards." On most mornings the number is 0 or 1, which makes the template even more visible.
- **Fix**: Replace the hero with a single typographic line: "Today is busy." / "Today has 4 bookings." / "Today is open." Drop the decorative circles. Move the open-slots count to the info-banner where it already lives.
- **Suggested command**: `/impeccable distill client/src/pages/DashboardPage.jsx`

- **[P1] What**: Three competing serif headings in the first viewport.
- **Why it matters**: "Today" h1 (clamp 36-44px serif) → "Good day, name." h2 (36px serif) → "Today's Schedule" card-title (26px serif). Each one asks for orientation attention and they share the same hue. By the time staff reach the booking list they've passed three ceremonial moments.
- **Fix**: Reserve the page-head h1 only. The hero greeting becomes Inter (or goes away entirely if the hero is removed). Card titles for content rows can be Inter Title (700/22px) — the serif is the page's signature, not a default.
- **Suggested command**: `/impeccable typeset client/src/pages/DashboardPage.jsx`

- **[P2] What**: Hero-note redirects from "today" to "encode another booking."
- **Why it matters**: The bolded second line ("5 open slot(s) still available for staff encoding") inverts the page intent. The page says "Today" but the bold call-to-action says "Add more." Pick a job.
- **Fix**: Either drop the bold line (the dedicated `info-banner` already shows nearest available), or rename the page from "Today" to "What's next" and make the redirect the headline.
- **Suggested command**: `/impeccable clarify client/src/pages/DashboardPage.jsx`

- **[P3] What**: "Click a booking to see details" sits in card-head right at 13px.
- **Why it matters**: Helper copy that should be visible to first-timers is easy to miss. On a busy day with 6+ rows it disappears.
- **Fix**: Drop it (the rows look clickable from the hover state) or move it to a one-line empty/intro state above the list.

## Persona Red Flags

**Tita Marisol (clerk, low digital literacy)**: Sees "Good day, Marisol." The greeting works. But the giant "1" asks her to interpret "1 = booking listed" — number first, label second isn't how she reads. She'd parse "Today has one booking" faster.

**Carlo (assistant, fast typist)**: Lands on Today, scans booking list quickly. The compact time helps. The three quick-action buttons on the right repeat the page-head's "+ New Reservation" — for him it's chrome.

## Minor Observations

- "Today / Ngayong araw" is the right level of bilingual hand-holding for a frequent screen.
- Loading state ("Loading today's court schedule...") matches the page's domain — good.
- `bookedSlots.length` formatting handles 0/1/many correctly. Small but it shows.

## Questions to Consider

- What's the dashboard for? "Today's status" (read) or "today's actions" (write)? Right now it's both, and the hero implies the first while the bold copy pushes the second.
- Could the booking list be the primary surface, with the hero shrunk to a single sentence above it?
- Does the office have a TV / second screen? If so, this dashboard might want a "wall mode" with bigger time, no chrome — a different surface from the desk view.
