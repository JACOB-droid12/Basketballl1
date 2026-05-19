# React Staff Console Redesign

Date: 2026-05-13
Project: Barangay Basketball Court Scheduling System
Design status: Approved for implementation planning

## Objective

Replace the current main authenticated UI with a locally bundled React staff console that uses the supplied Staff-Friendly design as the primary visual source of truth. Fold in the fuller Premium Admin mockup where the staff-friendly design is missing required administration, activity log, and reporting surfaces.

The application remains an offline, local barangay-office system. It is not a public reservation website. Barangay personnel encode, manage, and monitor walk-in reservation requests on the office computer.

## Confirmed Decisions

- Use React SPA for the main authenticated app routes.
- Replace the main routes, not only `/prototype`.
- Keep Express, sessions, MySQL or MariaDB, validation, overlap prevention, activity logs, and offline packaging.
- Do not add a `PENDING` status.
- New reservations save as `RESERVED`.
- The real status model remains `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED`, and `COMPLETED`.
- Do not introduce cloud-only services, remote APIs, online authentication, CDN React, Google Fonts, or internet-dependent assets.

## Architecture

Express remains the backend and offline host. React becomes the primary authenticated UI served by Express from local build files. The React bundle must be generated locally and included in the offline package.

React owns the staff console screens, route transitions, dialogs, loading states, empty states, search/filter controls, reservation forms, availability suggestions, and status confirmations.

Express owns authentication, session cookies, API authorization, MySQL access, validation, reservation overlap prevention, account management, activity log writes, export behavior, and offline runtime/package scripts.

The SPA uses same-origin API calls with the existing session cookie. Backend validation remains the source of truth so UI logic cannot bypass reservation rules.

## Visual Direction

Use the Staff-Friendly design as the base:

- Warm office-friendly surface.
- Blue barangay header.
- Left navigation.
- Large readable controls.
- Clear English labels with selected Filipino helper labels where useful.
- Confirmation dialogs for important actions.
- Plain action wording for staff who may not be daily computer users.

Fold in Premium Admin elements only where needed:

- Accounts screen.
- Activity logs screen.
- Stronger reports and summary views.
- More complete reservation tables and detail surfaces.

No mockup seed data should ship. No UI element should pretend to work. Every visible table, card, action, modal, filter, badge, and navigation item must be backed by real data, real frontend state tied to backend behavior, or explicitly documented as intentionally omitted.

## Screen And Route Map

| Screen | Main route | Backend/API source | Main actions |
|---|---|---|---|
| Login | `/login` | session login/logout | sign in, show invalid credential errors |
| Dashboard | `/dashboard` | dashboard summary, today schedule, nearest slot | review today's bookings, jump to new booking, open details |
| Calendar | `/schedule` | weekly and daily schedule data | inspect availability and reservations by date |
| New Reservation | `/reservations/new` | reservation create API, availability API | create `RESERVED` reservation, use nearest available suggestion |
| Edit Reservation | `/reservations/:id/edit` | reservation detail and update API | update resident, contact, address, purpose, date, time, remarks |
| All Bookings | `/reservations` | reservations list API and CSV export | search, filter, open detail, export CSV |
| Reservation Detail | React dialog or page | reservation detail API | mark `MISSED`, `CANCELLED`, or `COMPLETED` with confirmation |
| Accounts | `/account` | admin account APIs | list users, create user, activate/deactivate account |
| Change Password | `/account/password` | existing password flow or API | change signed-in user's password |
| Activity Logs | `/activity-logs` | activity log API | search/filter audit records |
| Reports | `/reports` or app tab | reports API computed from real reservations | view/print/export local summary data |

Existing server-rendered pages can remain during migration as fallback or reference, but they must not be the primary staff workflow after the SPA is complete.

## Status Model

Backend status values remain unchanged:

- `AVAILABLE`: computed schedule slot with no blocking reservation.
- `RESERVED`: active booking that blocks overlap.
- `MISSED`: resident or group did not use the reserved slot.
- `CANCELLED`: booking was cancelled.
- `COMPLETED`: booking finished.

UI wording may be staff-friendly:

- `RESERVED` shows as "Reserved".
- `AVAILABLE` shows as "Available".
- `MISSED` shows as "Did not show up" or "Missed".
- `CANCELLED` shows as "Cancelled".
- `COMPLETED` shows as "Done" or "Completed".

There is no approval queue and no pending badge unless a future backend change explicitly adds that workflow.

## API Design

Add or adapt local JSON endpoints while reusing existing repositories and services.

| Need | Endpoint |
|---|---|
| session | `GET /api/session` |
| login | `POST /api/login` |
| logout | `POST /api/logout` |
| dashboard | `GET /api/dashboard` |
| reservations list | `GET /api/reservations?date=&status=&search=&purpose=` |
| reservation detail | `GET /api/reservations/:id` |
| create reservation | `POST /api/reservations` |
| edit reservation | `PUT /api/reservations/:id` |
| status update | `POST /api/reservations/:id/status` |
| availability and nearest slot | `GET /api/availability?date=&startTime=&endTime=` |
| weekly schedule | `GET /api/schedule?date=` |
| accounts | `GET /api/accounts`, `POST /api/accounts`, `POST /api/accounts/:id/status` |
| activity logs | `GET /api/activity-logs?action=&date=&search=` |
| reports | `GET /api/reports` |

API responses should use consistent field names that map cleanly to the current database model:

- `reservationId`
- `representativeName`
- `contactNo`
- `address`
- `purpose`
- `reservationDate`
- `startTime`
- `endTime`
- `statusCode`
- `statusName`
- `remarks`
- `createdByName`

Errors should be frontend-readable. Validation errors should identify fields where possible. Conflict errors should include the overlapping reservation when available so React can show a clear explanation and suggestions.

## Frontend Behavior

The React app must handle:

- Session check on initial load.
- Protected route behavior for signed-out users.
- Admin-only account routes and controls.
- Loading states per screen.
- Empty states with clear next actions.
- Inline validation errors for forms.
- Backend error messages for database/session/API failures.
- Reservation create/edit forms with all required fields preserved.
- Availability visualization before submission.
- Nearest available slot suggestions when selected time is unavailable.
- Status confirmations for missed, cancelled, and completed changes.
- Search, filter, and sorting on reservations and logs.
- Responsive layout for desktop and smaller screens without text overlap.
- CSV export link using real backend export behavior.

Reports may compute local summaries from real reservation records, such as total reservations, court-hours booked, missed count, status breakdown, and top requesters. Trend claims should not appear unless backed by actual comparison data.

## Backend Behavior

Backend must continue to enforce:

- Session-based authentication.
- Admin-only account management.
- Required reservation fields.
- Date and time validation.
- Reservation overlap prevention in repository logic and database constraints/triggers.
- Valid status transitions limited to `MISSED`, `CANCELLED`, and `COMPLETED` where supported.
- Duplicate username rejection.
- Activity log writes for reservation and account actions where existing behavior expects them.
- Offline/local database behavior.

No schema change is planned. Add one only if implementation uncovers a real backend gap that cannot be handled cleanly with the current tables.

## Offline Delivery

The SPA must be built into local files and served by Express. The offline bundle must include the React build output and any local runtime files needed to run it.

The app must work with no internet:

- Open `http://localhost:3000`.
- Serve React assets from local disk.
- Use same-machine `/api/...` endpoints.
- Use local MySQL or MariaDB.
- Keep session cookies local.
- Avoid remote fonts, icons, scripts, APIs, analytics, or auth.

## Testing Plan

Run existing and new checks:

- Frontend install/build check.
- Backend test suite with `npm test`.
- API tests for the new JSON endpoints.
- Reservation create/edit tests.
- Overlap rejection and adjacent-boundary allowance tests.
- Availability and nearest-slot tests.
- Login/logout and protected API tests.
- Admin-only account tests.
- Duplicate username tests.
- Activity log tests.
- Local browser smoke test for login, dashboard, calendar, reservation create/edit/status, accounts, logs, reports, and responsive behavior.
- Offline package checks after the React build is integrated: `bundle:offline`, `verify:bundle`, `verify:bundle:strict`, `verify:runtime-package`, and `verify:offline-runtime` where applicable.

## Acceptance Criteria

- The main authenticated app visually follows the Staff-Friendly design.
- Premium Admin elements are used only to fill required missing admin, log, and reporting screens.
- Old UI is not accidentally mixed into the primary staff workflow.
- All scheduling and reservation behavior remains backend-backed.
- No fake pending approval workflow exists.
- No frontend button or form pretends to work.
- The system remains offline/local.
- The app builds and runs successfully.
- Reservation overlap prevention remains enforced.
- Admin/staff account workflow still works.
- Activity logs remain visible and backed by real data.
- The offline package includes the React build and passes relevant verification.
