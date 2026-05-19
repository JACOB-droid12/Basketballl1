---
target: "client/src/pages/ReservationFormPage.jsx"
total_score: 36
p0_count: 0
p1_count: 1
timestamp: 2026-05-16T22-00-00Z
slug: client-src-pages-reservationformpage-jsx
---
# New Reservation — Critique (run 3, browser-verified — REGRESSION FOUND)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live availability check works, but idle-hide regression in create mode |
| 2 | Match System / Real World | 4 | Three plain-language section headers |
| 3 | User Control and Freedom | 4 | Cancel + suggestion-chips + "Adjust manually" toggle |
| 4 | Consistency and Standards | 4 | Save disabled on known conflict |
| 5 | Error Prevention | 3 | Pre-flight check + Save guard. Idle-hide fails in create mode (regression) |
| 6 | Recognition Rather Than Recall | 4 | Numbered sections, section circles, bilingual hints |
| 7 | Flexibility and Efficiency | 3 | No arrow-key navigation in radiogroup chips (carried) |
| 8 | Aesthetic and Minimalist Design | 4 | Override toggle is a styled button now, not a hidden details |
| 9 | Error Recovery | 4 | Conflict → suggestion chips → click to apply |
| 10 | Help and Documentation | 3 | "Adjust end time manually" label is self-explanatory |
| **Total** | | **36/40** | flat from 36/40 — discoverability win + regression cancel out |

## Anti-Patterns Verdict

**LLM (browser-verified at 1440)**: The "Adjust end time manually" toggle works as a real button now — clicking it expands the End-time `<select>` and the button text flips to "Use auto end time". Aria-expanded toggles correctly. This is the discoverability win I aimed for.

**But — regression detected:** On a fresh New Reservation form, the "This time is available" success banner shows immediately on page load, before the user has touched any time field. I introduced a `timeTouched` flag in run 2 specifically to prevent this, but the gating logic (`!timeTouched && !canCheck`) only fires when `canCheck` is false. In create mode, `hasEditedTimeChanged` is hard-coded to `true` (line 95), so `canCheckAvailability` is `true` from mount, the API call fires immediately, and the banner appears.

The run-2 fix worked in **edit** mode (where `hasEditedTimeChanged` is properly false until the user changes a time) but never fired in **create** mode. I missed this in the run-2 critique because I only verified the edit code path.

**Deterministic**: No banned patterns.

## What's Working

- **"Adjust end time manually" as a button**: Verified visually — renders as a styled button with hover/focus states. The `<details>` ambiguity from run 2 is gone. Click it, panel expands, button text flips. Real progressive disclosure.
- **Numbered-section pattern**: 32px primary circle + serif h3 + Filipino italic — still the project's signature.
- **Save disable on known conflict**: I would need a conflict response to fully test this, but the code path is in place.
- **Time chip + Duration + "Will end at" derived label**: Layout flow reads naturally — Date → Start → Duration → derived End time → optional manual override.

## Priority Issues

- **[P1] What**: Idle availability banner shows on initial create-mode load (regression from run 2).
- **Why it matters**: I claimed in run 2 that the panel was hidden until time fields were touched. That's true in edit mode but false in create mode. The banner shows "This time is available" immediately for the default 7-8am slot, which is exactly the pre-emptive helper text run-1 critique flagged as creating anxiety where there shouldn't be any.
- **Fix**: Change `canCheckAvailability` to require `timeTouched` in create mode too:
  ```js
  const canCheckAvailability = useMemo(() => {
    if (!isEdit && !timeTouched) return false;
    return hasEditedTimeChanged && isValidDate(form.reservationDate) && isValidTimeRange(form.startTime, form.endTime);
  }, [...]);
  ```
  This makes the create-mode flow: page loads → no banner → user picks Start time → `timeTouched=true` → banner appears.
- **Suggested command**: `/impeccable harden client/src/pages/ReservationFormPage.jsx`

- **[P3] What**: Time-chip radiogroup still lacks arrow-key navigation.
- **Why it matters**: Carried from runs 1 and 2.
- **Fix**: ~30 lines of `onKeyDown` handler.

- **[P3] What**: Override toggle is text-only at 13px.
- **Why it matters**: Now that I see it rendered, the button is functional but small — 36px min-height, 13px label. Discoverable, but not loud. For a clerk who has never seen the form before, the chrome around it (`Will end at 8:00 AM`) is louder than the override.
- **Fix**: Either bump the toggle to 14-15px, or add a small chevron icon to signal expandability.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Flow is faster than run 2. She picks Date, taps Start, taps Duration. "Will end at 9:00 AM" answers her last unspoken question. **Sticking point**: she sees a green "This time is available" banner before she's done anything — slightly confusing if she expects "system response" to mean "after I make a choice."

**Carlo (assistant, 20s)**: Wants to type, not click. Same complaint as runs 1 and 2.

## Minor Observations

- The override panel uses `border-top` separator inside the same card — keeps the relationship clear ("this is part of end-time, not a new section").
- Aria-expanded + aria-controls are both wired — assistive tech will announce state correctly.
- The "Use auto end time" / "Adjust end time manually" label flip is the right copy: it tells the user what the next click does, not what the current state is.

## Trend for `client-src-pages-reservationformpage-jsx` (last 5 runs): 33 → 36 → **36**
