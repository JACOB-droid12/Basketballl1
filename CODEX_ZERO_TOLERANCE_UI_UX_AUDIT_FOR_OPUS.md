# Codex Zero-Tolerance UI/UX Audit for Opus

Date: 2026-05-18
Auditor: Codex
Scope: Barangay Basketball Court Scheduling System frontend, rendered Chrome DevTools MCP runtime, accessibility, responsiveness, print layouts, public-service usability, and frontend/API display contracts.
Evidence root: `tmp/codex-zero-tolerance-ui-audit`

## Executive Summary

Final UI/UX inspection judgment: **FAILED**.

The core reservation backend and automated checks still pass, but this zero-tolerance frontend audit found critical UI/API-display risks that can mislead staff or produce wrong official-facing information. The most serious issues are:

- Dashboard says past same-day slots are still available and picks a past "nearest available" slot even though the reservation validation endpoint rejects it.
- New Reservation opens with a disabled past start time selected, shows a valid-looking end time, and keeps Save enabled until the backend rejects the submission.
- Shared timestamp formatting shifts local SQL timestamps by 8 hours on activity logs, account records, reservation slips, and daily printouts.
- The backup reminder component is mounted but invisible because the frontend reads the wrong response shape from `/api/maintenance/backup-status`.

Recommended readiness score until fixes: **78 / 100**. The system remains functionally strong, but it is not ready for final UI sign-off or a defense/client demo without Opus fixes and one Codex/backend dashboard fix.

Codex did not implement UI/UX fixes, backend logic changes, database schema changes, API route changes, recurring UI, or PDF/XLSX UI. The only changes made by this audit are report and handoff files.

## Screens Inspected

| Screen/workflow | Routes | Viewports/evidence |
|---|---|---|
| Login | `/login` | `login-1366.png` |
| Dashboard/Home | `/dashboard` | `dashboard-1366-nearest-past-slot.png`, `dashboard-1024.png`, `dashboard-768-mobilebar.png`, `dashboard-390.png`, `dashboard-390-mobile-nav-open.png` |
| App shell/navigation | all staff routes | 1366, 1024, 768, 390 screenshots above |
| Calendar/schedule | `/schedule` | `calendar-1366-alerts.png`, `calendar-more-menu-1366.png` |
| Maintenance modal | `/schedule` modal | `maintenance-modal-1366.png` |
| Clear for Public Use modal | `/schedule` modal | `clear-public-use-modal-1366.png`, `clear-public-use-confirmation-1366.png` |
| New Reservation | `/reservations/new` | `new-reservation-1366-disabled-selected-past-time.png`, `new-reservation-backend-past-time-error-after-submit.png`, `new-reservation-768-mobile-nav-open.png`, `new-reservation-390.png` |
| Reservation list/search | `/reservations` | `reservations-1366-list-nested-print-buttons.png` |
| Reservation details | `/reservations/24` | `reservation-detail-drawer-1366.png` |
| Reservation slip print | `/reservations/24/slip` | `reservation-slip-1366-timestamp-shift.png` |
| Daily schedule print | `/schedule/daily-print?date=2026-05-18` | `daily-print-1366-timestamp-shift.png` |
| Reports and CSV controls | `/reports` | `reports-1366-usage.png`, `reports-maintenance-public-use-1366.png` |
| Resident directory | `/residents` | `resident-directory-1366.png`, `resident-directory-390-cards.png` |
| Resident history | `/reservations/history` | `reservation-history-390-empty.png`, `reservation-history-390-results.png` |
| Activity logs | `/activity-logs` | `activity-logs-1366-timestamp-shift.png` |
| Court policy/settings | `/settings/court-policy` | `court-policy-1366-missing-backup-reminder.png` |
| Account management | `/account` | `accounts-1366.png`, Lighthouse snapshot |

## Screens Not Fully Inspected

| Screen/state | Reason | Risk |
|---|---|---|
| Staff-role runtime session | No staff-only credentials were available during the Chrome sweep; source and tests were inspected instead. | Admin/staff visibility should be rechecked by Opus after fixes. |
| Native browser print dialog / physical printer | Browser print was stubbed to prevent blocking the audit; rendered print pages were inspected. | Physical paper margins and Windows printer scaling still need office-PC sign-off. |
| Successful creation of a new reservation | Avoided adding more demo data; validation error path was tested. | Opus should retest create success after changing form default-slot behavior. |
| Actual maintenance/public-use mutation | Destructive workflow was stopped at confirmation. | Opus should retest after modal copy/layout changes. |
| Simulated offline backend outage | Not forced during this audit. | Error banners were inspected by source; runtime outage recovery remains a lower-confidence state. |
| Daily print with an active block row | No active block was present in the current data. | Source/API mismatch found; Opus should verify with seeded block data. |

## States Inspected

Default, authenticated, signed-in login revisit, route refresh, modal default, modal validation, destructive confirmation, reservation validation error, empty history, populated history, resident list, filtered/report tabs, print page rendering, 1366 desktop, 1024 desktop, 768 narrow, 390 stress width, console/network after workflows, API response comparisons, and Lighthouse accessibility snapshot.

States not fully inspected: actual destructive mutation success, actual backend outage, native print dialog, physical printer, and staff-role-only browser session.

## Commands Run

| Command | Result | Notes |
|---|---:|---|
| `npm run frontend:build` | PASS | Vite build completed. Font references were left for runtime resolution; runtime served fonts successfully. |
| `npm run verify:react-build` | PASS | React build present and no remote asset references. |
| `npm run verify:ui` | PASS after rerun | First attempt overlapped with the build and missed the transient manifest. Rerun passed for 22 office screens. |
| `npm test` | PASS | 418/418 tests passed. |
| `npm run check:database` | PASS | Local database check passed. |
| Chrome DevTools MCP Lighthouse snapshot | PASS for accessibility/best practices | Accessibility 100, Best Practices 100, SEO 75 because no meta description. |

## Standards Applied

| Standard/framework | Generic description | Why it matters here | Result |
|---|---|---|---|
| ISO/IEC 25010-style software quality | Practical quality model for functional suitability, usability, reliability, maintainability, compatibility, portability, and security support. | The UI must show correct backend data and stay understandable on an offline barangay PC. | **Failed** because dashboard availability and timestamp displays are materially wrong. |
| ISO 9241-210 human-centered design | Designs should fit real users, real tasks, and real contexts. | Staff encode walk-in reservations, check schedules, print slips, and manage public-use/maintenance decisions. | **Partially passed**; core flows exist, but time defaults and backup visibility do not fit staff decision-making. |
| Nielsen heuristics | Ten usability heuristics covering status visibility, real-world match, control, consistency, prevention, recognition, efficiency, minimalism, error recovery, and help. | The app must prevent wrong dates/times/status choices and make results obvious. | **Partially passed**; prevention/status visibility fail on same-day slots, timestamps, and backup reminder. |
| WCAG 2.2 practical baseline | Perceivable, operable, understandable, robust accessibility checks. | Barangay staff may use keyboard, zoom, narrow screens, and printouts. | **Partially passed**; Lighthouse snapshot was strong, but nested interactive controls and tab/menu keyboard gaps remain. |
| WAI-ARIA APG / semantic HTML | Interactive widgets should use native semantics or complete ARIA behavior. | Cards, tabs, menus, modals, buttons, and forms must be predictable. | **Partially passed**; dialogs are mostly acceptable, but reservation cards, tabs, and menus need fixes. |
| Public-service design principles | Plain, official, predictable, non-flashy interfaces for government/public office use. | The system should look trustworthy, simple, and official for staff and panelists. | **Partially passed**; current design is close, but wrong times, hidden backup, raw labels, demo data, and mobile density hurt confidence. |
| Responsive design best practices | Layout must remain usable at desktop and narrow widths, not merely shrink. | Office PCs vary; panelists may test narrow windows or mobile widths. | **Partially passed**; content remains reachable, but nav/topbar density and card actions are heavy at 390/768. |
| OWASP-style safe frontend validation | Frontend should catch invalid input early while backend stays authoritative. | Staff should get fast feedback before submitting invalid dates/times or malformed values. | **Partially passed**; backend blocks past time, but the form presents an invalid default and allows submission. |
| ISO/IEC/IEEE 29119-style evidence discipline | Test conditions, expected/actual result, evidence, and risk should be recorded. | Opus needs a copy-paste-ready implementation handoff with reproducible proof. | **Passed** for this audit; evidence and traceability files were generated. |

## Non-Visual Frontend Code Inspection Summary

Inspected frontend route definitions, app shell, navigation, API clients, dashboard, calendar, reservation form/list/detail/print, daily schedule print, reports/export controls, maintenance and public-use modals, activity logs, resident directory/history, account management, court policy settings, backup reminder, shared status/date/time mappers, CSS-relevant component patterns, frontend tests, UI smoke tests, and Barangay reference context.

Key code findings:

- `src/features/schedule/scheduleService.js:92-151` and `src/features/api/apiRoutes.js:417-448` compute dashboard availability without excluding same-day past slots.
- `client/src/pages/ReservationFormPage.jsx:58`, `:97`, `:463-475`, `:570`, and `:897-898` allow a disabled past slot to be selected and submitted.
- `client/src/api/mappers.js:67-88` formats local SQL timestamps using `timeZone: "UTC"`, shifting local times.
- `client/src/components/BackupReminderCard.jsx:59` and `:82` expect a flat response, but `src/features/api/apiRoutes.js:908-909` returns `{ backupStatus }`.
- `client/src/pages/ReservationsPage.jsx:290-317` nests a real button inside a button-like card.
- `client/src/pages/ReservationsPage.jsx:140` exports via legacy `/reservations/export.csv` instead of preserving React filters.
- `client/src/components/DailySchedulePrintView.jsx:150` reads `block.blockType`, while the API mapper emits `type`.

## Chrome DevTools MCP Runtime Summary

Chrome DevTools MCP was used against `http://localhost:3000` with screenshots, snapshots, console/network checks, viewport resizing, form filling, modal inspection, API fetch comparisons, and print-route inspection.

Runtime evidence confirmed:

- Dashboard displayed `Nearest available: Mon, May 18, 2026, 7:00 AM - 8:00 AM` at about 5:13 PM Manila time.
- `/api/availability?date=2026-05-18&startTime=07:00&endTime=08:00` returned 400 with `Start time must be later than the current time for today's reservations.`
- New Reservation loaded with 7:00 AM selected and disabled; backend rejected Save with the same validation error.
- Activity log and print issued times displayed about 8 hours earlier than the backend SQL timestamp.
- Court Policy did not show the backup reminder even though `/api/maintenance/backup-status` returned `backupDue: true`.
- Reservation list produced nested interactive controls in the accessibility tree.

Console/network summary:

- No unexpected persistent network failures after normal navigation.
- One expected 400 POST to `/api/reservations` was generated by the audit to prove backend validation.
- One expected 400 GET to `/api/availability` was generated by the audit to prove dashboard/backend mismatch.
- Chrome issue panel reported "A form field element should have an id or name attribute"; no affected node was exposed in the final snapshot, so this remains a low-confidence accessibility follow-up.

## Full Findings Table

| ID | Severity | Source | Category | Screen/component | Exact problem | Evidence | Suggested owner |
|---|---|---|---|---|---|---|---|
| UI-AUD-001 | Critical | Backend verification during UI audit | ISO 25010, error prevention | Dashboard `/dashboard`, `/api/dashboard` | Dashboard counts and nearest slot include past same-day slots; availability endpoint rejects the same slot. | `dashboard-1366-nearest-past-slot.png`; API comparison against `/api/dashboard` and `/api/availability`. | Codex/backend separately; Opus should display safe results after fix. |
| UI-AUD-002 | Critical | Code + Chrome DevTools MCP | Human-centered design, OWASP validation | New Reservation `/reservations/new` | Form defaults to disabled past 7:00 AM on today's date and keeps Save enabled until backend rejection. | `new-reservation-1366-disabled-selected-past-time.png`, `new-reservation-backend-past-time-error-after-submit.png`; `ReservationFormPage.jsx:58,97,463-475,570`. | Opus frontend. |
| UI-AUD-003 | Critical | Code + Chrome DevTools MCP | ISO 25010, public-service design | Activity logs, accounts, slips, daily print | Local SQL timestamps display 8 hours early because the shared formatter parses local DB time then formats as UTC. | `activity-logs-1366-timestamp-shift.png`, `reservation-slip-1366-timestamp-shift.png`, `daily-print-1366-timestamp-shift.png`; `mappers.js:67-88`. | Opus frontend. |
| UI-AUD-004 | High | Code + Chrome DevTools MCP | Visibility of system status | Court Policy backup reminder | Backup due state is hidden because frontend stores `{ backupStatus }` and checks `status.backupDue`. | `court-policy-1366-missing-backup-reminder.png`; `BackupReminderCard.jsx:59,82`; API `/api/maintenance/backup-status`. | Opus frontend. |
| UI-AUD-005 | High | Code + Chrome DevTools MCP | Public-service usability | Dashboard alerts/backup visibility | Home dashboard does not surface the backup reminder or dashboard alert payload even though Home is the natural daily starting point. | `dashboard-1366-nearest-past-slot.png`; `DashboardPage.jsx` imports no backup card. | Opus frontend. |
| UI-AUD-006 | Medium | Code inspection | Print layout, API contract display | Daily schedule print | Block rows read `block.blockType`, but API schedule block mapper emits `type`; active block type can print as dash. | `DailySchedulePrintView.jsx:150`; `apiMappers.js:84-103`; no active block screenshot. | Opus frontend. |
| UI-AUD-007 | Medium | Code + Chrome DevTools MCP | WAI-ARIA/semantic HTML | Reservations list | Reservation card uses `role="button"` and contains a nested `Print slip` button. | `reservations-1366-list-nested-print-buttons.png`; `ReservationsPage.jsx:290-317`. | Opus frontend. |
| UI-AUD-008 | Medium | Code inspection | ISO 25010, recognition | Reservations export | React `Export CSV` link uses `/reservations/export.csv` and does not preserve search/scope/status filters. | `ReservationsPage.jsx:140`; screenshot shows export beside filtered list. | Opus frontend, backend only if a new filtered endpoint is required. |
| UI-AUD-009 | Medium | Code inspection | WCAG operable, WAI-ARIA APG | Reports and resident history tabs | Elements declare `role="tab"` but no arrow/Home/End keyboard behavior was found. | `ReportsPage.jsx:225,719`; `ReservationHistoryPage.jsx:338`. | Opus frontend. |
| UI-AUD-010 | Medium | Code + Chrome DevTools MCP | WAI-ARIA APG | Calendar overflow menu | Menu uses `aria-haspopup="menu"`/menu roles but lacks complete menu keyboard and focus behavior. | `calendar-more-menu-1366.png`; `CalendarPage.jsx:335`. | Opus frontend. |
| UI-AUD-011 | Medium | Code inspection | Error prevention | Reservation time keyboard/stale clock | `todayInManila` and `currentManilaTime` are memoized once; keyboard time choices include disabled past times. | `ReservationFormPage.jsx:97,897-898`. | Opus frontend. |
| UI-AUD-012 | Medium | Chrome DevTools MCP | Public-service design | Reports | Usage labels show raw 24-hour slot ranges such as `07:00-08:00`, which reads technical compared with the rest of the app. | `reports-1366-usage.png`. | Opus frontend. |
| UI-AUD-013 | Medium | Chrome DevTools MCP | Responsive design | App shell/nav | 390/768 layouts remain usable but nav/topbar and sign-out controls take excessive vertical space. | `dashboard-390.png`, `dashboard-390-mobile-nav-open.png`, `new-reservation-768-mobile-nav-open.png`. | Opus frontend. |
| UI-AUD-014 | Medium | Chrome DevTools MCP | Print layout | Daily schedule print | Daily print shows past same-day slots as visually available; with UI-AUD-001 this can be misread as current availability. | `daily-print-1366-timestamp-shift.png`. | Opus frontend after backend fix. |
| UI-AUD-015 | Low | Chrome DevTools MCP + code | User control/freedom | `/login` while signed in | Signed-in users can navigate to `/login` and see a blank sign-in form instead of being redirected or told they are signed in. | `login-1366.png`; `App.jsx` login path branch. | Opus frontend. |
| UI-AUD-016 | Low | Chrome DevTools MCP | Public-service design | New Reservation | "Recurring reservations: not yet available" is prominent and can look like an unfinished feature during defense. | `new-reservation-390.png`; `ReservationFormPage.jsx:559`. | Opus frontend; do not add recurring UI. |
| UI-AUD-017 | Low | Code inspection | Error recovery | New Reservation availability error copy | Copy says staff can "save anyway" when schedule check fails; that weakens confidence even though backend validates. | `ReservationFormPage.jsx:840`. | Opus frontend. |
| UI-AUD-018 | Low | Code inspection | Consistency | Status labels | Status language alternates between `Done`, `Completed`, and status-code-derived labels across filters/reports/history. | `statusDisplay.js`, `ReservationsPage.jsx`, `ReportsPage.jsx`. | Opus frontend. |
| UI-AUD-019 | Low | Chrome DevTools MCP | Responsive design | Resident directory 390 | Search placeholder truncates at mobile width. | `resident-directory-390-cards.png`. | Opus frontend. |
| UI-AUD-020 | Low | Chrome DevTools MCP | Aesthetic/minimalist design | Resident directory 390 | Each mobile resident card has large repeated Use/Edit/Remove actions, visually heavy for scanning. | `resident-directory-390-cards.png`. | Opus frontend. |
| UI-AUD-021 | Low | Code inspection | WCAG status messages | Accounts | Success message uses `role="alert"` instead of a calmer status pattern. | `AccountsPage.jsx:181`. | Opus frontend. |
| UI-AUD-022 | Low | Code inspection | Accessibility polish | Court policy | Remove button uses a bare `x` glyph and raw date-oriented aria text. | `CourtPolicyForm.jsx` inspected by source. | Opus frontend. |
| UI-AUD-023 | Low | Code inspection | Public-service design | Reports/daily print headers | Some official headers hardcode `Barangay Sto. Nino` instead of using the official spelling/config consistently. | `ReportsPage.jsx:212`; `DailySchedulePrintView.jsx:41`. | Opus frontend. |
| UI-AUD-024 | Low | Chrome DevTools MCP | WCAG robust | Form fields | Chrome issue panel reported a form field missing id/name, but final DOM snapshot did not identify the node. | Lighthouse/Chrome issue panel; no node path. | Opus follow-up. |
| UI-AUD-025 | Trivial | Code inspection | Maintainability | App route fallback | Dead `ROUTES` placeholder remains in `App.jsx`. | `App.jsx:22,173`. | Opus/frontend cleanup only if nearby. |
| UI-AUD-026 | Trivial | Chrome DevTools MCP | Documentation/metadata | App shell | Lighthouse SEO flags no meta description. For offline internal app this is non-blocking. | `tmp/codex-zero-tolerance-ui-audit/lighthouse-accounts/report.html`. | Optional. |
| UI-AUD-027 | Trivial | Chrome DevTools MCP | Visual polish | Time range typography | Some places use compact hyphenated ranges while other places use friendlier `to`/AM-PM forms. | Reports and reservation cards screenshots. | Opus frontend. |
| UI-AUD-028 | Trivial | Chrome DevTools MCP | Defense readiness | Demo data display | Current demo data includes typo/noise names and purposes, which makes screenshots look less official even if app logic is correct. | `reservations-1366-list-nested-print-buttons.png`, `activity-logs-1366-timestamp-shift.png`. | Data cleanup before defense; not a code fix. |

## Tiny / Trivial Issue Table

| ID | Issue | Risk |
|---|---|---|
| UI-AUD-025 | Dead route placeholder in `App.jsx`. | Maintainer confusion only. |
| UI-AUD-026 | Lighthouse meta description warning. | Non-blocking for offline app. |
| UI-AUD-027 | Time range typography varies. | Small polish issue. |
| UI-AUD-028 | Demo data looks messy in screenshots. | Defense confidence issue, not app logic. |

## Responsive Findings

- 1366 desktop is generally readable.
- 1024 remains usable.
- 768 switches to the mobile bar; the nav panel is functional but tall.
- 390 remains technically usable, but topbar/nav/action density is heavy and can crowd primary tasks.
- New Reservation at 390 shows the critical invalid selected time clearly; fixing the logic is higher priority than layout polish.

## Accessibility Findings

- Lighthouse accessibility snapshot on Account scored 100, but it is not proof of full app conformance.
- Reservation list has nested interactive controls.
- Reports/history tab widgets need full keyboard behavior or simpler native controls.
- Calendar overflow menu needs complete menu keyboard/focus behavior or simpler native disclosure semantics.
- Chrome reported one id/name form-field issue without node detail.
- Success states should use `role="status"`/polite regions instead of alerts when not urgent.

## Public-Service Usability Findings

- Wrong available time and wrong issued timestamps are the largest public-service risks.
- Printouts are visually official enough in structure but cannot be trusted until timestamps are fixed.
- Backup reminder must be visible because this is an offline local office deployment.
- Reports are mostly task-led, but raw slot labels and export wording should be made more staff-friendly.
- Avoid adding recurring UI or PDF/XLSX UI. Preserve CSV-only export language.

## Backend Verification During UI Audit

| Finding | Backend result | Classification |
|---|---|---|
| Dashboard nearest/open slots show past same-day availability. | `/api/dashboard` returns past available slots; `/api/availability` and reservation validation reject them. | Backend/API issue discovered through UI inspection. |
| New Reservation submits selected past time. | Backend correctly returns 400 with field error. | Backend correct; frontend default/validation display issue. |
| Activity/print timestamps are wrong. | Backend returns local SQL timestamp such as `2026-05-18 17:31:00`; frontend displays 9:31 AM. | Backend correct; frontend formatter issue. |
| Backup reminder hidden. | `/api/maintenance/backup-status` returns `{ backupStatus: { backupDue: true } }`; component expects flat `backupDue`. | Backend correct; frontend API contract usage issue. |
| Daily block type can print as dash. | API mapper emits `type`; print component reads `blockType`. | Backend/API contract display mismatch; frontend should read both. |

## Prioritized Opus Fix List

1. Fix New Reservation same-day defaulting: choose first future valid slot, keep duration close to selected start, and disable Save until selected date/time passes frontend checks.
2. Fix shared local datetime formatting so activity logs, accounts, slips, and daily print show the same Manila/local time the backend returns.
3. Fix `BackupReminderCard` to unwrap `data.backupStatus` and place backup/dashboard alerts where staff will see them during daily use.
4. Replace reservation list nested button/card semantics with a semantic card plus separate action buttons.
5. Fix or relabel Reservations CSV export so staff understand whether it exports all records or the current filtered view.
6. Complete keyboard behavior for Reports/History tabs and Calendar overflow menu, or replace those roles with simpler native controls.
7. Fix Daily Schedule print block type display and official print headers.
8. Make report time-slot labels human-readable and consistent with schedule/reservation displays.
9. Reduce mobile nav/topbar density and repeated card actions at 390/768 widths.
10. De-emphasize the recurring unavailable notice without adding recurring reservations, and normalize status wording.

## Deployment / Defense Risk Summary

Blocks final UI sign-off:

- UI-AUD-001
- UI-AUD-002
- UI-AUD-003

Hurts defense/client confidence:

- UI-AUD-004
- UI-AUD-005
- UI-AUD-006
- UI-AUD-007
- UI-AUD-012
- UI-AUD-013
- UI-AUD-014
- UI-AUD-028

Minor polish only:

- UI-AUD-015 through UI-AUD-027 except where listed above.

## Final Recommendation

Do not present the frontend as visually or usability complete. Keep the project status as **functionally strong, not final UI-signed-off** until Opus resolves the frontend findings and Codex separately fixes the dashboard availability backend bug. After those fixes, rerun `npm run frontend:build`, `npm run verify:react-build`, `npm run verify:ui`, `npm test`, Chrome DevTools MCP viewport screenshots, and print route checks.
