# Full Staff-Friendly Replacement Design

Date: 2026-05-15
Project: Barangay Basketball Court Scheduling System
Design status: Approved for written spec review
Supersedes: `docs/superpowers/specs/2026-05-13-react-staff-console-design.md`

## Objective

Replace every normal user-facing UI in the current system with the `Barangay (1)` Staff-Friendly interface direction.

This is not a theme port. The current UI and UX should be scrapped as the visible product surface. The new surface should feel and behave like the Staff-Friendly `Barangay (1)` app while using the existing backend, database, authentication, validation, offline runtime, backup/restore workflow, and API behavior as the working engine.

The result remains an offline, staff-mediated barangay office application. It is not a public online booking site, and it should not imply that residents reserve directly from their own devices.

## Confirmed Decisions

- Use the `Barangay (1)` Staff-Friendly variant as the source of truth.
- Replace every normal user-facing page, not only `/app`.
- Keep the existing backend and database as the system of record.
- Keep the existing status model: `RESERVED`, `MISSED`, `CANCELLED`, and `COMPLETED`.
- Do not add `PENDING`, `APPROVED`, or `DECLINED` as backend statuses in this phase.
- New reservations save directly as `RESERVED`.
- After this replacement works, evaluate deeper product-model changes separately.
- Preserve offline Windows packaging and avoid CDN, cloud-only, or internet-dependent runtime assets.

## Source Design

The primary reference is:

- `C:\Users\Emmy Lou\Downloads\Barangay (1)\Barangay Court Scheduling - Staff Friendly.html`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\styles-staff.css`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\staff-components.jsx`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\staff-app.jsx`

The replacement should preserve the staff-friendly character:

- Warm paper background and civic blue primary identity.
- Large readable staff controls.
- Persistent topbar and sidebar.
- Plain English labels with Filipino helper text where it reduces hesitation.
- Big direct buttons for office tasks.
- Clear status pills with text labels.
- Confirmation dialogs for important status changes.
- Toasts or inline feedback after successful staff actions.

The prototype implementation details should not be copied blindly. The shipped app must not use mock seed data, browser globals as its main architecture, Babel-in-browser, or CDN React.

## Architecture

Express remains the local backend. React/Vite becomes the only normal user-facing UI.

React owns:

- Login and session-driven navigation.
- Dashboard, calendar, reservation form, reservation list, detail drawer, reports, activity logs, and accounts screens.
- Staff-Friendly visual system and layout.
- UI validation, loading, empty, error, confirmation, and toast states.
- Route transitions for all staff workflows.

Express owns:

- Session cookies and authentication.
- Role authorization.
- MySQL or MariaDB access.
- Reservation validation and overlap prevention.
- Status changes.
- Accounts.
- Activity logs.
- CSV export.
- Offline package generation and local runtime startup.
- Backup and restore scripts.

The frontend must treat backend validation as authoritative. Client-side checks can improve feedback, but they cannot replace server-side rules.

## Route Replacement

Every normal user route should render the Staff-Friendly React app shell or redirect into it. The old EJS pages should no longer be the visible staff workflow.

Routes covered by the replacement:

| Route | New behavior |
|---|---|
| `/` | Staff-Friendly app, defaulting to Home after session check |
| `/login` | Staff-Friendly login |
| `/dashboard` | Staff-Friendly Home |
| `/schedule` | Staff-Friendly Calendar |
| `/reservations` | Staff-Friendly All Bookings |
| `/reservations/new` | Staff-Friendly New Reservation |
| `/reservations/:id` | Staff-Friendly reservation detail surface |
| `/reservations/:id/edit` | Staff-Friendly edit flow or drawer edit mode |
| `/reports` | Staff-Friendly Summary |
| `/activity-logs` | Staff-Friendly Activity Logs |
| `/account` | Staff-Friendly Accounts |
| `/account/password` | Staff-Friendly password/account access flow |

Legacy server-rendered handlers may remain internally if needed for CSV export or compatibility during migration, but staff should not normally land on old EJS UI.

## Status Model

The Staff-Friendly UI must use the real backend statuses.

| Staff-Friendly concept | Backend status |
|---|---|
| Active booking | `RESERVED` |
| No-show or missed booking | `MISSED` |
| Cancelled request | `CANCELLED` |
| Finished booking | `COMPLETED` |

User-facing labels:

| Backend status | UI label |
|---|---|
| `RESERVED` | Reserved |
| `MISSED` | Did not show up |
| `CANCELLED` | Cancelled |
| `COMPLETED` | Done |

Unavailable or open schedule cells can still show `Available` when computed by schedule APIs, but `AVAILABLE` is not a stored reservation state.

The UI should remove or rename prototype-only approval language:

- Replace "pending approval" with "Reserved" or "Saved reservation".
- Replace "Approve" with no action in this phase.
- Replace "Decline" with "Cancel".
- Keep "Mark as missed".
- Keep "Mark as done".

## Screen Design

### Login

Use the Staff-Friendly centered login style with the barangay seal, large fields, and plain staff-only language.

Connect to:

- `GET /api/session`
- `POST /api/login`
- `POST /api/logout`

Failed login should show the backend error in the Staff-Friendly alert style.

### Home

Use the Staff-Friendly Home structure:

- Page title for today's court.
- Large summary cards.
- Today's reservation list.
- Clear empty state when no bookings exist.
- Primary "New Reservation" action.
- Notice for nearest available slot when available.

Connect to:

- `GET /api/dashboard`

### Calendar

Use the Staff-Friendly weekly calendar, not the old table-heavy EJS page.

The calendar should show:

- Week navigation.
- Per-day booking blocks.
- Available/no booking messaging.
- Status colors and labels.
- Click/open reservation details.
- "New Reservation" entry point.

Connect to:

- `GET /api/schedule?date=YYYY-MM-DD`

### New Reservation

Use the Staff-Friendly guided reservation form and slot picker, adapted to the real backend.

Required fields remain aligned with backend validation:

- Representative or group name.
- Contact number.
- Address when required by the current backend.
- Purpose.
- Reservation date.
- Start time.
- End time.
- Remarks or notes.

Behavior:

- Check availability while the staff selects date and time.
- Show conflict details and backend suggestions.
- Save directly as `RESERVED`.
- On success, show a Staff-Friendly confirmation and route to the booking list or detail.

Connect to:

- `GET /api/availability?date=&startTime=&endTime=`
- `POST /api/reservations`
- `PUT /api/reservations/:id`

### All Bookings

Use the Staff-Friendly list/table pattern with search and status filters.

Show:

- Reservation date and time.
- Requester/group.
- Contact.
- Purpose.
- Status pill.
- Open detail action.
- Print and CSV export actions where currently supported.

Connect to:

- `GET /api/reservations`
- Existing `/reservations/export.csv` handler for CSV download.

### Reservation Detail

Use the Staff-Friendly detail drawer or modal.

Show:

- Requester/group.
- Contact.
- Address.
- Purpose.
- Date and time.
- Status.
- Remarks.
- Created/updated context when available.

Actions:

- Edit reservation.
- Mark as missed -> `MISSED`.
- Cancel reservation -> `CANCELLED`.
- Mark as done -> `COMPLETED`.

Every status action needs a confirmation dialog with direct language.

Connect to:

- `GET /api/reservations/:id`
- `POST /api/reservations/:id/status`
- `DELETE /api/reservations/:id` if kept as the cancel shortcut.

### Attention / No-Shows

Use the Staff-Friendly attention concept, but adapt it to current statuses.

The screen should focus on records that need staff review:

- `MISSED` reservations.
- `CANCELLED` reservations, if useful for staff review.
- Active `RESERVED` reservations for today that may need completion/missed actions.

Because the backend already prevents active overlaps, this screen should not imply unresolved database conflicts unless an actual overlap is returned by data.

### Summary / Reports

Use the Staff-Friendly summary/report visual language.

The current `/api/reports` payload supports:

- Total reservations.
- Court-hours booked.
- Missed count.
- Completed count.
- Reserved count.
- Cancelled count.
- Status totals.
- Top requesters.

If richer `Barangay (1)` visuals such as demand-by-hour, purpose breakdown, or heat map are added, they must be computed from real backend data, not hardcoded mock trends.

### Activity Logs

Replace the old activity log UI with Staff-Friendly styling.

Keep:

- Search.
- Action filter.
- Date filter.
- Recorded action list.
- Empty and error states.

Connect to:

- `GET /api/activity-logs`

### Accounts

Replace the old account UI with Staff-Friendly styling.

Keep:

- Admin-only account list.
- Create local staff/admin account.
- Activate/deactivate accounts.
- Current account protection.
- Non-admin access message.

Connect to:

- `GET /api/accounts`
- `POST /api/accounts`
- `POST /api/accounts/:id/status`

## Offline Requirements

The replacement must remain fully local.

- Bundle fonts or use local/system fonts.
- Do not use CDN React, CDN Babel, remote fonts, or internet image assets.
- The offline package must include the built React app.
- Existing scripts for bundle verification should keep passing.
- The app should start from the same Windows launcher workflow.

## Error Handling

The UI must handle:

- Signed-out session.
- Invalid credentials.
- Non-admin account access.
- Database/API failure.
- Validation errors by field.
- Reservation conflict errors with overlap detail.
- Empty lists and empty calendar days.
- Network failure against the local server.

Messages should be direct and staff-readable.

## Testing And Acceptance

Acceptance requires verification that:

- Old visible UI is no longer the normal staff path.
- Staff-Friendly UI loads after login.
- Every main route renders in the new shell.
- Login/logout work.
- New reservation creates a real `RESERVED` record.
- Availability conflict suggestions still work.
- Reservation status actions update real statuses.
- Calendar and dashboard use real schedule data.
- Reservation list search/filter works.
- CSV export remains reachable.
- Reports use real backend data.
- Accounts remain admin-gated.
- Activity logs render real log records.
- Mobile/narrow viewport does not overflow badly.
- Offline bundle checks still pass.

Expected verification commands include the existing local checks:

- `npm test`
- `npm run frontend:build`
- `npm run verify:react-build`
- `npm run verify:offline-runtime`
- `npm run verify:bundle:strict`

Additional browser QA should cover the main staff workflows after implementation.

## Out Of Scope For This Phase

Do not include these in the first replacement unless explicitly approved later:

- New backend statuses for pending, approved, or declined.
- A full approval queue.
- Resident self-service booking.
- SMS or email notifications.
- Cloud sync or cloud backup.
- Multi-court scheduling.
- Deep analytics beyond what real data can support now.

## Future Product Rebuild Decision

After the Staff-Friendly replacement works, the next product decision can be whether to deepen the backend model.

Possible later work:

- Add true pending/approved/declined workflow.
- Add approval audit fields.
- Add richer court policy rules.
- Add report tables for demand-by-hour and purpose categories.
- Add stronger account and backup activity logging.

That future work should be planned separately so this phase stays focused on replacing the UI/UX without destabilizing the proven offline system.
