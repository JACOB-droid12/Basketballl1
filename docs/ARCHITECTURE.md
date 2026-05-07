# Architecture Plan

## Goal

Build a simple offline reservation management system for the Barangay Sto. Niño, Parañaque City basketball court. Barangay personnel use the system in the office to encode reservation requests, view available and reserved time slots, prevent conflicts, and maintain records for presentation and ISO 25010 evaluation.

## Reference Inputs Reviewed

- `C:\Users\Emmy Lou\Downloads\Project Proposal.pdf`
- `C:\Users\Emmy Lou\Downloads\Presentation Slides.pptx`
- `C:\Users\Emmy Lou\Downloads\Database Diagram.jpg`
- Attached database diagram image in the Codex thread

Key alignment points:

- Offline system installed on a barangay office computer
- Residents request reservations in person
- Authorized staff encode and manage schedules
- MySQL stores reservation details, schedule records, and activity logs
- Admin account creation flow includes full name, username, password, and role
- UI drafts use a red header, tan background, left navigation, login page, schedule view, and account-management screens

## Approaches Considered

### PHP/MySQL

This matches common school and XAMPP deployment patterns. It would be easy to install with XAMPP, but PHP and Composer are not available in the current workspace environment, so it is weaker for immediate development and automated checks here.

### Node.js/Express/MySQL

This is the chosen approach. Node.js and npm are available in the environment, Express keeps the app simple, EJS avoids a separate frontend build process, and MySQL remains the final local database target. After dependencies are installed once, the app can run offline on the office computer.

### Python/Flask/MySQL

This would also work for a small local office app, but Flask and MySQL connector packages are not installed in the current environment. It would not be safer than Node.js here.

### SQLite Fallback

SQLite is useful for local development if MySQL is temporarily unavailable, but the project proposal and slides specifically name MySQL. SQLite should only be used as a temporary development fallback if the team cannot install MySQL during implementation.

## Decision

Use a local server-rendered web app:

```text
Office browser -> local Express server -> local MySQL database
```

The system remains offline-first. It does not expose resident self-service booking, public online booking, online payment, email, SMS, AI scheduling, or cloud database functionality.

## Project Structure

```text
database/
  schema.sql        MySQL schema, constraints, and overlap triggers
  seed.sql          Reference statuses, time slots, and court settings
  README.md         Local database setup instructions
docs/
  ARCHITECTURE.md   Architecture and stack decision
  CODEX_HANDOFF.md  Current state and continuation guide
  REFERENCE_REVIEW.md
  superpowers/plans/
public/
  css/styles.css    Initial UI style tokens aligned with mockups
scripts/
  verify-foundation.mjs
src/
  app.js            Express app factory
  server.js         Local server entry point
  config/database.js
views/
  login.ejs         Initial login-page shell
```

Current implementation also includes feature folders for `reservations`, `schedule`, and `users`, plus EJS views for dashboard, schedule, reservation records/details, and account management.

## Database Model

The database keeps the main entities from the diagram but tightens the structure for implementation:

- `users`: barangay admin and staff accounts with `password_hash`, role, and account status
- `residents`: resident or group representative details
- `reservation_statuses`: Available, Reserved, Missed, Cancelled, Completed
- `time_slots`: default one-hour display slots
- `court_settings`: configurable barangay, court, timezone, and open-hours values
- `reservations`: reservation date, exact start/end time, purpose, status, resident, encoder, approver, timestamps
- `activity_logs`: user and reservation activity trail

`Available` is seeded as a display status. Actual available slots should be derived from open time slots minus active reserved records.

## Reservation Conflict Rule

Conflict prevention belongs in two layers:

- Application validation for clear user-facing messages before saving
- MySQL triggers as a database backstop

The schema includes insert and update triggers that reject a new active reservation when:

```text
same reservation date
AND existing status is blocking
AND new.start_time < existing.end_time
AND new.end_time > existing.start_time
```

The seeded blocking status is `Reserved`. `Missed`, `Cancelled`, and `Completed` do not block future booking.

## UI Direction

The first UI implementation should preserve the presentation's office-tool direction:

- Red top bar
- Tan content background
- Left-side navigation for Home, Schedule, and Account
- Login page with account name and password
- Dashboard with today's slots, available slots, upcoming reservations, and missed items
- Schedule view with date selector, hourly slots, and status colors
- Account management flow for admin-only account creation

The UI should improve usability where needed, but avoid turning the project into a public booking website or marketing page.

## Security and Privacy

- Never store plaintext passwords
- Use bcrypt password hashing
- Use parameterized MySQL queries through `mysql2`
- Use role checks for admin-only screens
- Admin-only account management is protected by session role checks
- Keep resident contact number and address local to the barangay office computer
- Do not add email, SMS, cloud sync, or public resident accounts

## ISO 25010 Readiness

Documentation and implementation should provide evidence for:

- Functional suitability: reservations, availability, overlap prevention
- Reliability: validation, database constraints, clear status handling
- Usability: simple barangay-friendly screens and messages
- Security: hashed passwords, roles, local-only deployment
- Maintainability: small modules, setup docs, schema docs, handoff
- Portability: local setup instructions for office deployment

## Milestone Roadmap

1. Foundation: project structure, architecture docs, schema, seeds, handoff
2. Core reservations: models, add/list/edit/cancel, validation, overlap tests
3. Schedule dashboard: date schedule, today view, status labels, nearest slot suggestion
4. Authentication: login, roles, account creation, password hashing
5. Usability and deployment: logs, reporting, print/export if feasible, user guide, ISO notes
