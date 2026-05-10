# Barangay Basketball Court Scheduling System

Offline barangay-office reservation management system for the basketball court in Barangay Sto. Niño, Parañaque City.

The system is designed for authorized barangay personnel. Residents request reservations in person; staff encode and manage the schedule locally.

## Current Milestone

Milestone 5 usability, reporting, and deployment documentation is partly in progress. Milestones 1 through 4 are implemented in code and tests. Live SQL verification has passed against disposable local Oracle MySQL and MariaDB servers during development; the same verification still needs to be repeated on the barangay office's target local MySQL/MariaDB installation:

- Local Node.js + Express application skeleton
- Local MySQL target schema
- Seed data for reservation statuses, court settings, and hourly time slots
- Architecture and reference review documents
- Handoff document for future Codex turns
- Login handling with bcrypt password verification
- Admin account management, create-account, and activate/deactivate screens
- Add-reservation, reservation-list, reservation-detail, and schedule routes
- Date/time validation and active-overlap prevention logic
- Schedule slot display logic with clickable reserved/available slots
- Activity-log viewing with date, action, and user/details filters
- Reservation CSV export from the filtered reservation list
- Print controls and print-friendly styling for reservation records and schedules
- Tests for validation, overlap rules, query builders, route validation, schedule mapping, login, and account creation

## Target Stack

- Node.js + Express for a simple local web app
- EJS server-rendered pages for straightforward offline deployment
- Local MySQL for reservation, schedule, user, and activity-log records
- bcrypt password hashes for user accounts

The app does not use cloud services for core functionality.

Deployment focus is Windows only for this project. Use the included `.bat` and PowerShell scripts for barangay-office setup and startup.

## Quick Start

1. Install Node.js 20+ and MySQL 8+ on the barangay office computer.
2. Create the local `.env` file:

```powershell
npm run setup:env
```

Then open `.env` and update `DB_PASSWORD` for the local MySQL account. The setup command generates a local session secret and refuses to overwrite an existing `.env` file.

3. Install dependencies:

```powershell
npm install
```

4. Check local prerequisites:

```powershell
npm run verify:prereqs
```

This checks Node.js, npm, MySQL client tools, `.env`, and required local configuration values.

5. Create the database:

Double-click the SQL-only local setup runner:

```text
setup-database-only.bat
```

Or run this from PowerShell:

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root < database\schema.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\seed.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

This SQL-only runner applies `database/schema.sql`, applies `database/seed.sql`, then runs the read-only diagnostics checks. Run it from the project root so the relative file paths resolve correctly.

6. Run the foundation check:

```powershell
npm run verify:foundation
```

7. Run the SQL static check:

```powershell
npm run verify:sql
```

This checks the schema, seed, diagnostics, and SQL-only setup runner for required tables, utf8mb4 charset/collation enforcement, foreign keys, time checks, overlap triggers, trigger rerun safety, seed idempotency, reference statuses, default slots, password-hash seed safety, read-only diagnostics coverage, and setup-file coverage. It does not replace live MySQL verification.

8. Run the live MySQL verification on the office computer:

```powershell
npm run verify:mysql
```

This command applies the schema and seed using `.env`, verifies the seeded `admin` account, writes/reads/completes a temporary reservation, checks activity logging, confirms the database overlap trigger rejects a direct overlapping insert, then logs in through the app over HTTP and checks the main authenticated office pages.

If the starter `admin` password has already been changed, set `VERIFY_LOGIN_PASSWORD` in `.env` before rerunning `npm run verify:mysql`. Leave it blank for first setup so the verifier uses the seeded temporary password.

9. Run the local UI smoke check:

```powershell
npm run verify:ui
```

This command renders the main office screens with safe sample data and checks the login, dashboard, schedule, reservation, account, and activity-log pages.

10. Run the automated tests:

```powershell
npm test
```

## Pure Offline Barangay Setup

For the barangay office, prepare a complete offline project folder before bringing it to the office computer. The folder must include `node_modules/`; the one-click setup does not download npm packages.

This setup path is Windows-only. The supported office workflow is `check-office-readiness.bat` -> `setup-barangay-office.bat` -> `start-barangay-office.bat`.

To create the prepared folder on a setup computer:

```powershell
npm install
npm run bundle:offline
npm run verify:bundle
```

This creates `dist/barangay-court-scheduler-offline/`. Copy that folder to the barangay office computer.

On the barangay office computer, after Node.js 20+ and MySQL 8+ are installed from local installers if needed:

1. Double-click `check-office-readiness.bat`.
2. Fix any failed readiness checks, such as missing Node.js, MySQL tools, or `node_modules/`.
3. Double-click `setup-barangay-office.bat`.
4. Enter the local MySQL password when asked.
5. Double-click `start-barangay-office.bat`.
6. Open `http://localhost:3000/login`.

See `docs/OFFLINE_INSTALL_CHECKLIST.md` for the full pure-offline checklist.

For a database-only local setup fallback, double-click `setup-database-only.bat` or see `database/SQL_ONLY_SETUP.md`.

11. Start the local app:

```powershell
npm start
```

Useful local URLs:

- `http://localhost:3000/login`
- `http://localhost:3000/account`
- `http://localhost:3000/schedule`
- `http://localhost:3000/reservations`
- `http://localhost:3000/reservations/new`
- `http://localhost:3000/activity-logs`

Seeded starter login after applying `database/seed.sql`:

- Username: `admin`
- Temporary password: `admin123`

After first login, open Account > Change Password and replace the temporary password before regular office use.

This project has been live-verified against disposable local Oracle MySQL and MariaDB servers during development, including reservation saves and overlap-trigger checks. Before barangay-office sign-off, repeat `npm run verify:mysql` against the actual local MySQL/MariaDB installation that will store office records.

## Backup

After MySQL is installed and `.env` is configured, create a timestamped local backup with:

```powershell
npm run backup:mysql
```

Backups are written to `backups/` by default. Set `BACKUP_DIR` in `.env` if the barangay office wants to store them on another local folder or protected external drive.

Restore only after confirming the target database can be replaced:

```powershell
npm run restore:mysql -- backups\backup-file.sql
```

## Documentation

- `docs/USER_GUIDE.md` explains the daily workflow for barangay Admin and Staff users.
- `docs/DEPLOYMENT_GUIDE.md` explains offline Windows + local MySQL installation, startup, backup, restore, and update steps.
- `check-office-readiness.bat` checks whether a barangay office computer has the local files and tools needed before running setup.
- `docs/ISO_25010_EVALUATION.md` maps the system to ISO 25010 quality characteristics for project evaluation.
- `docs/ARCHITECTURE.md` explains the chosen stack and module boundaries.
- `docs/CODEX_HANDOFF.md` records the current milestone state, verification, risks, and next step.
