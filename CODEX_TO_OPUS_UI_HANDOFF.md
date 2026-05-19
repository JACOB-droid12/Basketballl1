# Codex To Opus UI Handoff

Date: 2026-05-18
Scope: frontend/UI/UX/design issues observed during a backend/system audit. Codex did not redesign UI.

## Summary

Backend/API/database verification passed after Codex fixes. The item below is frontend-owned because it concerns UI request state and export-button wiring, not backend storage integrity.

## Handoff Items

| Issue ID | Severity | Screen/component | Deployment blocked | Backend verification result |
|---|---:|---|---:|---|
| OPUS-001 | Medium | Reservations list CSV export control | No | Backend CSV/export endpoints are server-side, CSV-only, and validation-backed. Legacy server-rendered reservation export preserves filters. React filter-state handoff should be confirmed by Opus. |

### OPUS-001 - Reservation CSV Export Filter State

Steps to reproduce:

1. Open the React reservations list.
2. Apply a date/status/search/purpose filter.
3. Use the visible CSV export control.
4. Inspect whether the downloaded CSV is filtered exactly like the visible list.

Expected behavior:

The export request should include the same active filters as the visible reservations list, and the backend should return the filtered CSV.

Actual behavior:

Prior frontend inspection flagged export-filter preservation as needing Opus confirmation. Codex did not change frontend request wiring in this backend/system audit.

Suggested Opus fix:

Wire the CSV export button/link to the active list filters and keep export support CSV-only. Do not add PDF/XLSX. If the UI uses a monthly endpoint, make sure that is a deliberate product choice and that the label communicates it clearly.

Backend verification:

Codex tightened backend filter validation for `GET /api/reservations`; report/export date ranges now reject reversed ranges; CSV exports do not expose account passwords or secrets.

Deployment impact:

Not a backend deployment blocker. Treat as a frontend polish/integration handoff before final presentation.
