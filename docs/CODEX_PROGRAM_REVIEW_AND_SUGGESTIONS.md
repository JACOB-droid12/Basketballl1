# Barangay Sto. Nino Basketball Court Scheduling System - Program Review and Suggestions

Review date: 2026-05-16  
Repository: `C:\Users\Emmy Lou\Documents\New project`  
Review mode: evidence-first technical review; no feature implementation performed.

## 1. Executive Summary

The system is a credible offline barangay-office scheduling application. The current checkout uses a local Express server, a React/Vite staff console, retained EJS/prototype compatibility routes, and a local MySQL/MariaDB database. Its strongest technical points are the two-layer reservation conflict protection, broad automated test coverage, strict one-stop offline package checks, and Windows launcher/maintenance scripts.

The app is defense-ready in the sense that core scheduling, local login, reservation CRUD, schedule display, nearest-slot suggestion, activity logs, reports, and offline packaging all have file-level and command-level evidence. The best defense framing is: this is not an online resident booking website; it is a local office tool used by authorized barangay staff to encode walk-in requests and prevent overlapping court reservations.

The main risks before defense are not missing core features. They are explanation and hardening risks:

- `npm run backup:mysql` failed in a plain PowerShell session until the bundled MariaDB runtime path was manually added; the office `.bat` wrapper loads that path, but the raw npm command is not self-contained.
- Cookie-based JSON APIs do not include CSRF protection. This is lower risk for a localhost-only office app, but it is a real web security limitation.
- No rate limiting or account lockout exists for login attempts.
- Missed reservations are manually marked; there is no automatic "past reserved becomes missed" job.
- `court_settings` exists in schema/seed, but the app mostly uses active `time_slots` and fixed client time options rather than an editable policy screen.
- Current worktree contains unrelated uncommitted UI/build changes that should be checkpointed or intentionally cleaned before a final defense package.

## 2. Current System Overview

### Actual Tech Stack

- Backend: Node.js 20+, Express 4, ESM modules, `express-session`, EJS retained for legacy/server-rendered routes (`package.json`, `src/app.js:1-17`).
- Frontend: React 18 staff console built by Vite 8 into `public/app` (`package.json`, `client/src/App.jsx:48-137`, `client/vite.config.js`).
- Database: MySQL/MariaDB using `mysql2`, schema in `database/schema.sql`, seed data in `database/seed.sql`, live verification in `scripts/verify-mysql.mjs`.
- Auth: session cookie named `barangay_scheduler_sid`, bcrypt password comparison/hashing (`src/app.js:38-48`, `src/features/api/apiRoutes.js:72-91`, `src/features/users/userRepository.js:49-50`).
- Offline deployment: Windows `.bat` launchers, PowerShell setup scripts, bundled `runtime/node` and `runtime/mariadb`, package validators (`START-HERE.bat`, `start-barangay-office.bat`, `maintenance-tools/`, `scripts/verify-runtime-package.mjs`).
- Tests: Node test runner through `scripts/run-tests.mjs`; 250 tests passed in this review.

### Architecture

The architecture is:

```text
Office browser -> local Express app -> local MySQL/MariaDB database
                       |
                       +-> React staff console from public/app
                       +-> JSON APIs under /api/*
                       +-> retained EJS/prototype routes for compatibility
```

`src/app.js` builds the Express application, serves static assets, configures sessions, exposes `/health`, mounts auth/API/prototype/React routes, then protects legacy EJS pages with `requireSignedIn` (`src/app.js:23-73`). React handles normal staff navigation and calls JSON APIs through `client/src/api/client.js:1-39`.

### Main User Flows

- Login: React calls `/api/session` and `/api/login`; backend normalizes username, compares bcrypt hash, and stores `userId`, `fullName`, `username`, and `role` in session (`src/features/api/apiRoutes.js:65-91`).
- Dashboard: React dashboard calls `/api/dashboard`, shows today's bookings, open slots, and nearest available slot (`src/features/api/apiRoutes.js:266-287`, `client/src/pages/DashboardPage.jsx:10-150`).
- Calendar/schedule: React weekly calendar calls `/api/schedule`; backend builds Sunday-Saturday rows from active time slots and reservations (`src/features/api/apiRoutes.js:293-317`, `client/src/pages/CalendarPage.jsx:8-134`).
- Create/edit reservation: React form collects walk-in representative, contact, address, purpose, date, time, remarks, and status; it checks `/api/availability` before saving and posts to `/api/reservations` or `PUT /api/reservations/:id` (`client/src/pages/ReservationFormPage.jsx:49-234`, `src/features/api/apiRoutes.js:168-218`).
- Reservation records/status: React list filters/searches records and opens detail drawer; status changes post `MISSED`, `CANCELLED`, or `COMPLETED` (`client/src/pages/ReservationsPage.jsx:21-107`, `src/features/api/apiRoutes.js:220-264`).
- Account management: Admin-only React screen lists users, creates accounts, and activates/deactivates other accounts (`src/features/api/apiRoutes.js:378-443`, `client/src/pages/AccountsPage.jsx:15-245`).
- Password change: signed-in users can change their own password after current-password verification (`src/features/api/apiRoutes.js:109-135`, `client/src/pages/AccountPasswordPage.jsx`).
- Activity logs: logs are written for reservation/account mutations and viewed through `/api/activity-logs` (`src/features/reservations/reservationRepository.js:278-283`, `src/features/users/userRepository.js:63-67`, `client/src/pages/ActivityLogsPage.jsx:38-251`).
- Reports: `/api/reports` summarizes reservation totals, status counts, top requesters, and booked court hours excluding cancelled reservations (`src/features/api/apiRoutes.js:454-464`, `client/src/pages/ReportsPage.jsx:23-238`).
- Offline startup: `START-HERE.bat` provides setup/maintenance choices; `start-barangay-office.bat` checks Node, npm, `node_modules`, `.env`, and DB readiness before opening `http://localhost:3000/dashboard`.

## 3. Requirement Alignment

| Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Offline barangay-office operation | Implemented and working | `README.md:37-66`, `START-HERE.bat`, `start-barangay-office.bat`, `npm run verify:offline-runtime` passed | Current package validates as a true one-stop offline package. |
| In-person reservation workflow | Implemented and working | `client/src/pages/ReservationFormPage.jsx:239-320` | Form copy explicitly supports staff encoding while resident is at the counter. |
| Admin/staff reservation encoding | Implemented and working | `src/features/api/apiRoutes.js:107-218` | Any signed-in user can create/edit reservations; admin-only controls are limited to account management. |
| Available/reserved slot display | Implemented and working | `src/features/schedule/scheduleService.js:11-31`, `client/src/pages/CalendarPage.jsx:73-130` | Schedule derives availability from active time slots minus blocking reservations. |
| Conflict/double-booking prevention | Implemented and working | `src/features/reservations/reservationRepository.js:145-183`, `database/schema.sql:147-218` | App checks overlap before insert/update; DB triggers reject direct overlapping active rows. |
| Nearest available slot behavior | Implemented and working | `src/features/schedule/scheduleService.js:66-84`, `src/features/api/apiRoutes.js:276-287` | Dashboard searches up to 14 days. Availability API also returns suggestions. |
| Missed reservation behavior | Partially implemented | `src/features/api/apiRoutes.js:220-239`, `client/src/pages/ReservationsPage.jsx:343-354` | Staff can manually mark missed; no automatic missed transition. |
| Activity logs | Implemented and working | `src/features/reservations/reservationRepository.js:278-283`, `src/features/users/userRepository.js:201-213`, `client/src/pages/ActivityLogsPage.jsx:7-35` | Covers reservation and account/password actions. Login/logout are not logged. |
| Account management | Implemented and working | `src/features/api/apiRoutes.js:378-443`, `client/src/pages/AccountsPage.jsx:126-245` | Admin-only account list/create/status; staff sees access-required message. |
| Records/reporting | Implemented and working | `src/features/reservations/reservationRoutes.js:63-75`, `client/src/pages/ReportsPage.jsx:23-238` | Reservation CSV export and printable report screen exist. |
| Usability for non-technical personnel | Partially implemented | `client/src/pages/DashboardPage.jsx:57-106`, `STAFF-DAILY-USE.txt` | Good staff-focused copy and launch docs; final manual browser walkthrough is still recommended. |

## 4. Backend Review

### Strengths

- Route registration is clear. Auth, JSON API, prototype API, React app, and legacy routes are separated (`src/app.js:62-71`).
- JSON APIs enforce signed-in access after public `/api/session` and `/api/login` (`src/features/api/apiRoutes.js:65-107`).
- Admin-only account APIs use `requireApiAdmin` (`src/features/api/apiRoutes.js:378-443`, `src/features/api/apiRoutes.js:487-494`).
- Reservation validation checks required date, time, representative, contact, address, purpose, allowed statuses, future dates, and same-day past start times (`src/features/reservations/reservationValidation.js:5-79`).
- Conflict handling maps app overlap errors to HTTP 409 with overlap detail (`src/features/api/apiRoutes.js:542-557`).
- Status transitions are intentionally limited to `MISSED`, `CANCELLED`, and `COMPLETED` after creation (`src/features/api/apiRoutes.js:220-239`).
- Database operations use parameterized queries through `db.execute` with named params, reducing SQL injection risk (`src/features/reservations/reservationRepository.js:16-183`).
- Mutations write activity logs inside transactions (`src/features/reservations/reservationRepository.js:243-293`, `src/features/users/userRepository.js:181-214`).

### Risks / Gaps

- CSRF protection is not present for cookie-authenticated POST/PUT/DELETE APIs. For a localhost-only app this is not an emergency, but a defense panel may ask why browser POST actions are protected only by session auth.
- No login rate limiting, lockout, or delay exists around `/api/login` or `/login` (`src/features/api/apiRoutes.js:72-91`, `src/features/users/authRoutes.js:43-72`).
- Session cookie is `httpOnly` and `sameSite=lax`, but does not set `secure`, expiration, or custom local-only hardening (`src/app.js:38-48`). This is acceptable for localhost HTTP, but should be explained as local deployment.
- The backend validation does not enforce maximum string lengths matching all DB fields; the React form caps lengths, but API callers could still send oversized values and receive DB errors (`client/src/pages/ReservationFormPage.jsx:39-47`, `database/schema.sql:29-31`, `database/schema.sql:81-82`).
- `court_settings` is present but not used as an editable policy source for schedule hours or barangay metadata (`database/schema.sql:63-69`).

## 5. Database Review

### Strengths

- Schema is straightforward and defensible: `users`, `residents`, `reservation_statuses`, `time_slots`, `court_settings`, `reservations`, and `activity_logs` (`database/schema.sql:11-132`).
- User roles and account statuses are constrained (`database/schema.sql:21-24`).
- Reservation rows have foreign keys to residents, status, creator, approver, and optional time slot (`database/schema.sql:71-110`).
- Useful indexes exist for date/time schedule lookup, status/date filtering, resident lookup, and activity log filtering (`database/schema.sql:86-89`, `database/schema.sql:121-123`).
- Overlap triggers protect the database even if code bypasses the app repository (`database/schema.sql:147-218`).
- Seed data includes the expected statuses, default 7 AM-9 PM schedule slots, court settings, and a bcrypt starter admin hash (`database/seed.sql`).
- Diagnostics are read-only and checked by `npm run verify:sql`.

### Risks / Gaps

- The schema does not automatically transition old `RESERVED` rows to `MISSED`; missed handling is a staff workflow, not a database rule.
- `time_slot_id` is nullable and reservation start/end time are the true source of time. This is flexible and practical, but should be explained clearly in defense.
- Resident records are deduplicated by exact full name/contact/address during reservation mutation (`src/features/reservations/reservationRepository.js:386-420`). Small spelling differences create separate resident rows.
- Backup works when the bundled runtime path is loaded, but the raw `npm run backup:mysql` command failed in a plain shell before adding `runtime\mariadb\bin` to PATH.

## 6. Frontend / UX Review

### Strengths

- React routes cover the main staff surfaces: dashboard, calendar, new/edit reservation, records, reports, activity logs, accounts, and password (`client/src/App.jsx:121-137`).
- The dashboard gives quick staff actions and nearest-available messaging (`client/src/pages/DashboardPage.jsx:57-106`).
- Calendar provides week navigation, date jump, and a visible legend (`client/src/pages/CalendarPage.jsx:51-79`).
- Reservation form is staff-friendly, uses Filipino helper text, radio-style time chips, duration buttons, availability check, and conflict suggestions (`client/src/pages/ReservationFormPage.jsx:239-565`).
- Reservation records include search, status filter, attention list, detail drawer, and status actions (`client/src/pages/ReservationsPage.jsx:121-241`).
- Account page clearly separates admin-only account management (`client/src/pages/AccountsPage.jsx:126-245`).
- Accessibility basics are present in several places: ARIA labels/roles, `role="alert"`, focus management in confirm dialog, associated field errors (`client/src/components/ConfirmDialog.jsx`, `client/src/components/Field.jsx`).

### Risks / Gaps

- Final UX consistency needs manual browser review because there are active uncommitted UI/build changes in `client/src/pages/*`, `client/src/styles.css`, and `public/app/*`.
- Calendar primarily shows booked blocks and "No bookings"; explicit available hour grid is less detailed in React than the legacy EJS schedule slot grid. It still supports availability through the form and dashboard, but defense should demo both calendar and new reservation availability checks.
- Activity log "This week" preset clears the date filter because the backend only supports a single date filter for logs (`client/src/pages/ActivityLogsPage.jsx:96-103`). That is an honest limitation.
- Some frontend date range calculations use JavaScript UTC date helpers while other parts explicitly use Manila date helpers. Tests pass, but Manila-local consistency should be watched around midnight (`client/src/pages/ReportsPage.jsx:212-237`, `client/src/pages/DashboardPage.jsx:31-41`).

## 7. Testing / Build Results

Commands run from `C:\Users\Emmy Lou\Documents\New project`:

| Command | Outcome |
| --- | --- |
| `npm test` | Passed. 250 tests, 250 pass, 0 fail. |
| `npm run verify:foundation` | Passed. `Foundation verification passed.` |
| `npm run verify:sql` | Passed. All SQL static checks `[OK]`, including charset, FKs, triggers, seed statuses, default slots, password safety, diagnostics, and SQL-only setup. |
| `npm run frontend:build` | Passed. Vite built 34 modules into `public/app`. Font URL messages are runtime-resolution warnings for local `/app/fonts/*`, not build failures. |
| `npm run verify:react-build` | Passed. React build present and no remote asset references. |
| `npm run verify:runtime-package` | Passed. Classified current folder as `true one-stop offline package`. |
| `npm run verify:bundle` | Passed. Existing `dist\barangay-court-scheduler-offline` verified as deployment candidate. |
| `npm run verify:bundle:strict` | Passed. Existing bundle verified as strict one-stop offline package with bundled Node and MariaDB runtime files. |
| `npm run verify:offline-runtime` | Passed at `http://127.0.0.1:54555/prototype`. |
| `npm run verify:ui` | Passed for 22 office screens. |
| `npm run check:database` | Passed for database `barangay_court_scheduler`. |
| `npm run verify:mysql` | Passed. Applied schema and seed, live app HTTP smoke passed for 5 authenticated office pages. |
| `npm run backup:mysql` | Failed in plain PowerShell: `spawn mysqldump ENOENT`. |
| PowerShell with `$env:Path` prepended by `runtime\mariadb\bin` and `runtime\node`, then `npm run backup:mysql` | Passed. Created `backups\barangay_court_scheduler_2026-05-17_0001.sql`. |

`npm run restore:mysql` was not run because restore is intentionally destructive unless a specific backup file and target database replacement are approved.

## 8. Security and Data Integrity Review

Strong points:

- Passwords use bcrypt hashes, not plaintext (`src/features/users/userRepository.js:49-50`, `database/seed.sql`).
- User list query excludes password hashes (`src/features/users/userRepository.js:78-100`).
- Password/account activity logs do not include plaintext password details (`src/features/users/userRepository.js:159-163`, tests cover this).
- Session cookie uses `httpOnly` and `sameSite=lax` (`src/app.js:44-47`).
- SQL access is parameterized with `db.execute`.
- App-level overlap checks and DB triggers protect against double booking.
- `.env`, `backups`, and `reports` are excluded from the offline bundle by verifier output.

Defense risks to explain or fix:

- No CSRF token. Mitigation: localhost-only office app, `sameSite=lax`, no public resident access. Better fix: add CSRF tokens or same-origin request validation for mutating routes.
- No login throttling. Better fix: short local in-memory throttle or lockout after repeated failed attempts.
- Starter `admin/admin123` exists by seed design. Docs say change it; defense demo should show password change or use a changed local admin.
- Backup command depends on `mysqldump` discoverability. Wrapper handles it; raw npm script does not autodetect bundled runtime.

## 9. Offline Deployment Review

The offline story is strong. `README.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/OFFLINE_INSTALL_CHECKLIST.md`, `README-FIRST-WINDOWS.txt`, `STAFF-DAILY-USE.txt`, `START-HERE.bat`, and `start-barangay-office.bat` all reinforce the same intended deployment: a Windows office PC runs a local browser UI, local Express backend, and local MySQL/MariaDB database.

Current verification confirms:

- Source folder has bundled Node and MariaDB runtime files.
- Existing `dist\barangay-court-scheduler-offline` passes strict one-stop verification.
- Offline runtime check found no remote runtime asset references.
- UI smoke check covers 22 office screens.
- Live MySQL verifier can reach the configured local DB and validate schema/seed/app smoke behavior.

Deployment caveat:

- Final sign-off must still be run on the actual defense/office computer. Passing here proves the current machine and package, not every future Windows PC.

## 10. Defense Readiness Notes

The team can confidently explain:

- Why offline: barangay personnel encode in-person requests; there is no resident public booking site and no cloud dependency.
- Why browser UI: the browser is only the local interface to `localhost`; it is not an online website.
- How overlaps are prevented: validation/repository checks before saving plus MySQL triggers as a database backstop.
- How roles work: STAFF can use reservation workflows; ADMIN can additionally manage accounts.
- How database supports scheduling: `time_slots` define active display slots, `reservations` store exact date/time/status, `reservation_statuses.is_blocking` decides whether a row blocks booking.
- How ISO 25010 can be discussed:
  - Functional suitability: reservations, schedule, conflict prevention, reports.
  - Reliability: validation, transactions, DB triggers, verification scripts.
  - Usability: staff-focused React screens and Windows launchers.
  - Security: local-only deployment, sessions, roles, bcrypt.
  - Maintainability: modular feature folders and test coverage.
  - Portability: one-stop Windows package with bundled runtimes.
- Limitations: no public online booking, no SMS/email/payment, no automated missed-job, no cloud sync. These are intentional or acceptable for barangay-office scope.

## 11. Prioritized Improvement Suggestions

### Critical before defense

- Fix or document the backup command path issue. Either make `scripts/backup-mysql.mjs` autodetect `runtime\mariadb\bin\mysqldump.exe`, or make defense instructions use `START-HERE.bat` / maintenance wrapper only. Evidence: raw `npm run backup:mysql` failed with `spawn mysqldump ENOENT`; runtime-path version passed.
- Run final office sign-off on the actual defense laptop/VM/package, not only this source checkout. Use `START-HERE.bat` -> `Create final office sign-off report`.
- Checkpoint or intentionally clean the current uncommitted UI/build changes before packaging. `git status` currently shows modified React pages/styles and changed built assets.
- Change the starter admin password before any live demo and be ready to explain that `admin123` is temporary seed data.

### High-value improvements

- Add CSRF or same-origin mutation protection for session-authenticated POST/PUT/DELETE routes.
- Add simple local login throttling to reduce brute-force risk.
- Add server-side max-length validation matching `database/schema.sql`, not only client-side `maxLength`.
- Add login/logout activity logging if the audit trail is presented as full accountability.
- Add a clear "Mark missed" workflow explanation in the UI/docs: manual staff action after no-show, not automatic.
- Make `court_settings` either visibly used or document it as seeded configuration metadata for future policy editing.
- Add an activity-log backend date range filter so "This week" works as a true server-side filter.

### Optional polish

- Add a one-page defense demo script showing login -> create reservation -> conflict rejection -> suggested slot -> mark completed/missed -> activity log -> report -> backup.
- Add a small "Local only" label in staff-facing help/docs so reviewers do not confuse browser UI with public website deployment.
- Improve calendar available-slot visibility if the defense panel expects to see open hours directly on the weekly calendar.
- Add screenshots to `docs/` after final UI sign-off for professor/client review.

## 12. Safe Phased Implementation Plan

### Phase 1: Must-fix issues only

- Files likely affected:
  - `scripts/backup-mysql.mjs`
  - `scripts/restore-mysql.mjs` if the same runtime autodetect pattern should be shared
  - `docs/DEPLOYMENT_GUIDE.md`
  - `README-FIRST-WINDOWS.txt`
- Risk level: Low to medium.
- Complexity: Small.
- Validation:
  - Run `npm run backup:mysql` from plain PowerShell.
  - Run existing backup tests.
  - Run `npm run verify:runtime-package`.
- Codex should implement now or wait: Implement after user approval. This is a real defense-risk fix but touches maintenance scripts.

### Phase 2: Defense-demo polish

- Files likely affected:
  - `docs/DEFENSE_PROJECT_CODEX.md`
  - `docs/USER_GUIDE.md`
  - `docs/OFFLINE_INSTALL_CHECKLIST.md`
  - Optional new `docs/DEFENSE_DEMO_SCRIPT.md`
  - Possibly `client/src/pages/ActivityLogsPage.jsx` for honest "This week" behavior
- Risk level: Low.
- Complexity: Small to medium.
- Validation:
  - Run `npm test`.
  - Run `npm run verify:ui`.
  - Manual demo walkthrough.
- Codex should implement now or wait: Good next step after backup fix and after deciding whether current UI changes are final.

### Phase 3: Post-defense improvements

- Files likely affected:
  - `src/app.js`
  - `src/features/api/apiRoutes.js`
  - `src/features/users/authRoutes.js`
  - `src/features/users/userRepository.js`
  - `src/features/reservations/reservationValidation.js`
  - `client/src/pages/CalendarPage.jsx`
- Risk level: Medium.
- Complexity: Medium.
- Validation:
  - Add focused tests for CSRF/same-origin protection, login throttling, max-length validation, login/logout logs, activity range filters.
  - Run full `npm test`, `npm run verify:mysql`, `npm run verify:offline-runtime`, and UI smoke.
- Codex should implement now or wait: Wait until after defense unless the panel specifically requires security hardening.

## 13. Recommended Next Codex Implementation Prompt

```text
Fix only the defense-critical backup/runtime issue first. In the Barangay Sto. Nino Basketball Court Scheduling System, make the backup command work from plain PowerShell when bundled runtime\mariadb\bin exists, without requiring staff to manually edit PATH. Keep the office wrapper behavior intact. Do not change reservation features or UI. Add or update focused tests for bundled mysqldump autodetection. Then run npm test, npm run backup:mysql, npm run verify:runtime-package, and report exact outcomes.
```
