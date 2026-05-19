# Database Setup

The final system targets a local MySQL/MariaDB database running on the same barangay office computer or local network.

## Requirements

- MySQL 8.0 or newer (default)
- Or a local MariaDB server that passes `npm run verify:mysql`
- A local database account allowed to create databases, tables, triggers, and foreign keys

This database setup has been live-verified against disposable local Oracle MySQL and MariaDB servers during development. Before deployment, rerun `npm run verify:mysql` on the barangay office's target local MySQL/MariaDB installation.

## SQL-Only One-Command Setup

From the project root, double-click:

```text
maintenance-tools\setup-database-only.bat
```

Or run the same SQL-only setup from PowerShell:

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root < database\schema.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\seed.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

This runs `schema.sql`, `seed.sql`, and `diagnostics.sql` in order. Keep PowerShell in the project root because the commands use relative file paths.

See `database/SQL_ONLY_SETUP.md` for a short manual setup guide.

## Create Schema Manually

From the project root:

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root < database\schema.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

This creates the `barangay_court_scheduler` database if it does not exist, then creates:

- `users`
- `residents`
- `reservation_statuses`
- `time_slots`
- `court_settings`
- `reservations`
- `activity_logs`

It also creates MySQL triggers that block overlapping active reservations.

The schema explicitly creates/alters the database and every table with `utf8mb4` / `utf8mb4_unicode_ci` so names such as `Sto. Niño` are stored correctly even if a local MySQL installation has a different default charset. It also converts existing required tables to that charset when `schema.sql` is rerun after an older installation.

## Seed Reference Data

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\seed.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

Seed data includes:

- A starter `admin` account with a bcrypt-hashed temporary password
- Reservation status labels: Available, Reserved, Missed, Cancelled, Completed
- Default hourly time slots from 7:00 AM to 9:00 PM
- Court settings for Barangay Sto. Niño, Parañaque City

If `seed.sql` is rerun after the starter `admin` account has been changed or deactivated, it does not reset the local password or reactivate the account. This keeps office account-retirement decisions intact after initial setup.

## Run Database Diagnostics

After applying the schema and seed files on a real MySQL installation, run:

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

The diagnostics script is read-only. It reports PASS/FAIL rows for the database charset/collation, required tables, table engine/collation, reservation foreign keys, overlap trigger presence, seeded statuses, default active time slots, starter admin password hashing, and court settings.

## Migrations

This first version uses `schema.sql` as the baseline install script instead of an automated migration framework. Future schema changes should be added under `database/migrations/` as forward-only SQL files, then documented in `docs/CODEX_HANDOFF.md`. Back up the database before applying any migration on the barangay office computer.

## Verify MySQL Setup

First check the local tooling and `.env` values:

```powershell
npm run setup:env
npm run verify:prereqs
npm run verify:sql
```

If `.env` already exists, `npm run setup:env` will refuse to overwrite it. `npm run verify:sql` statically checks the schema, seed, diagnostics, and SQL-only setup files for required tables, charsets, foreign keys, overlap triggers, reference statuses, default slots, password-hash safety, read-only diagnostics coverage, and setup-file coverage. After `.env` has the local MySQL connection settings, run this from the project root:

```powershell
npm run verify:mysql
```

The verifier applies `schema.sql` and `seed.sql`, checks reference data, confirms at least one Admin account is active, checks that the starter admin password is still stored as a bcrypt hash, creates and completes a temporary reservation through the app repository, confirms an activity-log entry was written, confirms the MySQL trigger rejects an overlapping direct insert, then logs in through the app over HTTP and checks the main authenticated office pages. Temporary verification rows are removed after the check.

If the starter `admin` password has already been changed, set `VERIFY_LOGIN_PASSWORD` in `.env` before rerunning `npm run verify:mysql`. If the starter account has been deactivated after creating a real Admin account, set both `VERIFY_LOGIN_USERNAME` and `VERIFY_LOGIN_PASSWORD` to that active Admin account. Leave the password blank during first setup to use `admin123`.

For a no-database screen rendering check, run:

```powershell
npm run verify:ui
```

This renders the prototype frontend and the main office screens with safe sample data. It does not prove MySQL storage; use it alongside `npm run verify:mysql`.

For the prepared offline folder, run this after `npm run bundle:offline`:

```powershell
npm run verify:bundle
```

This confirms the copy-ready bundle includes `node_modules/`, SQL setup files, app files, and docs without copying `.env` secrets or backup data.

## Back Up MySQL Data

After `.env` is configured and MySQL client tools are installed, create a backup with:

```powershell
npm run backup:mysql
```

The backup command uses `mysqldump`, includes routines and triggers, and writes a timestamped `.sql` file to `backups/` by default.

Restore a backup only after confirming the target database can be replaced:

```powershell
npm run restore:mysql -- backups\backup-file.sql
```

## Passwords

The schema stores `password_hash`, not plaintext passwords. The seed includes a starter account for local setup:

- Username: `admin`
- Temporary password: `admin123`

Change this password from Account > Change Password before presenting or deploying the system.

## Overlap Rule

Only statuses marked with `is_blocking = 1` block future active reservations. The seed marks `Reserved` as blocking. `Cancelled`, `Missed`, and `Completed` do not block new reservations.
