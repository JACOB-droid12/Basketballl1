# Post-Deployment Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend/database/API foundation for post-deployment reservation references, slips, daily print data, alerts, backup status, Clear for Public Use, maintenance blocks, reports, exports, resident history/directory, policy settings, and safe recurring reservations.

**Architecture:** Keep the existing Express/MySQL repository pattern. Add persisted schedule-block records for both maintenance/unavailable ranges and Clear for Public Use, and make reservation creation/update check those blocks in the same server-side path as reservation overlap checks. Keep UI changes out of scope except prototype API bridging where backend verification needs a route.

**Tech Stack:** Node.js ESM, Express, mysql2 named placeholders, MariaDB/MySQL SQL scripts, node:test, local CSV export utilities, offline Windows package scripts.

---

### Task 1: P0 Reservation References, Slip Data, Daily Print, Backup Status, Alerts

**Files:**
- Modify: `database/schema.sql`
- Modify: `database/seed.sql`
- Modify: `database/diagnostics.sql`
- Modify: `scripts/verify-sql-static.mjs`
- Modify: `src/features/reservations/reservationRepository.js`
- Modify: `src/features/api/apiRoutes.js`
- Modify: `src/features/api/apiMappers.js`
- Modify: `src/features/schedule/scheduleService.js`
- Create: `src/features/maintenance/maintenanceRepository.js`
- Create: `src/features/schedule/scheduleBlockRepository.js`
- Test: `tests/apiRoutes.test.js`
- Test: `tests/reservationRepository.test.js`
- Test: `tests/scheduleService.test.js`

- [ ] **Step 1: Write failing P0 API and repository tests**

Add tests that expect:
- `referenceNo` in `/api/reservations`
- `GET /api/reservations/:id/slip`
- `GET /api/schedule/daily-print?date=YYYY-MM-DD`
- `GET /api/dashboard/alerts`
- `GET /api/maintenance/backup-status`
- `reserveNextReservationReference(connection, date)` to lock and advance a yearly sequence

Run: `npm test -- tests/apiRoutes.test.js tests/reservationRepository.test.js`

Expected: FAIL for missing fields/routes/functions.

- [ ] **Step 2: Implement reservation reference support**

Add `reservations.reference_no`, `reservation_reference_sequences`, backfill, repository mapping, and sequence generation in the same transaction as reservation creation.

Rules:
- format `BCS-YYYY-000001`
- use `SELECT ... FOR UPDATE` on `reservation_reference_sequences`
- use the greater of stored `next_sequence` and current max existing reference plus one
- include reference in activity log details

- [ ] **Step 3: Implement P0 read APIs**

Add:
- `GET /api/reservations/:id/slip`
- `GET /api/schedule/daily-print`
- `GET /api/dashboard/alerts`
- `GET /api/maintenance/backup-status`

The daily-print endpoint uses actual reservations and persisted schedule blocks. The slip endpoint reads the reservation and settings from the database.

- [ ] **Step 4: Run P0 focused tests**

Run: `npm test -- tests/apiRoutes.test.js tests/reservationRepository.test.js tests/scheduleService.test.js`

Expected: PASS.

### Task 2: P1 Persisted Maintenance Blocks and Clear for Public Use

**Files:**
- Modify: `database/schema.sql`
- Modify: `database/diagnostics.sql`
- Modify: `scripts/verify-sql-static.mjs`
- Modify: `src/features/schedule/scheduleBlockRepository.js`
- Modify: `src/features/reservations/reservationRepository.js`
- Modify: `src/features/reservations/reservationOverlap.js`
- Modify: `src/features/reservations/reservationValidation.js`
- Modify: `src/features/api/apiRoutes.js`
- Modify: `src/features/prototype/prototypeApiRoutes.js`
- Modify: `public/js/prototype-backend.js` only if needed to wire old prototype clear actions to the backend
- Test: `tests/apiRoutes.test.js`
- Test: `tests/reservationRepository.test.js`
- Test: `tests/reservationOverlap.test.js`
- Test: `tests/prototypeApiRoutes.test.js`

- [ ] **Step 1: Write failing tests for block creation and clear ranges**

Add tests for:
- admin-only `POST /api/schedule/blocks`
- `DELETE /api/schedule/blocks/:id`
- admin-only `POST /api/schedule/clear-public-use`
- clear modes `WHOLE_DAY`, `TIME_RANGE`, `FROM_TIME_ONWARD`
- clearing cancels only overlapping `RESERVED` reservations
- clear records persist in `schedule_blocks`
- maintenance and clear ranges block future reservation creation/update
- schedule endpoints display `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE`

Run: `npm test -- tests/apiRoutes.test.js tests/reservationRepository.test.js tests/reservationOverlap.test.js`

Expected: FAIL for missing behavior.

- [ ] **Step 2: Implement schedule block repository**

Add repository functions:
- `createScheduleBlock(db, payload, { userId })`
- `deactivateScheduleBlock(db, blockId, { userId })`
- `listScheduleBlocks(db, filters)`
- `findScheduleBlockOverlap(connection, candidate)`
- `clearPublicUseRange(db, payload, { userId })`

Use a transaction and date-level advisory lock for mutations.

- [ ] **Step 3: Enforce server-side block conflicts**

Update reservation create/update to reject active schedule blocks overlapping the candidate. Keep existing reservation overlap protection intact.

Error response shape for block conflicts:
```json
{
  "error": "Reservation overlaps an unavailable court range.",
  "overlap": { "statusCode": "CLEARED_PUBLIC_USE", "startTime": "07:00", "endTime": "21:00" }
}
```

- [ ] **Step 4: Implement Clear for Public Use**

For selected range:
- compute concrete start/end based on mode
- create persistent `PUBLIC_USE` block
- update overlapping `RESERVED` reservations to `CANCELLED`
- do not delete residents or reservations
- log block creation and each cancelled reservation or a clear summary
- leave non-overlapping reservations alone

- [ ] **Step 5: Wire prototype bridge only to backend clear endpoint**

Bridge old `promptClearDay` / `clearDay` behavior by replacing frontend-only `clearedDays[...] = true` with a call to the backend clear endpoint, then refresh from database. Do not redesign the prototype.

- [ ] **Step 6: Run P1 focused tests**

Run: `npm test -- tests/apiRoutes.test.js tests/reservationRepository.test.js tests/reservationOverlap.test.js tests/prototypeApiRoutes.test.js tests/scheduleService.test.js`

Expected: PASS.

### Task 3: P1 Reports and Exports

**Files:**
- Modify: `src/features/api/apiReports.js`
- Modify: `src/features/reservations/reservationExport.js`
- Modify: `src/features/api/apiRoutes.js`
- Test: `tests/apiRoutes.test.js`
- Test: `tests/reservationExport.test.js`

- [ ] **Step 1: Write failing report/export tests**

Add tests for:
- most used days
- most used time slots
- monthly reservation count
- missed/cancelled reservations
- reservations by purpose
- reservations encoded by staff
- public-use ranges
- maintenance blocks
- CSV export for daily schedule, monthly reservations, activity logs, missed, cancelled, and reports summary

Run: `npm test -- tests/apiRoutes.test.js tests/reservationExport.test.js`

Expected: FAIL for missing report fields/routes.

- [ ] **Step 2: Implement report calculations and CSV exports**

Keep CSV as required offline export. Add PDF/Excel only if already safe through local dependencies; otherwise document CSV as implemented and PDF/Excel as deferred to frontend or a later backend package.

- [ ] **Step 3: Run report/export tests**

Run: `npm test -- tests/apiRoutes.test.js tests/reservationExport.test.js`

Expected: PASS.

### Task 4: P1 Resident History and Calendar Status Data

**Files:**
- Modify: `src/features/reservations/reservationRepository.js`
- Modify: `src/features/api/apiRoutes.js`
- Modify: `src/features/api/apiMappers.js`
- Test: `tests/apiRoutes.test.js`
- Test: `tests/reservationRepository.test.js`

- [ ] **Step 1: Write failing history/status tests**

Add tests for:
- `GET /api/reservations/history?name=...&contactNumber=...`
- active/upcoming/past split
- missed/cancelled/completed/active counts
- last reservation date
- schedule/calendar payload includes backend-owned status values and labels

- [ ] **Step 2: Implement repository/API**

Use existing reservation rows only. Return limited reservation-related data, not a broad citizen profile.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- tests/apiRoutes.test.js tests/reservationRepository.test.js`

Expected: PASS.

### Task 5: P2 Policy Settings and Resident Directory

**Files:**
- Modify: `database/schema.sql`
- Modify: `database/seed.sql`
- Create: `src/features/settings/policyRepository.js`
- Create: `src/features/settings/policyValidation.js`
- Create: `src/features/residents/residentDirectoryRepository.js`
- Create: `src/features/residents/residentDirectoryValidation.js`
- Modify: `src/features/api/apiRoutes.js`
- Test: `tests/apiRoutes.test.js`
- Test: `tests/reservationValidation.test.js`

- [ ] **Step 1: Write failing policy and directory tests**

Add tests for:
- staff-readable policy endpoint
- admin-only policy update endpoint
- invalid opening/closing/duration/days rejected
- reservation create/update enforces policy server-side
- resident directory create/update/search with duplicate-safe contact handling

- [ ] **Step 2: Implement policy settings**

Use `court_settings` keys rather than a separate settings table. Enforce policy without mutating existing reservations.

- [ ] **Step 3: Implement resident directory**

Extend current `residents` table with `group_name` and `notes` if necessary. Keep it lightweight and reservation-oriented.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/apiRoutes.test.js tests/reservationValidation.test.js tests/reservationRepository.test.js`

Expected: PASS.

### Task 6: P2 Recurring Reservations

**Files:**
- Modify: `database/schema.sql`
- Create: `src/features/recurring/recurringReservationRepository.js`
- Create: `src/features/recurring/recurringReservationValidation.js`
- Modify: `src/features/api/apiRoutes.js`
- Test: `tests/apiRoutes.test.js`

- [ ] **Step 1: Decide feasibility from current conflict code**

Recurring support is feasible only if it can reuse the same single-reservation create path and preflight all occurrences before writing.

- [ ] **Step 2: If feasible, implement weekly series**

Support:
- weekly recurrence
- start date/end date or occurrence count
- conflict preview before insert
- cancel one occurrence by normal reservation status update
- cancel whole series by status update across generated occurrences

- [ ] **Step 3: If not feasible, defer explicitly**

Document the reason in both handoff docs and final report.

### Task 7: SQL, Backup/Restore, Offline Package, Docs

**Files:**
- Modify: `docs/POST_DEPLOYMENT_API_CONTRACT.md`
- Modify: `docs/OPUS_FRONTEND_HANDOFF.md`
- Modify: `database/README.md` if schema/setup notes need updating
- Modify: `scripts/verify-deployment-stress.mjs` if stress coverage needs new clear/block checks

- [ ] **Step 1: Update API contract**

Document endpoints, roles, payloads, errors, date/time formats, status values, exports, slips, clear public-use, maintenance blocks, policy settings, dashboard alerts, resident history/directory, and recurrence status.

- [ ] **Step 2: Update Opus handoff**

Tell Opus exactly which endpoints to use, likely frontend files/components, and what not to change.

- [ ] **Step 3: Run full verification**

Run:
```powershell
npm test
npm run verify:sql
npm run verify:stress
npm run verify:mysql
npm run backup:mysql
npm run restore:mysql -- <created-backup-file>
npm run bundle:offline
npm run verify:runtime-package
npm run verify:offline-runtime
npm run verify:bundle:strict
```

If backup/restore needs bundled PATH in plain PowerShell, set:
```powershell
$env:PATH = "$PWD\runtime\mariadb\bin;$PWD\runtime\node;$env:PATH"
```

Expected: all feasible verification commands pass. Any environment-only blocker must be reported with exact error text.
