---
target: src/features/frontend/reactAppRoutes.js
total_score: 40
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T12-30-00Z
slug: src-features-frontend-reactapproutes-js
---
# Express SPA Route Coverage — Critique (run 1, server-verified — post-fix)

## What Changed

`src/features/frontend/reactAppRoutes.js` — the `MAIN_ROUTES` list now includes every client-side route that the React app advertises in the sidebar, including:

- `/schedule/daily-print`
- `/reservations/history`
- `/reservations/:id/slip`
- `/residents`
- `/settings/court-policy`

Tests in `tests/reactAppRoutes.test.js` extended to cover all the new paths (still 2 tests, now exercising 17 routes; pass).

## Anti-Patterns Verdict

**Server verification**: Hit each of the 5 previously-404 paths with a logged-in session via `Invoke-WebRequest -MaximumRedirection 0`. All return 200 with the SPA HTML shell, confirming the deep-link / hard-reload path now works for the entire navigation surface.

A staff user who bookmarks `/residents` or refreshes their browser tab on `/reservations/history` no longer gets "Cannot GET". The office-restart workflow (where Windows restores the last open tab) survives.

## Outstanding

- **None** for the listed paths. The opt-in route list is now in sync with the sidebar.
- **Defensive**: A future client-side route added under the SPA without updating `MAIN_ROUTES` would silently 404 again. Worth a follow-up "generic SPA fallback for unmatched non-`/api/`, non-`/app/assets/` paths" if the route list grows further. Deferred — the explicit list keeps the surface auditable today.

## Trend
First run baseline.
