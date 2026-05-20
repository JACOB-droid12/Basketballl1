# Final Deployment Signoff

Date: 2026-05-20
System: Barangay Basketball Court Scheduling System
Target: Offline barangay-office Windows deployment for staff/admin encoding.

## Final Judgment

DO NOT DEPLOY TO THE BARANGAY OFFICE YET.

Local source, database, strict offline bundle, backup, restore drill, browser smoke, and print-page rendering are verified on this development machine. The external deployment gates are still not complete: the actual target office PC has not been checked in this run and a physical printer/browser print preview has not been signed off.

Release status:

- Local deployment candidate: PASS
- Strict one-stop offline package: PASS
- Live local MySQL/MariaDB verification: PASS
- Backup creation: PASS
- Restore drill on disposable database: PASS
- Browser print page rendering: PASS
- Physical printer output: NOT VERIFIED
- Target office PC setup/start/restart: NOT VERIFIED

## Bugs Fixed In This Pass

1. Resident Directory Use did not reliably prefill New Reservation.
   - Root cause: the React router normalized away the query string for state while also writing the normalized URL, and ReservationFormPage did not consume `residentId`.
   - Fix: preserve browser URL query strings, route by pathname, add `GET /api/residents/:residentId`, and prefill requester, contact, and address with graceful fallback messages.
   - Tests: `tests/residentRepository.test.js`, `tests/apiRoutes.test.js`, `tests/reactPostDeploymentPages.test.js`.

2. Activity Logs did not expose reservation reference numbers.
   - Root cause: the activity-log repository did not select or map `reservations.reference_no`.
   - Fix: include `referenceNo` in repository/API responses and CSV export.
   - Tests: `tests/activityLogRepository.test.js`, `tests/apiRoutes.test.js`, `tests/reactFrontendHelpers.test.js`.

3. Dashboard nearest available and available-count could include elapsed same-day slots.
   - Root cause: nearest-slot logic skipped only slots whose end time had passed, while reservation creation rejects slots whose start time has passed.
   - Fix: exclude same-day slots with `startTime <= currentTime` from dashboard nearest-slot and available-count logic.
   - Tests: `tests/scheduleService.test.js`, `tests/apiRoutes.test.js`.

## Verified Local Gates

- `npm ci`: PASS
- `npm test`: PASS, 469 tests
- `npm run verify:sql`: PASS
- `npm run verify:foundation`: PASS
- `npm run verify:prereqs`: PASS
- `npm run check:database`: PASS after bundled MariaDB startup
- `npm run backup:mysql`: PASS
- `npm run verify:mysql`: PASS after backup
- `npm run verify:stress`: PASS, including disposable backup/restore
- `npm run restore:mysql -- <stress-backup.sql>` with disposable stress database: PASS
- `npm run frontend:build`: PASS
- `npm run verify:react-build`: PASS
- `npm run verify:ui`: PASS, 22 office screens
- `npm run verify:offline-runtime`: PASS
- `npm run bundle:offline`: PASS
- `npm run verify:bundle`: PASS
- `npm run verify:bundle:strict`: PASS
- `npm run verify:runtime-package`: PASS
- `npm audit --omit=dev`: PASS, 0 vulnerabilities
- Chrome DevTools browser smoke: PASS for login, dashboard, reservations list, resident prefill, overlap rejection, reservation slip route, daily print route, console health, and Lighthouse accessibility snapshot.

## Print Status

Browser-rendered print pages were verified:

- Reservation slip route loaded with reference number, barangay/court name, requester, contact, address, date/time, purpose, status, encoder, issued timestamp, and signature lines.
- Daily schedule print route loaded with date, issued timestamp, slot rows, references, statuses, blocks section, and totals.

Physical printer output was not verified from this environment. Complete `docs/TARGET_PC_FINAL_CHECKLIST.md` on the actual office computer before deployment.

## Backup And Privacy Status

The repo ignores `.env`, `backups/`, `data/mariadb-data/`, `data/logs/`, `runtime/`, generated reports, and temporary files. The offline bundle verifier confirms `.env`, `backups`, and `reports` are excluded.

SQL backup files contain resident names, contact numbers, addresses, reservation history, accounts metadata, and audit logs. Treat every `.sql` backup as confidential barangay data. Store backups only on barangay-controlled drives and limit restore authority to the admin/IT role.

## Remaining Deployment Blockers

1. Target office PC not verified.
   - Risk: Windows permissions, port conflicts, local runtime, database startup, browser availability, or shortcut behavior may differ from the development machine.
   - Required action: run `docs/TARGET_PC_FINAL_CHECKLIST.md` on the actual office computer.

2. Physical printer/browser print preview not verified.
   - Risk: paper size, printer margins, scaling, or driver defaults may affect slip/schedule readability.
   - Required action: print one reservation slip and one daily schedule from the target PC.

3. Local development database contains QA rows.
   - Risk: not a bundle blocker because the strict offline bundle prepares an empty portable data folder, but do not reuse this development database as the production office record store.
   - Required action: perform first-time setup on the target office database and change the starter admin password before regular use.

## Deployment Package

Bundle path:

```text
C:\Users\Emmy Lou\Documents\New project\dist\barangay-court-scheduler-offline
```

Use `START-HERE.bat` on the target PC, then choose first-time setup and final office sign-off. Keep the generated office sign-off report under `reports\office-signoff`.

