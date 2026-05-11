# Deployment Guide

Offline local deployment guide for the Barangay Sto. Niño Basketball Court Scheduling System.

The final target is a barangay office computer running the app and local MySQL with no internet connection required during normal use. If installers or npm packages are not already available, use a separate setup computer to download them first, then bring the prepared offline folder and local installers to the barangay office.

## Required Software

- Windows 10 or Windows 11
- Node.js 20 or newer
- MySQL 8 or newer
- A browser such as Chrome, Edge, or Firefox

## Folder Location

Recommended installation folder:

```text
C:\BarangayCourtScheduler
```

For development in this Codex workspace, the repo is currently located at:

```text
C:\Users\Emmy Lou\Documents\New project
```

## Install Dependencies

From the project folder:

```powershell
npm install
```

For a repeatable installation using the committed lockfile:

```powershell
npm ci --ignore-scripts
```

For a pure offline barangay-office install, run dependency installation before bringing the project folder to the office computer. The copied project folder must include `node_modules/`. The one-click barangay setup does not download npm packages.

To create a prepared offline folder:

```powershell
npm install
npm run bundle:offline
npm run verify:bundle
```

Copy `dist\barangay-court-scheduler-offline` to the barangay office computer.

The prepared folder includes `START-HERE.bat` as the maintenance launcher, `README-FIRST-WINDOWS.txt` for the shortest written setup path, `backup-database.bat` for staff-friendly local backups, `create-desktop-shortcut.bat` for optional Desktop shortcuts, and `TROUBLESHOOT-WINDOWS.txt` for common Windows setup/startup errors.

The intended office workflow separates daily use from maintenance. The daily Desktop shortcut is named `Barangay Court Scheduler` and starts the local system directly. The maintenance Desktop shortcut is named `Barangay Court Scheduler - Maintenance` and opens setup, backup, database checks, sign-off, and support tools.

## One-Click Offline Setup

For the installer/admin, the simplest setup and maintenance path is:

```text
START-HERE.bat
```

That menu can check the computer, run first-time setup, create Desktop shortcuts, start daily office use, create a local database backup, create the sign-off report, and open the quick instructions.

For ordinary barangay staff after setup, the simplest daily path is:

```text
Barangay Court Scheduler
```

That Desktop shortcut runs `start-barangay-office.bat`, checks the local database, starts the local app, and opens the browser after the server is ready.

After Node.js 20+ and MySQL 8+ are installed on the barangay office computer from local installers if needed, use:

```text
setup-barangay-office.bat
```

This setup uses local files only. It creates `.env` if needed, asks for the local MySQL password, applies `database/schema.sql`, applies `database/seed.sql`, runs `database/diagnostics.sql`, and runs the live MySQL verifier.

Before running setup on the office computer, double-click `check-office-readiness.bat`. It checks the local Node.js, npm, MySQL client tools, `node_modules/`, SQL files, and setup/start scripts without downloading anything.

If `node_modules/` is missing, setup stops. Prepare the project folder with dependencies on another computer, then copy the complete folder to the barangay office computer.

To start regular office use after setup:

```text
start-barangay-office.bat
```

Keep the startup window open while the system is being used. It opens the browser only after the local server is listening and prints the correct local address from `APP_PORT`.

If staff click the daily shortcut while the app is already running, the startup helper checks the local `/health` endpoint. When it confirms the Barangay Court Scheduler is already running, it opens the existing local app instead of showing a Node.js port error.

For final deployment sign-off on the office computer:

```text
run-office-signoff.bat
```

This creates a timestamped text report under `reports\office-signoff`. It runs only local commands: prerequisite verification, runtime database readiness, live MySQL/app smoke verification, UI smoke verification, and a local MySQL backup. It also writes the manual office workflow checklist into the report. Generated sign-off reports are local deployment records and are ignored by git.

If any setup, startup, or sign-off message is unclear, open `TROUBLESHOOT-WINDOWS.txt` before changing files manually.

## Configure Environment

Create the local `.env` file:

```powershell
npm run setup:env
```

The setup command reads `.env.example`, generates a local `APP_SESSION_SECRET`, writes `.env`, and refuses to overwrite an existing `.env` file.

Example local settings:

```env
APP_PORT=3000
APP_SESSION_SECRET=replace-with-a-long-local-secret
DB_HOST=localhost
DB_PORT=3306
DB_NAME=barangay_court_scheduler
DB_USER=root
DB_PASSWORD=your-local-mysql-password
DEFAULT_CREATED_BY_USER_ID=1
VERIFY_LOGIN_USERNAME=admin
VERIFY_LOGIN_PASSWORD=
VERIFY_MYSQL_DATE=2099-05-08
```

Use a strong `APP_SESSION_SECRET` for the barangay office installation.
Set `DB_PASSWORD` to the local MySQL password before running the live verification commands.
Leave `VERIFY_LOGIN_PASSWORD` blank during first setup so the verifier uses the seeded temporary password `admin123`. If the starter password has already been changed and you need to rerun `npm run verify:mysql`, set `VERIFY_LOGIN_PASSWORD` to the current local password first. Keep `.env` private.
If the starter `admin` account has been deactivated after creating a real Admin account, set `VERIFY_LOGIN_USERNAME` and `VERIFY_LOGIN_PASSWORD` to the active Admin account before running live verification.

## Create Local MySQL Database

Before creating the database, run:

```powershell
npm run verify:prereqs
```

This checks Node.js, npm, MySQL client tools, `.env`, and required local configuration values.

Run these commands from the project folder:

```powershell
npm run verify:sql
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root < database\schema.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\seed.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

On Windows, `setup-database-only.bat` runs the same local setup without needing to type the redirection commands. It applies `database/schema.sql`, `database/seed.sql`, and `database/diagnostics.sql` as separate MySQL commands for Oracle MySQL 9 and MariaDB compatibility. `database/setup.sql` remains only as a convenience for clients that support `SOURCE` from redirected input.

The schema creates:

- Users
- Residents
- Reservation statuses
- Time slots
- Court settings
- Reservations
- Activity logs
- Overlap-prevention triggers

The schema also forces `utf8mb4` / `utf8mb4_unicode_ci` at the database and table level so barangay names and resident names with Filipino characters are stored correctly. When rerun after an older installation, it converts the existing required tables to the same charset. Back up the database before rerunning schema changes on an office computer that already has live reservation records.

`database/diagnostics.sql` is a read-only follow-up check. It reports PASS/FAIL rows for database charset, required tables, table engine/collation, foreign keys, trigger presence, seed statuses, default active slots, starter admin password hash, and court settings.

## Verify Installation

Run:

```powershell
npm run verify:prereqs
npm run check:database
npm run verify:foundation
npm run verify:sql
npm run verify:mysql
npm run verify:ui
npm test
```

On the actual office computer, `run-office-signoff.bat` runs the office-focused subset and saves a report for project presentation and deployment records.

Expected result:

- Prerequisite verification passes.
- Foundation verification passes.
- SQL static verification confirms required schema, seed, and diagnostics safeguards before live MySQL setup.
- Database diagnostics prints PASS rows for the installed MySQL database setup checks.
- MySQL verification applies the schema and seed, checks reference data, confirms at least one active Admin account, verifies the starter account still uses a bcrypt password hash, creates/completes a temporary reservation, verifies activity logging, confirms overlap-trigger rejection, and logs in through the app over HTTP to check authenticated office pages.
- UI smoke verification renders the prototype frontend and the main office screens with sample data and confirms each page contains the expected workflow text.
- Automated tests pass.

## Start the App

Run:

```powershell
npm start
```

Open:

```text
http://localhost:3000/prototype
```

Seeded starter account:

- Username: `admin`
- Temporary password: `admin123`

Change the seeded admin password from Account > Change Password before regular office use, or create a new Admin account and deactivate the seeded account.

Rerunning setup or live verification after deactivating the seeded account will not reactivate it. Keep at least one real Admin account active and set `VERIFY_LOGIN_USERNAME` / `VERIFY_LOGIN_PASSWORD` to that account for sign-off checks.

## Office Startup Procedure

1. Turn on the barangay office computer.
2. Start MySQL if it does not start automatically.
3. Double-click the Desktop shortcut named `Barangay Court Scheduler`.
4. Use the address shown in the startup window if the browser does not open automatically.
5. Log in as Admin or Staff.

## Optional Windows Shortcut

Use `START-HERE.bat` and choose `Create desktop shortcut`, or double-click `create-desktop-shortcut.bat`. It creates two current-user Desktop shortcuts: `Barangay Court Scheduler` opens `start-barangay-office.bat` for daily staff use, and `Barangay Court Scheduler - Maintenance` opens `START-HERE.bat` for setup, backup, database checks, sign-off, and support.

## Backup Database

Back up the database before system changes and at the end of regular office intervals.

Recommended backup command:

```powershell
npm run backup:mysql
```

For barangay staff or support personnel, use `Barangay Court Scheduler - Maintenance` and choose `Back up the database now`, or double-click `backup-database.bat`.

The command reads `.env`, creates `backups/` if needed, and writes a timestamped `.sql` file such as `barangay_court_scheduler_2026-05-08_1430.sql`. It passes the MySQL password through the child process environment instead of putting the password in the command text.

Keep backup files on a protected external drive or barangay-controlled storage. To store backups somewhere else, set `BACKUP_DIR` in `.env`.

## Restore Database

Use restore only when necessary and only after confirming the target database can be replaced.

```powershell
npm run restore:mysql -- backups\backup-file.sql
```

The restore command requires an explicit `.sql` file path and reads the MySQL password from `.env` rather than putting it in the command text.

## Update Procedure

1. Back up the MySQL database.
2. Stop the running app.
3. Copy or pull the updated project files.
4. Run `npm install` or `npm ci --ignore-scripts`.
5. Apply any new database migration scripts if added later.
6. Run `npm test`.
7. Start the app again.

## Security Notes

- Do not publish the app as a public website.
- Do not use cloud databases for the barangay office deployment.
- Keep `.env` private.
- Use individual Admin and Staff accounts instead of sharing one password.
- Change the temporary starter password before regular office use.
- Lock the computer when unattended.
- Restrict database access to authorized technical staff.

## Current Deployment Limitation

This version has been live-verified during development against disposable local Oracle MySQL and MariaDB servers. That proves the schema, seed, reservation writes, overlap triggers, backup, restore, and diagnostics paths on MySQL-compatible engines. Final deployment sign-off must still be performed on the barangay office computer or another Windows computer using the actual local MySQL/MariaDB installation that will store office records.
