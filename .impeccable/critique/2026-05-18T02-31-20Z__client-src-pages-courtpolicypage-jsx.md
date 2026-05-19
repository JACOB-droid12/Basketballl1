---
target: Court policy section
total_score: 17
p0_count: 2
p1_count: 2
timestamp: 2026-05-18T02-31-20Z
slug: client-src-pages-courtpolicypage-jsx
---
# Court policy — critique

**Target:** `client/src/pages/CourtPolicyPage.jsx` (+ `client/src/components/CourtPolicyForm.jsx`)
**Route:** `/settings/court-policy` (admin-only)

The page passes every absolute ban from the shared design laws but reads as an engineer wireframe rather than a designed civic surface: eight controls stacked in one undifferentiated tower, a maintenance alert hijacking the top of the page, a free-text date textarea, and zero peak-moment weight for an action that controls real reservations.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Save success alert vanishes on next keystroke; no timestamp or actor |
| 2 | Match System / Real World | 2 | DB-column field labels ("Default slot minutes"), `YYYY-MM-DD` exposed verbatim |
| 3 | User Control and Freedom | 1 | No Cancel, no discard guard, no undo, no revert-to-defaults |
| 4 | Consistency and Standards | 2 | "Save Policy" Title Case anomaly; textarea-as-date-list unique to this page |
| 5 | Error Prevention | 1 | Zero client-side validation; `parseBlockedDaysText` silently drops malformed entries |
| 6 | Recognition Rather Than Recall | 2 | Range hints help; `YYYY-MM-DD` recall is on the user |
| 7 | Flexibility and Efficiency | 2 | No Cmd+S, no batch day toggles, no quick-revert |
| 8 | Aesthetic and Minimalist Design | 2 | Clean palette but a tower-of-inputs with no internal rhythm |
| 9 | Error Recovery | 2 | Per-field errors wired correctly, but copy is server-canned |
| 10 | Help and Documentation | 1 | No inline definitions for "grace period" or "default slot" |
| **Total** | | **17/40** | **Poor — major UX overhaul required** |

## Anti-Patterns Verdict

**LLM assessment.** Borderline. The page passes every named ban: no gradient text, no glassmorphism (`.form-card` is flat 1px border, `styles.css:976-1034`), no hero-metric template, no identical card grid, no `border-left` accent stripe, no modal-as-first-thought, no em dashes. The slop tells are structural rather than visual: 8 controls in one ungrouped column, a generic alert banner above the form (BackupReminderCard rendered first), Title Case `Save Policy` button label, and a 15px `.form-copy` line under the 17px civic baseline.

**Deterministic scan.** `npx impeccable detect --json client/src/pages/CourtPolicyPage.jsx client/src/components/CourtPolicyForm.jsx` returned `[]`. No regex- or jsdom-detectable AI tells in the markup or inline styling. The detector cannot see structural problems like single-column form towers or DB-shaped IA, which is where this page lives.

**Visual overlays.** Skipped — no dev server confirmed running and the critique is on source. The detector's clean result + the structural findings below stand on their own.

## Overall Impression

What works: the design tokens are honored, the bilingual pattern is impeccable, and the accessibility plumbing through `Field.jsx` is more rigorous than most projects. What doesn't: the page treats policy editing as CRUD over `court_settings` columns, not as an admin committing rules that govern real bookings. The single biggest opportunity is to break the eight-input tower into four labelled sub-sections and to give the save action peak-moment weight (consequence summary, persistent saved state, optional effective-from date).

## What's Working

- **Bilingual pattern is total.** Every label, hint, legend, and per-day checkbox carries English plus Filipino italic helper, including `Linggo`/`Lunes`/`Martes`/`Miyerkules`/`Huwebes`/`Biyernes`/`Sabado` on the day chips (`CourtPolicyForm.jsx:14-22`, `212-215`). This is the staff-friendly direction lived through.
- **Real semantics under the hood.** `Field.jsx` chains `aria-describedby` between hint and error, toggles `aria-invalid`, and inherits to every cloned input. The allowed-days group uses real `<fieldset>` + `<legend>` with the cross-field error wired via `aria-describedby` (`CourtPolicyForm.jsx:201-251`) — most projects fake this with `role="group"`.
- **Offline copy doesn't drift.** `OFFLINE_MESSAGE` and `isNetworkError` are duplicated verbatim across page and form — same wording, same heuristic, no drift between callers.

## Priority Issues

### [P0] Blocked dates as a free-text textarea
**What.** The blocked-dates field is a 4-row `<textarea>` and the user is told "One YYYY-MM-DD date per line. Leave empty if none." (`CourtPolicyForm.jsx:255-262`). On save, `parseBlockedDaysText` does `.split(/[\s,]+/)` then `.filter(Boolean)` (`CourtPolicyForm.jsx:359-364`) — malformed entries are silently dropped before the server even sees them.
**Why it matters.** This is the single most consequential field on the page (it disables booking on specific days) and it asks a barangay clerk to type ISO dates and trust that they typed them right. There is no client validation, no preview of what was parsed, and no warning when an entry was discarded. Staff will paste from spreadsheets and lose half their dates without ever knowing.
**Fix.** Replace with a chip list backed by `<input type="date">` plus an "Add date" button. Render existing dates as removable chips; reject invalid entries inline; show the parsed list before save.

### [P0] Eight inputs in one undifferentiated tower
**What.** `.form-card` is a single-column 18px-gap grid (`styles.css:1031-1034`); the whole form is one flat list of fields with one `<h2>Operating settings</h2>` at the top. The eight controls — opening, closing, min minutes, max minutes, allowed days, blocked dates, grace period, default slot — share no internal rhythm or grouping (`CourtPolicyForm.jsx:140-313`).
**Why it matters.** This is the cognitive-load failure: 8 visible decisions, ≥4 of them numeric in similar units, no chunking or visual grouping. A first-time admin opens this page and sees a wall of similar-looking 54px inputs. The cognitive-load checklist fails 6 of 8 items.
**Fix.** Break into four labelled `<section>`s with serif `<h3>` sub-heads — **Hours**, **Reservation length**, **Operating days**, **Late policy** — and use the existing `.form-grid` two-column variant (or an inline pair) for the paired numerics (min/max, grace/default slot). The `<h3>`s are the missing serif moment from the design system.

### [P1] Read-only mode visually identical to edit mode
**What.** Staff-as-viewer renders the same eight `<input>`s with `readOnly` (text/number) or `disabled` (checkboxes), with apologetic copy: "These settings can only be changed by an administrator. Ask the office admin if a change is needed." (`CourtPolicyForm.jsx:147-150`, plus per-field `readOnly={!isAdmin}` and `disabled={!isAdmin}` at lines 163, 178, 198, 224, 264, 283, 303). `<input type="time" readOnly>` looks identical to an editable input on most browsers; `disabled` checkboxes are skipped from the tab order, so a keyboard user cannot inspect the policy at all.
**Why it matters.** Two classes of staff arrive here: admins who need to edit and clerks who need to read. The page tells the second class that they're at the wrong page. This collapses a useful read surface into apologetic friction, and it breaks keyboard inspection on the day toggles.
**Fix.** Bifurcate the render. For non-admins, render plain-text rows ("Opening time: 8:00 AM"; "Allowed days: Mon, Tue, Wed, Thu, Fri") inside the same form-card, no inputs, no Save row. Drop the apology and replace it with one neutral line ("Court policy values, last changed by Admin Name on 2026-05-12.").

### [P1] Save commits in one click with no peak-moment weight
**What.** `handleSubmit` ships the form straight to `PUT /api/settings/court-policy`; on success it shows a one-line `.alert.success` "Court policy saved." (`CourtPolicyForm.jsx:99-119`). There is no diff, no consequence summary, no confirmation, and no client-side validation; the alert disappears on the next keystroke (`updateField` clears `formSuccess` at line 78).
**Why it matters.** This action governs real bookings — toggling Sunday off can cancel a recurring reservation pattern, and dropping the maximum from 240 to 120 minutes invalidates pending bookings. The page treats the commit as a CRUD save. There is no signal that anything weighty happened, and no record of who saved what when in this UI.
**Fix.** Add a "Review changes" step: a small panel above the Save row that lists the three or four fields the admin actually touched, with old → new values. Keep the success state persistent (until next edit), with timestamp and actor name, and a "View today on calendar" link so the admin can verify the rules took.

### [P2] BackupReminderCard at the top of the page
**What.** The page renders `<BackupReminderCard />` directly above the form (`CourtPolicyPage.jsx:81-86`). The card is an `.alert.warning` or `.alert.error` palette banner (`BackupReminderCard.jsx:88-94`) with `role="alert"`.
**Why it matters.** A maintenance reminder unrelated to court policy is louder than the form itself and reads as a page-level error to a first-time admin. The dashboard already hosts this card; rendering it twice on a settings page splits its meaning.
**Fix.** Remove from this route. If admins need a backup nudge while editing settings, give it the bottom of the page in the calmer `.alert.info` palette, not the top.

## Persona Red Flags

**Alex (power admin):** No `Cmd+S` shortcut. No diff before commit, so cautious admins refresh to compare. The blocked-dates textarea silently drops malformed paste from Excel. The success alert disappears on the next keystroke, leaving no "last saved at" trace anywhere on the page.

**Jordan (first-time admin):** "Grace period before missed (minutes)" is undefined inline — Jordan doesn't know whether 30 means "30 minutes after start" or "30 minutes before end". Three similar-sounding numeric fields (default slot vs minimum vs maximum minutes) with no distinguishing examples. The BackupReminderCard at the top will be misread as a page error and Jordan will leave to fix the wrong problem.

**Sam (keyboard / screen-reader staff):** `disabled={!isAdmin}` on the day checkboxes (`CourtPolicyForm.jsx:215`) drops them from the tab order — Sam cannot consult the policy with keyboard alone. `<input type="time" readOnly>` has no viewer-mode visual cue and reads identically to an editable field. Success alert is `role="alert"` (assertive) instead of `role="status"` (polite), so the SR interrupts mid-task to announce a save Sam expected.

**Barangay clerk (project-specific):** ISO `YYYY-MM-DD` without a date picker is the highest red flag — clerks deal in `Disyembre 25` or `12/25`, not `2026-12-25`. Jargon "Operating settings" / "grace period" / "default slot" doesn't match the parlance in `STAFF-DAILY-USE.txt` ("opening time", "closing time", "no-show"). Apologetic viewer-mode copy buries the values they came to see.

## Minor Observations

- `<h2>Operating settings</h2>` in the form falls back to the global `h2` rule (Inter, no override) — wastes a serif moment that fits the design system's "orientation moments" rule.
- Court orange page-kicker repeats twice on the same surface (page-level "Settings" and form-level "Court policy") — within the rule but redundant on a single-form page.
- Offline failure renders in `.alert.error` red; the offline copy is reassuring ("Try again once the network is back."), so the warning palette would match the tone better than danger.
- "Save Policy" Title Case is inconsistent with peer buttons elsewhere ("Save changes", "Add block").

## Questions to Consider

- Should this page be a form at all? Render the policy as one plain-language sentence ("The court is open **8:00 AM** to **5:00 PM** on **Mon–Fri**, ...") with click-to-edit fragments. The read-only/editable split disappears, and clerks read the same surface admins edit.
- What if the calendar were the editor? Paint the policy onto a week template, watch the reservation grid update live, with the eight numerics as a collapsed details panel.
- Should saving require an "effective from" date and a consequence summary ("affects 14 pending reservations after Dec 1")? That gives the peak moment weight and stops admins fearing the Save button.
