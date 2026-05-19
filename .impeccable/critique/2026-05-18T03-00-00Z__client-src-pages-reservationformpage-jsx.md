---
target: client/src/pages/ReservationFormPage.jsx
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-reservationformpage-jsx
---
# New Reservation — Critique (run 4, browser-verified, 1440)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Availability banner with conflict + suggestions |
| 2 | Match System / Real World | 4 | "Who is booking?" / "When will they use the court?" |
| 3 | User Control and Freedom | 4 | Choose-from-directory shortcut, manual end-time toggle |
| 4 | Consistency and Standards | 4 | Field + section-num + chip primitives reused |
| 5 | Error Prevention | 4 | Inline availability check + per-field validation |
| 6 | Recognition Rather Than Recall | 4 | Three-step numbered sections with bilingual subheads |
| 7 | Flexibility and Efficiency | 4 | Time chips + duration buttons + manual end-time |
| 8 | Aesthetic and Minimalist Design | 3 | 14 time chips + 4 duration buttons + auto end-time line; one of these is a duplicate |
| 9 | Error Recovery | 4 | Suggested-slot chips on conflict |
| 10 | Help and Documentation | 4 | "Tap when the court time begins. The end time is calculated from the duration below." |
| **Total** | | **38/40** | strongest page in the system |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: This is the system's most committed surface. Numbered three-step sections ("1 Who is booking? · 2 When will they use the court? · 3 Any notes?") with English-primary + Filipino-secondary subheads do real cognitive load reduction; staff don't have to figure out *what* to fill out next. The 14-chip start-time grid and the 1h/2h/3h/4h duration row are the right answer for an offline desk workflow — way faster than a `<select>`. The "Will end at 8:00 AM" inline summary plus the "Adjust end time manually" disclosure handles the edge case without bloating the default flow.

**Deterministic**: Detector clean for `ReservationFormPage.jsx`.

## What's Working

- **The numbered section pattern.** "1 Who is booking? · Sino ang magpapa-reserba?" is the kind of copy that survives translation in both directions. Section heads are heading-3 serif with a small numbered badge and a Filipino italic subhead. Three steps, no more.
- **Time chips at 60px min-height** mean the clerk can confidently tap a time on a reasonably-sized monitor. Selected state carries a "Selected" caption rendered via `::after` (per DESIGN.md) — the Status Must Read rule applies even to selection state.
- **Inline availability check fires after a 350ms debounce** with a real banner: success ("This time is available · Final save will still be checked by the backend"), conflict ("This time is already booked"), or warn (network failure with retry button). Conflict banner shows the conflicting reservation's ID, name, date, time — actionable.
- **Resident directory shortcut** ("Choose from directory") sits at the top of step 1 as a tertiary button — discoverable but not pushy. Mounts the picker dialog only when opened, so the residents fetch doesn't fire on every form load.

## Priority Issues

- **[P3] What**: The "Adjust end time manually" disclosure label switches text to "Use auto end time" when expanded.
- **Why it matters**: Carried from prior implementation review. This is a "click-to-toggle" pattern but the label doesn't read like a toggle — it reads like two different commands. New staff will hesitate before clicking.
- **Fix**: Make the label stable ("End time") and the icon carry the toggle (chevron-down → chevron-up). Or stop hiding it: end time is a real field that staff sometimes need; one extra `<select>` won't crash the form.
- **Suggested command**: `clarify`

- **[P3] What**: The "Recurring reservations: not yet available" line at the bottom of section 3.
- **Why it matters**: A "not yet available" affordance with no call to action is dead text. It signals the team thought about recurrence and decided not to ship it — staff don't need to know that.
- **Fix**: Drop the line entirely. When recurrence ships, render the toggle then.
- **Suggested command**: `distill`

- **[P3] What**: The Save button stays enabled even when no time has been touched in create mode (the availability banner is hidden but the form will still POST).
- **Why it matters**: Staff who tab through default-7am-to-8am will never see the availability check fire. The backend will catch it (overlap trigger), but the client surface gives no warning before submit.
- **Fix**: Either fire the availability check on form mount once, or block Save until `timeTouched` has been true at least once. The latter is consistent with the existing `canCheckAvailability` gate.
- **Suggested command**: `harden`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: 14 time-chips × 60px each is dense visually but tap-safe. The "Will end at 8:00 AM" summary line is exactly the readback she needs.

**Carlo (assistant, 20s)**: The 350ms debounce on availability is fast enough that he'll never notice. The "Try again" button on availability failure is well-placed inside the warn banner.

## Minor Observations

- `<input type="date">` is the right native control here (Windows-default browser is Chrome/Edge in-office). Native picker is acceptable.
- The "Reference number" surface after a successful save uses the system's `banner banner-ok` pattern with a strong reference-number readout — well-suited to the "hand the reference number to the resident" line on the page.
- Form footer has Cancel / Save Reservation as a left-right pair. If the form ever scrolls, the footer doesn't stick. Worth considering for very-long sessions, but not a P0.
