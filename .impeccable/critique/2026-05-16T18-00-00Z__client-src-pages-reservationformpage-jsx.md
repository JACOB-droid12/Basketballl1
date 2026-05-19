---
target: "client/src/pages/ReservationFormPage.jsx"
total_score: 33
p0_count: 0
p1_count: 2
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-reservationformpage-jsx
---
# New Reservation (Form) — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live availability check, debounced 350ms, three-state banner |
| 2 | Match System / Real World | 4 | "Who is booking? / When will they use the court? / Any notes?" — desk-language headers |
| 3 | User Control and Freedom | 3 | Cancel button, suggestion-chips revertible, Back to Bookings |
| 4 | Consistency and Standards | 3 | Save button isn't disabled on known conflict — mixed signal |
| 5 | Error Prevention | 3 | Pre-flight availability check; HTML5 required; conflict suggestions |
| 6 | Recognition Rather Than Recall | 4 | Numbered section circles + serif heads + bilingual hints |
| 7 | Flexibility and Efficiency | 3 | Time chips fast; no arrow-key navigation in `role=radiogroup` chips |
| 8 | Aesthetic and Minimalist Design | 3 | Three layers of instructional chrome at the top |
| 9 | Error Recovery | 3 | Conflict → 4 suggestion chips → click to apply — excellent recovery |
| 10 | Help and Documentation | 3 | Per-section helper italics in Filipino |
| **Total** | | **33/40** | **The strongest screen in the system** |

## Anti-Patterns Verdict

**LLM assessment**: Passes the AI-slop test cleanly. The numbered-circle + serif-h3 + Filipino-italic-hint section pattern is original and project-rooted, not a SaaS template. The time-chip grid + duration picker is the right shape for a counter-clerk who needs to encode quickly. No gradient text, no glassmorphism, no hero metrics.

**Deterministic scan**: No banned patterns. Skipped CLI scan.

## Overall Impression

This is where the system delivers its premium-utility promise. The form treats the staff member's brain like it should: "Who is booking? / When? / Any notes?" — three plain-language sections with numbered circles. The live availability check with one-click suggestion chips is a legitimately delightful pattern that prevents the most common booking error before it ships. The single biggest issue is that the screen *over-narrates*: there's a "How this works" banner above three numbered sections that already explain themselves.

## What's Working

- **Section pattern: 32px primary circle + serif h3 + Filipino italic hint.** Real progressive disclosure that respects mixed digital literacy. Original to this project; not a template.
- **Live availability with suggestion chips.** Debounced server check at 350ms, four banner states (idle, loading, success, conflict+suggestions), and conflict shows up to 4 alternative slots the staff can apply with one click. This is the form's signature feature and it's well-executed.
- **`status-badge` consistency for "RESERVED" default.** The form pre-sets status code, doesn't ask the user, and the system speaks the same vocabulary as the list and calendar views.

## Priority Issues

- **[P1] What**: Three competing instructional layers at the top.
- **Why it matters**: The "How this works" `banner-info` (with three numbered points: 1. Ask for details. 2. Pick a free time. 3. Save) sits directly above three numbered form sections (1. Who is booking? 2. When? 3. Any notes?). That's the same three-step structure narrated twice in a row — once as instruction, once as labels.
- **Fix**: Drop the "How this works" banner. The section heads + section-hint italics carry the same content with better proximity to the work.
- **Suggested command**: `/impeccable distill client/src/pages/ReservationFormPage.jsx`

- **[P1] What**: End time appears before Start time in the layout.
- **Why it matters**: The grid is `Date (col 1) | End time (col 2)`, then below in a `slot-picker`, Quick duration, then below in another `slot-picker`, Start time chip grid. The user reads "End time" before they've picked "Start time" — that's backwards. Also, two slot-pickers in a row (duration + start time) makes the time-picking section feel like a search interface rather than a quick action.
- **Fix**: Reorder to Date → Start time chip grid → Duration. End time becomes a derived label ("Will end at 9:00 AM") right above the Save button, not a select. The select-end-time only re-appears for staff who want to fine-tune.
- **Suggested command**: `/impeccable layout client/src/pages/ReservationFormPage.jsx`

- **[P2] What**: Idle availability panel is visible from page load.
- **Why it matters**: On a fresh new-reservation form, the panel reads "Pick a valid date and time / The system will check the real court schedule before saving." Pre-emptive helper text that warns about a problem that hasn't occurred. Anxiety where there shouldn't be.
- **Fix**: Hide the availability panel until the user has touched a time field, or until either a conflict surfaces or save is attempted.
- **Suggested command**: `/impeccable distill client/src/pages/ReservationFormPage.jsx`

- **[P2] What**: Save button stays enabled when availability check returns a conflict.
- **Why it matters**: The warning banner says "This time is already booked." The button still says "Save Reservation" in primary blue. Mixed signal: the page is telling staff "no" while the button is telling them "yes." Server-side will reject anyway, but that's a wasted round trip and a more confusing error.
- **Fix**: Either disable Save while a known-conflict banner is showing, or relabel the button "Try Save anyway" until the conflict resolves.
- **Suggested command**: `/impeccable harden client/src/pages/ReservationFormPage.jsx`

- **[P3] What**: Time chip grid uses `role="radiogroup"` but no arrow-key navigation between chips.
- **Why it matters**: ARIA convention is that radio groups support arrow-key cycling. Tab still works (each chip is a button), but a power-user can't sweep through times with arrows the way the role announces.
- **Fix**: Add `onKeyDown` to the time-grid: ArrowRight/Down advances, ArrowLeft/Up rewinds, Home/End jump to ends. Roughly 30 lines.

## Persona Red Flags

**Tita Marisol (clerk, 50s, low digital literacy)**: This is the screen the system was built FOR her. The numbered circles + serif heads + Tagalog hints walk her through. The live availability check saves her from booking a conflict she'd otherwise have to undo at the desk. **One sticking point**: when she taps a time chip and the page silently re-checks availability, she might not notice the small banner change at the bottom of the form before she clicks Save.

**Carlo (assistant, 20s, fast typist)**: He wants to type, not click chips. The chip grid is great for Tita; for him, a typeable time field would be faster. The Tab order through 14+ start-time chips is long.

## Minor Observations

- **Field component composition** (`<Field id label filipino hint error wide>`) is the cleanest abstraction in the codebase — it bakes in `aria-invalid`, `aria-describedby`, and label/control linking.
- The `ValidationErrorList` component bubbles backend validation errors into the UI in a structured way — small but real correctness work.
- The `applyStartTime` helper preserves duration when the user picks a different start — good muscle memory across edits.

## Questions to Consider

- What does the form look like at 380px (single column phone)? The 2-column form-grid would need to stack.
- Could a "frequent requester" lookup (typeahead by name) skip 3 of 4 fields when a regular books again?
- Is there a confirmation step after Save? Right now Save → navigate to /reservations. A "Reservation #45 saved" toast or stay-on-page success state would help staff who want to print the confirmation.
