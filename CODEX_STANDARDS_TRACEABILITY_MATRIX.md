# Codex Standards Traceability Matrix

Date: 2026-05-18

| Standard/framework | Requirement/principle | Backend/system area checked | Pass/Partial/Fail/NA | Issue IDs | Evidence/command | Fix status |
|---|---|---|---|---|---|---|
| ISO/IEC 25010-style | Functional suitability | Reservation create/edit/cancel/status, Clear for Public Use, maintenance blocks, residents, reports, settings | Pass | CS-004 | `npm test`, `verify:mysql`, `verify:stress` | Fixed |
| ISO/IEC 25010-style | Performance efficiency | High-volume reservation list/report and concurrency stress | Pass | None | `verify:stress`: 1680 seeded reservations; one-day lookup 18 ms; full list 21 ms | Verified |
| ISO/IEC 25010-style | Compatibility/portability | Windows, paths with spaces, bundled Node/MariaDB, offline package | Pass | None | `verify:prereqs`, `bundle:offline`, `verify:bundle:strict`, `verify:offline-runtime` | Verified |
| ISO/IEC 25010-style | Reliability | Restart/reconnect, duplicate submissions, backup/restore, concurrency | Pass | CS-004 | `verify:stress`, `backup:mysql`, `restore:mysql`, `check:database` | Fixed |
| ISO/IEC 25010-style | Security | Auth, role checks, password handling, session secret enforcement | Pass | None | `npm test`, source inspection | Verified |
| OWASP API Security | Broken authentication | Login/logout/session, account password change | Pass | None | `npm test` auth/API tests | Verified |
| OWASP API Security | Broken function-level authorization | Admin-only account/settings/block/clear APIs | Pass | None | `npm test` role tests | Verified |
| OWASP API Security | Broken object/property authorization | Accepted fields, account lists, resident records, reservation status | Pass | None | Source inspection, API tests | Verified |
| OWASP API Security | Unrestricted resource consumption | Large reports/exports/stress requests | Pass | None | `verify:stress` | Verified |
| OWASP API Security | API inventory | Prototype bridge and resident APIs documented/safe | Pass | CS-005 | `docs/POST_DEPLOYMENT_API_CONTRACT.md` | Fixed |
| OWASP REST/input validation | Date/status filter validation | `GET /api/reservations` | Pass | CS-001 | focused API regression, `npm test` | Fixed |
| OWASP REST/input validation | Semantic date ranges | Reports/activity logs/CSV report filters | Pass | CS-002 | focused API regression, `npm test` | Fixed |
| OWASP REST/input validation | Length limits before storage | Maintenance/Public Use reason | Pass | CS-003 | focused API regression, `npm test` | Fixed |
| Database integrity | No double booking | Reservation overlap triggers and app-level transaction locks | Pass | None | `verify:sql`, `verify:stress` | Verified |
| Database integrity | Maintenance block consistency | Prevent active reservation from being hidden by a block | Pass | CS-004 | repository/API regression tests | Fixed |
| Database integrity | Reference sequence | Unique BCS references and restore survival | Pass | None | `verify:sql`, `verify:stress` | Verified |
| NIST SP 800-34-style | Backup creation | Local SQL backup with clear filename | Pass | None | `backup:mysql` | Verified |
| NIST SP 800-34-style | Restore and post-restore check | Restore current backup and check DB | Pass | None | `restore:mysql`, `check:database` | Verified |
| NIST SP 800-34-style | Accidental restore protection | Office launcher requires `RESTORE` confirmation | Pass | None | `maintenance-tools/restore-database.bat` inspection | Verified |
| ISO/IEC/IEEE 29119-style | Test design/evidence | Automated and focused regression tests | Pass | CS-001, CS-002, CS-003, CS-004 | failing-before/failing-after TDD evidence, `npm test` | Fixed |
| Offline deployment | START-HERE flow | Launcher, runtime env, DB check, browser URL | Pass | None | `START-HERE.bat`, `start-barangay-office.bat`, `bundle:offline`, `verify:bundle`, `verify:bundle:strict`, `verify:runtime-package`, `verify:offline-runtime` | Verified |
| Logging/auditability | Sensitive/admin action logs | Login/logout, reservation changes, clear, blocks, accounts, backup/restore | Pass | None | Source inspection and tests | Verified |
| Data privacy/minimum necessary | No passwords/secrets in exports/logs | CSV exports, account list, backup docs, errors | Pass | None | Source inspection, tests, docs | Verified |
| Defense/readiness docs | Docs match implementation | API contract, readiness report, QA report, staff/recovery docs | Pass after final report update | CS-005 | report/docs updates | Fixed |
