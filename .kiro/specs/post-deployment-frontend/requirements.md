# Requirements Document

## Introduction

This feature delivers the frontend (UI/UX, frontend state, frontend validation, print views, dashboard presentation, calendar display, and frontend tests) for the post-deployment backend that Codex completed. The backend foundation already provides reservation reference numbers, a printable slip endpoint, daily-schedule print data, dashboard alerts, a backup-status endpoint, persisted maintenance and unavailable schedule blocks, a flexible Clear for Public Use endpoint, an expanded reports endpoint, CSV-only exports, reservation history lookup, a resident directory, calendar status fields, and court policy settings (see `docs/POST_DEPLOYMENT_API_CONTRACT.md` and `docs/OPUS_FRONTEND_HANDOFF.md`).

The frontend extends the existing React + Vite staff console at `client/src/` and reuses the established Barangay Sto. Niño visual language documented in `DESIGN.md` and `.impeccable/design.json`. The Barangay (1) reference (`Barangay (1)/DESIGN.md`) is the primary visual source of truth; the current program already aligns with it where applicable. No new generic admin-dashboard style, gradients, glassmorphism, or SaaS template patterns are introduced. All cleared-public-use, schedule-block, policy, and overlap state must come from backend-confirmed data; the deprecated frontend-only `clearedDays` behavior is not recreated.

Recurring reservations were intentionally deferred at the backend layer and must not appear as active UI. Exports remain CSV-only; PDF and XLSX export options must not be exposed.

## Glossary

- **Court_Scheduler_Frontend**: The React staff console under `client/src/` plus its built bundle at `public/app/`. The single application surface this feature touches.
- **Staff_User**: A signed-in user whose `role` is `STAFF`. Can read most surfaces and encode reservations.
- **Admin_User**: A signed-in user whose `role` is `ADMIN`. Can additionally create maintenance blocks, run Clear for Public Use, edit court policy settings, and manage accounts.
- **Reservation_Reference_Number**: A backend-issued identifier in the format `BCS-YYYY-000001` returned as `referenceNo` on every reservation payload.
- **Reservation_Slip**: The printable permit/slip rendered from `GET /api/reservations/:reservationId/slip`.
- **Daily_Schedule_Printout**: The printable daily slot list rendered from `GET /api/schedule/daily-print?date=YYYY-MM-DD`.
- **Schedule_Block**: A persisted unavailable-court range returned with a `blockType` (`CLEANING`, `BARANGAY_EVENT`, `REPAIRS`, `TOURNAMENT`, `MEETING`, `EMERGENCY_USE`, `MAINTENANCE`) and a `mode` (`WHOLE_DAY` or `TIME_RANGE`).
- **Public_Use_Clear**: A backend-persisted block created by `POST /api/schedule/clear-public-use` with mode `WHOLE_DAY`, `TIME_RANGE`, or `FROM_TIME_ONWARD`, surfaced as `statusCode: "CLEARED_PUBLIC_USE"`.
- **Court_Policy_Settings**: The configuration document returned by `GET /api/settings/court-policy` (opening/closing time, min/max reservation minutes, allowed days, blocked dates, grace period, default slot minutes).
- **Resident_Directory_Record**: A row from `GET/POST/PUT /api/residents` containing name, contact number, address, group, and notes.
- **Reservation_History_Lookup**: The summary plus past/upcoming list returned by `GET /api/reservations/history?contactNumber=...|name=...`.
- **Dashboard_Alerts_Endpoint**: `GET /api/dashboard/alerts`, returning today's alerts and metrics including `nextReservation`, `missedPendingCount`, `backupStatus`, `publicUseActiveToday`, and `maintenanceActiveToday`.
- **Backup_Status_Endpoint**: `GET /api/maintenance/backup-status`, returning `lastBackupAt`, `daysSinceBackup`, `reminderThresholdDays`, and `backupDue`.
- **CSV_Export_Endpoints**: The seven backend routes under `/api/exports/*.csv` for daily, weekly, monthly, activity logs, missed, cancelled, and reports CSVs.
- **Status_Code**: One of `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`. Frontend reads `statusCode` and `statusName` from backend payloads.
- **Barangay_Visual_Language**: The design system codified in `DESIGN.md`, `.impeccable/design.json`, and the `Barangay (1)/` reference. Civic Blue primary action, Court Orange used sparingly, paper-cream surfaces, 17px body baseline, 48px control height, 64px main action, status pills with words, no gradients, no glassmorphism, no >1px colored stripes (except the calendar booking block bar).
- **Offline_Operation**: The application runs from `localhost` on the office computer with no CDN or third-party network dependency.

## Requirements

### Requirement 1: Reservation Reference Number Display

**User Story:** As a Staff_User, I want every reservation surface to show the backend `referenceNo`, so that residents and staff can cite reservations using a stable identifier across the office.

#### Acceptance Criteria

1. WHEN the Court_Scheduler_Frontend renders a reservation in the reservation list, the calendar booking block, the reservation detail drawer, the reservation form's saved-confirmation surface, the activity log details, the Reservation_Slip print view, or the Daily_Schedule_Printout, THE Court_Scheduler_Frontend SHALL display the `referenceNo` value returned by the backend.
2. THE Court_Scheduler_Frontend SHALL render the reference number using the exact backend-provided string without recomputing or reformatting it.
3. WHEN the reservation list search box receives input that matches a `referenceNo` substring (case-insensitive), THE Court_Scheduler_Frontend SHALL include reservations whose `referenceNo` matches in the filtered results.
4. IF a reservation payload omits `referenceNo`, THEN THE Court_Scheduler_Frontend SHALL render a clear placeholder ("No reference number") and SHALL NOT crash the surface.

### Requirement 2: Printable Reservation Slip

**User Story:** As a Staff_User, I want a printable slip per reservation, so that I can hand the resident an official paper record at the counter.

#### Acceptance Criteria

1. WHEN a Staff_User triggers the "Print slip" action on a reservation, THE Court_Scheduler_Frontend SHALL request `GET /api/reservations/:reservationId/slip` and render a print-ready view using the returned `slip` payload.
2. THE Reservation_Slip view SHALL display the `referenceNo`, `representativeName`, `contactNo`, `address`, `reservationDate`, `startTime`, `endTime`, `purpose`, `statusName`, `staffEncoder`, `issuedAt`, `barangayName`, and `courtName` exactly as returned by the backend.
3. WHILE the slip endpoint has returned a successful response, THE Reservation_Slip view SHALL include a signature line area that prints below the reservation details.
4. WHEN the slip's `statusCode` is `CANCELLED`, THE Court_Scheduler_Frontend SHALL render a visible "CANCELLED" mark on the slip in addition to the status badge.
5. THE Reservation_Slip view SHALL use only locally bundled fonts, styles, and the Barangay_Visual_Language with an ink-friendly plain official-document layout suitable for monochrome printing.
6. WHILE the office computer is in Offline_Operation, THE Reservation_Slip view SHALL render and print without any external network request.
7. IF the slip endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL display the backend error message in a readable error state, SHALL exclude the signature line, and SHALL NOT render an empty or broken print view.

### Requirement 3: Court Policy Settings Page

**User Story:** As an Admin_User, I want a page to view and update court policy, so that I can adjust opening/closing time, min/max duration, allowed/blocked days, grace period, and default slot size from the office computer.

#### Acceptance Criteria

1. WHEN an Admin_User navigates to the court policy settings page, THE Court_Scheduler_Frontend SHALL fetch `GET /api/settings/court-policy` and render the returned values in form fields for `openingTime`, `closingTime`, `minimumReservationMinutes`, `maximumReservationMinutes`, `allowedDays`, `blockedDays`, `gracePeriodBeforeMissedMinutes`, and `defaultSlotMinutes`.
2. WHEN a Staff_User navigates to the court policy settings page, THE Court_Scheduler_Frontend SHALL render the current policy values in read-only form and SHALL NOT render the save action.
3. WHEN an Admin_User submits the court policy form, THE Court_Scheduler_Frontend SHALL send `PUT /api/settings/court-policy` with the changed fields and SHALL display a success confirmation on a `200` response.
4. IF the `PUT /api/settings/court-policy` response body contains an `errors` object, THEN THE Court_Scheduler_Frontend SHALL display each error message next to its corresponding field.
5. WHERE the signed-in user is not an Admin_User, THE Court_Scheduler_Frontend SHALL hide the navigation entry that opens the editable policy form.

### Requirement 4: Maintenance and Unavailable Block UI

**User Story:** As an Admin_User, I want to add and deactivate maintenance or unavailable Schedule_Blocks, so that the court schedule reflects cleaning, repairs, tournaments, meetings, barangay events, and emergency use.

#### Acceptance Criteria

1. WHEN an Admin_User opens the maintenance block creation modal, THE Court_Scheduler_Frontend SHALL provide inputs for `date`, `mode` (`WHOLE_DAY` or `TIME_RANGE`), `startTime`, `endTime`, `blockType` (one of `CLEANING`, `BARANGAY_EVENT`, `REPAIRS`, `TOURNAMENT`, `MEETING`, `EMERGENCY_USE`, `MAINTENANCE`), and `reason`.
2. WHILE the selected `mode` is `WHOLE_DAY`, THE Court_Scheduler_Frontend SHALL hide or disable the `startTime` and `endTime` inputs.
3. WHEN an Admin_User submits the modal, THE Court_Scheduler_Frontend SHALL send `POST /api/schedule/blocks` with the entered payload and SHALL refresh the calendar week display on a successful response.
4. WHEN an Admin_User triggers "Deactivate" on a Schedule_Block, THE Court_Scheduler_Frontend SHALL send `DELETE /api/schedule/blocks/:blockId` and SHALL update the calendar to reflect the deactivated state only after receiving a successful response from the backend.
5. IF the create or deactivate response returns a validation or authorization error, THEN THE Court_Scheduler_Frontend SHALL display the backend error message and SHALL NOT alter the local schedule state.
6. THE Court_Scheduler_Frontend SHALL render an active Schedule_Block on the calendar using the backend `block` payload (status, type, reason) separately from any `reservation` data and SHALL NOT merge block data into reservation cards.
7. WHILE the signed-in user is not an Admin_User, THE Court_Scheduler_Frontend SHALL hide the "Add maintenance block" and "Deactivate block" actions regardless of API or connectivity state.

### Requirement 5: Expanded Reports Page

**User Story:** As a Staff_User, I want an expanded reports page that uses the backend's expanded report sections, so that I can review barangay court usage from one screen.

#### Acceptance Criteria

1. WHEN a Staff_User opens the reports page, THE Court_Scheduler_Frontend SHALL fetch `GET /api/reports?from=&to=` using the selected filter range and SHALL render sections for `summary`, `statusCounts`, `topRequesters`, `mostUsedDays`, `mostUsedTimeSlots`, `monthlyReservationCount`, `missedReservations`, `cancelledReservations`, `reservationsByPurpose`, `reservationsEncodedByStaff`, `clearedPublicUseRanges`, and `maintenanceBlocks`.
2. WHEN the user changes the date filter to `all`, `week`, `month`, `year`, or a custom `from`/`to` range, THE Court_Scheduler_Frontend SHALL re-fetch `GET /api/reports` with the corresponding query parameters within 500ms of the selection.
3. THE Court_Scheduler_Frontend SHALL render every section using only fields the backend returns and SHALL NOT compute synthetic totals that the backend did not provide.
4. WHEN a section's array is empty in the backend response, THE Court_Scheduler_Frontend SHALL display a readable empty-state for that section using the existing empty-state component.
5. IF the reports endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL display the backend error message in an alert and SHALL NOT render partial mock data.

### Requirement 6: CSV Export UI (CSV-Only)

**User Story:** As a Staff_User, I want CSV export buttons on the schedule, activity logs, missed/cancelled lists, and reports pages, so that I can hand the office a spreadsheet of records using only CSV files.

#### Acceptance Criteria

1. WHEN a Staff_User triggers a CSV export action, THE Court_Scheduler_Frontend SHALL navigate the browser to or anchor-link to the matching CSV_Export_Endpoint (`/api/exports/daily-schedule.csv`, `/api/exports/weekly-schedule.csv`, `/api/exports/monthly-reservations.csv`, `/api/exports/activity-logs.csv`, `/api/exports/missed-reservations.csv`, `/api/exports/cancelled-reservations.csv`, `/api/exports/reports.csv`) with the current filter parameters appended to the query string.
2. THE Court_Scheduler_Frontend SHALL label every export control with the word "CSV" so the staff user knows the file format before clicking.
3. THE Court_Scheduler_Frontend SHALL NOT render PDF, XLSX, JSON, or any other export format option for these surfaces.
4. WHEN the daily CSV export action is offered, THE Court_Scheduler_Frontend SHALL include the currently displayed `date` parameter in `YYYY-MM-DD` format.
5. WHEN the weekly CSV export action is offered, THE Court_Scheduler_Frontend SHALL include the currently displayed week's anchor `date` parameter.
6. WHEN the monthly CSV export action is offered, THE Court_Scheduler_Frontend SHALL include a `month` parameter in `YYYY-MM` format.
7. WHEN the activity-logs CSV export action is offered, THE Court_Scheduler_Frontend SHALL include the currently applied `action`, `date`, and `search` filters as query parameters when the user has set them.
8. IF a CSV export navigation fails because the request reaches the server but returns a `4xx` or `5xx` response, THEN THE Court_Scheduler_Frontend SHALL display a readable error message ("CSV export could not be downloaded.") with the backend error string when present.
9. IF a CSV export navigation fails because the office network or server is unreachable, THEN THE Court_Scheduler_Frontend SHALL display the standard offline error message defined in Requirement 17.1.

### Requirement 7: Daily Schedule Printout

**User Story:** As a Staff_User, I want a printable daily schedule for any selected date, so that the office can post or hand out the day's court bookings.

#### Acceptance Criteria

1. WHEN a Staff_User opens the Daily_Schedule_Printout for a selected date, THE Court_Scheduler_Frontend SHALL fetch `GET /api/schedule/daily-print?date=YYYY-MM-DD` using the selected date and SHALL render the returned `slots`, `blocks`, and `totals`.
2. THE Daily_Schedule_Printout SHALL render each slot's `name`, `startTime`, `endTime`, `statusName`, and (when present) the `reservation.referenceNo` and the `block` reason.
3. THE Daily_Schedule_Printout SHALL render Public_Use_Clear and maintenance ranges in a separately labeled section so they are not confused with reservations.
4. THE Daily_Schedule_Printout SHALL be styled for ink-friendly monochrome printing using the Barangay_Visual_Language and SHALL NOT depend on color alone to convey status.
5. WHILE the office computer is in Offline_Operation, THE Daily_Schedule_Printout SHALL render and print without any external network request.
6. IF the daily print endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL display the backend error message and SHALL NOT render an empty print frame.

### Requirement 8: Reservation History Per Resident

**User Story:** As a Staff_User, I want to look up a resident's reservation history by contact number or name, so that I can answer counter questions about past, upcoming, and missed bookings.

#### Acceptance Criteria

1. WHEN a Staff_User submits a contact number or representative name to the reservation history lookup, THE Court_Scheduler_Frontend SHALL request `GET /api/reservations/history?contactNumber=...` or `GET /api/reservations/history?name=...` and SHALL render the response.
2. THE Court_Scheduler_Frontend SHALL display the `summary.totalReservations`, `summary.missedCount`, `summary.cancelledCount`, `summary.completedCount`, `summary.activeReservationCount`, and `summary.lastReservationDate` exactly as returned.
3. THE Court_Scheduler_Frontend SHALL render the `pastReservations` and `upcomingReservations` lists using the existing reservation row component, including the `referenceNo` for each row.
4. WHEN both `pastReservations` and `upcomingReservations` are empty, THE Court_Scheduler_Frontend SHALL display a readable empty-state explaining that no records were found for the lookup.
5. IF the lookup endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL display the backend error message and SHALL NOT render placeholder counts.

### Requirement 9: Lightweight Resident Directory

**User Story:** As a Staff_User, I want to search and select resident records, so that I can quickly fill the reservation form for repeat requesters and groups.

#### Acceptance Criteria

1. WHEN a Staff_User opens the resident directory surface, THE Court_Scheduler_Frontend SHALL request `GET /api/residents?search=` and SHALL render the returned list with each resident's name, contact number, address, group, and notes.
2. WHEN a Staff_User submits the create or edit form, THE Court_Scheduler_Frontend SHALL send `POST /api/residents` or `PUT /api/residents/:residentId` with the entered payload.
3. WHEN a Staff_User selects a resident from the directory while encoding a reservation, THE Court_Scheduler_Frontend SHALL prefill `representativeName`, `contactNo`, and `address` on the reservation form from the selected `Resident_Directory_Record`.
4. IF the create/update response returns `errors.contactNumber` indicating a duplicate, THEN THE Court_Scheduler_Frontend SHALL display the backend error message next to the contact number field.
5. THE Court_Scheduler_Frontend SHALL NOT store or display any password or password hash on the resident directory surface.
6. THE resident directory surface SHALL use only the existing Barangay_Visual_Language components for inputs, buttons, cards, and table rows.

### Requirement 10: Calendar Status and Block Indicators

**User Story:** As a Staff_User, I want the calendar to show every backend status (including maintenance, barangay events, and cleared public use) using both a label and a color, so that I can read court state at a glance.

#### Acceptance Criteria

1. WHEN the calendar week renders, THE Court_Scheduler_Frontend SHALL color each cell based on the backend `statusCode` for the cell, including `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE`.
2. THE Court_Scheduler_Frontend SHALL render a text label (the backend `statusName` or its mapped display label) on every status cell so that status is never communicated by color alone.
3. WHEN a cell carries a `block` payload, THE Court_Scheduler_Frontend SHALL render the `blockType` and `reason` text alongside the status label.
4. THE calendar legend SHALL include entries for every status the backend may return for the current week, including the new `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE` statuses.
5. WHEN the Court_Scheduler_Frontend defines a status color in CSS, THE Court_Scheduler_Frontend SHALL render an accompanying text label or icon on the surface that uses the color, so that status is never communicated by color alone.
6. THE calendar status styling SHALL use only the existing Barangay_Visual_Language tokens (Civic Blue, Court Orange used sparingly, success/warning/danger soft pairs) and SHALL NOT introduce new gradients, neon colors, or color-left stripes wider than the existing 4px booking-block bar.

### Requirement 11: Dashboard Alerts and Today's Snapshot

**User Story:** As a Staff_User, I want the dashboard to show today's reservations count, the next reservation, missed-pending counts, public-use and maintenance flags for today, and any system alerts, so that I can plan the office day from one screen.

#### Acceptance Criteria

1. WHEN the dashboard page loads, THE Court_Scheduler_Frontend SHALL request `GET /api/dashboard/alerts` and SHALL render its `alerts` array, `metrics.todayReservationCount`, `metrics.missedPendingCount`, `metrics.nextReservation`, `metrics.publicUseActiveToday`, and `metrics.maintenanceActiveToday`.
2. THE Court_Scheduler_Frontend SHALL render the `nextReservation` start time and representative name when `metrics.nextReservation` is non-null.
3. WHEN `metrics.publicUseActiveToday` is `true`, THE Court_Scheduler_Frontend SHALL display a labeled "Cleared for public use today" notice on the dashboard.
4. WHEN `metrics.maintenanceActiveToday` is `true`, THE Court_Scheduler_Frontend SHALL display a labeled "Maintenance active today" notice on the dashboard.
5. WHEN the alerts array is empty AND every metric is zero or null, THE Court_Scheduler_Frontend SHALL render a calm empty-state ("Nothing needs attention today") instead of showing zeroed cards as warnings.
6. IF the dashboard alerts endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL display the backend error message at the top of the dashboard and SHALL still render the rest of the dashboard from `GET /api/dashboard` data.
7. WHEN the dashboard alerts endpoint succeeds AND any other dashboard request fails, THE Court_Scheduler_Frontend SHALL still display the failing request's error message alongside the successful alerts content.

### Requirement 12: Backup Reminder Widget

**User Story:** As a Staff_User, I want a non-disruptive backup reminder, so that the office knows when to run a backup without interrupting the day's work.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Court_Scheduler_Frontend SHALL request `GET /api/maintenance/backup-status` and SHALL render `lastBackupAt`, `daysSinceBackup`, and `reminderThresholdDays`.
2. WHEN the response field `backupDue` is `true` AND `daysSinceBackup` is at most twice `reminderThresholdDays`, THE Court_Scheduler_Frontend SHALL render the "Backup due" reminder card using the warning palette from the Barangay_Visual_Language.
3. WHEN the response field `backupDue` is `true` AND `daysSinceBackup` is more than twice `reminderThresholdDays`, THE Court_Scheduler_Frontend SHALL render the "Backup overdue" reminder card using the danger palette from the Barangay_Visual_Language.
4. THE backup reminder card SHALL include a static instructional line referring the staff to the maintenance launcher option for running a backup, matching the wording in `STAFF-DAILY-USE.txt`.
5. THE Court_Scheduler_Frontend SHALL NOT block the rest of the dashboard while the backup reminder is shown, SHALL NOT use a full-screen overlay, modal dialog, or auto-open dialog for the reminder, AND MAY use a non-full-screen card or floating element so long as the dashboard content remains visible and interactive.
6. IF the backup status endpoint returns an error response, THEN THE Court_Scheduler_Frontend SHALL hide the reminder card silently and SHALL log the error to the console without breaking the dashboard render.

### Requirement 13: Flexible Clear For Public Use

**User Story:** As an Admin_User, I want to clear the court for public use as a whole day, a time range, or from a time onward, so that the office can record open-play decisions and have overlapping reservations cancelled by the backend.

#### Acceptance Criteria

1. WHEN an Admin_User opens the Clear for Public Use modal, THE Court_Scheduler_Frontend SHALL provide a `mode` selector with values `WHOLE_DAY`, `TIME_RANGE`, and `FROM_TIME_ONWARD`, plus inputs for `date`, `startTime`, `endTime`, and `reason`.
2. WHILE the selected `mode` is `WHOLE_DAY`, THE Court_Scheduler_Frontend SHALL hide or disable the `startTime` and `endTime` inputs.
3. WHILE the selected `mode` is `FROM_TIME_ONWARD`, THE Court_Scheduler_Frontend SHALL hide or disable the `endTime` input.
4. WHEN an Admin_User confirms the modal's first step, THE Court_Scheduler_Frontend SHALL display the warning confirmation step before sending the request.
5. THE warning confirmation step SHALL explicitly state that "overlapping active reservations will be cancelled but their records will be kept" and SHALL require an explicit second confirmation before any backend request is sent.
6. WHEN the Admin_User confirms the warning step, THE Court_Scheduler_Frontend SHALL send `POST /api/schedule/clear-public-use` with the entered payload.
7. IF the Court_Scheduler_Frontend cannot send the `POST /api/schedule/clear-public-use` request (network error, request never dispatches, or session expired), THEN THE Court_Scheduler_Frontend SHALL display a readable error message and SHALL NOT close the modal or apply any local cleared-public-use state.
8. WHEN the response includes `cancelledReservations`, THE Court_Scheduler_Frontend SHALL display the list of cancelled `referenceNo` values in a follow-up confirmation panel.
9. THE Court_Scheduler_Frontend SHALL derive cleared-public-use state only from the backend response and from subsequent `GET /api/schedule` and `GET /api/dashboard/alerts` payloads, and SHALL NOT store cleared-day state in local-only React state, in `localStorage`, or in any in-memory `clearedDays` structure.
10. WHILE the signed-in user is not an Admin_User, THE Court_Scheduler_Frontend SHALL hide the Clear for Public Use action regardless of API or connectivity state.
11. WHERE a day-header or schedule-action menu interaction is offered to start the Clear for Public Use flow, THE Court_Scheduler_Frontend SHALL open the backend-driven modal and SHALL NOT call the deprecated `promptClearDay`/`clearDay` local-state behavior.

### Requirement 14: Recurring Reservations Deferral

**User Story:** As a Staff_User, I want recurring reservation UI to be absent or clearly disabled, so that I do not encode recurrences the backend cannot atomically support.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL NOT expose any active control that creates a recurring reservation series.
2. WHERE legacy recurring-reservation UI exists in the current frontend, THE Court_Scheduler_Frontend SHALL hide or disable that UI and SHALL render a short "Recurring reservations: not yet available" note in its place.
3. THE Court_Scheduler_Frontend SHALL NOT call any recurring reservation backend route.
4. THE Court_Scheduler_Frontend SHALL NOT store any frontend-only recurrence schedule that creates multiple reservations on submit.

### Requirement 15: Non-CSV Export Deferral

**User Story:** As a Staff_User, I want PDF and XLSX export options to be absent from the frontend, so that I do not see export controls that the backend does not support.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL NOT render any PDF, XLSX, or JSON export action on the reports, schedule, activity logs, missed, or cancelled surfaces.
2. WHERE export labels appear in the UI, THE Court_Scheduler_Frontend SHALL use the word "CSV" so the file format is unambiguous.
3. THE Court_Scheduler_Frontend SHALL NOT introduce any client-side PDF or XLSX rendering library; server-side PDF or XLSX processing on the backend is out of scope for this feature and is not prohibited by this requirement.

### Requirement 16: Role-Based Visibility

**User Story:** As an Admin_User, I want admin-only actions to be hidden from Staff_User accounts and to still rely on backend authorization, so that staff do not see controls they cannot use and the system remains secure.

#### Acceptance Criteria

1. WHILE the signed-in user is a Staff_User, THE Court_Scheduler_Frontend SHALL hide the controls that create maintenance blocks, deactivate blocks, run Clear for Public Use, edit court policy settings, and manage accounts regardless of API or connectivity state.
2. WHEN any admin-only request returns `403 { "error": "Admin access required." }`, THE Court_Scheduler_Frontend SHALL display the backend error message in a readable alert.
3. WHEN any admin-only request returns `403 { "error": "Admin access required." }`, THE Court_Scheduler_Frontend SHALL log the error response to the application error reporting path and SHALL NOT silently swallow the error, even if the alert display itself fails.
4. THE Court_Scheduler_Frontend SHALL continue to send admin-only requests through the same `apiRequest` client and SHALL NOT bypass the backend role check on the client.

### Requirement 17: Frontend Error and Empty States

**User Story:** As a Staff_User, I want every new surface to render readable error and empty states, so that the office never sees a blank screen or an unrecoverable crash.

#### Acceptance Criteria

1. IF any backend request added by this feature fails with a network error, THEN THE Court_Scheduler_Frontend SHALL display a readable office-friendly error message ("The system is offline or the office network is down. Try again once the network is back.") AND SHALL keep the rest of the surface usable; both behaviors are required, and a violation of either constitutes a violation of this requirement.
2. IF any backend request added by this feature returns a `4xx` or `5xx` response with an `error` or `errors` body, THEN THE Court_Scheduler_Frontend SHALL display the backend message in the existing alert/empty-state components.
3. IF any backend request added by this feature returns a `2xx` response with missing or malformed expected fields, THEN THE Court_Scheduler_Frontend SHALL render the existing empty-state component with a "Data unavailable" message and SHALL NOT throw an uncaught render exception.
4. WHEN any list-returning endpoint returns an empty array, THE Court_Scheduler_Frontend SHALL render the existing empty-state component with a clear title and body.
5. THE Court_Scheduler_Frontend SHALL NOT throw uncaught render exceptions or render a blank panel for any of the new surfaces in this feature.
6. THE Court_Scheduler_Frontend SHALL NOT fabricate fallback reservation, slip, schedule, alert, report, history, resident, policy, or block data when the backend returns an error.

### Requirement 18: Design Consistency With Barangay (1) and Current Program

**User Story:** As a barangay staff member, I want the new surfaces to look and feel like the existing program and the Barangay (1) reference, so that the system stays calm, readable, and on-brand.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL reuse the existing component set (`Field`, `StatusBadge`, `ConfirmDialog`, `ReservationDetailDrawer`, `EmptyState`, `LoadingState`, `Icon`, `AppShell`) and the existing CSS class vocabulary in `client/src/styles.css` for all new surfaces in this feature.
2. THE Court_Scheduler_Frontend SHALL use the color tokens defined in `.impeccable/design.json` and `DESIGN.md` (Civic Blue, Court Orange, success/warning/danger soft pairs, paper/cream surfaces, ink/border/border-strong) and SHALL NOT introduce new color tokens, gradients, neon colors, or glassmorphism for these surfaces.
3. THE Court_Scheduler_Frontend SHALL use Instrument Serif only for orientation text (page titles, hero numbers, card heads, dialog heads) and Inter for working surfaces, matching the typography rules in `DESIGN.md`.
4. THE Court_Scheduler_Frontend SHALL keep body text at 17px, primary controls at a minimum height of 48px, and the main screen action at 64px on every new surface.
5. THE Court_Scheduler_Frontend SHALL pair English labels with Filipino italic helper text on form fields and section heads where the existing program does so, following the bilingual italic rule.
6. THE Court_Scheduler_Frontend SHALL NOT introduce a separate generic admin-dashboard style, a SaaS-template look, online-booking phrasing, "cloud sync" language, or any wording that implies residents reserve remotely.
7. WHERE a new surface has no exact Barangay (1) equivalent (Clear for Public Use modal, maintenance block modal, court policy settings page, daily print page, resident directory), THE Court_Scheduler_Frontend SHALL extend the Barangay_Visual_Language using the existing tokens and components and SHALL NOT invent a new style language.

### Requirement 19: Offline Operation and No External Dependencies

**User Story:** As a Staff_User, I want the office computer to keep working without an internet connection, so that the system remains usable when the office network is down.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL load all fonts, scripts, styles, and images for the new surfaces from local paths only.
2. THE Court_Scheduler_Frontend SHALL NOT add any reference to `https://`, `http://`, `fonts.googleapis.com`, `unpkg.com`, `cdnjs.cloudflare.com`, or any other external host in source files under `client/src/` or `public/app/`.
3. THE Court_Scheduler_Frontend SHALL NOT introduce any client-side library that requires an outbound network call at runtime.
4. WHEN the office computer is offline, THE new dashboard, calendar, reservation slip, daily print, reports, history, resident directory, court policy, maintenance block, and Clear for Public Use surfaces SHALL render their last known data from the backend and SHALL display the standard offline error state (Requirement 17.1) for any failed request.

### Requirement 20: Frontend Tests

**User Story:** As a developer, I want frontend tests covering every new surface, so that regressions in reference numbers, status labels, role visibility, and CSV export wiring are caught before deployment.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL include automated tests under `tests/` that assert the following:
   1. Reservation `referenceNo` appears in the reservation list, calendar booking block, reservation detail drawer, reservation form saved-state surface, activity log details surface, slip print view, and daily schedule printout.
   2. The Reservation_Slip view renders `referenceNo`, `representativeName`, `contactNo`, `address`, `reservationDate`, `startTime`, `endTime`, `purpose`, `statusName`, `staffEncoder`, `issuedAt`, `barangayName`, and `courtName` exactly from the backend payload, and renders a "CANCELLED" mark when `statusCode` is `CANCELLED`.
   3. The Daily_Schedule_Printout renders slot rows, maintenance ranges, and Public_Use_Clear ranges with status labels, and prints with ink-friendly styling.
   4. The dashboard alerts surface renders today's count, next reservation, missed-pending count, public-use-active-today notice, maintenance-active-today notice, and the empty-state when no alerts are present.
   5. The backup reminder card renders when `backupDue` is `true` and is hidden when the endpoint errors.
   6. Calendar cells render the correct status label and color class for `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE`.
   7. The maintenance block create modal sends `POST /api/schedule/blocks` with the entered payload and the deactivate action sends `DELETE /api/schedule/blocks/:blockId`.
   8. The reports page calls `GET /api/reports?from=&to=` with the selected range and renders all expected sections including empty-states.
   9. Each CSV export control points at the correct CSV_Export_Endpoint with the current filter parameters.
   10. The reservation history surface fetches by contact number and by name, renders summary counts, and renders past/upcoming lists with `referenceNo`.
   11. The resident directory fetches `GET /api/residents`, posts/puts changes, prefills the reservation form on selection, and shows the duplicate-contact backend error.
   12. The court policy settings page is read-only for Staff_User and editable for Admin_User, and surfaces backend `errors` next to fields.
   13. The Clear for Public Use modal sends `POST /api/schedule/clear-public-use` with `WHOLE_DAY`, `TIME_RANGE`, and `FROM_TIME_ONWARD` modes, shows the cancellation warning before sending, and lists `cancelledReservations` after success.
   14. Admin-only actions are hidden for Staff_User accounts.
   15. Error states display backend messages and avoid blank panels for every new surface.
   16. No recurring reservation creation control is rendered.
   17. No PDF or XLSX export option is rendered.
2. WHEN the test command `node scripts/run-tests.mjs` is executed, THE new tests SHALL be discovered and SHALL run alongside the existing test suite.
3. THE new tests SHALL run without an outbound network call and SHALL match the existing static-source assertion style used by `tests/reactFrontendStatic.test.js` for source-level checks.

### Requirement 21: Documentation Updates

**User Story:** As a barangay staff member, I want the office documentation to reflect the new frontend features, so that staff and admins can find instructions for slips, daily prints, reports, exports, residents, policy, maintenance blocks, public-use clearing, and the backup reminder.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL ship updates to `STAFF-DAILY-USE.txt` describing where staff find the new actions: print slip, print daily schedule, look up resident history, search resident directory, see dashboard alerts, see the backup reminder, view reports, export CSV files, and (for admins) create maintenance blocks, clear for public use, and edit court policy settings.
2. WHERE applicable, THE Court_Scheduler_Frontend SHALL update `TROUBLESHOOT-WINDOWS.txt` with steps for handling visible offline errors on the new surfaces.
3. THE Court_Scheduler_Frontend SHALL update the frontend section of `DEPLOYMENT_READINESS_REPORT.md` to list the implemented frontend features, the deferred recurring reservation UI, the CSV-only export decision, and the backend-backed Clear for Public Use replacement of the legacy `clearedDays` behavior.
4. THE documentation updates SHALL not introduce any reference to PDF or XLSX exports, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.

### Requirement 22: Build and Verification

**User Story:** As a developer, I want the frontend build and existing verification scripts to keep passing with the new surfaces in place, so that the offline bundle remains shippable.

#### Acceptance Criteria

1. WHEN `npm run frontend:build` is executed, THE Court_Scheduler_Frontend SHALL build successfully and SHALL produce assets under `public/app/` referencing only locally bundled resources.
2. WHEN `node scripts/run-tests.mjs` is executed, THE existing and new tests SHALL pass.
3. WHEN `node scripts/verify-react-build.mjs` is executed, THE built bundle SHALL pass its existing assertions, including the offline-only and approval-workflow-free checks.
4. THE Court_Scheduler_Frontend SHALL NOT modify backend route handlers, database schema, server-side validation, or deployment scripts as part of this feature; the work is limited to `client/`, the relevant `public/` assets that ship with the React build, the `tests/` directory, and the documentation files listed in Requirement 21.
