# Opus Frontend Handoff

Codex implemented the backend/database/API foundation for the post-deployment feature set. Opus should now build UI on top of these endpoints without redesigning backend rules in the browser.

## Backend Features Implemented

- Reservation reference numbers: every reservation now has `referenceNo` like `BCS-2026-000001`.
- Printable reservation slip data: `GET /api/reservations/:reservationId/slip`.
- Daily print schedule data: `GET /api/schedule/daily-print?date=YYYY-MM-DD`.
- Dashboard alerts and backup age: `GET /api/dashboard/alerts`, `GET /api/maintenance/backup-status`.
- Maintenance/unavailable blocks: `POST /api/schedule/blocks`, `DELETE /api/schedule/blocks/:blockId`.
- Backend-backed Clear for Public Use: `POST /api/schedule/clear-public-use`.
- Prototype day clear bridge: old `clearDay(...)` now calls `POST /api/prototype/clear-public-use`.
- Reports: expanded `GET /api/reports`.
- CSV exports: daily, weekly, monthly, activity logs, missed, cancelled, reports.
- Reservation history by contact/name: `GET /api/reservations/history`.
- Resident directory: `GET/POST/PUT /api/residents`.
- Calendar status/color support: schedule cells return backend status fields and optional block data.
- Court policy settings: `GET/PUT /api/settings/court-policy`, enforced on reservation create/update.

Recurring reservations are deferred. Do not build recurring UI yet except disabled/coming-soon text if needed.

## Frontend Endpoints To Use

Use `client/src/api/client.js` and `client/src/api/mappers.js` for API calls and mapping.

- Reservation list/details: `GET /api/reservations`, `GET /api/reservations/:id`.
- Reservation create/update/delete/status: existing endpoints, now read `referenceNo` and handle `400` policy errors plus `409` unavailable block errors.
- Slip button/drawer/print view: `GET /api/reservations/:id/slip`.
- Calendar week: `GET /api/schedule?date=YYYY-MM-DD`.
- Availability checks: `GET /api/availability?date=&startTime=&endTime=&reservationId=`.
- Daily print view: `GET /api/schedule/daily-print?date=YYYY-MM-DD`.
- Dashboard alert band/cards: `GET /api/dashboard/alerts`.
- Backup reminder widget: `GET /api/maintenance/backup-status`.
- Maintenance modal: `POST /api/schedule/blocks`.
- Deactivate maintenance/clear block: `DELETE /api/schedule/blocks/:blockId`.
- Clear for Public Use modal: `POST /api/schedule/clear-public-use`.
- Reports page: `GET /api/reports?from=&to=`.
- CSV links/buttons:
  - `/api/exports/daily-schedule.csv?date=YYYY-MM-DD`
  - `/api/exports/weekly-schedule.csv?date=YYYY-MM-DD`
  - `/api/exports/monthly-reservations.csv?month=YYYY-MM`
  - `/api/exports/activity-logs.csv?action=&date=&search=`
  - `/api/exports/missed-reservations.csv?from=&to=`
  - `/api/exports/cancelled-reservations.csv?from=&to=`
  - `/api/exports/reports.csv?from=&to=`
- Resident history: `GET /api/reservations/history?contactNumber=` or `?name=`.
- Resident directory:
  - `GET /api/residents?search=&contactNumber=`
  - `POST /api/residents`
  - `PUT /api/residents/:residentId`
- Court policy:
  - `GET /api/settings/court-policy`
  - `PUT /api/settings/court-policy` admin only

See `docs/POST_DEPLOYMENT_API_CONTRACT.md` for exact payloads and error shapes.

## Likely Frontend Files

- `client/src/pages/DashboardPage.jsx`: add alert data, backup due card, public-use/maintenance notices.
- `client/src/pages/CalendarPage.jsx`: color cells from `statusCode`; show `block` separately from `reservation`; add clear/maintenance actions for admins.
- `client/src/pages/ReservationFormPage.jsx`: show `referenceNo` after create, policy validation errors, block conflicts, resident lookup prefill.
- `client/src/pages/ReservationsPage.jsx`: show/search reference numbers; add slip and history actions.
- `client/src/components/ReservationDetailDrawer.jsx`: display `referenceNo`; add print slip action.
- `client/src/pages/ReportsPage.jsx`: consume expanded report sections and export links.
- `client/src/pages/ActivityLogsPage.jsx`: add CSV export link.
- `client/src/components/StatusBadge.jsx`: add visual variants for `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE`.
- `client/src/api/mappers.js`: map new `referenceNo`, `block`, policy, resident directory, alerts, and report fields.
- `public/js/prototype-backend.js`: already updated for backend-backed prototype day clear. Avoid major prototype redesign unless specifically requested.

## UI Work To Build

- Add reservation reference display everywhere a reservation appears.
- Add printable slip workflow:
  - Button in reservation detail/list.
  - Fetch slip endpoint.
  - Render print-friendly permit/slip.
  - Show `CANCELLED` clearly when applicable.
- Add daily schedule print workflow:
  - Date picker.
  - Fetch daily print endpoint.
  - Render slots, reservations, maintenance, and clear public-use ranges.
- Add admin schedule actions:
  - Maintenance/unavailable block create modal.
  - Clear for Public Use modal with `WHOLE_DAY`, `TIME_RANGE`, `FROM_TIME_ONWARD`.
  - Confirmation must warn that overlapping active reservations will be cancelled but not deleted.
- Add resident history panel:
  - Search by contact number/name.
  - Show summary counts and past/upcoming reservations.
- Add resident directory page or drawer:
  - Search.
  - Create/update.
  - Prefill reservation form from directory record.
- Add court policy settings page:
  - Staff can read if useful.
  - Admin can update.
  - Show backend validation errors exactly.
- Add report sections:
  - Most used days.
  - Most used time slots.
  - Monthly reservation count.
  - Missed/cancelled.
  - Purpose.
  - Staff encoder.
  - Clear public-use ranges.
  - Maintenance blocks.
- Add CSV export buttons that link directly to backend export URLs.

## What Frontend Must Avoid

- Do not reimplement overlap, clear, block, policy, or cancellation rules in frontend-only state.
- Do not delete reservation history when clearing public use or maintenance ranges.
- Do not hardcode status meaning only in CSS. Use backend `statusCode`, `statusName`, and `block.type`.
- Do not create online resident booking, public accounts, SMS, cloud sync, or internet-dependent features.
- Do not store or display passwords or password hashes.
- Do not bypass API role rules with hidden-only buttons. Hide unavailable actions, but still expect backend `403`.
- Do not build recurring reservation UI as active; backend endpoint is intentionally deferred.

## Suggested Frontend Test Cases

- Reservation create shows `referenceNo` and rejects a policy-duration violation from backend.
- Calendar renders:
  - `RESERVED`
  - `MISSED`
  - `CANCELLED`
  - `COMPLETED`
  - `MAINTENANCE`
  - `BARANGAY_EVENT`
  - `CLEARED_PUBLIC_USE`
- Admin clears a whole day:
  - POSTs to `/api/schedule/clear-public-use`.
  - Cancelled reservations remain visible in history as `CANCELLED`.
  - Cleared cells show public-use status.
  - New overlapping reservation is blocked.
- Admin creates a maintenance block:
  - It displays separately from resident reservations.
  - New overlapping reservation is blocked.
- Slip print for cancelled reservation shows `CANCELLED`.
- Daily print view includes maintenance and clear public-use ranges.
- Backup alert appears when `backupStatus.backupDue` is true.
- Resident directory duplicate contact shows the backend contact error.
- CSV export buttons download files with timestamped filenames.

## Backend Limitations

- CSV exports are implemented. PDF/XLSX are intentionally not added because no existing safe offline dependency was present.
- Recurring reservations are deferred until a dedicated recurring series table and atomic all-or-nothing transaction design are added.
- Direct SQL writes outside the application can still bypass application-level policy and schedule-block checks; normal app/API flows enforce them.

## Backend Verification Notes

Codex added backend tests for reference numbers, slips, daily print data, alerts, backup reminder, maintenance blocks, Clear for Public Use, reports, exports, history, resident directory, and court policies. Final verification results are in the Codex final response for this task.
