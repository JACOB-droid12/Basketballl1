---
timestamp: 2026-05-18T03-50-59Z
slug: client-src-pages-courtpolicypage-jsx
target: "Court Policy"
total_score: 22
p0_count: 1
p1_count: 2
---

# Court Policy — Critique

## Anti-patterns verdict

No absolute-ban hits in markup. But the page has one real, named structural failure that overrides any "looks fine" reading: the "Allowed days" picker has no CSS for its `.court-policy-day-options` and `.court-policy-day-option` classes, so each day renders as a full-width row with a native checkbox stuck on the left. Verified live: each `<input type=checkbox>` measures **970px wide × 48px tall**. That is not a design choice, it's a missing rule.

The rest of the page passes the AI-slop test. No hero metric, no card grid of identical settings tiles, no glassmorphism. It is, however, a ten-control vertical form with no grouping, and that is the most generic shape a settings page can take. Category-reflex test: a stranger could correctly guess "barangay form on civic-blue + cream" from the domain alone, which is the second-order trap. The page isn't trying to be more than a form, but it could afford to do less generic work.

## Heuristic scores

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Save button shows "Saving..." text, success/error alerts surface; ok. |
| 2 | Match System / Real World | 4 | Bilingual labels, "blocked dates", "grace period before missed" — staff language throughout. |
| 3 | User Control and Freedom | 2 | No "Reset to defaults", no "Cancel changes" once edits are dirty, no diff-from-saved cue. Once the staff types into a field they cannot revert without reloading. |
| 4 | Consistency and Standards | 2 | Allowed days renders as full-width stacked checkboxes — mismatches every other day-of-week selector pattern in the world (and the project's own time-chip / duration-picker pill pattern). |
| 5 | Error Prevention | 2 | Min-minutes and max-minutes are sibling number fields with no client-side cross-check; the staff can submit min=240, max=30 and learn after a roundtrip. |
| 6 | Recognition Rather Than Recall | 2 | "Default slot minutes" vs "Minimum reservation minutes" vs "Maximum reservation minutes" — three closely-related numeric fields, no diagram or example to show what each one controls. |
| 7 | Flexibility and Efficiency | 2 | Blocked dates is a freeform textarea with `YYYY-MM-DD per line`. No date picker, no "add holiday" affordance, no preview. |
| 8 | Aesthetic and Minimalist Design | 2 | Eight controls vertically stacked at the same width with the same chrome reads as a long monotonous stack. The DESIGN.md "Vary spacing for rhythm" law isn't honoured — every field has identical padding. |
| 9 | Error Recovery | 3 | Backend validation errors render next to fields; ok. But there's no "you have unsaved changes" warning if the staff navigates away. |
| 10 | Help and Documentation | 3 | Each field has a hint line. No example or screenshot of how the policy affects the calendar, which is the question the office actually asks. |
| **Total** | | **22/40** | **Below the bar; one P0 and structural issues** |

## Overall impression

The page works as a contract — it loads policy, lets an admin edit it, sends it back. But it does not read like a deliberate civic settings surface. It reads like the form you build first to prove the API works, then ship before it gets a second pass. The P0 is the missing day-picker styling. Beyond that, the screen is a long vertical stack of eight controls with no grouping and no preview of what the policy does — and "what the policy does" is the entire point of the page.

The strongest single thing this page could do for staff is **show a one-day mini-calendar preview** of how the current opening time, closing time, slot minutes, and allowed days produce real bookable slots, then update it live as the admin edits. Right now the admin has to commit the policy and walk to the Calendar to see whether they got it right.

## What's working

- **Read-only-for-staff fallback.** Non-admin users see the same form with `readOnly` inputs and disabled checkboxes; the page doesn't fork into a second view, and the form copy adapts ("These settings can only be changed by an administrator. Ask the office admin if a change is needed.").
- **The page-head pattern is consistent with the rest of the staff console.** Kicker (`SETTINGS`) → serif page title → English-with-Filipino-italic sub.
- **Hint lines do real work.** "Between 15 and 720 minutes" is the constraint the backend enforces; the staff doesn't have to find that out by trial-and-error.

## Priority issues

### [P0] Allowed days picker is structurally broken
**Why it matters**: Each day option's `<label>` is a block element with default checkbox-on-the-left layout, so the seven days stack vertically at full container width instead of sitting in a horizontal row of pills. Live measurement: each row is 970px × 48px on a 1440 viewport. This is the single most-touched control on the page (an admin updates allowed days more often than they update opening hours), and it currently looks like a form the developer forgot to finish. Per DESIGN.md's "The Staff Can Read It Rule" and the time-chips component spec, this should be a row of seven pill chips with the same shape as Time Chips and Duration Picker (10px radius, 48–60px min-height, 2px Office Border, hover lifts to Civic Blue, selected fills Civic Blue).
**Fix**: Add CSS for `.court-policy-day-options` (display: flex; flex-wrap: wrap; gap: 8px) and `.court-policy-day-option` (10px radius pill, 60px min-height, 2px Office Border, body label inside, disabled state lowers opacity). Hide the native checkbox visually but keep it focusable. Reuse the time-chip selected/hover treatment so the day picker reads as the same component family as the reservation-form duration picker.
**Suggested command**: `craft` (genuinely missing component) or `polish`

### [P1] No live preview of what the policy produces
**Why it matters**: The page has eight controls that, in combination, define what the calendar shows for every staff member, every day. Today the admin has to save and switch screens to verify they did not just lock the office out of Wednesdays. The closest thing to a preview is the field hints, which describe the units, not the effect.
**Fix**: Render a sticky right-rail preview card (`.admin-grid` already supports this layout) showing one synthetic day at the current settings: time row from opening to closing, marked with the default-slot-minutes grid, blocked days greyed, the day label tinted by allowed-day membership. Update on input change. This is exactly the "match implementation complexity to vision" point in the shared design laws — a preview is worth more than another helper sentence.
**Suggested command**: `craft`

### [P1] Min / max / default minutes have no relationship-level validation
**Why it matters**: A staff user can set `minimumReservationMinutes=120`, `maximumReservationMinutes=60`, `defaultSlotMinutes=240` and submit; the backend will reject it but the form shows the values as if they were fine until the moment the round-trip returns. The fields also live next to each other in the layout but offer no diagram of how they relate. New admins regularly conflate "default slot" with "minimum reservation."
**Fix**: Two pieces. First, on blur or change, run client-side cross-checks (`min <= max`, `default >= min`, `default <= max`) and surface a single inline cross-field message in the same colour as the existing `fieldErrors.timeRange` alert. Second, replace the three numeric inputs with a single mini panel that visualises a slot ruler: a horizontal bar of total court hours with a draggable min-handle, max-handle, and slot-tick. If the drag UI is too ambitious, at least add a small text helper above the trio: "Reservations are between Min and Max minutes long, in Default-slot-minute steps."
**Suggested command**: `clarify` then `harden`

### [P2] Settings stack is monotonous and ungrouped
**Why it matters**: Eight controls at the same width with the same chrome reads as a flat list. The fields conceptually fall into three groups (hours, durations, calendar), but the layout treats them as a single column. DESIGN.md "Vary spacing for rhythm" is not honoured.
**Fix**: Group with subheads: `Operating hours` (opening, closing), `Reservation durations` (min, max, default-slot), `Calendar` (allowed days, blocked dates), `Missed-booking grace` (grace period). Add a 28px top margin before each group, a 14px sans-serif eyebrow per group. No new components needed; just CSS rhythm.
**Suggested command**: `layout`

### [P3] Blocked dates is a paste-friendly textarea, not a date entry
**Why it matters**: Office staff don't think in `YYYY-MM-DD per line`. They think "Aug 28 (Buwan ng Wika)." Asking the admin to know ISO format and to put one date per line is a small but real cognitive tax that the rest of this app avoids (date inputs use the native picker everywhere else).
**Fix**: Replace the textarea with a "Blocked dates" list: a `<input type=date>` plus an "Add holiday" button that pushes onto a chip-list of removable date pills. Submit serialises back to the same `YYYY-MM-DD[]` array the API expects. Optional: include a default Philippines public-holiday seed for the current year.
**Suggested command**: `craft`

## Persona red flags

**Romeo (admin who only edits this page once a quarter)**: Romeo logs in, opens Court Policy. The Allowed Days control immediately tells him something is broken about the screen — it doesn't look like the rest of the system. He becomes uncertain about whether his edits will save correctly because the visual contract is already wrong.

**Maria (counter clerk, read-only)**: Maria opens the page out of curiosity. Every input is `readOnly` with no visual cue that it's locked beyond the missing focus ring. She tries to type into "Opening time" and nothing happens. There's no clear "you cannot edit this" affordance other than the absence of a Save button at the bottom — which is below the fold on a 900px viewport.

## Minor observations

- The form is **1115px tall on a 1440×900 viewport** — the Save Policy button is below the fold for everyone. The non-admin experience hides Save, so the form just trails off at the bottom of a tall scroll.
- Page-kicker reads `SETTINGS` (top of page) and the form's own kicker reads `COURT POLICY`. Two kickers, three orientations (page-kicker → page-title → form-kicker → form-h2 "Operating settings"). Distill to one.
- `Save Policy` should be `Save policy` to match the rest of the app's button casing (the staff-page-head examples elsewhere use sentence case).
- `field-error` line for the time range renders globally at the top, but the per-field error pattern renders next to the field. Two error patterns for the same surface; consider always rendering field-level so the staff doesn't have to scroll up.

## Questions to consider

- What if Court Policy were a side-by-side editor + live calendar preview, not a vertical form?
- Does this need to be one page, or two? "Hours and durations" might belong with general settings; "Allowed days and blocked dates" might belong on the Calendar page itself, where the admin already sees the surface they're editing.
- Could the page open in read-only mode for admins too, with an explicit "Edit" affordance? It would prevent accidental change to a setting that affects every booking the office has ever seen.
