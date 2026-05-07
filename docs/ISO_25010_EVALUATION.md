# ISO 25010 Evaluation Notes

This document helps prepare the system for a project presentation or evaluation using ISO/IEC 25010 quality characteristics.

## Evaluation Scope

System: Barangay Sto. Niño Basketball Court Scheduling System.

Target users: authorized barangay Admin and Staff users.

Deployment model: offline local web app on a barangay office computer with local MySQL.

## Functional Suitability

Evidence:

- Reservation records include date, time, representative, contact, address, purpose, status, creator, and timestamps in the schema.
- Active overlap prevention exists in application logic and MySQL triggers.
- Schedule view shows available and reserved slots.
- Dashboard summarizes today’s schedule, upcoming reservations, missed reservations, and nearest available slot suggestion logic.
- Admin account management supports listing users, role display, duplicate username validation, account creation, and active/inactive status changes.
- Activity logs record and display reservation actions.
- Filtered reservation records can be exported as CSV for reports and presentation evidence.

Suggested evaluation tasks:

1. Add a valid reservation.
2. Try to add an overlapping reservation and confirm it is blocked.
3. Edit a reservation and confirm the new details appear.
4. Mark a reservation as Missed, Cancelled, and Completed.
5. Confirm the activity log records the action.

## Performance Efficiency

Evidence:

- Server-rendered EJS pages keep the UI simple for an office computer.
- Query builders use targeted filters for date, status, purpose, action, and search.
- Activity log list is limited to recent records.

Suggested evaluation tasks:

1. Open dashboard, schedule, reservation list, and activity logs.
2. Confirm pages respond within an acceptable time on the barangay office computer.
3. Test with a larger set of reservation records after live MySQL setup.

## Compatibility

Evidence:

- The app runs locally in a browser.
- Core functionality does not depend on cloud services.
- Local MySQL is the database target.

Suggested evaluation tasks:

1. Run the app on the target Windows computer.
2. Open it in the chosen office browser.
3. Confirm no internet connection is required after dependencies and MySQL are installed.

## Usability

Evidence:

- UI follows the provided mockups: red header, gold sidebar, tan workspace, large rounded navigation controls, and table-based schedule.
- Main navigation includes Home, Schedule, Reservations, Activity Logs, and Account.
- Validation messages are shown for missing or invalid fields.
- Available and reserved schedule slots are clickable.

Suggested evaluation tasks:

1. Ask a staff user to find today’s available time slots.
2. Ask a staff user to create a reservation from an available slot.
3. Ask an admin user to create a Staff account.
4. Ask a staff user to mark a missed reservation.

## Reliability

Evidence:

- Reservation overlap rules are covered by automated tests.
- Date/time validation is covered by automated tests.
- Database triggers provide an additional safety layer against overlapping active reservations.
- Controlled database-unavailable messages are shown when MySQL is not reachable.

Suggested evaluation tasks:

1. Stop MySQL and confirm the app shows a controlled error instead of crashing.
2. Restart MySQL and confirm normal use resumes.
3. Attempt adjacent non-overlapping reservations and confirm they are allowed.

## Security

Evidence:

- Passwords use bcrypt hashes.
- Plaintext passwords are not stored.
- Admin-only account creation is enforced by role middleware.
- SQL queries use named parameters.
- Resident contact and address data stays in the local database.

Suggested evaluation tasks:

1. Confirm Staff users cannot access Admin account creation.
2. Confirm invalid login attempts do not reveal whether username or password is wrong.
3. Review `.env` handling and keep it out of public sharing.

## Maintainability

Evidence:

- Code is separated into feature folders for reservations, schedule, users, and activity logs.
- Database setup files are isolated under `database/`.
- Automated tests cover validation, routes, query builders, schedule service, auth, account creation, and activity logs.
- `docs/CODEX_HANDOFF.md` records current state, tests, known risks, and next steps.

Suggested evaluation tasks:

1. Run `npm test`.
2. Review the feature folder structure.
3. Review handoff and architecture docs.

## Portability

Evidence:

- Deployment uses common Windows-compatible tools: Node.js, MySQL, and a browser.
- Environment settings are kept in `.env`.
- Setup commands are documented in `README.md`, `database/README.md`, and `docs/DEPLOYMENT_GUIDE.md`.

Suggested evaluation tasks:

1. Install the app on another local Windows computer.
2. Apply the schema and seed files.
3. Run the same test and startup commands.

## Current Evidence Gaps

- Live MySQL end-to-end verification is still required on a computer with MySQL installed.
- Database backup and restore are documented but not automated inside the app.
- Print formatting is not yet implemented as a dedicated UI, but exported CSV files can be opened in spreadsheet software and printed.

## Recommended Presentation Demo Flow

1. Show login page.
2. Log in as Admin.
3. Show Home dashboard.
4. Open Schedule and point out available and reserved slots.
5. Add a reservation from an available slot.
6. Try an overlapping reservation and show the validation/conflict handling.
7. Open reservation details.
8. Edit the reservation.
9. Mark it Completed or Missed.
10. Open Activity Logs and show the recorded actions.
11. Export reservation records as CSV.
12. Open Account and show the Create Account and Deactivate/Reactivate workflows.
