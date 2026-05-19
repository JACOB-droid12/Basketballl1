# Codex Backend Standards Fix Log

Date: 2026-05-18

## Summary

Backend/system issues found: 5
Backend/system issues fixed: 5
Backend/system issues deferred: 0

Severity counts: Critical 0, High 1, Medium 3, Low 1, Trivial 0.

## Fixes

| Issue ID | Severity | Standard/category | Root cause | Files changed | Fix summary | Tests added/updated | Verification result | Regression risk |
|---|---:|---|---|---|---|---|---|---|
| CS-001 | Medium | OWASP REST/input validation | Reservation list filter helper normalized date/status but did not validate them before storage. | `src/features/api/apiRoutes.js`, `tests/apiRoutes.test.js` | `GET /api/reservations` now validates real date filters and allowed status filters before querying. | Added invalid date/status API regression. | Focused regression PASS; `npm test` PASS 418/418. | Low |
| CS-002 | Medium | OWASP REST/input validation, reports | Report and activity-log range filters validated format but not `from <= to`. | `src/features/api/apiRoutes.js`, `tests/apiRoutes.test.js` | Added shared range-order validation for report/activity filters. | Added reversed-range API regressions for reports and activity logs. | Focused regression PASS; `npm test` PASS 418/418. | Low |
| CS-003 | Medium | Input validation, DB integrity | Maintenance/Public Use reason length could exceed database column length and fall through to storage error. | `src/features/api/apiRoutes.js`, `tests/apiRoutes.test.js` | Added 255-character API limit matching `schedule_blocks.reason`. | Added overlong reason regressions for maintenance blocks and Clear for Public Use. | Focused regression PASS; `npm test` PASS 418/418. | Low |
| CS-004 | High | Database integrity, schedule correctness | Maintenance block creation checked active blocks but not active reservations, risking occupied slots being obscured. | `src/features/schedule/scheduleBlockRepository.js`, `src/features/api/apiRoutes.js`, `tests/scheduleBlockRepository.test.js`, `tests/apiRoutes.test.js`, `docs/POST_DEPLOYMENT_API_CONTRACT.md` | Added `ScheduleBlockReservationConflictError`; maintenance block creation now rejects overlap with active `RESERVED` reservations and returns 409 with reservation details. | Added repository and API conflict regressions. | Focused regression PASS; `npm test` PASS 418/418; `verify:stress` PASS. | Medium-low because workflow now requires cancelling/clearing active reservations before adding maintenance |
| CS-005 | Low | API inventory/documentation | API contract did not list resident delete or newly enforced validation behavior. | `docs/POST_DEPLOYMENT_API_CONTRACT.md` | Documented `DELETE /api/residents/:residentId`, filter validation, reason length, reversed report range behavior, and maintenance/reservation conflict behavior. | Covered indirectly by documentation/API tests in full suite. | `npm test` PASS 418/418. | Low |

## Commands Run

| Command | Result | Notes |
|---|---:|---|
| `npm test` baseline | PASS | 411/411 before new regressions |
| Focused validation regressions before fix | FAIL as expected | Proved CS-001/CS-002/CS-003 |
| Focused validation regressions after fix | PASS | 5/5 |
| Focused maintenance-over-reservation regressions before fix | FAIL as expected | Proved CS-004 |
| Focused maintenance-over-reservation regressions after fix | PASS | 3/3 |
| `npm test` final | PASS | 418/418 |
| `npm run verify:sql` | PASS | Static schema/seed/trigger checks |
| `npm run verify:foundation` | PASS | Foundation verifier clean |
| `npm run verify:react-build` | PASS | Local assets only |
| `npm run verify:ui` | PASS | 22 office screens |
| `npm run verify:mysql` | PASS | Live schema/seed/app smoke |
| `npm run verify:stress` | PASS | Concurrency, hostile strings, large data, backup/restore, reconnect |
| `npm run backup:mysql` | PASS | Created `backups\barangay_court_scheduler_2026-05-18_171224.sql` |
| `npm run restore:mysql -- <backup>` | PASS | Restored current backup |
| `npm run check:database` | PASS | Passed after restore |
| `npm run bundle:offline` | PASS | Rebuilt `dist\barangay-court-scheduler-offline` after backend/report updates |
| `npm run verify:bundle` | PASS | Bundle contents passed |
| `npm run verify:bundle:strict` | PASS | Strict one-stop package passed |
| `npm run verify:runtime-package` | PASS | Runtime package classified as true one-stop offline package |
| `npm run verify:offline-runtime` | PASS | Offline runtime smoke passed |
