# Chrome DevTools MCP Visual Audit

Date: 2026-05-18
App URL tested: `http://localhost:3000`
Browser tool: Chrome DevTools MCP
Evidence root: `tmp/codex-zero-tolerance-ui-audit`

## Setup / Status

The local Express app was launched on port 3000 and inspected through Chrome DevTools MCP. The audit used real navigation, viewport resizing, accessibility snapshots, screenshots, console/network inspection, direct API fetch comparisons, modal clicks, form filling, and print-route rendering. Print pages were opened with `window.print` stubbed to avoid blocking the browser.

## Viewports Tested

- 1366 px desktop office width
- 1024 px smaller desktop width
- 768 px narrow width
- 390 px mobile-like stress width

## Screenshot / Evidence Index

| Evidence file | Screen/state |
|---|---|
| `login-1366.png` | Login screen |
| `dashboard-1366-nearest-past-slot.png` | Dashboard showing past nearest available slot |
| `calendar-1366-alerts.png` | Calendar with alerts |
| `calendar-more-menu-1366.png` | Calendar overflow menu |
| `maintenance-modal-1366.png` | Maintenance block modal |
| `clear-public-use-modal-1366.png` | Clear for Public Use modal |
| `clear-public-use-confirmation-1366.png` | Clear for Public Use confirmation |
| `new-reservation-1366-disabled-selected-past-time.png` | New Reservation with disabled selected past time |
| `new-reservation-backend-past-time-error-after-submit.png` | Backend validation error after Save |
| `dashboard-1024.png` | Dashboard at 1024 |
| `dashboard-768-mobilebar.png` | Dashboard at 768 |
| `new-reservation-768-mobile-nav-open.png` | New Reservation with mobile nav open |
| `dashboard-390.png` | Dashboard at 390 |
| `dashboard-390-mobile-nav-open.png` | 390 mobile nav open |
| `new-reservation-390.png` | New Reservation at 390 |
| `reservations-1366-list-nested-print-buttons.png` | Reservation list with nested Print buttons |
| `reservation-detail-drawer-1366.png` | Reservation detail drawer |
| `reports-1366-usage.png` | Reports usage section |
| `reports-maintenance-public-use-1366.png` | Reports maintenance/public-use section |
| `resident-directory-1366.png` | Resident directory desktop |
| `resident-directory-390-cards.png` | Resident directory mobile cards |
| `reservation-history-390-empty.png` | Resident history empty state |
| `reservation-history-390-results.png` | Resident history results |
| `activity-logs-1366-timestamp-shift.png` | Activity logs timestamp shift |
| `reservation-slip-1366-timestamp-shift.png` | Reservation slip timestamp shift |
| `daily-print-1366-timestamp-shift.png` | Daily print timestamp shift |
| `court-policy-1366-missing-backup-reminder.png` | Court policy missing backup reminder |
| `accounts-1366.png` | Account management |
| `lighthouse-accounts/report.html` | Lighthouse snapshot report |
| `lighthouse-accounts/report.json` | Lighthouse JSON report |

## Screens Inspected

Login, dashboard, app shell/sidebar/topbar/mobile nav, calendar/schedule, overflow menu, maintenance block modal, Clear for Public Use modal and confirmation, New Reservation, reservation validation error, reservations list/search, reservation detail drawer, reservation slip print route, daily schedule print route, reports, CSV export controls, resident directory, resident history lookup, activity logs, court policy settings, account management, and responsive layouts.

## Screens / States Not Inspected

- Staff-role-only runtime browser session: no separate staff credentials available in this sweep.
- Actual printer dialog and physical printout: browser print was stubbed.
- Actual maintenance/public-use destructive submit: stopped at confirmation.
- Successful new reservation creation: avoided adding data; validation error was tested instead.
- Daily print with active block row: current data had no active block.
- Full backend outage: not simulated.

## Console Summary

No persistent unexpected console error was found after normal navigation. Expected audit-induced 400 network console noise occurred when intentionally submitting a past same-day reservation and querying past same-day availability.

Chrome issue panel reported: `A form field element should have an id or name attribute`. The final page snapshot did not expose the affected node, so this is recorded as UI-AUD-024 for Opus follow-up.

## Network Summary

Expected failures captured:

- `GET /api/availability?date=2026-05-18&startTime=07:00&endTime=08:00` returned 400: `Start time must be later than the current time for today's reservations.`
- `POST /api/reservations` with today's 7:00 AM slot returned 400 with the same field error.

No unexpected persistent failed asset/API requests were observed after route navigation. Runtime fonts resolved successfully despite Vite build warnings about unresolved font references.

## Route Results

| Route/screen | Viewport | Console | Network | Visual | UX | Accessibility | Design consistency | Notes |
|---|---:|---|---|---|---|---|---|---|
| `/login` | 1366 | Passed | Passed | Passed | Issue | Passed | Partial | Signed-in users can still see login form. |
| `/dashboard` | 1366 | Passed | Backend issue | Issue | Issue | Passed | Partial | Past nearest slot and open count. |
| `/dashboard` | 1024 | Passed | Same backend issue | Issue | Issue | Passed | Partial | Layout usable. |
| `/dashboard` | 768 | Passed | Same backend issue | Issue | Issue | Passed | Partial | Mobile topbar/nav begins taking vertical space. |
| `/dashboard` | 390 | Passed | Same backend issue | Issue | Issue | Partial | Partial | Usable but dense. |
| `/schedule` | 1366 | Passed | Passed | Passed | Passed | Issue | Partial | Alert visible; menu keyboard gaps. |
| Maintenance modal | 1366 | Passed | Passed | Passed | Passed | Passed | Passed | Context copy is clear. |
| Clear Public Use modal | 1366 | Passed | Passed | Passed | Passed | Passed | Passed | Confirmation copy is clear. |
| `/reservations/new` | 1366 | Expected 400 after submit | Expected 400 | Issue | Issue | Partial | Partial | Disabled past slot selected. |
| `/reservations/new` | 768/390 | Expected 400 state retained | Expected 400 | Issue | Issue | Partial | Partial | Layout usable but problem remains. |
| `/reservations` | 1366 | Passed | Passed | Issue | Issue | Issue | Partial | Nested interactive controls. |
| `/reservations/24` | 1366 | Passed | Passed | Passed | Passed | Partial | Partial | Drawer functional. |
| `/reservations/24/slip` | 1366 | Passed | Passed | Issue | Issue | Passed | Partial | Issued time wrong. |
| `/schedule/daily-print` | 1366 | Passed | Passed | Issue | Issue | Passed | Partial | Issued time wrong; past slots look available. |
| `/reports` | 1366 | Passed | Passed | Issue | Partial | Issue | Partial | Raw time labels; tab keyboard gaps. |
| `/residents` | 1366 | Passed | Passed | Passed | Passed | Passed | Passed | Usable. |
| `/residents` | 390 | Passed | Passed | Issue | Partial | Passed | Partial | Placeholder clipping and heavy card actions. |
| `/reservations/history` | 390 | Passed | Passed | Passed | Passed | Issue | Partial | Tab keyboard gap by source. |
| `/activity-logs` | 1366 | Passed | Passed | Issue | Issue | Passed | Partial | Timestamps shifted. |
| `/settings/court-policy` | 1366 | Passed | Passed | Issue | Issue | Passed | Partial | Backup reminder absent despite due. |
| `/account` | 1366 | Passed | Passed | Passed | Partial | Partial | Partial | Shared timestamp and alert-role risks. |

## Responsive Findings

- At 1366 and 1024, the system is mostly comfortable.
- At 768, the mobile navigation surface appears and can push primary content down.
- At 390, core content remains reachable, but navigation, sign-out, resident cards, and repeated actions feel heavy for a public-office tool.
- No screen was completely unreadable at 390, but the critical date/time and timestamp issues remain visible at every width.

## Print Route Findings

- Reservation slip structure looks official, with prominent reference number and clear sections.
- Daily print is readable, but issued time is wrong and same-day past availability can be misunderstood.
- Daily print source can fail to show block type because of `blockType` vs `type`.
- Actual print dialog and physical paper output were not inspected.

## Modal / Dialog Findings

- Maintenance modal distinguishes maintenance from public-use clearing and shows the affected date/range.
- Clear for Public Use modal and confirmation explain cancellation impact and record retention.
- Modal copy is generally strong; Opus should preserve this clarity while polishing layout.

## Final Visual / Runtime Judgment

**FAILED** for final UI sign-off because runtime screens expose critical decision-making errors and wrong official-facing timestamps. Core screens render and automated UI smoke checks pass, so the correct implementation posture is targeted Opus frontend remediation plus a separate Codex/backend dashboard availability fix.
