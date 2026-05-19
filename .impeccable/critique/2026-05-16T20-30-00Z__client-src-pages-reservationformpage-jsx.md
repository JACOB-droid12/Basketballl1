---
target: "client/src/pages/ReservationFormPage.jsx"
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-reservationformpage-jsx
---
# New Reservation — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live availability check, debounced 350ms, four-state banner, idle hidden |
| 2 | Match System / Real World | 4 | Three plain-language section headers |
| 3 | User Control and Freedom | 4 | Cancel + suggestion-chips + "Adjust manually" details |
| 4 | Consistency and Standards | 4 | Save disabled on known conflict — no mixed signal |
| 5 | Error Prevention | 4 | Pre-flight check + Save guard + HTML5 required |
| 6 | Recognition Rather Than Recall | 4 | Numbered sections, section circles, bilingual hints |
| 7 | Flexibility and Efficiency | 3 | No arrow-key navigation in radiogroup chips (carried) |
| 8 | Aesthetic and Minimalist Design | 3 | Clean now, but the end-time-summary block pulls a small serif moment |
| 9 | Error Recovery | 4 | Conflict → 4 suggestion chips → click to apply |
| 10 | Help and Documentation | 2 | Per-section helper italics — still good, but `details/summary` for end-time override isn't discoverable |
| **Total** | | **36/40** | up from 33/40 |

## Anti-Patterns Verdict

**LLM**: Still the strongest screen in the system. The "How this works" duplicate banner is gone, the time section now reads in the order a clerk thinks (Date → Start → Duration → "Will end at HH:MM"), and Save is no longer telling staff to "save" while the page is telling them "no." The end-time-summary box is a new design element introduced by the layout pass — small serif moment for the derived end time. Earns its place because it's the answer to a question the user just asked, not a third orientation moment.

**Deterministic**: No banned patterns.

## What's Working

- **Numbered-section pattern** (32px primary circle + serif h3 + Filipino italic) still the cleanest progressive-disclosure I've seen for mixed digital literacy.
- **Live availability with idle hidden** — was the source of pre-emptive anxiety in run 1, now appears only after the user touches a time. Big invisible improvement.
- **Save disable on known conflict** — small change, big honesty win. The button no longer contradicts the panel above it.
- **`<details>` for "Adjust manually"** end-time override — progressive disclosure for the rare case (clerk needs an unusual end time) without taxing the common case (1h-4h durations).

## Priority Issues

- **[P2] What**: "Adjust manually" `<details>` summary is browser-default styled.
- **Why it matters**: It works, but a 13px primary-blue link inside a card-style banner doesn't read as "this is interactive" the way buttons in the rest of the form do. The `<details>` arrow on Chrome/Edge is a small triangle to the left, easy to miss. Staff who hit a rare scheduling case (e.g., booking from 12:30 to 14:30) won't find this.
- **Fix**: Either (a) wrap summary content in a small "Adjust manually" pill button styled like other secondary controls in the system, or (b) drop the `<details>` and show End-time as a small inline input with a subtle "(usually auto)" hint.
- **Suggested command**: `/impeccable polish client/src/pages/ReservationFormPage.jsx`

- **[P3] What**: Time-chip radiogroup still lacks arrow-key navigation.
- **Why it matters**: Carried from run 1. ARIA convention is that radiogroups support arrow cycling. Tab works, arrows don't.
- **Fix**: ~30 lines of `onKeyDown` handler. Worth doing.

- **[P3] What**: End-time summary (`Will end at HH:MM`) doesn't reflect on small viewports as cleanly.
- **Why it matters**: At 380px the flex wrap drops the strong-time element to its own line and the `<details>` to a third line. Functional, but the rhythm is off.
- **Fix**: Below 480px collapse to a one-line `<span>Will end at <strong>HH:MM</strong></span>` and move the override into a dedicated row.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: The flow is faster than run 1. She picks Date, taps a Start chip, taps a Duration. The "Will end at 9:00 AM" line answers her last unspoken question. **Sticking point**: she won't ever discover "Adjust manually" — and won't need to, until the day someone wants 12:30 to 14:30 and she's stuck.

**Carlo (assistant, 20s)**: Wants to type, not click. The chip grid is friction for him; a number-input for hour/minute would be faster. Carried from run 1.

## Minor Observations

- The `Field` component composition is still the cleanest abstraction in the codebase — bakes in `aria-invalid`, `aria-describedby`, and label-control linking.
- `applyStartTime` preserves duration when start changes — good muscle memory.
- The Tagalog `Anong oras magsisimula` helper inside `field-label` is a small touch that lowers hesitation.

## Trend for `client-src-pages-reservationformpage-jsx` (last 5 runs): 33 → **36**
