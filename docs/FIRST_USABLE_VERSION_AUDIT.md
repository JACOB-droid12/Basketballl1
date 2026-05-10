# First Usable Version Completion Audit

Date: 2026-05-10

## Objective Restated

Build an offline barangay-office Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City. The first usable version should let authorized barangay personnel log in, manage reservations locally, prevent double bookings, view available and reserved slots, update reservation statuses, maintain account/activity records, and prepare the system for offline Windows + local MySQL deployment.

## Current Status

Code, SQL, documentation, offline packaging, and prototype-backed frontend work are implemented for the first usable version. The supplied HTML prototype is now served as the visible frontend at `/`, `/prototype`, and `/app`; backend behavior is attached through a hidden local script so the prototype layout remains intact. Live SQL verification passed in this Codex sandbox against both a disposable Oracle MySQL 9.7.0 server under ignored `tmp\mysql-portable\` and a disposable MariaDB 12.2.2 server under ignored `tmp\mariadb-portable\`. That verifies the schema, seed, overlap triggers, repository round trip, authenticated app smoke, backup, restore, and diagnostics path. The startup and live-verification checks now support the documented starter-admin retirement flow as long as at least one real Admin account remains active. Final sign-off should still rerun the same verification on the barangay office's target local database installation.

## Prompt-to-Artifact Checklist

| Requirement / Deliverable | Concrete Evidence | Status |
| --- | --- | --- |
| Offline barangay-office system, no public booking | `README.md`, `docs/ARCHITECTURE.md`, `docs/OFFLINE_INSTALL_CHECKLIST.md`; routes are protected for personnel use and no resident self-service routes exist | Implemented |
| Safe, simple local stack | `docs/ARCHITECTURE.md`; `package.json` uses Node.js, Express, EJS, `mysql2`, `bcryptjs` | Implemented |
| Project structure | `src/`, `views/`, `public/`, `database/`, `docs/`, `tests/`, `scripts/` | Implemented |
| Local MySQL schema | `database/schema.sql` creates `users`, `residents`, `reservation_statuses`, `time_slots`, `court_settings`, `reservations`, and `activity_logs` | Implemented |
| Reservation required fields | `database/schema.sql`; `views/reservations/new.ejs`; `src/features/reservations/reservationValidation.js` | Implemented and tested |
| Data integrity rules | `database/schema.sql` includes required columns, unique usernames, foreign keys, status/time checks, timestamps, and overlap triggers | Implemented; live trigger verification passed on disposable local Oracle MySQL and MariaDB |
| UTF-8 support for Sto. Niño text | `database/schema.sql` enforces and converts required tables to `utf8mb4` / `utf8mb4_unicode_ci`; `npm run verify:sql` checks this | Statically verified |
| Seed data | `database/seed.sql` seeds `admin`, statuses, hourly time slots, and court settings with `ON DUPLICATE KEY UPDATE`; duplicate starter-admin seed preserves local password/status so reruns do not reactivate a retired starter account | Implemented and statically verified |
| Password hashing | `users.password_hash`; `src/features/users/userRepository.js` uses `bcrypt.hash`; `src/features/users/authRoutes.js` uses `bcrypt.compare` | Implemented and tested |
| Login | `src/features/users/authRoutes.js`; `views/login.ejs`; `tests/authRoutes.test.js` | Implemented and tested |
| Admin/staff roles | `users.role` check constraint; `requireAdmin`; account routes/tests | Implemented and tested |
| Account creation workflow | `views/account/create.ejs`, `views/account/success.ejs`, `src/features/users/userValidation.js` | Implemented and tested |
| Duplicate username validation | `DuplicateUsernameError`; `tests/authRoutes.test.js`; `tests/userRepository.test.js` | Implemented and tested |
| Account deactivate/reactivate | `views/account/index.ejs`; `POST /account/:userId/status`; self-deactivation guard | Implemented and tested |
| Self-service password change | `views/account/password.ejs`; `POST /account/password`; `updateUserPassword`; validation tests confirm current-password and confirmation checks | Implemented and tested |
| Add reservation | `POST /reservations`; `views/reservations/new.ejs`; route tests | Implemented and tested |
| Edit reservation | `POST /reservations/:reservationId/edit`; `views/reservations/edit.ejs`; route tests | Implemented and tested |
| Cancel/missed/completed statuses | `POST /reservations/:reservationId/status`; list/detail buttons; activity logging | Implemented and tested |
| App-level overlap prevention | `src/features/reservations/reservationOverlap.js`; overlap query builder/tests | Implemented and tested |
| Database-level overlap prevention | `prevent_reservation_overlap_before_insert` and `prevent_reservation_overlap_before_update` in `database/schema.sql`; `scripts/verify-mysql.mjs` exercises the trigger | Implemented; live trigger verification passed on disposable local Oracle MySQL and MariaDB |
| Available/reserved slot display | `src/features/schedule/scheduleService.js`; `views/schedule/index.ejs`; `views/dashboard.ejs`; schedule tests | Implemented and tested |
| Today dashboard and future schedule | `src/features/schedule/dashboardRoutes.js`; `src/features/schedule/scheduleRoutes.js`; dashboard/schedule tests | Implemented and tested |
| Nearest available slot suggestion | `findNearestAvailableSlot` in `scheduleService.js`; `tests/scheduleService.test.js` | Implemented and tested |
| Search/filter reservations | Reservation list query, filters in `views/reservations/index.ejs`, repository tests | Implemented and tested |
| Reservation details view | `views/reservations/show.ejs`; detail route tests | Implemented and tested |
| Activity logs | `activity_logs`, `src/features/activityLogs/*`, `views/activityLogs/index.ejs`, activity-log tests | Implemented and tested |
| CSV export | `src/features/reservations/reservationExport.js`; `/reservations/export.csv`; export tests | Implemented and tested |
| Print controls | Print buttons in reservation/schedule views; print CSS in `public/css/styles.css` | Implemented; printer-specific output needs office-device check |
| Backup/restore commands | `scripts/backup-mysql.mjs`; `scripts/restore-mysql.mjs`; backup/restore tests; disposable Oracle MySQL and MariaDB client tools verified live backup/restore | Implemented and live-tested on disposable local Oracle MySQL and MariaDB |
| SQL diagnostics | `database/diagnostics.sql`; `npm run verify:sql` checks diagnostics coverage and read-only safety | Implemented and statically verified |
| SQL-only manual setup | `setup-database-only.bat`; `database/SQL_ONLY_SETUP.md`; `npm run verify:sql` checks that setup applies schema, seed, and diagnostics; the batch runner passes the password through local `MYSQL_PWD` instead of using `mysql -p` while SQL input is redirected | Implemented, statically verified, and fixed for Oracle MySQL 9 |
| One-click barangay setup | `setup-barangay-office.bat`; `scripts/setup-barangay-office.ps1`; `tests/oneClickSetup.test.js` | Implemented; requires local Node.js/MySQL already installed |
| Office readiness check | `check-office-readiness.bat`; `scripts/check-office-readiness.ps1`; `tests/oneClickSetup.test.js`; `docs/OFFLINE_INSTALL_CHECKLIST.md` | Implemented and tested |
| Office deployment sign-off report | `run-office-signoff.bat`; `scripts/run-office-signoff.ps1`; `reports\office-signoff` output; `tests/oneClickSetup.test.js`; `docs/DEPLOYMENT_GUIDE.md` | Implemented and tested; requires actual office MySQL/MariaDB for passing sign-off |
| Local-only report protection | `.gitignore`; `scripts/verify-offline-bundle.mjs`; `tests/offlineBundle.test.js` reject copied `reports` data | Implemented and tested |
| Windows first-run guide | `README-FIRST-WINDOWS.txt`; `docs/OFFLINE_INSTALL_CHECKLIST.md`; `tests/offlineBundle.test.js`; `npm run verify:bundle` | Implemented and tested |
| Windows troubleshooting guide | `TROUBLESHOOT-WINDOWS.txt`; `README-FIRST-WINDOWS.txt`; `docs/OFFLINE_INSTALL_CHECKLIST.md`; `tests/offlineBundle.test.js`; `npm run verify:bundle` | Implemented and tested |
| One-click local start | `start-barangay-office.bat`; `tests/oneClickSetup.test.js` | Implemented and tested |
| Start-script setup guard | `start-barangay-office.bat` checks Node.js, npm, `node_modules\`, and `.env`; `tests/oneClickSetup.test.js` | Implemented and tested |
| Start-script SQL readiness guard | `scripts/check-runtime-database.mjs`; `npm run check:database`; `start-barangay-office.bat`; `tests/runtimeDatabaseCheck.test.js`; `tests/oneClickSetup.test.js` | Implemented and tested; accepts any active Admin account and fails safely when local MySQL/MariaDB is not running |
| Pure offline bundle | `create-offline-bundle.bat`; `scripts/create-offline-bundle.ps1`; `npm run bundle:offline`; `tests/offlineBundle.test.js` | Implemented and tested |
| Offline bundle verification | `scripts/verify-offline-bundle.mjs`; `npm run verify:bundle`; `tests/offlineBundle.test.js` | Implemented and tested |
| Prepared offline folder exists | `dist\barangay-court-scheduler-offline` contains `node_modules`, SQL files including `setup.sql`, `setup-database-only.bat`, app source, views, CSS, and setup/start scripts | Verified locally |
| UI alignment with mockups | Red/gold/tan palette in `public/css/styles.css`, barangay logo asset, EJS views, UI smoke verifier | Implemented and smoke-tested |
| HTML prototype served as visible frontend | `public/prototype/sto-nino-court-reservation-system-prototype.html`; `src/features/prototype/prototypeRoutes.js`; `public/js/prototype-backend.js`; `/`, `/prototype`, and `/app` serve the prototype with the backend bridge | Implemented and tested |
| Prototype loads without CDN dependency | `src/features/prototype/prototypeRoutes.js` rewrites CDN script URLs to `public/vendor/html2canvas.min.js` and `public/vendor/jspdf.umd.min.js`; bundle verifier requires both files | Implemented and browser-verified |
| HTML prototype used as UI baseline | `docs/PROTOTYPE_ALIGNMENT.md`; `docs/REFERENCE_REVIEW.md`; copied prototype file preserved as the day-to-day frontend while local backend APIs provide login, reservation, and account persistence | Implemented and documented |
| User/deployment docs | `README.md`, `database/README.md`, `docs/USER_GUIDE.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/OFFLINE_INSTALL_CHECKLIST.md` | Implemented |
| ISO 25010 readiness | `docs/ISO_25010_EVALUATION.md` | Implemented |
| Handoff | `docs/CODEX_HANDOFF.md` | Implemented and updated |
| Automated test command avoids bundled duplicate tests | `scripts/run-tests.mjs`; `package.json` test script | Implemented and verified |
| Live local MySQL storage | `scripts/verify-mysql.mjs` applies schema/seed, writes/reads/completes a reservation, checks logs/triggers, then checks authenticated pages | Implemented and verified on disposable local Oracle MySQL and MariaDB; rerun on office MySQL/MariaDB before deployment |
| Live verifier after password change or starter-admin retirement | `VERIFY_LOGIN_USERNAME` / `VERIFY_LOGIN_PASSWORD` in `.env`; `buildMysqlVerificationConfig`; MySQL verifier tests cover configured login password and retired starter `admin` with another active Admin account | Implemented and tested |

## Fresh Verification Evidence

- Prototype frontend pivot on 2026-05-10: `npm test -- tests\prototypeRoutes.test.js tests\prototypeApiRoutes.test.js tests\uiSmokeVerifier.test.js tests\offlineBundle.test.js tests\oneClickSetup.test.js` passed with 21/21 focused tests after `/`, `/prototype`, `/app`, the injected backend bridge, prototype API login/reservation/account routes, offline bundle requirements, and the Windows start URL were updated.
- Prototype frontend pivot on 2026-05-10: `node --check src\features\prototype\prototypeRoutes.js`, `node --check src\features\prototype\prototypeApiRoutes.js`, `node --check scripts\verify-ui-smoke.mjs`, and `node --check public\js\prototype-backend.js` passed.
- Prototype offline browser verification on 2026-05-10: Chrome loaded `http://127.0.0.1:3188/prototype` against disposable local MySQL 9.7.0 on `127.0.0.1:3391`, logged in with `admin`, loaded only local scripts, created a reservation through `/api/prototype/reservations`, and displayed it in the prototype Schedule screen.
- Prototype CDN removal on 2026-05-10: network requests during browser verification were only `127.0.0.1` document/script/API requests after local vendor files were added.
- Final prototype/backend refresh on 2026-05-10: `npm test` passed 126/126 tests after the startup database guard and MySQL verifier were changed to validate the configured active Admin login while still supporting a retired starter `admin` account when another Admin is active.
- Final prototype/backend refresh on 2026-05-10: `npm test -- tests\mysqlVerifier.test.js tests\runtimeDatabaseCheck.test.js` passed 20/20 focused database-readiness and live-verifier tests.
- Final prototype/backend refresh on 2026-05-10: `npm run verify:sql`, `npm run verify:foundation`, `npm run verify:ui` for 15 office screens, `npm run bundle:offline`, `npm run verify:bundle`, and `git diff --check` passed.
- Final prototype/backend refresh on 2026-05-10: default `npm run verify:mysql` failed safely because no default service is listening on `127.0.0.1:3306`, then `npm run verify:mysql` passed when pointed at disposable local Oracle MySQL 9.7.0 on `127.0.0.1:3391`.
- Completion-audit rerun on 2026-05-10: `npm test` passed 126/126 tests, `npm run verify:foundation` passed, `npm run verify:sql` passed, `npm run verify:ui` passed for 15 screens, `npm run verify:bundle` passed, `npm run verify:prereqs` failed only for missing normal `mysql` and `mysqldump` tools on PATH, and default `npm run verify:mysql` failed only because no normal MySQL service is listening on `127.0.0.1:3306`.
- Completion-audit browser/backend check on 2026-05-10: after starting disposable Oracle MySQL 9.7.0 on `127.0.0.1:3391` and the app on `127.0.0.1:3188`, Chrome loaded the prototype, logged in through the visible UI with `admin`, created `Browser Audit Team` through `/api/prototype/reservations` with HTTP 201, rejected an overlapping reservation with HTTP 409, listed the stored reservation, and showed only local `127.0.0.1` document/script/API network requests.
- Earlier 2026-05-10 local refresh after Windows office sign-off helper: `npm test` passed 114/114 tests.
- Earlier 2026-05-10 local refresh after Windows office sign-off helper: `npm run verify:sql`, `npm run verify:foundation`, `npm run verify:ui`, `npm run bundle:offline`, `npm run verify:bundle`, `npm audit --omit=dev --json`, and `git diff --check` passed.
- Earlier 2026-05-10 local refresh after Windows runtime database guard: `npm run verify:prereqs`, `npm run check:database`, and `npm run verify:mysql` failed only for the same local MySQL/MariaDB environment gap.
- Added `check-office-readiness.bat` and `scripts/check-office-readiness.ps1` so the office computer can be checked before setup for Node.js, npm, MySQL tools, `node_modules/`, SQL files, and setup/start scripts.
- Readiness-check iteration: `npm test` passed 108/108 tests after adding the checker.
- Readiness-check iteration: `npm run verify:sql` and `npm run verify:ui` passed after adding the checker.
- Readiness-check iteration: `npm run verify:bundle` passed after rebuilding the offline bundle with `check-office-readiness.bat` and `scripts/check-office-readiness.ps1`.
- Readiness-check iteration: running `scripts\check-office-readiness.ps1` in this shell passed Node.js/npm/local-file checks and failed only for missing `mysql` and `mysqldump`, which is the intended office-prerequisite warning.
- Windows first-run guide iteration: `npm test -- tests\offlineBundle.test.js` passed after requiring `README-FIRST-WINDOWS.txt` in the offline bundle.
- Windows start-script guard iteration: `npm test -- tests\oneClickSetup.test.js` passed after adding Node.js, npm, `node_modules\`, and `.env` checks before browser launch.
- Windows start-script SQL guard iteration: `npm test -- tests\runtimeDatabaseCheck.test.js tests\oneClickSetup.test.js tests\offlineBundle.test.js` passed after adding the read-only local database startup check; `npm run check:database` failed safely in this shell because no default MySQL/MariaDB service is running.
- Windows office sign-off iteration: `npm test -- tests\oneClickSetup.test.js tests\offlineBundle.test.js` passed after adding `run-office-signoff.bat` and `scripts\run-office-signoff.ps1`.
- Windows office sign-off iteration: PowerShell parser check passed for `scripts\run-office-signoff.ps1`.
- Windows troubleshooting guide iteration: `npm test -- tests\offlineBundle.test.js`, `npm run verify:foundation`, `npm run bundle:offline`, `npm run verify:bundle`, and `npm test` passed after adding `TROUBLESHOOT-WINDOWS.txt`.
- `npm test -- tests/oneClickSetup.test.js tests/offlineBundle.test.js` passed with 9 focused offline setup/bundle tests after adding `setup-database-only.bat`.
- `npm test` passed with 106 tests after adding the self-service password-change flow, updated UI smoke coverage, and configurable live-verification login credentials.
- `npm test -- tests/userValidation.test.js tests/userRepository.test.js tests/authRoutes.test.js` passed with 20 focused account/password tests after adding self-service password changes.
- `npm test -- tests/mysqlVerifier.test.js` passed with 12 MySQL verifier tests after adding configurable verification login credentials.
- `npm run verify:foundation` passed.
- `npm run verify:sql` passed and confirmed required tables, charset/collation, existing-table conversion, foreign keys, time checks, overlap triggers, trigger rerun safety, seed idempotency, reference statuses, default slots, password-hash safety, diagnostics coverage, diagnostics read-only safety, and SQL-only setup runner coverage.
- `npm run verify:ui` passed for 11 office screens with sample data, including Change Password.
- `npm run bundle:offline` passed and refreshed `dist\barangay-court-scheduler-offline`.
- `npm run verify:bundle` passed and confirmed the offline folder contains required runtime files, `setup-database-only.bat`, `views\account\password.ejs`, and excludes `.env`/backup data.
- The refreshed offline bundle contains `setup-database-only.bat`, `views\account\password.ejs`, `database\setup.sql`, `database\SQL_ONLY_SETUP.md`, `database\schema.sql`, `database\seed.sql`, and `database\diagnostics.sql`.
- `npm test -- tests/sqlStaticVerifier.test.js tests/oneClickSetup.test.js tests/offlineBundle.test.js` passed with 11 focused SQL/setup/bundle tests after hardening the SQL-only password flow.
- `npm run bundle:offline` passed and refreshed `dist\barangay-court-scheduler-offline` with the hardened SQL-only runner.
- `npm run verify:bundle` passed after the SQL-only password-flow fix and confirmed the refreshed offline folder still contains required runtime, SQL, documentation, setup, and verification files.
- `npm test` passed with 106 tests after the SQL-only password-flow fix.
- `npm audit --omit=dev --json` passed with zero production vulnerabilities.
- `git diff --check` passed; only Windows line-ending warnings were printed.
- `npm run verify:prereqs` failed only because `mysql` and `mysqldump` are unavailable here.
- `npm run verify:mysql` failed with `connect ECONNREFUSED 127.0.0.1:3306`, confirming no local MySQL server is reachable in this environment.
- `npm test -- tests/oneClickSetup.test.js` passed with 4 tests after hardening the one-click setup `.env` encoding/decoding.
- `npm test -- tests/dashboardRoutes.test.js tests/scheduleRoutes.test.js tests/uiSmokeVerifier.test.js tests/mysqlVerifier.test.js` passed with 17 focused tests after prototype dashboard title/status-cell updates.
- `npm test -- tests\uiSmokeVerifier.test.js tests\dashboardRoutes.test.js tests\scheduleRoutes.test.js` passed with 5 focused tests after the mobile schedule-toolbar overflow fix.
- `npm test` passed with 106 tests after the prototype/offline setup updates.
- `npm run verify:foundation`, `npm run verify:sql`, and `npm run verify:ui` passed after the prototype/offline setup updates.
- `npm audit --omit=dev --json` passed with zero production vulnerabilities after the prototype/offline setup updates.
- `git diff --check` passed after the prototype/offline setup updates; only Windows line-ending warnings were printed.
- Browser smoke verification through a temporary local server confirmed `/dashboard` and `/schedule` render the prototype-aligned shell without live MySQL.
- Narrow-viewport browser verification confirmed the schedule toolbar no longer creates document-level horizontal overflow; the dashboard weekly table remains inside its intended scroll wrapper.
- Official MariaDB 12.2.2 Windows ZIP was downloaded into ignored `tmp\mariadb-portable\`; SHA256 matched `b34bb91f0dd4bd184f420288a12aace2b5fcb20734f2b880075c36150d4641c6`.
- `mariadb-install-db.exe --datadir=tmp\mariadb-portable\data --port=3390 --password=verifyroot` initialized a disposable local data directory.
- `npm run verify:mysql` passed against disposable local MariaDB on `127.0.0.1:3390` for `barangay_court_scheduler_verify`: schema and seed applied, reservation storage/read/status update/activity log round trip passed, overlap trigger verification passed, and authenticated HTTP smoke passed for 4 office pages.
- `npm run verify:prereqs` passed when the disposable MariaDB `bin` directory was prepended to `PATH` and local env overrides pointed at port `3390`.
- `npm run backup:mysql` passed against the disposable database and created a local SQL backup under `tmp\mariadb-portable\backups\`.
- `npm run restore:mysql -- tmp\mariadb-portable\backups\barangay_court_scheduler_verify_2026-05-10_1724.sql` passed against the disposable database.
- `database\setup.sql` passed against disposable local MariaDB on port `3390`; `database\diagnostics.sql` reported PASS for charset/collation, required tables, InnoDB/utf8mb4 tables, foreign keys, overlap triggers, seeded statuses, active slots, hashed starter admin password, and court settings.
- `npm run verify:mysql` passed again against the default `barangay_court_scheduler` database after SQL-only setup.
- Official MySQL 9.7.0 Windows ZIP was downloaded into ignored `tmp\mysql-portable\`; MD5 matched `7ca0b76d01e2e86baf7e77df94e1a983`.
- Disposable Oracle MySQL 9.7.0 initialized under `tmp\mysql-portable\data` and started on `127.0.0.1:3391`.
- `npm run verify:mysql` passed against disposable Oracle MySQL 9.7.0 for `barangay_court_scheduler_mysql_verify`: schema and seed applied, reservation storage/read/status update/activity log round trip passed, overlap trigger verification passed, and authenticated HTTP smoke passed for 4 office pages.
- `npm run verify:prereqs` passed when the disposable Oracle MySQL `bin` directory was prepended to `PATH`.
- `npm run backup:mysql` passed against disposable Oracle MySQL and created a local SQL backup under `tmp\mysql-portable\backups\`.
- Direct `database\setup.sql` redirection failed on Oracle MySQL 9.7 because `SOURCE` was not executed from redirected stdin. `setup-database-only.bat`, SQL-only docs, tests, and `npm run verify:sql` were updated so the supported Windows path applies `schema.sql`, `seed.sql`, and `diagnostics.sql` as separate MySQL commands.
- `npm test -- tests\oneClickSetup.test.js tests\sqlStaticVerifier.test.js` passed with 6 focused SQL-only setup tests after the Oracle MySQL compatibility fix.
- `npm run verify:sql` passed after the Oracle MySQL compatibility fix.
- The fixed three-command SQL-only setup sequence passed against disposable Oracle MySQL 9.7.0, and diagnostics reported PASS for charset/collation, required tables, InnoDB/utf8mb4 tables, foreign keys, overlap triggers, seeded statuses, active slots, hashed starter admin password, and court settings.
- `npm run verify:mysql` passed again against the default `barangay_court_scheduler` database on disposable Oracle MySQL 9.7.0 after the fixed SQL-only setup sequence.
- First Oracle MySQL restore from a dump failed with `@@GLOBAL.GTID_PURGED cannot be changed`; `scripts\backup-mysql.mjs` now adds `--set-gtid-purged=OFF` and retries without it for clients that do not support the option.
- `npm test -- tests\mysqlBackup.test.js tests\mysqlRestore.test.js` passed with 12 focused backup/restore tests after the GTID restore fix.
- `npm run backup:mysql` and `npm run restore:mysql` both passed against disposable Oracle MySQL after the GTID fix.
- `npm run backup:mysql` also passed against disposable MariaDB after the fallback fix, confirming the backup helper still works when `mysqldump` does not support `--set-gtid-purged=OFF`.

## Missing or Weakly Verified Items

1. Live SQL execution has been verified on disposable local Oracle MySQL 9.7.0 and MariaDB 12.2.2, but not yet on the actual barangay office database installation.
2. Print output needs a final check on the barangay office browser/printer.
3. One-click setup is one-click after prerequisites are prepared; a bare Windows computer still needs offline Node.js/MySQL installers and the prepared bundle with `node_modules\`.
4. This workspace cannot complete the final office sign-off because the default local MySQL/MariaDB service is not running and the normal `mysql` / `mysqldump` client tools are not on PATH.

## Required Next Step

On a computer with local MySQL installed and running, use the prepared offline bundle:

```powershell
cd path\to\barangay-court-scheduler-offline
setup-barangay-office.bat
run-office-signoff.bat
```

Then complete the manual checklist written into the sign-off report: live-test login with `admin` / `admin123` on first setup or the configured active Admin account after starter-admin retirement, change the starter password, account creation/deactivation, add reservation, overlap rejection, edit reservation, mark missed/completed/cancelled, activity logs, CSV export, and print controls.
