---
timestamp: 2026-05-18T03-50-59Z
slug: client-src-pages-reservationhistorypage-jsx
target: "Reservation History"
total_score: 30
p0_count: 0
p1_count: 2
---

# Reservation History — Critique

## Anti-patterns verdict

No absolute-ban hits. No gradient text, no glassmorphism, no decorative side stripes (the only `border-left: 4px` in the codebase is the sanctioned calendar booking block), no hero-metric cliché clone — the hero number is single-purpose ("Court visits on record") and answers a real desk question. The page reads as civic-office, not SaaS-marketing. The category-reflex test passes: a "civic, paper-tinted, serif numeric hero" is not the obvious AI default for "reservation history," which would have been a dense admin table with status pill spam.

The only soft tell: the six summary stats and the tab pair labelled with parenthesised counts are a familiar product pattern. They earn their place here, but they are the most generic part of the screen.

## Heuristic scores

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading state is generic ("Looking up reservation history..."). No cue between "no record yet" and "search not run yet". |
| 2 | Match System / Real World | 4 | Bilingual italic helpers, "court visits on record", "Did not show up" — all match staff vocabulary. |
| 3 | User Control and Freedom | 3 | No way to copy or print the list, no link from a row to the reservation's detail drawer. |
| 4 | Consistency and Standards | 3 | Stats render uppercase eyebrows but the row time uses serif while the Did-not-show-up tile uses Inter — fine, but the "Last reservation" cell is body-weight while the others are 22px/700, which reads inconsistent rather than intentional. |
| 5 | Error Prevention | 3 | "Look up by" defaults to Contact number; switching to Name-or-group does not clear the typed contact number (but does reset the placeholder). Hint text doesn't mention name match is exact-or-prefix. |
| 6 | Recognition Rather Than Recall | 3 | The tab labels "Upcoming (1)" / "Past (6)" are good. The hero number and stats are good. But there's nothing tying a row to the detail drawer the staff already knows from All Bookings, so the staff has to recall the reference number to look it up next door. |
| 7 | Flexibility and Efficiency | 2 | No "open this reservation" action on a row. No keyboard shortcut. No CSV export. No print. The clerk has to hand-copy a reference number to take any action on the result. |
| 8 | Aesthetic and Minimalist Design | 3 | Hero card is good. Tab card has two slightly redundant titles ("Reservation lists" + the section subtitle), and the sub-text "Switch between past and upcoming bookings for this resident." restates what the tabs themselves say. |
| 9 | Error Recovery | 3 | Network-failure copy is the standard offline message. Validation message ("Enter a contact number to look up.") fires only after submit, with no inline focus to the field. |
| 10 | Help and Documentation | 3 | Hint text is present per field. No legend explaining why the same person has different counts (e.g., does "Active now" include today's bookings or only after-now?). |
| **Total** | | **30/40** | **Solid; not exceptional yet** |

## Overall impression

This is the strongest of the three pages by a wide margin. The hero number ("7 reservations so far") plus the stats grid plus the tab pair gives the clerk the answer to most counter questions in one glance. The serif hero earns its place — it's an orientation moment, not decoration. What's holding it back from a 35+ score is missing affordances on the result rows: the staff can see a booking, but cannot open, edit, copy a reference, or print from this screen. They have to memorise a reference number and walk to All Bookings.

## What's working

- **Hero + stats split has a real job.** "Court visits on record / 7 reservations so far" is the only big number on the page and it's the answer to the counter's most common question. Compare to the SaaS "hero metric" cliché where four big numbers fight for attention.
- **The tab card is honest.** Labels carry counts (`Upcoming (1)`, `Past (6)`), the default tab favours whichever side has rows, and an empty side renders an `EmptyState` instead of a confusing blank list.
- **Validation copy is in the user's language.** "Enter a contact number to look up." is a staff sentence, not "Field is required."

## Priority issues

### [P1] Result rows are read-only dead-ends
**Why it matters**: When the clerk finds the booking they were looking up, they almost always need to *do* something next: open the detail drawer, mark missed, print the slip, or re-print the receipt. The current row shows time, name, purpose, reference number, and a status pill, then nothing. The staff has to copy the reference, switch to All Bookings, paste it, and reopen the same record. Two screens to do one action.
**Fix**: Make the row clickable (it already has `role="group"` and uses `.booking-card` chrome that has hover state). Either link to `/reservations/:id` to land on the detail drawer in `ReservationsPage`, or open the same `ReservationDetailDrawer` component inline. Add a small "Open booking" caret on the right side of the row.
**Suggested command**: `harden`

### [P1] No action surface on the result set
**Why it matters**: Counter staff regularly need to print or hand a resident a "you have these bookings" sheet. Today the only path is to screenshot the page, or rewrite the list by hand. The screen has the data; it just doesn't expose the action.
**Fix**: Add a small action row above the tab pair: "Print history" (uses `window.print()` against a print-optimised stylesheet that hides nav and form), and a "Copy reference numbers" button when the active tab has rows. CSV export is overkill here; print is what the office actually does.
**Suggested command**: `harden`

### [P2] Duplicate sub-headings in the tab card
**Why it matters**: Inside the `history-tabs-card`, the staff sees `<h2>Reservation lists</h2>` plus `Switch between past and upcoming bookings for this resident.` plus the tab pair plus the section heading — four overlapping orientation lines for one component. The page already has a page title ("Reservation history") and a kicker ("RESERVATIONS"). The clerk does not need to be told twice that this is a list of bookings.
**Fix**: Drop the `<h2>Reservation lists</h2>` and the `Switch between...` subtitle. Let the tabs speak for themselves. If the card needs a heading at all, fold the count summary into it: `Reservations for 09171234567 — 7 on record`.
**Suggested command**: `distill`

### [P2] "Last reservation" stat reads thinner than its siblings
**Why it matters**: All other stats in the grid render their dd at 22px/700 ink. "Last reservation" overrides to 18px/600 because it's a date string instead of an integer. Side-by-side they look like two of them are emphasised and one is afterthought. The "wide" full-row treatment partially fixes this but the lighter weight still reads as less important than "Did not show up: 2", which is not the desired hierarchy.
**Fix**: Render "Last reservation" with the same 22px/700 weight as the other dds, but in serif (it's a date string, not a count, so weight + family contrast keeps it distinguishable). Or split into two cells — "Last reservation date" and "Days since" — so the staff can see how stale the resident's track record is at a glance.
**Suggested command**: `typeset`

### [P3] Validation does not return focus
**Why it matters**: When the staff submits an empty form, the inline `<small role="alert">` appears under the input but the cursor is still on the Submit button, not the field. On a keyboard-only flow that's two extra Shift+Tabs to recover.
**Fix**: After validation fails, focus the offending input. The codebase already does this on the Resident Directory contactNumber duplicate path; extract the same pattern.
**Suggested command**: `harden`

## Persona red flags

**Maria (counter clerk under time pressure)**: Resident is at the window asking to confirm their next booking. Maria types the contact number, sees the upcoming tab, reads the time and reference. To print a slip for the resident, she has to copy the reference number, navigate to All Bookings, paste-search, click the row, click "Print slip." Four hops where one would do.

**Tito (older walk-in barangay staff, less keyboard-fluent)**: Sees `Look up by` dropdown. Doesn't know whether to pick "Contact number" or "Name or group" because the dropdown opens in Inter sans-serif and the values are English-only inside the menu. After he picks one, the *outer* Field label changes ("Contact number / Numero ng telepono"), but inside the dropdown there's no Filipino italic. Two-language pattern is broken inside `<select>` because the `<option>` elements are not styled.

## Minor observations

- The `ReservationList` function is still exported in the file but unused (page now uses `ReservationHistoryTabs`). Dead code.
- "Did not show up" is friendlier than "Missed" but the rest of the system (status pill on the row) calls it `Missed`. Two words for the same idea on the same screen.
- The hero number uses `var(--primary)` Civic Blue. Per "The Blue Means Action Rule" in DESIGN.md, blue is reserved for action and identity. This is identity (a hero stat), not action, so it's borderline; consider Ink for the number itself and reserve the blue for the eyebrow only.
- `formatTime` outputs `HH:MM AM/PM` but the row joins with " - " with spaces; the standard time-range pattern in DESIGN.md uses an en-dash or hyphen without spaces. Either is fine, just be consistent project-wide.

## Questions to consider

- What would a row-click flow look like? If the answer is "open the detail drawer in place," the screen becomes a true lookup-and-act surface.
- Does this screen need to exist as a separate page, or could it live as a tab on the resident's directory entry? The current shape requires the staff to know one page exists for "lookup by contact" and another for "browse residents."
- Could the tab pair carry a third tab — `Active now (1)` — so the staff can jump straight to the booking the resident is currently inside, without scrolling either list?
