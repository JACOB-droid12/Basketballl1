# Codex Backend Findings Discovered During UI Audit

Date: 2026-05-18
Scope: Backend/API behavior found while inspecting frontend UI behavior.
Status: No backend code was changed in this audit.

## Summary

One backend/API issue was discovered through frontend runtime inspection. Other suspected issues were verified as frontend display/API-contract usage problems with backend behavior correct.

## Findings

| Issue ID | Severity | Endpoint/API area | Backend behavior | Frontend symptom | Evidence | Fixed by Codex? | Deferred to |
|---|---|---|---|---|---|---|---|
| CODEX-BE-UI-001 | Critical | `GET /api/dashboard`; schedule summary/nearest available slot | Dashboard builds today's schedule with `isAvailableForBooking` based on status/block only, then counts and selects past same-day slots as available. | Dashboard showed `Nearest available: Mon, May 18, 2026, 7:00 AM - 8:00 AM` at about 5:13 PM Manila time; New Reservation/availability validation rejects that same slot. | `dashboard-1366-nearest-past-slot.png`; `/api/dashboard` response included nearest 7:00 AM; `/api/availability?...07:00...08:00` returned 400. Source: `src/features/api/apiRoutes.js:417-448`, `src/features/schedule/scheduleService.js:92-151`. | No | Codex backend fix pass before final deployment; Opus should only verify UI after backend fix. |

## Backend-Correct / Frontend-Display Issues

| UI issue | Backend result | Classification |
|---|---|---|
| New Reservation saves selected past time. | Backend returned 400 with `errors.startTime`. | Backend correct; frontend should prevent invalid selected default. |
| Activity/print timestamps display 8 hours early. | Backend returned local SQL datetime such as `2026-05-18 17:31:00`. | Backend correct; frontend formatter shifts display. |
| Backup reminder hidden. | Endpoint returned `{ backupStatus: { backupDue: true } }`. | Backend correct; frontend expects wrong response shape. |
| Daily print block type may show dash. | API mapper emits `type`; Calendar already supports both names. | Backend/API contract mismatch at print component; frontend should read both. |

## Recommended Codex Backend Follow-Up

Fix `GET /api/dashboard` so same-day past slots are not counted as bookable and are not returned as `nearestAvailableSlot`. Add regression tests that freeze `todayProvider` and `currentTimeProvider` to a same-day afternoon time and assert:

- `summary.availableCount` excludes past slots for today.
- `nearestAvailableSlot` is later than current time when date is today.
- Future-day slots remain eligible.
- Dashboard behavior stays consistent with `/api/availability` and reservation validation.
