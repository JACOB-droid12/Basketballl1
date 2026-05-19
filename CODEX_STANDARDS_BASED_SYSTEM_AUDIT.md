# Codex Standards-Based Backend/System Audit

Date: 2026-05-18
System: Barangay Sto. Nino Basketball Court Scheduling System
Scope: backend, API, database, validation, security, backup/restore, offline deployment, scripts, tests, and deployment-readiness documentation.

This is a practical standards-based audit. It is not an ISO, NIST, OWASP, or software-testing certification.

## Executive Summary

Final judgment: READY WITH RISKS

Updated deployment readiness score recommendation: 96 / 100

Core backend/deployment behavior passed after fixes. Reservation overlap protection, Clear for Public Use, maintenance blocking, role separation, server-side validation, live MySQL verification, backup/restore, stress/concurrency, and offline package checks passed. The remaining risks are operational and frontend-owned: actual barangay office PC/printer sign-off, backup custody discipline, staff training, and Opus-owned UI/visual polish.

Codex found 5 backend/system issues and fixed 5. No critical backend, API, database, backup/restore, authorization, or offline-package issue remains open.

## Standards Applied

| Standard/framework | Generic description | Why it matters | Project application | Practical status |
|---|---|---|---|---|
| ISO/IEC 25010-style product quality | Quality model covering functional suitability, performance, compatibility, usability support, reliability, security, maintainability, and portability. | A deployment-ready office system must be correct, reliable, secure, maintainable, and portable, not just visually complete. | Checked reservation workflows, reports, logging, backup/restore, Windows launcher, scripts, tests, and offline package. | PASS with operational risks |
| OWASP API Security Top 10-style audit | Common API risk lens for auth, authorization, object/property access, resource abuse, sensitive flows, misconfiguration, and API inventory. | Staff/admin APIs can be called directly even when buttons are hidden. | Checked session APIs, staff/admin separation, account/settings/schedule APIs, prototype bridge, reports, exports, residents, and logs. | PASS |
| OWASP REST/input validation guidance | Server-side validation of type, length, format, range, enums, content, and workflow state. | Bad API input must not corrupt records, leak DB errors, or rely on frontend checks. | Tightened reservation filters, report/log date ranges, maintenance/public-use reason length, and maintenance conflict handling. | PASS after fixes |
| Database integrity and transaction discipline | Constraints, transactions, locks, foreign keys, indexes, and sequence handling preserve consistency. | The system's central promise is no double booking and preserved reservation history. | Checked triggers, app overlap checks, date locks, reference sequence, FK links, Clear/Public Use transactions, block transactions, and restore behavior. | PASS after fixes |
| NIST SP 800-34-style contingency/recovery | Practical backup, restore, and recovery planning for disruption handling. | The local database is the critical asset on an offline office PC. | Verified backup creation, restore from SQL, post-restore DB check, bundled tools, and staff/IT launcher flow. | PASS with custody/training risk |
| ISO/IEC/IEEE 29119-style testing discipline | Structured test design, execution, evidence, and traceability. | Defense-ready claims need commands, expected results, actual results, and regression evidence. | Ran unit, SQL, live DB, stress, UI smoke, backup/restore, and package verification. Added regression tests for every fixed backend issue. | PASS |
| Offline deployment/portability discipline | Target environment readiness for files, runtime, scripts, config, local DB, and startup flow. | Staff should be able to start the app offline through `START-HERE.bat`. | Checked bundled Node/MariaDB, paths with spaces, launcher scripts, package contents, local assets, and offline runtime smoke. | PASS |
| Logging/auditability/accountability | Important actions should be traceable with actor, action, target, timestamp, and safe details. | Barangay reservation/account/clear/block actions need accountability. | Checked login/logout, reservation changes, clear/public-use, maintenance, settings, account, backup, and restore logging behavior. | PASS |
| Data privacy/minimum necessary | Collect, expose, export, and log only needed data. | Offline systems still store resident names, contacts, addresses, history, and backups. | Checked CSV exports, account data, activity logs, backup sensitivity notes, and error handling. | PASS with backup custody risk |
| Defense/readiness documentation | Docs must match actual startup, daily use, backup/restore, limitations, and handoff boundaries. | Staff, panelists, and maintainers need accurate recovery and limitation guidance. | Updated API contract and readiness/QA reports; recurrence remains deferred and export support remains CSV-only. | PASS |

## Findings And Fixes

| ID | Severity | Category | Finding | Fix status |
|---|---:|---|---|---|
| CS-001 | Medium | OWASP REST/input validation | `GET /api/reservations` accepted invalid date/status filters and queried storage instead of returning 400. | Fixed |
| CS-002 | Medium | OWASP REST/input validation, reports | Reports/activity-log filters accepted reversed date ranges. | Fixed |
| CS-003 | Medium | Input validation, DB integrity | Maintenance/Clear for Public Use `reason` could exceed the `schedule_blocks.reason` column and surface as storage failure. | Fixed |
| CS-004 | High | Database integrity, schedule correctness | Maintenance blocks could be created over active `RESERVED` reservations, preserving data but risking hidden occupied slots. | Fixed |
| CS-005 | Low | Documentation/API inventory | API contract omitted `DELETE /api/residents/:residentId` and newly enforced validation semantics. | Fixed |
| OPUS-001 | Medium | Frontend handoff | Reservations CSV export filter-state preservation is frontend-owned if the active React page does not pass filters to the export URL. Backend CSV/export endpoints remain server-side and CSV-only. | Deferred to Opus |

Backend/system issue count: 5 found, 5 fixed, 0 deferred.
Frontend/Opus handoff count: 1 deferred.

Severity counts for backend/system issues: Critical 0, High 1, Medium 3, Low 1, Trivial 0.

## Backend/API Assessment

The Express API requires signed-in sessions for `/api/*` except public session/login/logout and the existing prototype bridge. Admin-only operations are guarded server-side, including account management, court policy updates, maintenance blocks, and Clear for Public Use. Direct staff API calls to admin-only routes return 403.

API validation is now stronger for query filters, date ranges, block reasons, IDs, reservation fields, resident fields, account fields, court policy settings, and status values. Errors return 4xx JSON instead of storage-level failure where practical.

## Database Integrity Assessment

The database uses InnoDB tables, foreign keys, unique reservation references, reservation overlap triggers, idempotent schema/seed behavior, and a persisted reference sequence. Reservation creation/update use transactions and date-scoped advisory locks. Clear for Public Use transactionally cancels only overlapping active `RESERVED` records and preserves cancelled/missed/completed history. Maintenance blocks now reject active-reservation overlap instead of obscuring bookings.

## Reservation Integrity Assessment

Result: PASS.

Evidence: unit tests, `verify:mysql`, and `verify:stress`. Stress verification produced 25 concurrent duplicate attempts with 1 success and 24 conflicts, allowed adjacent bookings, blocked 1-minute overlaps, blocked edit overlaps, and found 0 overlapping blocking reservations.

## Security/Authorization Assessment

Result: PASS for offline/local scope.

Admin/staff separation is enforced server-side. Password hashes are not returned by account list queries or CSV exports. Startup rejects missing/placeholder/short `APP_SESSION_SECRET` values. Sessions use httpOnly cookies and SameSite lax. If this system is ever exposed beyond the local office machine/LAN assumptions, CSRF/rate-limit hardening should be re-evaluated.

## Backup/Restore And Recovery Assessment

Result: PASS with operational risk.

`backup:mysql` created `C:\Users\Emmy Lou\Documents\New project\backups\barangay_court_scheduler_2026-05-18_171224.sql`, `restore:mysql` restored from it, and `check:database` passed afterward. The office launcher restore path requires typing `RESTORE`, which protects staff from accidental restore in normal use. Backup files remain sensitive and must be stored on barangay-controlled media.

## Offline Deployment Assessment

Result: PASS.

The offline package was rebuilt after backend fixes and report updates. `bundle:offline`, `verify:bundle`, `verify:bundle:strict`, `verify:runtime-package`, and `verify:offline-runtime` all passed. The generated folder is `dist\barangay-court-scheduler-offline`.

## Test Evidence

| Command | Result | Evidence |
|---|---:|---|
| `npm test` baseline | PASS | 411/411 tests, 11.5s |
| Focused validation regressions before fix | FAIL as expected | 5 failing tests proved CS-001/CS-002/CS-003 |
| Focused validation regressions after fix | PASS | 5/5 tests |
| Focused maintenance-over-reservation regressions before fix | FAIL as expected | missing conflict export/behavior proved CS-004 |
| Focused maintenance-over-reservation regressions after fix | PASS | 3/3 tests |
| `npm test` final | PASS | 418/418 tests, 11.8s |
| `npm run verify:sql` | PASS | schema/seed/triggers/charset/static checks |
| `npm run verify:foundation` | PASS | foundation verifier clean |
| `npm run check:database` | PASS | live runtime DB check passed before and after restore |
| `npm run verify:prereqs` | PASS | Node, npm, bundled MariaDB client/dump, env settings present |
| `npm run verify:react-build` | PASS | local React build present, no remote assets |
| `npm run verify:ui` | PASS | 22 office screens |
| `npm run verify:mysql` | PASS | schema/seed applied; live app HTTP smoke passed |
| `npm run verify:stress` | PASS | 25 concurrent attempts, 1680 seeded reservations, backup/restore/reconnect passed |
| `npm run backup:mysql` | PASS | created `backups\barangay_court_scheduler_2026-05-18_171224.sql` |
| `npm run restore:mysql -- <backup>` | PASS | restored from current backup |
| `npm run bundle:offline` | PASS | rebuilt `dist\barangay-court-scheduler-offline`, 14.8s |
| `npm run verify:bundle` | PASS | required bundle contents present, 1.0s |
| `npm run verify:bundle:strict` | PASS | strict one-stop runtime files present, 1.0s |
| `npm run verify:runtime-package` | PASS | true one-stop offline package, 1.0s |
| `npm run verify:offline-runtime` | PASS | offline runtime smoke passed at localhost, 2.1s |

## Remaining Risks

- Actual barangay office PC, printer, desktop shortcut, Windows account permissions, and staff workflow sign-off still need on-site confirmation.
- Backup files contain sensitive local data and need barangay-controlled custody.
- Opus owns remaining frontend visual polish and the CSV filter-state handoff if the React page does not preserve active filters.
- This is not a public internet portal. If deployed beyond local/offline office use, additional web-exposure controls must be reviewed.

## Final Recommendation

Proceed as READY WITH RISKS for backend/system deployment preparation. Do not represent this as formal standards certification. Before real office use, complete office-PC sign-off, printer check, staff backup training, and Opus UI handoff closure.
