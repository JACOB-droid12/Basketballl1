# Implementation Plan: Post-Deployment Frontend

## Overview

This plan converts the post-deployment frontend design into discrete coding steps for `client/src/`, related `public/app/` build output, the `tests/` directory, and the documentation files listed in Requirement 21. Work is purely additive and reuses the existing `apiRequest` client, the `Field` / `StatusBadge` / `ConfirmDialog` / `ReservationDetailDrawer` / `EmptyState` / `LoadingState` / `Icon` / `AppShell` component set, and the CSS class vocabulary in `client/src/styles.css`. Backend route handlers, database schema, server-side validation, and deployment scripts are not modified (Req. 22.4).

Per the design, property-based tests are not introduced (Req. 20.3 mandates the static-source assertion style of `tests/reactFrontendStatic.test.js`, and the feature is UI rendering, role-based visibility, simple CRUD wiring, and deterministic CSV-URL construction). The test layer is static-source assertions plus example-based behavioral tests, both under `tests/` and discovered by `node scripts/run-tests.mjs`.

## Tasks

- [x] 1. Implement shared frontend helper modules
  - [x] 1.1 Create reference-number helper at `client/src/api/referenceNo.js`
    - Export `formatReferenceNo(value)` that returns the backend string verbatim or `"No reference number"` when missing.
    - Export `matchesReferenceNo(reservation, query)` performing case-insensitive substring match against `reservation.referenceNo`.
    - No reformatting, padding, or recomputation of the reference value.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Create status display helper at `client/src/api/statusDisplay.js`
    - Export `getStatusDisplay(statusCode, statusName)` returning `{ label, className, paletteKey }` covering `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`.
    - `paletteKey` MUST map to existing soft-color tokens (`neutral`, `positive`, `info`, `warning`, `danger`, `muted`); no new tokens.
    - `label` falls back to `statusName` then to a humanized `statusCode`; never empty.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 18.2_

  - [x] 1.3 Create CSV export URL builder at `client/src/api/csvExport.js`
    - Export `buildCsvExportUrl(endpoint, params)` returning `/api/exports/{endpoint}.csv` with only defined, non-empty params encoded into the query string.
    - `endpoint` is restricted to the seven CSV endpoints: `daily-schedule`, `weekly-schedule`, `monthly-reservations`, `activity-logs`, `missed-reservations`, `cancelled-reservations`, `reports`.
    - Throw on unknown endpoint to prevent accidental PDF/XLSX/JSON wiring.
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 15.1, 15.2_

  - [ ]* 1.4 Write unit tests for helper modules under `tests/reactFrontendHelpers.test.js`
    - Cover `formatReferenceNo` placeholder behavior, `matchesReferenceNo` case-insensitivity, `getStatusDisplay` for all eight status codes, and `buildCsvExportUrl` URL/query-string output for each endpoint.
    - Use `node:test` so tests are picked up by `node scripts/run-tests.mjs` without an outbound network call.
    - _Requirements: 1.4, 6.1–6.7, 10.1, 20.2, 20.3_

- [x] 2. Implement print views and routes
  - [x] 2.1 Build `ReservationSlipPrintView` component at `client/src/components/ReservationSlipPrintView.jsx`
    - Accept `{ slip }`; render `referenceNo`, `representativeName`, `contactNo`, `address`, `reservationDate`, `startTime`, `endTime`, `purpose`, `statusName`, `staffEncoder`, `issuedAt`, `barangayName`, `courtName` verbatim from the payload.
    - Render a printed signature line area below the details on success.
    - Render a visible "CANCELLED" mark (text + bordered stripe within the existing 4px allowance) when `slip.statusCode === "CANCELLED"`.
    - Use only locally bundled fonts and the Barangay_Visual_Language; ink-friendly monochrome layout.
    - Render `<EmptyState title="Data unavailable" />` rather than throwing on a malformed payload; never render an empty/broken print frame.
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5, 17.3, 17.5, 18.1, 18.2, 19.1_

  - [x] 2.2 Build `ReservationSlipPrintPage` at `client/src/pages/ReservationSlipPrintPage.jsx`
    - Read `:reservationId` from the route, request `GET /api/reservations/:reservationId/slip` via `apiRequest`, render `ReservationSlipPrintView` on success and an `ErrorState` (alert + backend message, no signature line) on error.
    - On a successful first render, call `window.print()` once data is in DOM.
    - Use the print-only layout (no `AppShell` chrome).
    - On network failure render the standard offline copy from Requirement 17.1.
    - _Requirements: 2.1, 2.6, 2.7, 17.1, 17.2, 17.5, 19.4_

  - [x] 2.3 Build `DailySchedulePrintView` component at `client/src/components/DailySchedulePrintView.jsx`
    - Accept `{ payload }` matching `GET /api/schedule/daily-print?date=...`.
    - Render `slots` (each with `name`, `startTime`, `endTime`, `statusName`, the `reservation.referenceNo` when present, and the `block.reason` when present).
    - Render `blocks` and Public_Use_Clear ranges in a separately labeled section so they are not merged with reservations.
    - Convey status by both label (using `getStatusDisplay`) and class; ink-friendly monochrome styling; locally bundled fonts only.
    - _Requirements: 1.1, 7.2, 7.3, 7.4, 10.5, 18.1, 18.2, 19.1_

  - [x] 2.4 Build `DailySchedulePrintPage` at `client/src/pages/DailySchedulePrintPage.jsx`
    - Read `?date=YYYY-MM-DD`, request `GET /api/schedule/daily-print?date=...`, render `DailySchedulePrintView` on success.
    - On error render the backend message; never render an empty print frame.
    - On a successful first render, call `window.print()` once data is in DOM; print-only layout (no `AppShell` chrome).
    - On network failure render the standard offline copy.
    - _Requirements: 7.1, 7.5, 7.6, 17.1, 17.2, 17.5, 19.4_

- [x] 3. Implement admin schedule modals and the resident picker
  - [x] 3.1 Build `MaintenanceBlockModal` at `client/src/components/MaintenanceBlockModal.jsx`
    - Accept `{ open, onClose, onCreated, user }`; only mount when `user.role === "ADMIN"`.
    - Provide inputs for `date`, `mode` (`WHOLE_DAY`/`TIME_RANGE`), `startTime`, `endTime`, `blockType` (`CLEANING`, `BARANGAY_EVENT`, `REPAIRS`, `TOURNAMENT`, `MEETING`, `EMERGENCY_USE`, `MAINTENANCE`), `reason`.
    - When `mode === "WHOLE_DAY"`, hide or disable `startTime` and `endTime`.
    - On submit, send `POST /api/schedule/blocks` and call `onCreated()` only on a 2xx response so the calendar refresh is backend-driven.
    - Surface the deactivate flow as a confirm action that sends `DELETE /api/schedule/blocks/:blockId`; only update on 2xx.
    - On error, render the backend message via `Field`'s `error` prop and an alert; never mutate local schedule state.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 16.1, 17.1, 17.2_

  - [x] 3.2 Build `ClearPublicUseModal` at `client/src/components/ClearPublicUseModal.jsx`
    - Accept `{ open, onClose, onCleared, user }`; only mount when `user.role === "ADMIN"`.
    - Step 1: configuration form with `mode` selector (`WHOLE_DAY`/`TIME_RANGE`/`FROM_TIME_ONWARD`), `date`, `startTime`, `endTime`, `reason`. Hide both time inputs when `WHOLE_DAY`; hide `endTime` when `FROM_TIME_ONWARD`.
    - Step 2: warning step that displays the literal copy "overlapping active reservations will be cancelled but their records will be kept" and requires an explicit second confirm ("Yes, clear public use") before any backend request is sent.
    - Send `POST /api/schedule/clear-public-use` only after the second confirm.
    - On success, render a "Cancellations" panel listing `cancelledReservations[i].referenceNo`.
    - On any failure to send (network error, unsent request, session expired) keep the modal open, display the readable error, and apply no local cleared-public-use state. Derive cleared state only from the backend response and subsequent fetches; never store `clearedDays` in React state or `localStorage`.
    - Do not call any deprecated `promptClearDay` / `clearDay` helper.
    - _Requirements: 1.1, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 16.1, 17.1, 17.2_

  - [x] 3.3 Build `ResidentPickerDialog` at `client/src/components/ResidentPickerDialog.jsx`
    - Accept `{ open, onClose, onSelect }`; fetch `GET /api/residents?search=` with debounced search input.
    - Render rows showing `fullName`, `contactNumber`, `address`, `group`, `notes` (no password fields).
    - On select, invoke `onSelect(resident)` with `representativeName`, `contactNo`, `address` derived from the resident record so the reservation form can prefill.
    - Render an `EmptyState` when the list is empty and the standard error/offline state on request failure.
    - _Requirements: 9.1, 9.3, 9.5, 9.6, 17.1, 17.2, 17.4, 18.1_

- [x] 4. Implement new pages
  - [x] 4.1 Build `CourtPolicyForm` and `CourtPolicyPage`
    - Page at `client/src/pages/CourtPolicyPage.jsx`; form component at `client/src/components/CourtPolicyForm.jsx`.
    - Fetch `GET /api/settings/court-policy` and render fields for `openingTime`, `closingTime`, `minimumReservationMinutes`, `maximumReservationMinutes`, `allowedDays`, `blockedDays`, `gracePeriodBeforeMissedMinutes`, `defaultSlotMinutes`.
    - Read-only when `user.role !== "ADMIN"` (no save action). Editable for Admin_User; submit `PUT /api/settings/court-policy` and show success on 200.
    - When the response body has an `errors` object, render each error message next to its `Field` via the `error` prop.
    - Render the standard offline copy on network failure and the backend message on `4xx`/`5xx`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 17.1, 17.2, 18.1_

  - [x] 4.2 Build `ResidentDirectoryPage` at `client/src/pages/ResidentDirectoryPage.jsx`
    - Render a search input and resident list from `GET /api/residents?search=` showing name, contact number, address, group, notes.
    - Provide create and edit forms that call `POST /api/residents` and `PUT /api/residents/:residentId`.
    - When the response includes `errors.contactNumber` (duplicate), render the message next to the contact-number field.
    - Provide a "Use" action that returns to the reservation form with the chosen resident selected (via shared state or query param consumed by the form).
    - Never read or display password / password-hash fields.
    - Render `EmptyState` for empty list and the standard error/offline state on failure.
    - Use only existing Barangay_Visual_Language components for inputs, buttons, cards, and table rows.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.1, 17.2, 17.4, 18.1, 18.2_

  - [x] 4.3 Build `ReservationHistoryPage` at `client/src/pages/ReservationHistoryPage.jsx`
    - Provide a search form for `contactNumber` or `name`; on submit call `GET /api/reservations/history?contactNumber=...` or `GET /api/reservations/history?name=...`.
    - Render `summary.totalReservations`, `summary.missedCount`, `summary.cancelledCount`, `summary.completedCount`, `summary.activeReservationCount`, `summary.lastReservationDate` exactly as returned.
    - Render `pastReservations` and `upcomingReservations` using the existing reservation row component, including each row's `referenceNo` via `formatReferenceNo`.
    - Render an `EmptyState` ("No records found for this lookup") when both lists are empty.
    - On `4xx`/`5xx` render the backend message and never render placeholder counts; render the standard offline copy on network failure.
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5, 17.1, 17.2, 18.1_

- [x] 5. Implement dashboard widgets and the CSV export button
  - [x] 5.1 Build `DashboardAlertsCard` at `client/src/components/DashboardAlertsCard.jsx`
    - Render `alerts` array, `metrics.todayReservationCount`, `metrics.missedPendingCount`, and `metrics.nextReservation` (start time + representative name) when non-null.
    - Render a labeled "Cleared for public use today" notice when `metrics.publicUseActiveToday === true`.
    - Render a labeled "Maintenance active today" notice when `metrics.maintenanceActiveToday === true`.
    - Render a calm empty-state ("Nothing needs attention today") when the alerts array is empty and every metric is zero or null (do not show zeroed cards as warnings).
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 18.1_

  - [x] 5.2 Build `TodaySnapshotCard` at `client/src/components/TodaySnapshotCard.jsx`
    - Render today's reservation count and next-reservation summary fed from the dashboard fetch state.
    - Show the next reservation's `referenceNo`, start time, and representative name when present.
    - _Requirements: 1.1, 11.1, 11.2, 18.1_

  - [x] 5.3 Build `BackupReminderCard` at `client/src/components/BackupReminderCard.jsx`
    - Fetch `GET /api/maintenance/backup-status`; render `lastBackupAt`, `daysSinceBackup`, `reminderThresholdDays`.
    - Use the warning palette when `backupDue === true && daysSinceBackup <= 2 * reminderThresholdDays`.
    - Use the danger palette when `backupDue === true && daysSinceBackup > 2 * reminderThresholdDays`.
    - Include the static instructional line referring staff to the maintenance launcher option for running a backup, matching the wording in `STAFF-DAILY-USE.txt`.
    - Render as a non-modal card placed inside the dashboard grid; never use a full-screen overlay, modal dialog, or auto-open dialog.
    - On endpoint error, hide the card silently and `console.error` the failure without breaking the dashboard render.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 18.1, 18.2_

  - [x] 5.4 Build `CsvExportButton` at `client/src/components/CsvExportButton.jsx`
    - Accept `{ endpoint, params, label }`; render a button labeled with the word "CSV".
    - On click, call `buildCsvExportUrl(endpoint, params)` and trigger a navigation by setting `window.location.href` (or anchor link) to the resulting URL.
    - On a server-reachable `4xx`/`5xx` response, surface "CSV export could not be downloaded." plus the backend error string when present.
    - On a network failure, surface the standard offline copy from Requirement 17.1.
    - Never render PDF / XLSX / JSON variants.
    - _Requirements: 6.1, 6.2, 6.3, 6.8, 6.9, 15.1, 15.2, 17.1, 18.1_

- [x] 6. Wire helpers and new components into existing surfaces
  - [x] 6.1 Update `client/src/pages/ReservationsPage.jsx`
    - Render `formatReferenceNo(reservation.referenceNo)` in each reservation row.
    - Use `matchesReferenceNo` so the search box matches against `referenceNo` substrings (case-insensitive) in addition to existing fields.
    - Add a "Print slip" action per row that navigates to `/reservations/:id/slip`.
    - Render the standard error/empty/offline states for any new request; reuse existing `EmptyState` and alert components.
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 17.1, 17.2, 17.4, 17.5, 18.1_

  - [x] 6.2 Update `client/src/components/ReservationDetailDrawer.jsx`
    - Add a "Reference number" line that calls `formatReferenceNo(reservation.referenceNo)`.
    - Add a "Print slip" action that navigates to `/reservations/:id/slip`.
    - _Requirements: 1.1, 2.1, 18.1_

  - [x] 6.3 Update `client/src/pages/ReservationFormPage.jsx`
    - Add a "Choose from directory" action that opens `ResidentPickerDialog`; on select, prefill `representativeName`, `contactNo`, `address` (Req. 9.3).
    - Render `formatReferenceNo` on the saved-confirmation surface so the just-saved reservation's `referenceNo` is shown (Req. 1.1).
    - Audit and remove or disable any legacy recurring-reservation control; replace with the literal note "Recurring reservations: not yet available". Do not call any recurring backend route or store any frontend-only recurrence schedule.
    - Render the standard error/empty/offline states for any new request.
    - _Requirements: 1.1, 9.3, 14.1, 14.2, 14.3, 14.4, 17.1, 17.2, 17.5, 18.1_

  - [x] 6.4 Update `client/src/pages/CalendarPage.jsx`
    - Use `getStatusDisplay` for cell label and color class, covering `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`.
    - When a cell carries a `block` payload, render the `blockType` and `reason` text alongside the status label, sourced from the backend `block` payload (do not merge into reservation cards).
    - Render the booking block's `referenceNo` via `formatReferenceNo` (Req. 1.1).
    - Update the calendar legend so it includes entries for every status the backend may return for the current week, including `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE`.
    - Mount admin-only entry points for `MaintenanceBlockModal` ("Add maintenance block", "Deactivate block") and `ClearPublicUseModal` ("Clear for public use") only when `user.role === "ADMIN"`.
    - Do not call any deprecated `promptClearDay` / `clearDay` helper. Derive cleared-public-use state only from `GET /api/schedule` and `GET /api/dashboard/alerts` payloads.
    - Add a "Daily print" action that navigates to `/schedule/daily-print?date=...` for the selected date.
    - Use only existing Barangay_Visual_Language tokens (no new gradients, neon colors, or color-left stripes wider than the existing 4px booking-block bar).
    - _Requirements: 1.1, 4.6, 4.7, 7.1, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 13.10, 13.11, 16.1, 18.1, 18.2_

  - [x] 6.5 Update `client/src/pages/ReportsPage.jsx`
    - Restructure into the twelve sections from Req. 5.1: `summary`, `statusCounts`, `topRequesters`, `mostUsedDays`, `mostUsedTimeSlots`, `monthlyReservationCount`, `missedReservations`, `cancelledReservations`, `reservationsByPurpose`, `reservationsEncodedByStaff`, `clearedPublicUseRanges`, `maintenanceBlocks`.
    - Single fetch via `GET /api/reports?from=&to=`; date filter selection (`all`/`week`/`month`/`year`/custom) re-fires the fetch within 500ms.
    - Render every section using only fields the backend returns; never compute synthetic totals.
    - Render `EmptyState` for any empty-array section.
    - Add a `CsvExportButton` for `reports` with the current filter parameters; never render PDF/XLSX/JSON variants.
    - Render the backend error message in an alert on `4xx`/`5xx`; never render partial mock data.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 15.1, 15.2, 17.1, 17.2, 17.4, 17.5, 17.6, 18.1_

  - [x] 6.6 Update `client/src/pages/ActivityLogsPage.jsx`
    - Render reservation `referenceNo` in activity log details for entries that include a reservation reference (Req. 1.1).
    - Add a `CsvExportButton` for `activity-logs` that includes the currently applied `action`, `date`, and `search` filter values when set.
    - Render the standard error/empty/offline states for the export action.
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.7, 15.1, 15.2, 17.1, 17.2, 18.1_

  - [x] 6.7 Update `client/src/pages/DashboardPage.jsx`
    - Orchestrate `DashboardAlertsCard`, `TodaySnapshotCard`, and `BackupReminderCard` from a single shared fetch state.
    - Fetch `GET /api/dashboard/alerts` and `GET /api/dashboard`; when `/api/dashboard/alerts` succeeds and another dashboard request fails, render the failing request's error alongside the successful alerts content. The reverse case must also render the alerts error at the top while the rest of `/api/dashboard` still renders.
    - Hide `BackupReminderCard` silently when `/api/maintenance/backup-status` errors; the rest of the dashboard must remain interactive.
    - Render the standard offline copy on network failure for any new request.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.5, 12.6, 17.1, 17.2, 17.5, 18.1_

- [x] 7. Update navigation and routing
  - [x] 7.1 Extend `client/src/components/AppShell.jsx` `NAV_ITEMS`
    - Add entries for `Resident Directory` (`/residents`), `Reservation History` (`/reservations/history`), and `Court Policy` (`/settings/court-policy`).
    - Mark the `Court Policy` entry as `adminOnly` so it is hidden from Staff_User; keep using the existing role-gating pattern.
    - Use only existing Barangay_Visual_Language icons and tokens.
    - _Requirements: 3.5, 16.1, 18.1_

  - [x] 7.2 Register new routes in `client/src/App.jsx`
    - Wire `/residents`, `/reservations/history`, `/settings/court-policy`, `/reservations/:id/slip`, and `/schedule/daily-print` into the `renderPage` switch using the existing `window.history.pushState` client-side routing.
    - Print routes (`/reservations/:id/slip`, `/schedule/daily-print`) render without `AppShell` chrome.
    - _Requirements: 2.1, 7.1, 8.1, 9.1, 3.1, 18.1_

- [x] 8. Checkpoint - integration verification
  - Run `npm run frontend:build` and `node scripts/run-tests.mjs` to confirm the wiring builds and the existing suite still passes.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend tests
  - [x] 9.1 Extend `tests/reactFrontendStatic.test.js` with static-source assertions for the new feature
    - Assert each new source file under `client/src/` (helpers, components, pages) contains the required endpoints, status codes, and field names.
    - Assert presence of `referenceNo` rendering in the reservation list, calendar booking block, reservation detail drawer, reservation form saved-state surface, activity log details surface, slip print view, and daily schedule printout.
    - Assert presence of every status code (`AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`) in the calendar status mapping.
    - Assert each `CsvExportButton` consumer references the correct CSV endpoint name and that no PDF/XLSX/JSON export is rendered.
    - Assert absence of any active recurring-reservation control under `client/src/`, of `clearedDays` / `promptClearDay` / `clearDay` references, and of any `https://` / external host string under `client/src/` and `public/app/`.
    - _Requirements: 1.1, 6.1–6.7, 10.1, 13.9, 13.11, 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 19.1, 19.2, 19.3, 20.1.1, 20.1.6, 20.1.9, 20.1.16, 20.1.17, 20.2, 20.3_

  - [ ]* 9.2 Behavioral test for slip + daily print at `tests/reactPostDeploymentSlipDailyPrint.test.js`
    - Render `ReservationSlipPrintView` against a fixture and assert every required field renders verbatim.
    - Render the same view with `statusCode === "CANCELLED"` and assert the "CANCELLED" mark is rendered.
    - Render `DailySchedulePrintView` and assert slot rows, maintenance ranges, and Public_Use_Clear ranges render in clearly separated sections with their status labels.
    - _Requirements: 2.2, 2.4, 7.2, 7.3, 7.4, 20.1.2, 20.1.3, 20.2, 20.3_

  - [ ]* 9.3 Behavioral test for dashboard + calendar at `tests/reactPostDeploymentDashboardCalendar.test.js`
    - Mock `/api/dashboard/alerts` and assert the dashboard renders today's count, next reservation, missed-pending count, public-use-active-today notice, maintenance-active-today notice, and the calm empty-state when no alerts are present.
    - Mock `/api/maintenance/backup-status` and assert the backup reminder card renders when `backupDue === true` and is hidden when the endpoint errors.
    - Render `CalendarPage` against a fixture and assert each cell shows the correct label and palette class for `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`.
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 11.1–11.5, 12.1, 12.2, 12.3, 12.6, 20.1.4, 20.1.5, 20.1.6, 20.2, 20.3_

  - [ ]* 9.4 Behavioral test for admin schedule modals at `tests/reactPostDeploymentModals.test.js`
    - `MaintenanceBlockModal`: assert submit sends `POST /api/schedule/blocks` with the entered payload and the deactivate flow sends `DELETE /api/schedule/blocks/:blockId`.
    - `ClearPublicUseModal`: assert each of `WHOLE_DAY`, `TIME_RANGE`, and `FROM_TIME_ONWARD` modes sends `POST /api/schedule/clear-public-use` with the correct payload, that the warning step renders the literal "overlapping active reservations will be cancelled but their records will be kept" copy and is required before the request fires, and that `cancelledReservations` are listed after success.
    - Assert the modals are not mounted for Staff_User accounts.
    - _Requirements: 4.1, 4.3, 4.4, 4.7, 13.1–13.8, 13.10, 16.1, 20.1.7, 20.1.13, 20.1.14, 20.2, 20.3_

  - [ ]* 9.5 Behavioral test for new pages at `tests/reactPostDeploymentPages.test.js`
    - `ReportsPage`: mock `GET /api/reports?from=&to=` and assert it is called with the selected range, all expanded sections render, and empty-arrays render `EmptyState`.
    - `ReservationHistoryPage`: assert lookups by `contactNumber` and by `name` fetch the right endpoint, summary counts render exactly, and past/upcoming lists include `referenceNo`.
    - `ResidentDirectoryPage`: assert it fetches `GET /api/residents`, posts/puts changes, prefills the reservation form on selection, and shows the duplicate-contact backend error next to the contact-number field.
    - `CourtPolicyPage`: assert it is read-only for Staff_User and editable for Admin_User, and that `errors` from `PUT /api/settings/court-policy` render next to their fields.
    - _Requirements: 3.1–3.5, 5.1, 5.2, 5.4, 8.1–8.4, 9.1–9.5, 16.1, 17.4, 20.1.8, 20.1.10, 20.1.11, 20.1.12, 20.2, 20.3_

  - [ ]* 9.6 Behavioral test for CSV exports + role gating + error/empty states at `tests/reactPostDeploymentExportsAndRoles.test.js`
    - Assert each `CsvExportButton` produces the correct CSV endpoint URL with the current filter parameters (`date` for daily, week-anchor `date` for weekly, `month` for monthly, `action`/`date`/`search` for activity logs).
    - Assert admin-only actions (maintenance block, deactivate block, Clear for Public Use, court policy editor, account management) are hidden for Staff_User accounts in every surface.
    - Assert each new surface renders the standard offline copy on network failure, renders backend `error`/`errors` messages on `4xx`/`5xx`, and renders an `EmptyState` for missing/malformed `2xx` payloads without throwing.
    - Assert no fabricated fallback data is rendered when the backend errors.
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 15.1, 15.2, 16.1, 16.2, 16.3, 17.1–17.6, 20.1.9, 20.1.14, 20.1.15, 20.2, 20.3_

- [x] 10. Update documentation
  - [x] 10.1 Update `STAFF-DAILY-USE.txt`
    - Describe where staff find: print slip, print daily schedule, look up resident history, search resident directory, see dashboard alerts, see the backup reminder, view reports, export CSV files, and (for admins) create maintenance blocks, run Clear for Public Use, and edit court policy settings.
    - Use the same backup-reminder wording referenced by `BackupReminderCard`.
    - Do not introduce references to PDF/XLSX, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.
    - _Requirements: 12.4, 21.1, 21.4_

  - [x] 10.2 Update `TROUBLESHOOT-WINDOWS.txt`
    - Add steps for handling the standard offline error wording on the new surfaces (slip print, daily print, residents, history, reports, CSV exports, dashboard alerts, backup reminder, court policy, schedule blocks, Clear for Public Use).
    - Do not introduce references to PDF/XLSX, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.
    - _Requirements: 17.1, 21.2, 21.4_

  - [x] 10.3 Update `DEPLOYMENT_READINESS_REPORT.md`
    - List the implemented frontend features, the deferred recurring-reservation UI, the CSV-only export decision, and the backend-backed Clear for Public Use replacement of the legacy `clearedDays` behavior.
    - Do not introduce references to PDF/XLSX, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.
    - _Requirements: 14.1, 15.1, 13.9, 21.3, 21.4_

  - [ ]* 10.4 Extend `tests/documentation.test.js`
    - Assert `STAFF-DAILY-USE.txt` mentions print slip, print daily schedule, resident history, resident directory, dashboard alerts, backup reminder, reports, CSV export, and the admin-only Clear for Public Use / maintenance block / court policy entries.
    - Assert `TROUBLESHOOT-WINDOWS.txt` mentions the standard offline error wording on the new surfaces.
    - Assert `DEPLOYMENT_READINESS_REPORT.md` lists the implemented frontend features, deferred recurring-reservation UI, CSV-only export decision, and backend-backed Clear for Public Use replacement of `clearedDays`.
    - Assert none of the doc updates reference PDF/XLSX, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 20.2, 20.3_

- [x] 11. Final checkpoint - build and verification
  - Run `npm run frontend:build` and confirm assets emit under `public/app/` referencing only locally bundled resources.
  - Run `node scripts/run-tests.mjs` and confirm all tests (including the new and existing ones) pass.
  - Run `node scripts/verify-react-build.mjs` and confirm offline-only and approval-workflow-free checks pass.
  - Confirm no backend route handler, database schema, server-side validation, or deployment script was modified.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.1, 19.2, 19.3, 22.1, 22.2, 22.3, 22.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all test and documentation-test tasks fall in this category per the workflow's optional sub-task rule.
- Each task references specific requirement clauses for traceability (granular sub-requirements, not just user stories).
- Property-based tests are intentionally not included: Requirement 20.3 mandates the static-source assertion style of `tests/reactFrontendStatic.test.js`, and the feature is UI rendering, role-based visibility, simple CRUD wiring, and deterministic CSV-URL construction — categories the workflow flags as PBT-not-applicable. The Correctness Properties section is omitted in line with that guidance.
- Checkpoints (8 and 11) ensure incremental validation between component implementation, integration, and final build verification.
- Print routes render without `AppShell` chrome and call `window.print()` once data is in DOM; on error they render `ErrorState` instead of an empty print frame (Req. 17.5).
- All new fonts, scripts, styles, and images for new surfaces load from local paths only; no `https://` or external host is introduced (Req. 19.1, 19.2).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1", "2.3", "3.1", "3.2", "3.3", "4.1", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 2, "tasks": ["2.2", "2.4", "4.2", "4.3"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["10.4"] }
  ]
}
```
