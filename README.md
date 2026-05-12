# Barangay Basketball Court Scheduling System

Offline barangay-office reservation management system for the basketball court in Barangay Sto. Niño, Parañaque City.

The system is designed for authorized barangay personnel. Residents request reservations in person; staff encode and manage the schedule locally.

## Current Milestone

The current milestone is one-stop offline Windows setup packaging. Milestones 1 through 4 are implemented in code and tests, and the generated offline bundle has passed strict one-stop validation on this Windows PC with bundled Node.js and bundled MariaDB runtime folders present. Final barangay-office deployment sign-off is still a later activity, but this milestone focuses only on copy/extract, first-time setup through `START-HERE.bat`, daily startup through `Barangay Court Scheduler`, and local browser/backend/database verification:

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

The deployment goal is a high-quality, fully tested offline Windows local web application: staff use the supplied prototype UI in a browser, the backend and MySQL/MariaDB database run on the barangay office computer, daily use is started from a simple Desktop shortcut, and setup/backup/checks are kept in a separate maintenance launcher. The safest automation path is portable/bundled runtime support: launchers prefer `runtime\node` and `runtime\mariadb` when those folders are supplied, then fall back to installed local tools for development machines.

## Offline Package Modes

Deployment candidate mode means the folder can run offline when Node.js and MySQL/MariaDB are supplied either by bundled runtime folders or by already-installed local tools on the PC.

True one-stop offline package mode means setup should not need internet, global Node.js, global MySQL/MariaDB, manual PATH edits, manual `npm install`, or manual SQL import. The package must include:

- `runtime\node\node.exe`
- `runtime\node\npm.cmd`
- `runtime\mariadb\bin\mariadbd.exe`
- `runtime\mariadb\bin\mariadb-install-db.exe`
- `runtime\mariadb\bin\mariadb.exe or runtime\mariadb\bin\mysql.exe`
- `runtime\mariadb\bin\mysqldump.exe`
- `data\mariadb-data`
- `node_modules` or a built backend output
- database schema files
- `START-HERE.bat`
- Barangay Court Scheduler daily launcher
- Maintenance Tools launcher
- `README-FIRST-WINDOWS.txt`
- `TROUBLESHOOT-WINDOWS.txt`

Use `npm run verify:runtime-package` to classify the current folder. Use `npm run verify:bundle` for deployment candidate mode and `npm run verify:bundle:strict` for true one-stop offline package mode.

## Quick Start

For a barangay-office Windows setup, use `START-HERE.bat` first. It prefers bundled `runtime\node` and `runtime\mariadb` folders when they are included, checks the deployment folder, starts bundled MariaDB when practical, creates the local `.env` file, generates a local bundled-database password when using portable MariaDB, applies schema/seed data, and shows a plain error if the package is incomplete. The manual commands below are for developers or IT support.

1. Confirm Node.js 20+ and local MySQL/MariaDB client tools are available through the bundled runtime folders or installed local tools.
2. Create the local `.env` file:

```powershell
npm run setup:env
```

Then open `.env` and update `DB_PASSWORD` for the local MySQL account. The setup command generates a local session secret and refuses to overwrite an existing `.env` file. This manual step is for developer/IT fallback only; the one-stop `START-HERE.bat` path generates the local database password automatically when bundled MariaDB is present.

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

For the beginner Windows path, use `START-HERE.bat` and choose
`First-time setup on this computer`.

For developer or IT support SQL-only fallback, run the SQL-only local setup
runner from `maintenance-tools`:

```text
maintenance-tools\setup-database-only.bat
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

This command renders the prototype frontend plus the main office screens with safe sample data and checks the prototype backend bridge, login, dashboard, schedule, reservation, account, and activity-log pages.

10. Run the local offline runtime check:

```powershell
npm run verify:offline-runtime
```

This starts the local app on a temporary port, checks `/health`, loads `/prototype`, and fails if the served prototype contains external `http://` or `https://` font, script, image, or stylesheet references. It is a fast offline safety gate; it does not replace the real browser/manual sign-off on the barangay office computer.

11. Run the automated tests:

```powershell
npm test
```

## Pure Offline Barangay Setup

For the barangay office, prepare a complete offline project folder before bringing it to the office computer. The folder must include `node_modules/`; the one-click setup does not download npm packages.

This setup path is Windows-only. The installer/admin workflow uses `START-HERE.bat`, which opens one clear menu. Its first choices cover daily startup, first-time setup, and quick instructions. Backup, restore, database checks, readiness checks, troubleshooting, and sign-off are grouped as Maintenance/admin tools and implemented by wrappers inside `maintenance-tools`. The ordinary staff workflow uses a Desktop shortcut named `Barangay Court Scheduler` that starts daily use directly. The root `STAFF-DAILY-USE.txt` file is the plain daily-use sheet for non-technical staff.

Preferred portable/bundled runtime layout:

```text
runtime/
  node/
    node.exe
    npm.cmd
  mariadb/
    bin/
      mariadbd.exe
      mariadb-install-db.exe
      mysql.exe
      mysqldump.exe
```

When those folders exist, the Windows launchers use them automatically instead of requiring the MySQL/MariaDB bin folder to be added to the global PATH. If they are missing, the scripts fall back to installed local tools and show a clear error if the deployment package is incomplete.

To create the prepared folder on a setup computer:

```powershell
npm install
npm run bundle:offline
npm run verify:bundle
```

This creates `dist/barangay-court-scheduler-offline/`. Copy that folder to the barangay office computer.

On the barangay office computer:

1. Double-click `START-HERE.bat`.
2. Choose `Check this computer before setup`.
3. Fix any failed readiness checks, such as missing bundled runtime folders, installed fallback tools, or `node_modules/`.
4. Choose `First-time setup on this computer`.
5. If bundled `runtime\mariadb` is included, setup generates the local database password automatically. If the package falls back to an already-installed MySQL/MariaDB service, enter that service password when asked by the installer/admin.
6. Choose `Create desktop shortcut`. This creates `Barangay Court Scheduler` for daily staff use and `Barangay Court Scheduler - Maintenance` for setup, backup, checks, and support.
7. For daily use, double-click `Barangay Court Scheduler`. If needed, the installer/admin can still choose `Start the system for daily use` from `START-HERE.bat`.
8. Use the address shown in the startup window if the browser does not open automatically.
9. For deployment sign-off, choose `Create final office sign-off report` from the maintenance launcher and keep the generated report under `reports\office-signoff`.

If a Windows setup or startup message is unclear, open `TROUBLESHOOT-WINDOWS.txt` in the prepared offline folder.

`start-barangay-office.bat` checks for bundled or installed Node.js, npm, `node_modules/`, `.env`, and the local MySQL/MariaDB database before starting the app. If `runtime\mariadb` is bundled, it attempts to start the local database first. It opens the browser only after the local server is listening and prints the correct local address from `APP_PORT`. Keep the startup window open while the system is being used. If a check fails, follow the message and rerun setup if needed.

For a database-only daily startup check without opening the app, run:

```powershell
npm run check:database
```

`maintenance-tools\run-office-signoff.bat` runs the office-focused local verification sequence, including the offline prototype runtime check, and writes a timestamped report for presentation/deployment records. It does not download packages or use online services. Generated reports stay local under `reports\office-signoff` and are ignored by git.

See `docs/OFFLINE_INSTALL_CHECKLIST.md` for the full pure-offline checklist.

For a database-only local setup fallback, use `START-HERE.bat` > `Database-only setup/checks for IT support`, or see `database/SQL_ONLY_SETUP.md`.

11. Start the local app:

```powershell
npm start
```

Useful local URLs, assuming the default `APP_PORT=3000`:

- `http://localhost:3000/prototype` - prototype frontend used by barangay staff
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

For barangay staff, the easier path is `START-HERE.bat` -> `Back up the database now`.

Backups are written to `backups/` by default. Set `BACKUP_DIR` in `.env` if the barangay office wants to store them on another local folder or protected external drive.

Restore only after confirming the target database can be replaced:

```powershell
npm run restore:mysql -- backups\backup-file.sql
```

## Documentation

- `docs/USER_GUIDE.md` explains the daily workflow for barangay Admin and Staff users.
- `STAFF-DAILY-USE.txt` is the shortest daily-use sheet for ordinary barangay staff.
- `docs/DEPLOYMENT_GUIDE.md` explains offline Windows + local MySQL installation, startup, backup, restore, and update steps.
- `npm run verify:offline-runtime` starts the app locally and checks that the served prototype runtime uses only local resources.
- `START-HERE.bat` groups readiness checks, backup, restore, sign-off, and database support under Maintenance/admin tools.
- `maintenance-tools\check-office-readiness.bat` checks whether a barangay office computer has the local files and tools needed before running setup.
- `maintenance-tools\run-office-signoff.bat` runs final local verification on the office computer and saves a sign-off report.
- `TROUBLESHOOT-WINDOWS.txt` lists common offline Windows setup/startup errors and the next action for each.
- `docs/ISO_25010_EVALUATION.md` maps the system to ISO 25010 quality characteristics for project evaluation.
- `docs/ARCHITECTURE.md` explains the chosen stack and module boundaries.
- `docs/CODEX_HANDOFF.md` records the current milestone state, verification, risks, and next step.
