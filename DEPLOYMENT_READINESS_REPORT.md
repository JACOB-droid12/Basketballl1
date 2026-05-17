# Barangay Basketball Court Scheduling System Deployment Readiness Report

Date: 2026-05-17
Target use: Offline single-computer barangay office deployment for Barangay Sto. Nino staff/admin encoding walk-in reservations.

## Final Deployment Judgment

READY WITH RISKS

Deployment readiness score: 91 / 100

The app passed normal verification and disposable-database stress testing. The remaining risks are environmental: the actual Wednesday barangay office computer, a real Windows reboot, printer/browser defaults, power-loss behavior during an active write, and staff training have not been physically tested on the target machine.

## Summary Of Changes Made

- Added server-side max-length and format validation for reservation and account inputs so bad/extreme form data is rejected before MySQL column failures.
- Added login/logout activity logging for both React API routes and legacy routes.
- Added reservation-date advisory locking around create/update reservation writes to harden concurrent double-submit and multi-tab booking attempts.
- Hardened backup filenames with second-level timestamps and collision suffixes.
- Hardened backup/restore/prerequisite scripts to locate bundled `runtime/mariadb/bin` tools without relying on a pre-edited global PATH.
- Changed restore to connect without requiring the target database first, so backups made with `mysqldump --databases` can restore into a fresh/reset local database.
- Added `npm run verify:stress` for reproducible disposable-database stress testing.
- Required `DEPLOYMENT_READINESS_REPORT.md` in the offline bundle verifier and rebuilt `dist/barangay-court-scheduler-offline`.

## Bugs Found And Fixed

1. Plain-shell prerequisite checks could not find bundled `mysql.exe` / `mysqldump.exe`.
   - Fixed in `scripts/verify-prereqs.mjs`.
2. Backup filenames could collide if two backups were created in the same minute.
   - Fixed in `scripts/backup-mysql.mjs`.
3. Restore connected to the target database before replaying a `--databases` dump, which is weak for fresh/reset restores.
   - Fixed in `scripts/restore-mysql.mjs`.
4. Login/logout were not written to the activity log.
   - Fixed in `src/features/api/apiRoutes.js`, `src/features/users/authRoutes.js`, and `src/features/users/userRepository.js`.
5. Very long or malformed staff input could fall through to database errors instead of clean validation.
   - Fixed in `src/features/reservations/reservationValidation.js` and `src/features/users/userValidation.js`.
6. Concurrent reservation writes relied on normal overlap checks but lacked app-level write serialization.
   - Fixed in `src/features/reservations/reservationRepository.js`.

## Normal Test Results

Commands run and passed:

- `npm test` - 262/262 tests passed.
- `npm run verify:sql` - schema, seed, trigger, charset, diagnostic, and idempotency checks passed.
- `npm run verify:foundation` - foundation verification passed.
- `npm run verify:prereqs` - Node, npm, bundled MySQL client, bundled mysqldump, `.env`, DB settings, and session secret passed.
- `npm run verify:react-build` - React build present with no remote asset references.
- `npm run verify:ui` - 22 office screens passed smoke verification.
- `npm run verify:mysql` - schema/seed applied, repository round trip passed, overlap trigger passed, and live authenticated HTTP smoke passed.
- `npm run check:database` - local database readiness passed.
- `npm run bundle:offline` - offline bundle rebuilt.
- `npm run verify:bundle` - deployment bundle contents passed.
- `npm run verify:bundle:strict` - strict one-stop runtime bundle passed.
- `npm run verify:runtime-package` - bundled Node/MariaDB runtime files passed.
- `npm run verify:offline-runtime` - offline runtime launched and served `/prototype`.
- Database-down recovery check - `npm run verify:mysql` initially failed when `127.0.0.1:3306` was not listening; `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensure-local-database.ps1` started bundled MariaDB, then `npm run verify:mysql` and `npm run check:database` passed.

Rendered browser QA:

- Logged in at `http://127.0.0.1:3999/dashboard`.
- Dashboard rendered with staff navigation, nearest available slot, and schedule summary.
- Opened New Reservation and submitted empty required fields.
- Validation messages appeared for requester/group, contact number, address, and purpose without a blank page or lost form state.
- The only console/network item from this invalid-submit flow was the expected HTTP 400 validation response.
- Screenshot evidence saved under `tmp/browser-qa/`.

## Extreme Stress Test Results

Final judgment: PASS

Command:

- `npm run verify:stress`

Disposable database:

- `barangay_court_scheduler_stress_1779018909462`
- Dropped automatically after the run.

Dataset size:

- 1,680 seeded high-volume reservations across 120 days.
- 1,687 total reservations after overlap, hostile-input, edit-conflict, and volume scenarios.
- 25 concurrent duplicate reservation attempts.

Stress scenarios performed:

- Concurrent duplicate same-slot reservations.
- Adjacent back-to-back reservations.
- One-minute overlap rejection.
- AM/PM boundary reservation.
- Editing an existing reservation into a conflicting time slot.
- Empty, malformed, overlong, invalid-date, invalid-time, invalid-status, hostile contact, and hostile text input checks.
- SQL-like/script-like text storage through parameterized repository paths.
- High-volume reservation list performance checks.
- Backup, delete disposable data, restore, and count verification.
- Database connection close/reopen recovery.
- Post-stress integrity audit for overlaps, required fields, roles, and activity logs.

Measured stress results:

- Concurrent attempts: 1 success, 24 conflict rejections.
- Overlapping active reservations after audit: 0.
- Invalid required reservation fields after audit: 0.
- Invalid user roles after audit: 0.
- One-day lookup with high-volume data: 21 ms.
- Full reservation list lookup with high-volume data: 37 ms.
- Backup restored reservation count exactly.
- Stress backup file: `tmp\stress-backups\barangay_court_scheduler_stress_1779018909462_2026-05-17_195512.sql`.

Bugs discovered during stress work:

- The first stress-run implementation had a script bug using snake_case slot fields as camelCase, causing undefined SQL bind values.

Bugs fixed:

- Fixed the stress script field mapping and reran successfully.

Remaining stress risks:

- This stress pass used a disposable local database, not real barangay production data.
- Physical Windows reboot and power-loss tests were not performed in this environment.
- Direct manual database writes are outside normal office use; the app now serializes app-level reservation writes, and database triggers still protect normal direct sequential inserts/updates.

## Data Integrity And Security Findings

Passed:

- Passwords are bcrypt hashes in seed and account flows.
- User list queries do not expose password hashes.
- Database queries reviewed in reservation/user/report paths use parameterized/named placeholders.
- Duplicate usernames are rejected.
- Staff/admin API role checks are enforced for account management.
- Reservation overlap protection exists in app logic, database triggers, and now app-level date locks.
- Login, logout, reservation create/update/status, account create/status/password, backup, and restore paths write activity-log entries where applicable.

Known limitations:

- Backup/restore remain maintenance scripts, not in-app staff UI.
- Staff training is still required before giving restore access; restore can overwrite current records.

## Start / Stop / Restart Steps

Daily start:

1. Open `dist/barangay-court-scheduler-offline`.
2. Double-click `START-HERE.bat`.
3. Choose `1. Start the system for daily use`.
4. Keep the black command window open while using the system.
5. If the browser does not open, manually open `http://localhost:3000/dashboard`.

Daily stop:

1. Sign out from the app.
2. Close the browser tab/window.
3. Close the black command window.

Restart:

1. Close the browser and black command window.
2. Double-click `START-HERE.bat` again.
3. Choose `1. Start the system for daily use`.

If staff click the launcher more than once:

- The startup path detects an already-running local app and opens/reuses the existing local URL instead of creating a broken duplicate instance.

## Backup Instructions

Use this before maintenance, before restore, before copying the computer, and at the end of office days during deployment week.

1. Open `dist/barangay-court-scheduler-offline`.
2. Double-click `START-HERE.bat`.
3. Choose `6. Back up the database now`.
4. Wait for the success message.
5. Confirm the new `.sql` file exists in the local `backups` folder.
6. Copy important backups to a barangay-controlled external drive if available.

Backup files are timestamped and collision-safe.

## Restore Instructions

Restore is for IT support or an authorized barangay administrator only.

1. Create a fresh backup first unless the database is already unusable.
2. Close the daily-use app window if possible.
3. Open `dist/barangay-court-scheduler-offline`.
4. Double-click `START-HERE.bat`.
5. Choose `7. Restore database backup (IT support only)`.
6. Type `RESTORE` only after confirming the selected backup is correct.
7. Enter the path to the `.sql` backup file.
8. Wait for the restore success message.
9. Start the system and confirm login, reservations, schedule, accounts, and activity logs.

## Emergency Recovery If The App Does Not Open

1. Make sure the black command window is still open. If it closed, start again through `START-HERE.bat`.
2. If the browser did not open, manually open `http://localhost:3000/dashboard`.
3. If login page does not load, run `START-HERE.bat` then choose `5. Check this computer before setup`.
4. If database check fails, choose `9. Database-only setup/checks for IT support`.
5. If records look wrong after maintenance, stop daily use and restore the newest known-good `.sql` backup.
6. If port 3000 is occupied by another app, close the other app or ask IT support to change `APP_PORT` in `.env`.
7. Keep `TROUBLESHOOT-WINDOWS.txt` available in the deployment folder.

## Defense Demo Flow

1. Start with `START-HERE.bat` option 1.
2. Log in as admin.
3. Show Dashboard and nearest available slot.
4. Open Calendar/Schedule and explain available/reserved slots.
5. Create a valid walk-in reservation.
6. Attempt an overlapping reservation and show rejection.
7. Open All Bookings and search/filter.
8. Open Activity Logs and show login/reservation/account activity.
9. Open Accounts as admin and show role separation.
10. Explain backup and restore through `START-HERE.bat` maintenance options.

## Files / Scripts Deployment Users Should Click

- Daily use: `dist/barangay-court-scheduler-offline\START-HERE.bat`, option 1.
- Direct daily launcher: `dist/barangay-court-scheduler-offline\start-barangay-office.bat`.
- Backup: `dist/barangay-court-scheduler-offline\START-HERE.bat`, option 6.
- Restore: `dist/barangay-court-scheduler-offline\START-HERE.bat`, option 7.
- Troubleshooting: `dist/barangay-court-scheduler-offline\TROUBLESHOOT-WINDOWS.txt`.
- Staff guide: `dist/barangay-court-scheduler-offline\STAFF-DAILY-USE.txt`.

## Remaining Risks

- Target barangay office computer still needs a real install/reboot rehearsal.
- Printer behavior and default browser behavior need target-machine confirmation.
- Restore while staff are actively using the app should be avoided; close the app first.
- Physical power loss during a database write was not simulated.
- Keep restore permission limited to admin/IT support.
