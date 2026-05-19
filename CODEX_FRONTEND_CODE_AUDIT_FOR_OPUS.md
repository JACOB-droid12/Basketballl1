# Codex Frontend Code Audit for Opus

Date: 2026-05-18
Scope: React frontend, shared UI helpers, route wiring, frontend/API contracts, print components, CSS-driven component patterns, tests, and browser-confirmed source issues.

## Code Areas Inspected

- `client/src/App.jsx`
- `client/src/components/AppShell.jsx`
- `client/src/api/client.js`
- `client/src/api/mappers.js`
- `client/src/api/statusDisplay.js`
- Dashboard, calendar, reports, reservation, resident, account, activity log, court policy, print, modal, and shared UI components under `client/src`
- Frontend route metadata under `src/features/frontend`
- API contract routes and mappers under `src/features/api`
- Schedule service under `src/features/schedule`
- Reservation validation under `src/features/reservations`
- React/static/UI smoke tests under `tests`

## API Contract Usage Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-004 | High | `client/src/components/BackupReminderCard.jsx:59,82`; `src/features/api/apiRoutes.js:908-909` | Component expects `backupDue` at top level, endpoint returns `{ backupStatus }`. | Unwrap `data.backupStatus || data` and keep hidden state only when confirmed not due. |
| UI-AUD-006 | Medium | `client/src/components/DailySchedulePrintView.jsx:150`; `src/features/api/apiMappers.js` | Print reads `block.blockType`, API emits `type`. | Read both fields and humanize code values. |
| UI-AUD-008 | Medium | `client/src/pages/ReservationsPage.jsx:140` | Export link bypasses React filter/search state. | Preserve filters in export URL or label as "Export all reservations CSV". |

## State Management Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-002 | Critical | `client/src/pages/ReservationFormPage.jsx:58,463-475,570` | Default selected time can be disabled and Save remains enabled. | Compute first valid future time when date is today; block Save on disabled/current invalid slot. |
| UI-AUD-011 | Medium | `client/src/pages/ReservationFormPage.jsx:97,897-898` | Current Manila date/time is memoized once and keyboard choices include disabled past slots. | Refresh current time on date/time checks and filter keyboard choices. |
| UI-AUD-015 | Low | `client/src/App.jsx` | `/login` renders login form even when signed in. | Redirect signed-in user to dashboard or show signed-in state. |

## Error / Loading / Empty State Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-017 | Low | `client/src/pages/ReservationFormPage.jsx:840` | "Save anyway" copy weakens confidence when schedule check fails. | Say backend will validate and staff should retry, without encouraging blind save. |
| UI-AUD-024 | Low | Runtime Chrome issue | Form field missing id/name was reported, but node was not identified. | Re-run Chrome issues panel after fixes; inspect native date/time/search controls. |

## Role Visibility Findings

Source indicates admin-only routes are gated in the app shell and API routes. Staff runtime was not separately inspected due lack of staff credentials in this sweep. Opus should retest staff account behavior after frontend changes, especially Accounts and Court Policy visibility.

## Form Validation Findings

- Client length caps generally mirror database constraints.
- Backend remains authoritative for same-day past time validation.
- Frontend must stop presenting invalid same-day past times as selected or saveable.
- Contact pattern is present; long-data and special-character handling should be preserved.

## Date / Time / Status Formatting Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-003 | Critical | `client/src/api/mappers.js:67-88`; `ActivityLogsPage.jsx`; `AccountsPage.jsx`; print components | `formatDateTimeHuman` formats local SQL timestamps with UTC, shifting by 8 hours. | Treat backend SQL local datetime as Manila/local display or make API return ISO with zone, then update tests. |
| UI-AUD-012 | Medium | `client/src/pages/ReportsPage.jsx` | Report usage labels use raw 24-hour ranges. | Use shared `formatTime`/friendly range helper. |
| UI-AUD-018 | Low | Status display consumers | `Done` and `Completed` wording is inconsistent. | Pick one staff-facing word and use it everywhere. |
| UI-AUD-027 | Trivial | Multiple screens | Time range typography varies. | Normalize time range display. |

## Accessibility / Semantic HTML Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-007 | Medium | `client/src/pages/ReservationsPage.jsx:290-317` | Button-like card contains real button. | Make the card a semantic article/list item with explicit View and Print buttons. |
| UI-AUD-009 | Medium | `ReportsPage.jsx:225,719`; `ReservationHistoryPage.jsx:338` | `role="tab"` elements lack expected keyboard behavior. | Implement ARIA tabs properly or use simpler segmented buttons. |
| UI-AUD-010 | Medium | `CalendarPage.jsx:335` | Menu roles need menu keyboard/focus behavior. | Implement roving focus/arrow keys or downgrade to a normal disclosure list. |
| UI-AUD-021 | Low | `AccountsPage.jsx:181` | Success uses `role="alert"`. | Use `role="status"` with polite live region. |

## Print Component Findings

| ID | Severity | File(s) | Problem | Opus note |
|---|---|---|---|---|
| UI-AUD-003 | Critical | `ReservationSlipPrintView.jsx`; `DailySchedulePrintView.jsx`; `mappers.js` | Issued times print wrong. | Fix shared formatter first. |
| UI-AUD-006 | Medium | `DailySchedulePrintView.jsx:150` | Block type field mismatch. | Read `type` and `blockType`; humanize. |
| UI-AUD-014 | Medium | `DailySchedulePrintView.jsx` | Same-day past slots can look currently available. | Add print wording that distinguishes schedule record from bookable-now state, after backend fix. |
| UI-AUD-023 | Low | `ReportsPage.jsx:212`; `DailySchedulePrintView.jsx:41` | Official name spelling/header consistency. | Use one official app/site constant. |

## Likely Files for Opus to Modify

- `client/src/pages/ReservationFormPage.jsx`
- `client/src/api/mappers.js`
- `client/src/components/BackupReminderCard.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/ReservationsPage.jsx`
- `client/src/pages/ReportsPage.jsx`
- `client/src/pages/ReservationHistoryPage.jsx`
- `client/src/pages/CalendarPage.jsx`
- `client/src/components/DailySchedulePrintView.jsx`
- `client/src/components/ReservationSlipPrintView.jsx`
- `client/src/pages/ResidentDirectoryPage.jsx`
- `client/src/pages/AccountsPage.jsx`
- `client/src/App.jsx`
- Related tests in `tests/reactPostDeployment*.test.js` and static UI tests.

## Suggested Implementation Notes for Opus

- Do not change backend logic, API routes, database schema, reservation overlap rules, Clear for Public Use behavior, maintenance-block behavior, recurring reservation behavior, or export format support.
- Do not add PDF/XLSX UI. CSV remains the supported export format.
- Fix UI/API display contract bugs in the frontend unless Codex separately changes the dashboard backend issue.
- Preserve the current Barangay/public-office design language: quiet, task-first, official, predictable.
- After fixes, run `npm run frontend:build`, `npm run verify:react-build`, `npm run verify:ui`, `npm test`, and Chrome DevTools MCP screenshots at 1366/1024/768/390.
