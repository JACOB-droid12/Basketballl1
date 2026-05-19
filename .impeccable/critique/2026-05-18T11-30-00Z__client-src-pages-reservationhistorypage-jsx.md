---
target: client/src/pages/ReservationHistoryPage.jsx
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-05-18T11-30-00Z
slug: client-src-pages-reservationhistorypage-jsx
---
# Reservation History — Critique (run 1, browser-verified, 1440 + 820)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading inline label, form-card lookup state |
| 2 | Match System / Real World | 3 | "Look up history" verb, bilingual subhead |
| 3 | User Control and Freedom | 3 | Type select + value field + submit; no Clear |
| 4 | Consistency and Standards | 3 | `card filter-card` + `booking-card-list` reused |
| 5 | Error Prevention | 4 | Inline validation message before submit |
| 6 | Recognition Rather Than Recall | 3 | Type-aware label + placeholder switch (number vs name) |
| 7 | Flexibility and Efficiency | 2 | Single result page; no recent lookups, no permalink |
| 8 | Aesthetic and Minimalist Design | 3 | Summary card + two list cards; reads tall |
| 9 | Error Recovery | 3 | Standard alert / offline / 4xx-5xx |
| 10 | Help and Documentation | 2 | Caption "Counts come straight from the local reservations record" leaks dev voice |
| **Total** | | **29/40** | first run baseline |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: The form-card pattern is the right anchor for a lookup surface. The lookupType select + lookupValue input pair toggles between "contact number" and "name or group" cleanly — the input's `type` switches to `tel` for numbers and `text` for names, and the placeholder updates from `09171234567` to `Team Alpha`. A clerk fielding a counter question can answer "show me Liga ng Kabataan's reservations" or "find that 09171… number" without remembering which axis to search.

The result surface that follows the form is three cards in a column: **Summary** (counts), **Upcoming reservations** (booking-card list), **Past reservations** (booking-card list). Each booking-card row carries a status badge and the reference number, matching the rest of the system.

**One leaked developer caption** caught: the Summary card's `<span>` reads "Counts come straight from the local reservations record." This is the same family as the Reports `statusCounts` leak that polish run 5 cleaned up. It mentions the data source by location, not by what staff should *do* with it.

**Deterministic**: Detector clean for `ReservationHistoryPage.jsx`.

## What's Working

- **Type-aware input**. The lookup type drives the field type (`tel` vs `text`), placeholder, label, and Filipino subline. One field handles both jobs.
- **Bilingual lookup labels**: "Numero ng telepono" / "Pangalan o grupo" sit under the English. "Hanapin sa pamamagitan ng" sits under "Look up by".
- **Empty state is specific**: "No records found for this lookup · Try a different contact number or name to find more reservations." Names the user's last action and offers the next step.
- **Reference number on every result row**, formatted via `formatReferenceNo`. The reference is the surface a clerk reads aloud at the desk.

## Priority Issues

- **[P1] What**: Summary caption leaks developer voice: "Counts come straight from the local reservations record."
- **Why it matters**: Same anti-pattern family as the Reports leak that polish run 5 fixed. The line tells the staff member where the data came from in technical terms ("local reservations record"), not what the count means or what to do with it.
- **Fix**: Replace with a question or directive: "How this resident has used the court so far." Or drop the caption and let the section heading "Summary" stand alone.
- **Suggested command**: `clarify`

- **[P1] What**: Total / Missed / Cancelled / Completed / Active / Last reservation date are rendered as a flat `dl detail-grid staff-detail-grid` with no visual hierarchy.
- **Why it matters**: Six rows of label/value, all same weight, all same size. The most important number for a counter question is "Total reservations: 7" — the rest are sub-counts. Without a hierarchy the clerk has to read every row before they understand the gist.
- **Fix**: Promote `totalReservations` to a hero number (display-size serif, paired with "court visits on record"). Render the other five as a secondary `<dl>` underneath. Optionally: render Missed + Cancelled together with a divider, since the typical desk question is "did they show up?"
- **Suggested command**: `layout` or `bolder`

- **[P2] What**: Two list cards stacked vertically — "Upcoming reservations" then "Past reservations". When a resident has only past reservations (the common case for a one-off request), the Upcoming card shows "None on record · No upcoming reservations on record for this resident" and adds vertical noise.
- **Why it matters**: 12 of 12 sample lookups in real use will skew toward "all past, no upcoming" or vice versa. An empty card consumes ~150px of viewport height for a "no" answer.
- **Fix**: Merge into one tabbed list ("Upcoming (1) | Past (6)") matching the Reports `report-detail-tabs` pattern from run 5. Default tab: whichever has rows. Empty state for the merged card surfaces a single line.
- **Suggested command**: `layout`

- **[P2] What**: No "Recent lookups" affordance.
- **Why it matters**: A counter clerk often answers the same lookup twice in five minutes (resident asks, walks away, comes back). The form has no memory; the search has to be retyped.
- **Fix**: Out of scope for small tweaks. Could keep the last 3 successful lookups in `localStorage` and surface them as small chips above the form.
- **Suggested command**: `harden` (deferred)

- **[P3] What**: The "Look up history" button has no `Clear` partner.
- **Why it matters**: Once a result is shown, the only way to start a fresh lookup is to retype. Other forms in the system (Activity Logs filter card) have an Apply / Clear pair.
- **Fix**: Add a `Clear` light button that resets `lookupType`, `inputValue`, and `state.submitted`.
- **Suggested command**: `clarify`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: At the counter, she'd type the resident's contact number and press Enter. The form returns Summary + Upcoming + Past in one page-load — she'll glance at the Total and read the most recent past reservation aloud. The summary `dl` reads as a wall of label/value pairs to her; she'd benefit most from the hero number.

**Carlo (assistant, 20s)**: He'll switch between "Contact number" and "Name or group" without thinking. The placeholder swap helps him not type a name into the contact field. He'll notice the missing Clear button after his second lookup.

## Minor Observations

- The page-header eyebrow reads "RESERVATIONS"; the page title reads "Reservation history". Eyebrow-singular vs title-plural is a minor stylistic mismatch.
- `state.submitted` is the only signal that drives the empty-state vs not-yet-searched fork. Acceptable but a more explicit name would help — e.g., `hasResult`.
- `lookupType="contactNumber"` uses camelCase; the URL query param `?contactNumber=...` matches. No mismatch.
- The "9 reservations on record · Last reservation: 22 May 2026" pattern from many CRM tools would be a more natural lead than the 6-row dl. Worth considering for `bolder`.
