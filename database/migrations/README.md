# Database Migrations

This project does not use a migration framework yet. For the first working version:

- `database/schema.sql` is the baseline install script for a new local MySQL database.
- `database/seed.sql` contains idempotent reference data for statuses, time slots, court settings, and the starter admin account.
- `database/diagnostics.sql` is a read-only setup check after schema and seed scripts are applied.

Future database changes should be added here as forward-only SQL files instead of silently changing an already-deployed office database.

## Naming

Use this pattern:

```text
YYYYMMDDHHMM_short_description.sql
```

Example:

```text
202605081900_add_reservation_notes_index.sql
```

## Rules

- Back up the local MySQL database before applying any migration.
- Keep each migration focused on one schema/data change.
- Do not edit an old migration after it has been used on an office computer; create a new migration instead.
- Use `ALTER TABLE`, `CREATE INDEX`, or small data correction statements as needed.
- Keep migrations compatible with MySQL 8.0.
- Update `database/diagnostics.sql` and `npm run verify:sql` if a migration adds required tables, constraints, seed values, or triggers.
- Record the migration in `docs/CODEX_HANDOFF.md`.

## Manual Apply Flow

From the project root on the barangay office computer:

```powershell
npm run backup:mysql
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -u root barangay_court_scheduler < database\migrations\YYYYMMDDHHMM_short_description.sql"
cmd /c "mysql -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
npm run verify:mysql
```
