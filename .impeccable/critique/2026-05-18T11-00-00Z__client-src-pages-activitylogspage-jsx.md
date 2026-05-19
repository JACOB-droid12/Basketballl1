---
target: client/src/pages/ActivityLogsPage.jsx
total_score: 37
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T11-00-00Z
slug: client-src-pages-activitylogspage-jsx
---
# Activity Logs — Critique (run 5, browser-verified, 1440 — post-fix)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | "50 shown" + "50 log rows from the local audit table" |
| 2 | Match System / Real World | 4 | "Created a reservation", "Marked the booking missed" |
| 3 | User Control and Freedom | 4 | Search + action filter + date filter + Apply/Clear |
| 4 | Consistency and Standards | 4 | Filter card + table primitives reused |
| 5 | Error Prevention | 3 | Apply requires explicit submit, no accidental refilter |
| 6 | Recognition Rather Than Recall | 4 | Action labels are full English sentences |
| 7 | Flexibility and Efficiency | 3 | All / Today / This week presets |
| 8 | Aesthetic and Minimalist Design | 4 | "No reference number" fail-state lines suppressed |
| 9 | Error Recovery | 3 | "Could not load activity logs" state-card |
| 10 | Help and Documentation | 4 | "Use this when a resident asks what changed" |
| **Total** | | **37/40** | up from 36/40 (run 4) |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: 50 log rows render with no "Reservation reference: No reference number" fail-state lines anywhere. Verified in the live DOM. The detail column now reads as the action's own message ("User logged in.", "Cleared 2026-05-20 07:00-21:00 for public use. Cancelled 0 reservation(s).", "Reservation status changed to COMPLETED.", etc.) without the noisy fallback line beneath it.

When the backend ever supplies a real `referenceNo` on a log row, the line will render again — verified by the new gate (`typeof log.referenceNo === "string" && log.referenceNo.trim() !== ""`).

**Deterministic**: Detector clean for `ActivityLogsPage.jsx` (verified run 5).

## What's Working

- **Fail-state line gone.** The 16-row column of "Reservation reference: No reference number" is no longer rendered. The audit table reads top-to-bottom as the actual story of office activity.
- **Action labels still doing the heavy lift.** "Marked the booking done" / "Created a reservation" / "Deactivate schedule block" — full English sentences in the Action column.
- **Counts**: "50 shown" badge in the filter card + "50 log rows from the local audit table" in the table card. Two framings of the same number, both useful.

## Priority Issues

- **[P3] What**: Login + Logout rows still pile up (~20 of 50 in this run).
- **Why it matters**: Carried from run 4. The signal-to-noise ratio of the "what changed?" view is still dragged down by session events.
- **Fix**: Add a "Hide login/logout" toggle (default on) or auto-suppress them with a small "+ N login/logout events" affordance.
- **Suggested command**: `distill` (out of scope for small-tweaks)

- **[P3] What**: "This week" preset still doesn't filter by week.
- **Why it matters**: Carried from run 4. Code comment admits the limitation.
- **Fix**: Hide the preset until the backend supports a range, or replace with "Last 7 days".
- **Suggested command**: `harden` (out of scope for small-tweaks)

## Trend (5 runs): 25 → 32 → 31 → 33 → 36 → **37**
