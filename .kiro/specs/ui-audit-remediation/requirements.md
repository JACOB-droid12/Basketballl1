# Requirements Document

## Introduction

This feature implements the narrowly-scoped UI/UX remediations identified in the Codex zero-tolerance UI/UX audit (final judgment: FAILED, readiness 78/100; 28 issues: 3 Critical, 2 High, 9 Medium, 10 Low, 4 Trivial), plus three user-reported consistency problems: Today's Alert living on the Calendar tab, inconsistent overlay/modal presentation across the app (mismatched positions, corner radii, padding, and cut-off action buttons), and a cluttered Court Policy page that reads like an afterthought.

The source of truth for the audit-driven items is `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md` and the underlying audit artifacts (`CODEX_ZERO_TOLERANCE_UI_UX_AUDIT_FOR_OPUS.md`, `CODEX_UI_UX_TRACEABILITY_MATRIX.md`, `CHROME_DEVTOOLS_MCP_VISUAL_AUDIT.md`, `CODEX_FRONTEND_CODE_AUDIT_FOR_OPUS.md`, `CODEX_BACKEND_UI_AUDIT_FINDINGS.md`). All work happens in the existing React + Vite staff console at `client/src/` and the assets shipped under `public/app/`. The Barangay Sto. Niño visual language documented in `DESIGN.md`, `.impeccable/design.json`, and `Barangay (1)/DESIGN.md` is the visual ground truth and is not redesigned.

This feature is intentionally a remediation pass, not a redesign. It does not change backend logic, database schema, API routes, recurring-reservation behavior, or export formats. It does not introduce a generic SaaS/dashboard look, online booking, SMS, cloud sync, public resident accounts, payments, or memberships. Frontend validation remains usability support; the backend stays authoritative. The application remains an Offline_Operation app for the barangay office computer.

## Glossary

- **Court_Scheduler_Frontend**: The React staff console under `client/src/` plus its built bundle at `public/app/`. The single application surface this feature touches.
- **Staff_User**: A signed-in user whose `role` is `STAFF`. Encodes walk-in reservations and reads most surfaces.
- **Admin_User**: A signed-in user whose `role` is `ADMIN`. Additionally creates maintenance blocks, runs Public_Use_Clear, edits Court_Policy_Settings, and manages accounts.
- **Reservation_Slip**: The printable permit/slip rendered from `GET /api/reservations/:reservationId/slip`.
- **Daily_Schedule_Printout**: The printable daily slot list rendered from `GET /api/schedule/daily-print?date=YYYY-MM-DD`.
- **Public_Use_Clear**: A backend-persisted block created by `POST /api/schedule/clear-public-use` (modes `WHOLE_DAY`, `TIME_RANGE`, `FROM_TIME_ONWARD`).
- **Court_Policy_Settings**: The configuration document returned by `GET /api/settings/court-policy` (opening/closing time, min/max reservation minutes, allowed days, blocked dates, grace period, default slot minutes).
- **Status_Code**: One of `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, `COMPLETED`, `MAINTENANCE`, `BARANGAY_EVENT`, `CLEARED_PUBLIC_USE`. The frontend reads `statusCode` and `statusName` from backend payloads.
- **Barangay_Visual_Language**: The design system codified in `DESIGN.md`, `.impeccable/design.json`, and the `Barangay (1)/` reference. Civic Blue primary action, Court Orange used sparingly, paper-cream surfaces, 17px body baseline, 48px control height, 64px main action, status pills with words, no gradients, no glassmorphism, no >1px colored stripes (except the calendar booking block bar).
- **Offline_Operation**: The application runs from `localhost` on the office computer with no CDN or third-party network dependency.
- **Manila_Time**: Asia/Manila local civil time as written by the backend; the same wall-clock hours and minutes are displayed in the UI without any timezone offset re-application.
- **Modal_Shell**: The single shared overlay container component (or shared overlay class) that governs position, max-width, padding, corner radius, header/body/footer layout, and footer button visibility for every dialog/drawer rendered by the Court_Scheduler_Frontend.
- **Audit_Issue_ID**: An identifier from the Codex audit traceability matrix (e.g., `UI-AUD-002`). The frontend changes in this feature are traceable back to one or more Audit_Issue_IDs.
- **Supported_Viewports**: The four viewport widths verified by the audit and required for verification in this feature: 1366px, 1024px, 768px, and 390px.
- **Today_Alert_Surface**: The dashboard region (or, where present, a persistent in-shell alert region) where today's calendar/operational alerts are surfaced. The Calendar tab is explicitly not a Today_Alert_Surface.
- **Verification_Surface_Set**: The fixed set of surfaces that must be manually verified at every Supported_Viewport: Dashboard, New Reservation, Reservation list, Reservation detail, Calendar/schedule, Maintenance Block modal, Public_Use_Clear modal, Reservation_Slip print, Daily_Schedule_Printout, Reports, CSV export controls, Activity logs, Residents/history, Court Policy, and Accounts.

## Requirements

### Requirement 1: Reservation Form Today-Time Default and Save Gating (UI-AUD-002)

**User Story:** As a Staff_User, I want the New Reservation form to never pre-select a past start time for today, and to disable Save until date, start, and end are valid, so that I do not submit reservations the backend will reject.

#### Acceptance Criteria

1. WHEN the New Reservation form loads with `reservationDate` equal to the current calendar date in Manila_Time, THE Court_Scheduler_Frontend SHALL set `startTime` either to the earliest selectable start-time slot whose value is strictly greater than the current Manila_Time, or SHALL leave `startTime` empty; in no case SHALL `startTime` be pre-populated with a value less than or equal to the current Manila_Time, and Save SHALL remain disabled until the Staff_User has chosen a non-disabled `startTime`.
2. WHILE `reservationDate` equals the current calendar date in Manila_Time, THE Court_Scheduler_Frontend SHALL render every start-time control whose value is less than or equal to the current Manila_Time as disabled and non-selectable, SHALL NOT mark any disabled start-time control as `selected`, and SHALL NOT treat any disabled start-time control as the active or default option.
3. WHILE `reservationDate`, `startTime`, or `endTime` is empty, missing, or refers to a start-time control that is currently rendered as disabled, THE Court_Scheduler_Frontend SHALL disable the Save action for the New Reservation form and SHALL render the Save control in its disabled visual state.
4. WHILE the duration field has not produced an `endTime` that is strictly greater than `startTime` and that falls within the minimum and maximum reservation duration defined by Court_Policy_Settings, THE Court_Scheduler_Frontend SHALL disable the Save action for the New Reservation form.
5. THE Court_Scheduler_Frontend SHALL render the `startTime`, duration, and `endTime` controls within a single visual group of the New Reservation form such that, on every Supported_Viewport, all three controls are simultaneously visible without horizontal scrolling and without vertical scrolling within that group.
6. IF the Staff_User attempts to submit the New Reservation form while Save is disabled, THEN THE Court_Scheduler_Frontend SHALL keep the form open, SHALL NOT issue any reservation creation request, AND SHALL display in the existing inline error component a message that identifies, by field name, every field currently blocking submission.
7. THE Court_Scheduler_Frontend SHALL NOT modify backend reservation validation logic, route handlers, request schemas, or response schemas as part of fulfilling UI-AUD-002.

### Requirement 2: Local Manila Timestamp Display (UI-AUD-003)

**User Story:** As a Staff_User, I want every timestamp in the staff console and printouts to read the same wall-clock time the backend wrote, so that I do not have to mentally subtract eight hours when reading activity logs, account records, slips, or daily prints.

#### Acceptance Criteria

1. WHEN the Court_Scheduler_Frontend renders a timestamp received from the backend on the activity logs page, the accounts page, the Reservation_Slip print view, or the Daily_Schedule_Printout, THE Court_Scheduler_Frontend SHALL display the same year, month, day, hour, and minute that the backend stored in Manila_Time (UTC+8), regardless of the browser's local timezone setting.
2. THE Court_Scheduler_Frontend SHALL NOT apply a browser-local timezone offset, daylight-saving adjustment, or any other transformation that shifts a backend Manila_Time value to a different wall-clock date, hour, or minute.
3. THE Court_Scheduler_Frontend SHALL render every backend `createdAt`, `updatedAt`, `issuedAt`, `loggedAt`, and equivalent timestamp field using one shared formatter that preserves Manila_Time and produces a single consistent time format (either 12-hour with AM/PM or 24-hour) per surface.
4. IF a backend timestamp value is missing, null, or cannot be parsed as a valid date-time, THEN THE Court_Scheduler_Frontend SHALL render the placeholder "—" in place of the timestamp and SHALL NOT raise an uncaught render exception.
5. THE Court_Scheduler_Frontend SHALL include automated tests that assert a representative backend Manila_Time value (for example `2026-05-18T17:31:00`) renders as `5:31 PM` (or the matching 24-hour form already used by the surface) on the activity logs page, the accounts page, the Reservation_Slip view, and the Daily_Schedule_Printout, with the test environment configured to a non-Manila timezone (for example UTC or America/Los_Angeles) to confirm no offset is applied.

### Requirement 3: Shared Modal Shell And Overlay Consistency

**User Story:** As a Staff_User, I want every modal in the staff console to share one consistent shell (position, padding, corner radius, header/body/footer, button area), so that the app does not look broken or unfinished.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL render every modal, dialog, and drawer through one shared Modal_Shell component or one shared overlay CSS class set, with all surface, border, shadow, corner-radius, and spacing properties sourced exclusively from existing Barangay_Visual_Language tokens.
2. WHILE the viewport width is greater than or equal to 768px, THE Modal_Shell SHALL position the modal centered horizontally and vertically within the visible viewport area.
3. WHILE the viewport width is less than 768px, THE Modal_Shell SHALL position the modal as a full-width sheet spanning 100 percent of the viewport width.
4. THE Court_Scheduler_Frontend SHALL NOT render center-positioned and right-side-positioned overlays within the same interaction class.
5. THE Modal_Shell SHALL apply the same Barangay_Visual_Language corner-radius token to all four corners of every modal surface, producing identical radius values at the top-left, top-right, bottom-left, and bottom-right corners.
6. IF any modal is rendered with one or more corner radii differing from the other corners, THEN THE Court_Scheduler_Frontend SHALL treat the modal as non-conformant and SHALL NOT release it.
7. THE Modal_Shell SHALL apply a single Barangay_Visual_Language spacing token as inner padding around the header, body, and footer regions, and SHALL render the modal as three vertically stacked regions in the order header, body, footer, with the footer region containing only primary and secondary action buttons.
8. WHILE any modal is open on any Supported_Viewport, THE Court_Scheduler_Frontend SHALL keep every footer action button fully visible within the viewport bounds, with no horizontal scrolling required and no portion of any footer button clipped by the viewport edge.
9. WHEN modal body content exceeds the available body region height on any Supported_Viewport, THE Court_Scheduler_Frontend SHALL scroll only the body region and SHALL keep the header and footer regions pinned and fully visible.
10. THE Maintenance Block modal, the Public_Use_Clear modal, the Resident Picker modal, and every other dialog and drawer in the Court_Scheduler_Frontend SHALL render through the Modal_Shell and SHALL conform to clauses 1 through 9.
11. THE Court_Scheduler_Frontend SHALL NOT introduce new tokens, gradients, or color variants for the Modal_Shell, and SHALL reuse existing Barangay_Visual_Language surfaces, borders, and shadows for all modal styling.

### Requirement 4: Backup Reminder Visibility On Dashboard And Court Policy (UI-AUD-004)

**User Story:** As a Staff_User, I want the backup reminder to be unmistakable on the dashboard and on the Court Policy page, so that the office knows when a backup is due without being interrupted by a blocking dialog.

#### Acceptance Criteria

1. WHEN `GET /api/maintenance/backup-status` returns a successful payload with `backupStatus.backupDue` equal to `true`, THE Court_Scheduler_Frontend SHALL render the Backup-Due reminder card on the dashboard such that the card is present in the rendered page and visually perceivable to the Staff_User without requiring further user interaction.
2. WHEN `GET /api/maintenance/backup-status` returns a successful payload with `backupStatus.backupDue` equal to `true`, THE Court_Scheduler_Frontend SHALL render the Backup-Due reminder card on the Court Policy settings page such that the card is present in the rendered page and visually perceivable to the Staff_User without requiring further user interaction.
3. WHEN `GET /api/maintenance/backup-status` returns a successful payload, THE backup reminder component SHALL read `lastBackupAt`, `daysSinceBackup`, `reminderThresholdDays`, and `backupDue` from the `backupStatus` wrapper exactly as the backend returns them, and SHALL render the Backup-Due reminder card populated with the values of `lastBackupAt`, `daysSinceBackup`, and `reminderThresholdDays` rather than rendering an empty card.
4. IF `GET /api/maintenance/backup-status` returns a successful payload with `backupStatus.backupDue` equal to `false`, THEN THE Court_Scheduler_Frontend SHALL NOT render the Backup-Due reminder card on the dashboard or on the Court Policy settings page.
5. THE Court_Scheduler_Frontend SHALL render the backup reminder as a non-blocking element that does not appear as a full-screen overlay, does not auto-open as a modal dialog, and does not prevent keyboard or pointer interaction with any other control on the same surface.
6. THE backup reminder SHALL use the warning palette defined in the Barangay_Visual_Language and SHALL include the existing instructional line directing staff to the maintenance launcher option for running a backup.
7. IF `GET /api/maintenance/backup-status` returns an error response, THEN THE Court_Scheduler_Frontend SHALL omit the Backup-Due reminder card from the dashboard and the Court Policy settings page without surfacing an error indication to the Staff_User.
8. IF `GET /api/maintenance/backup-status` returns an error response, THEN THE Court_Scheduler_Frontend SHALL continue to render the dashboard and the Court Policy settings page with all non-reminder controls remaining interactive.

### Requirement 5: Calendar Tab Shows Only The Calendar; Today's Alert Relocated

**User Story:** As a Staff_User, I want the Calendar tab to show the calendar only, and today's alerts to live on the dashboard or in a persistent alert region, so that the Calendar tab is not also a notifications tab.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL NOT render any "Today's Alert" card, banner, list, badge, toast, or DOM element identified as a today-alert surface within the Calendar tab view tree.
2. WHEN the Calendar tab is rendered (via tab navigation, deep link, or page refresh), THE Court_Scheduler_Frontend SHALL render the calendar grid, status legend, and block indicators unchanged, and SHALL NOT mount any Today's Alert surface from the previous Calendar-tab implementation.
3. WHEN the dashboard is rendered, THE Court_Scheduler_Frontend SHALL fetch today's alerts from `GET /api/dashboard/alerts` and render them on the dashboard as the primary Today_Alert_Surface, where today's alerts are defined as alert records whose effective date equals the Staff_User's current local calendar date.
4. IF the `GET /api/dashboard/alerts` call fails or returns a non-success response, THEN THE Court_Scheduler_Frontend SHALL render the dashboard Today_Alert_Surface in an error state with a retry control and SHALL NOT fall back to rendering today's alerts on the Calendar tab.
5. IF the `GET /api/dashboard/alerts` call returns an empty list, THEN THE Court_Scheduler_Frontend SHALL render the dashboard Today_Alert_Surface in an empty state indicating no alerts for today, within 2 seconds of the dashboard load completing.
6. WHERE a persistent in-shell alert region is offered (for example a header notification bell or a top-of-page banner), THE Court_Scheduler_Frontend MAY also surface today's alerts there, provided the dashboard remains the primary Today_Alert_Surface and the Calendar tab continues to render no Today's Alert surface.

### Requirement 6: Reservation List Semantic Markup And Explicit Actions (UI-AUD-007)

**User Story:** As a Staff_User using keyboard or assistive technology, I want reservation list cards to use clean semantic markup with explicit View and Print actions, so that controls are not nested inside other controls.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL render the reservation list as a single list container exposing the list role to assistive technology, and SHALL render each reservation row as a child list item exposing the listitem role, such that an accessibility tree inspection reports exactly one list ancestor and one listitem per reservation row.
2. THE Court_Scheduler_Frontend SHALL NOT nest any interactive element (a real `button`, a link, an element with `role="button"`, or any element with an attached activation handler that responds to click, Enter, or Space) inside another interactive element on the reservation list, verifiable by an accessibility tree inspection reporting zero interactive descendants for any interactive ancestor within a reservation row.
3. THE Court_Scheduler_Frontend SHALL render, on each reservation row, a primary "View" (or "Open") action control and a "Print" action control as DOM siblings of one another, each with a non-empty programmatic accessible name that uniquely identifies the target reservation, and neither control SHALL be a descendant of the other.
4. WHEN a Staff_User activates the row's primary action via mouse click, the Enter key, or the Space key while the primary action control has keyboard focus, THE Court_Scheduler_Frontend SHALL open the reservation detail drawer for that reservation exactly once per activation and SHALL move keyboard focus into the opened drawer.
5. WHEN a Staff_User activates the Print action via mouse click, the Enter key, or the Space key while the Print control has keyboard focus, THE Court_Scheduler_Frontend SHALL open the Reservation_Slip print view for that reservation exactly once per activation and SHALL NOT also open the reservation detail drawer or trigger any other row-level action for that activation.
6. THE Court_Scheduler_Frontend SHALL render a visible focus indicator on the currently focused reservation row, primary action control, and Print action control at every Supported_Viewport, where the indicator surrounds the focused element on all four sides, has a minimum thickness of 2 CSS pixels, and maintains a contrast ratio of at least 3:1 against the adjacent background.
7. WHILE the reservation list is rendered, THE Court_Scheduler_Frontend SHALL place the row, the primary action control, and the Print action control into the sequential keyboard tab order in a consistent left-to-right, top-to-bottom order across all reservation rows, with no interactive control reachable only by mouse.

### Requirement 7: Reservations CSV Export Filter Behavior (UI-AUD-008)

**User Story:** As a Staff_User, I want the Reservations Export action to either honor my current filters or to be clearly labeled as a full export, so that I do not accidentally hand the office a different dataset than I am viewing.

#### Acceptance Criteria

1. WHEN the staff user activates the CSV export control on the reservations list view, THE Court_Scheduler_Frontend SHALL either (a) append the currently applied search, scope, and status filter values to the existing export route as query parameters so the resulting export reflects the visible list, or (b) render the export control with the literal label text "Export all reservations (CSV)" and send no filter query parameters with the request.
2. WHILE the Court_Scheduler_Frontend renders the reservations list view, THE Court_Scheduler_Frontend SHALL display the export control with a visible label containing the literal substring "CSV" so the file format is identifiable before activation.
3. THE Court_Scheduler_Frontend SHALL NOT render any export control or menu option offering PDF, XLSX, JSON, or any file format other than CSV on the reservations list view.
4. THE Court_Scheduler_Frontend SHALL NOT modify backend export route handlers, route paths, request methods, or response body shapes, and SHALL only adjust the frontend export control label text and the query parameters appended to the existing export route.
5. IF the export request returns an HTTP 4xx or 5xx response, THEN THE Court_Scheduler_Frontend SHALL display a visible, dismissible error notification containing the literal text "CSV export could not be downloaded." and SHALL append the backend-provided error message when the response body contains one.
6. WHILE no search, scope, or status filter values are applied to the reservations list, THE Court_Scheduler_Frontend SHALL keep the CSV export control activatable and SHALL omit filter query parameters from the resulting export request.

### Requirement 8: Tab And Menu Keyboard Behavior (UI-AUD-009, UI-AUD-010)

**User Story:** As a Staff_User using a keyboard, I want every tab-like or menu-like control to either fully implement ARIA keyboard behavior or to be a plain native button group/disclosure, so that focus and activation work predictably.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL apply this requirement to the Reports page, the Reservation History page, and the Calendar/Schedule page.
2. WHERE a control surface is rendered with `role="tablist"` or `role="tab"`, THE Court_Scheduler_Frontend SHALL implement the full ARIA tab keyboard behavior, including Left/Right (and Up/Down for vertical orientation) arrow keys to move focus between tabs with wrap-around, Home to move focus to the first tab, End to move focus to the last tab, Enter or Space to activate the focused tab, a single tab stop into the group via roving tabindex where only the active or focused tab has tabindex="0" and all other tabs have tabindex="-1", and Tab moving focus out of the tablist to the next focusable element on the page within 100 ms of the keypress.
3. WHERE a control surface is rendered with `role="menu"` or `role="menuitem"`, THE Court_Scheduler_Frontend SHALL implement the full ARIA menu keyboard behavior, including Up/Down arrow keys to move focus between menu items with wrap-around, Home and End to jump to the first and last menu items, Enter or Space to activate the focused menu item, and Escape to close the menu and return focus to the element that opened it within 100 ms of the keypress.
4. WHERE a control surface cannot fully implement criterion 2 or criterion 3, THE Court_Scheduler_Frontend SHALL render the surface as a native button group or disclosure pattern using plain HTML `button` elements with no `role="tab"`, `role="tablist"`, `role="menu"`, or `role="menuitem"` attributes present, and SHALL allow Tab and Shift+Tab to move focus between those buttons and Enter or Space to activate the focused button.
5. THE Court_Scheduler_Frontend SHALL render a focus indicator on every tab, menu item, and native button in these surfaces that is visible against the surrounding background and persists for the entire duration that the element holds keyboard focus.
6. THE Court_Scheduler_Frontend SHALL allow keyboard focus to leave any tab, menu, or native button group via Tab or Shift+Tab without requiring activation of any control, and SHALL NOT programmatically return focus into the group after the user has moved focus out, except as required by criterion 3 when closing a menu.
7. THE Court_Scheduler_Frontend SHALL pass an automated test suite that, for each surface listed in criterion 1, asserts that either every tab/menu role from the ARIA tab and menu patterns is present together with the keyboard behaviors defined in criteria 2 and 3, or that none of those ARIA roles are present and the surface uses only plain `button` elements as defined in criterion 4, with the test failing if a surface contains any subset or mixture of the two patterns.
8. IF an automated test from criterion 7 detects a surface that mixes ARIA tab/menu roles with missing keyboard behaviors or with plain buttons, THEN THE Court_Scheduler_Frontend test suite SHALL report a failure that identifies the surface and the specific roles or behaviors that violate the rule, and SHALL exit with a non-zero status.

### Requirement 9: Daily Print Display Fixes (UI-AUD-006, UI-AUD-014)

**User Story:** As a Staff_User, I want the Daily_Schedule_Printout to read the right block type field, humanize block labels, show correct timestamps, and not imply that past same-day slots are bookable, so that posted printouts are accurate.

#### Acceptance Criteria

1. WHEN the Court_Scheduler_Frontend renders a block on the Daily_Schedule_Printout, THE Court_Scheduler_Frontend SHALL resolve the block type by reading `block.type` first and falling back to `block.blockType` only when `block.type` is null, undefined, or an empty string, and SHALL render the resolved value in the block's type cell.
2. IF neither `block.type` nor `block.blockType` resolves to a non-empty value, THEN THE Court_Scheduler_Frontend SHALL render the literal label "Blocked" in the block's type cell and SHALL NOT render an empty cell, the word "undefined", the word "null", or the raw uppercase enum.
3. THE Court_Scheduler_Frontend SHALL map each block type enum value to its humanized label using the same mapping used in the staff console (`CLEANING` → "Cleaning", `BARANGAY_EVENT` → "Barangay event", `REPAIRS` → "Repairs", `TOURNAMENT` → "Tournament", `MEETING` → "Meeting", `EMERGENCY_USE` → "Emergency use", `MAINTENANCE` → "Maintenance") and SHALL render only the humanized label, never the raw uppercase enum value.
4. IF the resolved block type does not match any value in the humanization mapping, THEN THE Court_Scheduler_Frontend SHALL render the label "Other" and SHALL NOT render the raw uppercase enum value.
5. THE Court_Scheduler_Frontend SHALL render every timestamp on the Daily_Schedule_Printout per Requirement 2 (Manila_Time, no offset shift).
6. WHEN the Daily_Schedule_Printout is opened for the current Manila_Time date, THE Court_Scheduler_Frontend SHALL classify any slot whose end time is earlier than the current Manila_Time as a past same-day slot.
7. WHEN a slot is classified as a past same-day slot, THE Court_Scheduler_Frontend SHALL render that slot's row visually de-emphasized (for example reduced opacity or strikethrough on the time and status text), and SHALL NOT render the strings "available now", "available", "open", "bookable", or any other phrasing that indicates the slot can still be booked for that row.
8. THE Daily_Schedule_Printout SHALL keep its existing ink-friendly monochrome styling and SHALL use only the Barangay_Visual_Language tokens.

### Requirement 10: Reports Friendly Time Ranges And Task-Led Export Labels (UI-AUD-012)

**User Story:** As a Staff_User, I want the Reports page to read in plain official language with friendly time ranges and task-led export labels, so that the office can scan reports without parsing raw `HH:MM-HH:MM` strings or marketing-style labels.

#### Acceptance Criteria

1. WHEN the Court_Scheduler_Frontend renders a time-range value on the Reports page (including the "most-used time slot" tile and any other time-range display), THE Court_Scheduler_Frontend SHALL render the value in 12-hour clock format with an uppercase "AM" or "PM" suffix and the literal separator " to " between the start and end times (for example, a raw `09:00-11:00` value SHALL be displayed as "9:00 AM to 11:00 AM"), and SHALL leave the underlying raw value returned by the backend unchanged.
2. WHEN the Court_Scheduler_Frontend renders a single time value (not a range) on the Reports page, THE Court_Scheduler_Frontend SHALL render it in 12-hour clock format with an uppercase "AM" or "PM" suffix (for example, raw `09:00` SHALL be displayed as "9:00 AM").
3. IF a time or time-range value sourced from the backend cannot be parsed into the 12-hour display format, THEN THE Court_Scheduler_Frontend SHALL render the original raw value as-is and SHALL NOT block rendering of the rest of the Reports page.
4. THE Court_Scheduler_Frontend SHALL label every CSV export control on the Reports page with a task-led action phrase that begins with the verb "Download" and names the artifact being exported (for example "Download Reports CSV"), with the visible label between 3 and 60 characters.
5. THE Court_Scheduler_Frontend SHALL NOT use marketing-style or SaaS-style copy on Reports page export controls, section labels, or headings, where marketing-style copy is defined as any of the following: promotional verbs such as "Grab", "Unlock", "Boost", or "Supercharge"; hype adjectives such as "Amazing", "Awesome", "Effortless", or "Powerful"; or trailing exclamation marks on labels and headings.
6. THE Court_Scheduler_Frontend SHALL render Reports page section labels and headings using the same official Barangay-office terminology used elsewhere in the staff console, with each label matching the wording used for the equivalent concept on other staff console pages.
7. THE Court_Scheduler_Frontend SHALL NOT change backend report fields, route handlers, or computed values as part of this requirement.

### Requirement 11: Court Policy Page Reorganization

**User Story:** As an Admin_User, I want the Court Policy page reorganized into clear logical groups so I can scan and edit settings without cognitive overload, while keeping the existing visual language.

#### Acceptance Criteria

1. WHEN an Admin_User loads the Court Policy page, THE Court_Scheduler_Frontend SHALL render the following labeled groups in this exact top-to-bottom order: (a) Operating hours (`openingTime`, `closingTime`), (b) Reservation duration (`minimumReservationMinutes`, `maximumReservationMinutes`, `defaultSlotMinutes`), (c) Allowed days (`allowedDays`), (d) Blocked dates (`blockedDays`), (e) Grace period (`gracePeriodBeforeMissedMinutes`), and (f) Backup reminder, where the Backup reminder group SHALL contain only a read-only summary and a navigation control that routes to the Backup page defined in Requirement 4.
2. THE Court_Scheduler_Frontend SHALL render each group with a visible group header showing the group name and a single-line description of at most 120 characters, both styled using the existing Barangay_Visual_Language helper-text class already defined in `client/src/styles.css`, with no new typography or spacing tokens introduced.
3. WHERE a Filipino translation key for a group's description already exists in the existing translations source used by the rest of the application, THE Court_Scheduler_Frontend SHALL render that Filipino translation as italic helper text immediately below the English description using the same italic helper-text style already used elsewhere in the application; WHERE no such translation key exists, THE Court_Scheduler_Frontend SHALL omit the Filipino italic helper text for that group and SHALL NOT render placeholder text.
4. THE Court_Scheduler_Frontend SHALL preserve, for every field listed in criterion 1, the same input control type, the same client-side validation rules, the same submit-action label, and the same post-submit success and error feedback that existed on the Court Policy page prior to this reorganization, so that any test that passed against the pre-reorganization page continues to pass against the reorganized page.
5. THE Court_Scheduler_Frontend SHALL NOT introduce new color tokens, gradients, glassmorphism effects, or new visual primitives for the Court Policy page, and SHALL reuse only the existing components (`Field`, `StatusBadge`, `EmptyState`, `LoadingState`) and existing CSS classes already defined in `client/src/styles.css`.
6. WHEN the Court Policy page is rendered on any Supported_Viewport, THE Court_Scheduler_Frontend SHALL display the groups in the order defined in criterion 1 with no horizontal scrollbar on the page container, with every group header, field label, and field value fully visible without text truncation or clipping, and with each group separated from the next by the existing section spacing class from `client/src/styles.css`.
7. WHILE the signed-in user is a Staff_User, THE Court_Scheduler_Frontend SHALL render every input on the Court Policy page in a non-editable state and SHALL NOT render the save action, matching existing role-based visibility rules.
8. WHILE the Court Policy data is being fetched from the backend, THE Court_Scheduler_Frontend SHALL render the existing `LoadingState` component in place of the group content, and IF the fetch fails, THEN THE Court_Scheduler_Frontend SHALL render the existing `EmptyState` component with an error indication and SHALL NOT render any group as interactive.

### Requirement 12: Responsive Density At 768px And 390px (UI-AUD-013, UI-AUD-019, UI-AUD-020)

**User Story:** As a Staff_User on a tablet or phone-width browser, I want the dashboard, New Reservation, and Residents pages to keep Home, Calendar, New Reservation, and current-page context visible while reducing nav and card weight, so that the office tablet view is not cramped.

#### Acceptance Criteria

1. WHILE the viewport width is 768px, THE Court_Scheduler_Frontend SHALL render the Home, Calendar, New Reservation, and current-page context affordances such that each affordance is present in the initial above-the-fold view, is reachable with a single tap or click without expanding a hidden menu, and exposes an accessible name, on the dashboard, the New Reservation page, and the Residents page.
2. WHILE the viewport width is 390px, THE Court_Scheduler_Frontend SHALL render the Home, Calendar, New Reservation, and current-page context affordances such that each affordance is reachable with a single tap, is exposed with an accessible name, and the page produces no horizontal scrollbar and no content clipped beyond the 390px viewport edge, on the dashboard, the New Reservation page, and the Residents page.
3. WHILE the viewport width is 768px or 390px, THE Court_Scheduler_Frontend SHALL apply the reduced-density navigation, top-bar, and card-action treatment defined by the Barangay_Visual_Language while preserving the 17px body baseline, the 48px primary control height, and the 64px main action height where the main action is rendered.
4. THE Court_Scheduler_Frontend SHALL NOT introduce mobile-only pages, mobile-only navigation patterns, or mobile-only color tokens that are not already part of the Barangay_Visual_Language used at the desktop viewport.
5. WHILE the viewport width is at any Supported_Viewport, THE Court_Scheduler_Frontend SHALL preserve the desktop focus order, keep every interactive control reachable via keyboard Tab and Shift+Tab navigation, and expose the same accessible name and role to screen readers as at the desktop viewport.
6. IF an interactive affordance required by criterion 1 or criterion 2 is hidden, clipped, or rendered without an accessible name at 768px or 390px, THEN THE Court_Scheduler_Frontend SHALL be considered non-compliant with this requirement and the page SHALL fail the responsive-density acceptance check.

### Requirement 13: Signed-In User Login Redirect (UI-AUD-015)

**User Story:** As a signed-in Staff_User or Admin_User who navigates to `/login`, I want to be redirected away from the login screen, so that I am not asked to sign in again while already authenticated.

#### Acceptance Criteria

1. WHEN a signed-in Staff_User or Admin_User navigates to `/login`, THE Court_Scheduler_Frontend SHALL redirect the browser to the application's default authenticated route within 2 seconds of route resolution, without rendering the login form fields or accepting any login form input.
2. WHILE the user is unauthenticated, THE Court_Scheduler_Frontend SHALL render the login screen at `/login` and SHALL NOT trigger any redirect away from `/login`.
3. IF the authentication state cannot be determined within 3 seconds of navigating to `/login`, THEN THE Court_Scheduler_Frontend SHALL render the login screen and treat the user as unauthenticated until the authentication state resolves.
4. THE Court_Scheduler_Frontend SHALL NOT modify backend session, authentication, or authorization endpoints, payloads, or stored state as part of fulfilling this requirement.

### Requirement 14: De-Emphasize Recurring Unavailable Note (UI-AUD-016)

**User Story:** As a Staff_User, I want the "recurring reservations not yet available" note to be small and quiet, so that it does not look like a feature I should expect to use.

#### Acceptance Criteria

1. WHERE the "Recurring reservations: not yet available" note is rendered, THE Court_Scheduler_Frontend SHALL render it as inline helper text using the existing muted text style, with a font size less than or equal to the application's body text size, and SHALL NOT render it inside a card container, banner container, alert container, or any element styled as a button or call-to-action.
2. WHERE the "Recurring reservations: not yet available" note is rendered, THE Court_Scheduler_Frontend SHALL render it as non-interactive static text with no clickable, hoverable, or focusable affordance, no link, no button, and no cursor-pointer styling.
3. THE Court_Scheduler_Frontend SHALL NOT render any control, menu item, toggle, form field, or icon that creates, schedules, edits, or implies a recurring reservation series.
4. THE Court_Scheduler_Frontend SHALL NOT issue any network request to a recurring-reservation backend route.
5. IF a Staff_User interacts with the "Recurring reservations: not yet available" note via click, tap, or keyboard activation, THEN THE Court_Scheduler_Frontend SHALL take no action, perform no navigation, and trigger no network request.

### Requirement 15: "Save Anyway" Copy Rewrite (UI-AUD-017)

**User Story:** As a Staff_User, I want the "save anyway" override copy rewritten in plain official language, so that I understand what the override actually does before I click it.

#### Acceptance Criteria

1. WHEN the override control is rendered on any surface, THE Court_Scheduler_Frontend SHALL display the action label "Save with policy override" in place of the legacy "save anyway" wording, using the existing Barangay_Visual_Language voice and a maximum label length of 40 characters.
2. WHEN the override control is rendered, THE Court_Scheduler_Frontend SHALL display a supporting description, with a maximum length of 200 characters, that names the specific policy being overridden and states that the action will be recorded for Admin_User review.
3. THE Court_Scheduler_Frontend SHALL keep the override gated behind explicit Admin_User authorization on the backend and SHALL NOT change any authorization, validation, or persistence behavior as part of this copy rewrite.
4. THE Court_Scheduler_Frontend SHALL apply the rewritten label and description consistently on every surface where the override appears, including primary action buttons, confirmation dialogs, and inline warnings, with no surface retaining the legacy "save anyway" wording.
5. IF the rewritten copy for the current locale is unavailable at render time, THEN THE Court_Scheduler_Frontend SHALL display the rewritten English fallback copy and SHALL NOT fall back to the legacy "save anyway" wording.

### Requirement 16: Done/Completed Status Wording Normalization (UI-AUD-018)

**User Story:** As a Staff_User, I want one consistent word for completed reservations across the app, so that "Done" and "Completed" do not appear to mean different things.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL define exactly one canonical display label string for Status_Code `COMPLETED` in a single status-label mapping module, and SHALL render that label verbatim (identical character sequence, identical casing, identical leading and trailing whitespace) on every staff console surface that displays the status, including reservation list, reservation detail drawer, calendar legend, reports view, history view, slip print output, daily print output, and activity logs.
2. IF any staff console surface renders a reservation whose backend `statusCode` equals `COMPLETED` using a string that differs from the canonical display label defined in the status-label mapping module by even one character (including casing differences such as "DONE" vs "Done", word differences such as "Done" vs "Completed", or whitespace differences), THEN THE Court_Scheduler_Frontend SHALL be treated as failing requirement UI-AUD-018 during QA verification, and the deviating surface SHALL be identified by name in the QA failure report.
3. THE Court_Scheduler_Frontend SHALL keep the backend `statusCode` and `statusName` payload contract unchanged for `COMPLETED` reservations, SHALL apply the canonical display label only at the presentation layer, and SHALL NOT send, persist, or echo the substituted display label back to any backend API in request bodies, query parameters, or headers.
4. WHERE a `COMPLETED` status indicator is exposed through an accessible name, tooltip, screen-reader label, filter chip, dropdown option, or status badge, THE Court_Scheduler_Frontend SHALL use the same canonical display label string defined in the status-label mapping module, with no alternate synonym or abbreviation.

### Requirement 17: Success Messages Use role="status" (UI-AUD-021)

**User Story:** As a Staff_User using assistive technology, I want success messages to be announced through a polite live region, so that screen readers tell me when an action succeeded without interrupting the current task.

#### Acceptance Criteria

1. WHEN the Court_Scheduler_Frontend renders a success confirmation following a save, submit, export, deactivate, or clear-public-use write action, THE Court_Scheduler_Frontend SHALL render the success message inside a container element that has either `role="status"` or `aria-live="polite"`.
2. WHEN the Court_Scheduler_Frontend renders the success confirmation container described in criterion 1, THE Court_Scheduler_Frontend SHALL set `aria-atomic="true"` on that container so the full message is announced as a single unit.
3. IF a confirmation reflects a routine successful write action (save, submit, export, deactivate, or clear-public-use), THEN THE Court_Scheduler_Frontend SHALL NOT assign `role="alert"` or `aria-live="assertive"` to that confirmation's container.
4. WHEN a success message is inserted into the polite live region, THE Court_Scheduler_Frontend SHALL keep the message text in the DOM for at least 4 seconds before removing or replacing it, so assistive technology has time to announce it.
5. THE Court_Scheduler_Frontend SHALL preserve the existing visual presentation of success messages defined by the Barangay_Visual_Language, adding only the polite live-region semantics required by criteria 1 through 4.

### Requirement 18: Official Header Spelling And Configuration Consistency (UI-AUD-023)

**User Story:** As a barangay staff member, I want the official header (barangay name, court name, header copy) to be spelled and configured consistently across the staff console and printed outputs, so that printouts and the on-screen header agree.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL render the official header fields (barangay name, court name, official subtitle) on the staff console header, the Reservation_Slip print view, and the Daily_Schedule_Printout by reading each field from one shared configuration source, such that the rendered string for each field is byte-for-byte equal across all three surfaces.
2. WHEN any of the staff console header, the Reservation_Slip print view, or the Daily_Schedule_Printout is rendered, THE Court_Scheduler_Frontend SHALL render each official header field (barangay name, court name, official subtitle) as an exact-character match (including letter case, spacing, and punctuation) to the value provided by the shared configuration source, with no surface applying its own transformation, abbreviation, or alternate spelling.
3. THE Court_Scheduler_Frontend SHALL include an automated test that (a) asserts the staff console header, the Reservation_Slip print view, and the Daily_Schedule_Printout all read each official header field from the same shared configuration source, and (b) asserts that for each of the three fields (barangay name, court name, official subtitle) the rendered string is identical (exact-character match) across all three surfaces, with the test failing if any surface differs in any character.
4. IF the shared configuration source is missing a value for any official header field (barangay name, court name, or official subtitle) or returns an empty string for that field at render time, THEN THE Court_Scheduler_Frontend SHALL render a configuration error indication identifying the missing field rather than silently rendering an alternate spelling, and SHALL NOT block rendering of the rest of the surface.

### Requirement 19: Form Field id/name Warning Resolution (UI-AUD-024)

**User Story:** As a developer, I want the Chrome issues panel to stop reporting "form field with no id or name" warnings, so that the staff console passes a clean DevTools issues check.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL render every `input`, `select`, and `textarea` element that is currently flagged by the Chrome issues panel "form field with no id or name" warning with at least one of: a non-empty `id` attribute (1 to 100 characters, containing no whitespace), a non-empty `name` attribute (1 to 100 characters), or both.
2. WHERE an `input`, `select`, or `textarea` element receives an `id` attribute, THE Court_Scheduler_Frontend SHALL ensure that `id` value is unique within the rendered HTML document.
3. WHERE a form control rendered by the Court_Scheduler_Frontend has an associated visible label in the existing visual design, THE Court_Scheduler_Frontend SHALL associate that control with a `label` element either by setting the `label` element's `for` attribute equal to the control's `id`, or by nesting the control inside the `label` element.
4. IF a form control is hidden, decorative, or is not a labelable element (for example `input type="hidden"`, `input type="submit"`, `input type="button"`), THEN THE Court_Scheduler_Frontend SHALL still satisfy criterion 1 for that control but SHALL NOT be required to attach a visible `label` element.
5. WHEN the Chrome issues panel is re-run on each page previously flagged by warning UI-AUD-024 after this remediation is deployed, THE Court_Scheduler_Frontend SHALL produce zero "form field with no id or name" warnings on those pages.

### Requirement 20: Trivial Polish Items (UI-AUD-025 Through UI-AUD-028)

**User Story:** As a Staff_User, I want the trivial-rated polish items from the audit handled when the surrounding code is touched, so that the visible-quality bar matches the rest of the program.

#### Acceptance Criteria

1. WHEN this remediation is implemented, THE Court_Scheduler_Frontend SHALL apply the recommendation specified in `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md` for each of the Audit_Issue_IDs `UI-AUD-025`, `UI-AUD-026`, `UI-AUD-027`, and `UI-AUD-028`, such that each Audit_Issue_ID is marked resolved in the audit traceability matrix with a reference to the changed file or files.
2. IF a trivial item conflicts with a higher-severity requirement defined in this document, where conflict means the trivial recommendation would override, contradict, or prevent satisfaction of that higher-severity requirement, THEN THE Court_Scheduler_Frontend SHALL implement the higher-severity requirement and SHALL defer the trivial item, recording the deferral in the implementation report with the conflicting requirement identifier and the reason for deferral.
3. THE Court_Scheduler_Frontend SHALL NOT introduce design tokens, third-party libraries, or user-visible behaviors that were not already present in the codebase prior to this remediation as part of completing `UI-AUD-025` through `UI-AUD-028`.
4. WHEN remediation of `UI-AUD-025` through `UI-AUD-028` is complete, THE Court_Scheduler_Frontend SHALL include in the implementation report one entry per Audit_Issue_ID stating either resolved with the changed file reference, or deferred with the conflicting requirement identifier and reason.

### Requirement 21: Supported Viewports Quality Bar

**User Story:** As a Staff_User, I want every touched surface to render correctly at 1366px, 1024px, 768px, and 390px, so that the office desktop and tablet views remain usable after this remediation.

#### Acceptance Criteria

1. WHEN a surface modified by this feature is rendered at any Supported_Viewport width (1366px, 1024px, 768px, or 390px) with viewport height of at least 600px, THE Court_Scheduler_Frontend SHALL display all content within the viewport width without producing a horizontal scrollbar on the document or on any container that is not explicitly designated as horizontally scrollable.
2. WHEN a surface modified by this feature is rendered at any Supported_Viewport width, THE Court_Scheduler_Frontend SHALL render all text at the specified body baseline of 17px or larger, with no text clipped, truncated without an ellipsis affordance, or overlapping adjacent elements.
3. WHEN a surface modified by this feature is rendered at any Supported_Viewport width, THE Court_Scheduler_Frontend SHALL keep primary actions, navigation affordances, and Modal_Shell footer buttons fully visible within the viewport without requiring the user to scroll horizontally and without any portion of those controls being clipped or covered by other elements.
4. THE Court_Scheduler_Frontend SHALL preserve the 17px body baseline, the 48px minimum primary control height, and the 64px minimum main action height, with a tolerance of 0px, on every Supported_Viewport where the corresponding element is rendered.
5. THE Court_Scheduler_Frontend SHALL NOT introduce viewport-conditional copy strings, viewport-conditional color tokens, or viewport-conditional navigation patterns to satisfy this requirement, such that the rendered copy text, color token identifiers, and navigation structure are identical across all Supported_Viewports for any given surface.
6. WHEN a surface modified by this feature is rendered at any Supported_Viewport width, THE Court_Scheduler_Frontend SHALL preserve keyboard focusability of every interactive element, maintain the same logical focus order across all Supported_Viewports, and render a visible focus indicator with a minimum 2px outline and a minimum 3:1 contrast ratio against the adjacent background.
7. IF a surface modified by this feature cannot satisfy criteria 1 through 6 at a given Supported_Viewport width, THEN THE Court_Scheduler_Frontend SHALL be treated as failing the Supported Viewports Quality Bar for that surface and viewport, with the failing surface and viewport identified by their defined names.

### Requirement 22: Documentation And Reporting Updates

**User Story:** As a barangay staff member and as a reviewer of this remediation, I want the status reports and bug reports updated after implementation, so that the deployment-readiness story matches what shipped.

#### Acceptance Criteria

1. WHEN the implementation of this feature is completed, THE Court_Scheduler_Frontend SHALL update `OPUS_UI_BUG_REPORT.md` so that, for every Audit_Issue_ID addressed by this feature, the file contains an entry consisting of the Audit_Issue_ID, a resolution summary describing the change made, the file paths or surfaces modified, and verification evidence consisting of the verification command executed and its pass/fail result.
2. WHEN the implementation of this feature is completed, THE Court_Scheduler_Frontend SHALL update `OPUS_FRONTEND_INSPECTION_REPORT.md` so that the file contains, for each touched surface, the surface identifier, the items re-inspected, and a pass or fail outcome per item.
3. WHERE `OPUS_FRONTEND_MICRO_AUDIT.md` is present in the repository, WHEN the implementation of this feature is completed, THE Court_Scheduler_Frontend SHALL update that file so that it contains, for each item previously flagged in it that falls within the touched surfaces, the item identifier and a pass or fail outcome.
4. IF `OPUS_FRONTEND_MICRO_AUDIT.md` is not present in the repository, THEN THE Court_Scheduler_Frontend SHALL NOT treat the absence of an update to that file as a violation of this requirement.
5. WHEN the implementation of this feature is completed, THE Court_Scheduler_Frontend SHALL update `DEPLOYMENT_READINESS_REPORT.md` so that the file contains the post-remediation readiness score expressed on the same scale used in the prior version of the report, a list of remaining deferred issues with each entry tagged by its Audit_Issue_ID, and the list of verification commands and viewport checks executed with a pass or fail result for each.
6. WHEN the implementation of this feature is completed, THE Court_Scheduler_Frontend SHALL update `QA_FULL_SYSTEM_REPORT.md` so that the file contains, for each touched surface, the surface identifier, the QA checks executed, and a pass or fail outcome per check.
7. THE documentation updates produced under this requirement SHALL NOT introduce any reference to PDF exports, XLSX exports, online booking, SMS, payments, memberships, public resident accounts, or cloud sync.
8. IF any of `OPUS_UI_BUG_REPORT.md`, `OPUS_FRONTEND_INSPECTION_REPORT.md`, `DEPLOYMENT_READINESS_REPORT.md`, or `QA_FULL_SYSTEM_REPORT.md` is not present in the repository at the time of update, THEN THE Court_Scheduler_Frontend SHALL surface a written notice identifying the missing file and SHALL NOT silently skip the update.

### Requirement 23: Build, Test, And Manual Viewport Verification

**User Story:** As a developer signing off this remediation, I want the build, automated test, and manual viewport verification steps run and recorded, so that the remediation is provably complete.

#### Acceptance Criteria

1. WHEN `npm run frontend:build` is executed, THE Court_Scheduler_Frontend SHALL exit with status code 0, SHALL emit zero build errors, and SHALL produce assets under `public/app/` whose markup and stylesheets reference only paths resolving inside `public/app/` (no external URLs, CDNs, or absolute remote hostnames).
2. IF `npm run frontend:build` exits with a non-zero status code or emits any build error, THEN THE Court_Scheduler_Frontend SHALL be treated as not built and the implementation report SHALL record the verbatim failing command, exit code, and error output.
3. WHEN `npm run verify:react-build` is executed, THE Court_Scheduler_Frontend SHALL exit with status code 0 and SHALL satisfy every existing assertion in that script, including the offline-only assertion and the approval-workflow-free assertion.
4. WHEN `npm run verify:ui` is executed, THE Court_Scheduler_Frontend SHALL exit with status code 0, SHALL satisfy every existing assertion in that script, and SHALL write the verification artifacts produced by that script to their existing output locations.
5. WHEN `npm test` is executed, THE Court_Scheduler_Frontend SHALL run the automated test suite to completion and SHALL exit with status code 0 with zero failing tests.
6. IF `npm test` cannot be run in the current environment due to a documented environmental blocker (missing dependency, sandbox restriction, or unavailable runtime), THEN THE implementation report SHALL record the specific blocker, the exact substitute command(s) executed, and each substitute command's exit code and pass/fail outcome.
7. THE Court_Scheduler_Frontend SHALL be manually verified at each Supported_Viewport width (1366px, 1024px, 768px, 390px) on every surface in the Verification_Surface_Set.
8. WHILE manual verification is performed on each surface in the Verification_Surface_Set at each Supported_Viewport, THE Court_Scheduler_Frontend SHALL be inspected via the Chrome DevTools Console panel and Network panel and SHALL exhibit zero new uncaught console errors and zero new failed network requests attributable to this remediation, where "new" means not present on the same surface in the pre-remediation baseline.
9. IF any surface in the Verification_Surface_Set produces an uncaught console error or a failed network request at any Supported_Viewport, THEN THE implementation report SHALL record the surface, the viewport width, the verbatim error or failed request URL and status, and whether the issue is pre-existing or attributable to this remediation.
10. THE implementation report SHALL include each of the following sections, and SHALL be considered incomplete if any section is absent: (a) list of files changed with repository-relative paths, (b) Audit_Issue_IDs resolved, (c) Audit_Issue_IDs intentionally deferred each with a written reason, (d) every command run with its verbatim invocation, exit code, and pass/fail result, and (e) for every (surface, viewport) pair in the Verification_Surface_Set, a repository-relative path to a screenshot or other captured evidence file.

### Requirement 24: Non-Goals And Out-Of-Scope Boundaries

**User Story:** As a reviewer of this remediation, I want the explicit non-goals encoded in requirements, so that scope creep is rejected at requirements review and not at implementation review.

#### Acceptance Criteria

1. THE Court_Scheduler_Frontend SHALL NOT modify backend logic, backend route handler implementations, server-side request validation rules, response payload shapes, or business rules as part of this feature.
2. THE Court_Scheduler_Frontend SHALL NOT modify the database schema, including table definitions, column definitions, indexes, or constraints, as part of this feature.
3. THE Court_Scheduler_Frontend SHALL NOT modify existing API route paths or HTTP methods as part of this feature.
4. THE Court_Scheduler_Frontend SHALL NOT introduce a recurring reservation UI, recurring scheduler view, or any control whose action creates a recurring reservation series.
5. THE Court_Scheduler_Frontend SHALL NOT introduce PDF export controls, XLSX export controls, export libraries for those formats, or visible labels referencing PDF or XLSX export.
6. THE Court_Scheduler_Frontend SHALL preserve the existing CSV-only export UI surface and SHALL NOT add new CSV export endpoints or remove existing backend-supported CSV export endpoints.
7. THE Court_Scheduler_Frontend SHALL preserve the backend-backed Public_Use_Clear behavior as the single source of truth for cleared days.
8. THE Court_Scheduler_Frontend SHALL NOT recreate a frontend-only `clearedDays` state in React component state, React context, Redux or other client store, `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or any in-memory client structure.
9. THE Court_Scheduler_Frontend SHALL conform to the Barangay_Visual_Language as defined in `DESIGN.md`, `.impeccable/design.json`, and `Barangay (1)/DESIGN.md`, using only the color tokens, typography tokens, spacing tokens, and visual primitives declared in those three sources.
10. THE Court_Scheduler_Frontend SHALL NOT introduce gradients, glassmorphism effects, neon color palettes, or any visual primitive not declared in the Barangay_Visual_Language sources listed in criterion 9.
11. THE Court_Scheduler_Frontend SHALL NOT introduce online booking, SMS notifications, cloud sync, public resident accounts, payment processing, or membership features as part of this feature.
12. THE Court_Scheduler_Frontend SHALL treat client-side validation as usability support only and SHALL rely on backend validation as the authoritative source of correctness for every submission.
13. THE Court_Scheduler_Frontend SHALL run as Offline_Operation, with no runtime dependency on external networks during normal operation.
14. THE Court_Scheduler_Frontend SHALL NOT include CDN URLs, third-party host URLs, or any outbound network references (in `<script src>`, `<link href>`, ES module `import` from external URL, `fetch`, `XMLHttpRequest`, `WebSocket`, or equivalent network call) within source files located under `client/src/` or `public/app/`.
