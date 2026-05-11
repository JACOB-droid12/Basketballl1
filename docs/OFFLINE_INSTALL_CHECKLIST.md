# Pure Offline Install Checklist

This system is designed to run without internet access in the barangay office.

Deployment is Windows-only for this project. Use the included `.bat` files and PowerShell scripts on the barangay office computer.

The intended deployment separates ordinary staff use from technical maintenance: `Barangay Court Scheduler` starts the local system for daily work, while `Barangay Court Scheduler - Maintenance` opens setup, backup, database checks, sign-off, and support tools.

## What Offline Means

- The reservation system opens at `http://localhost:3000/prototype`.
- The database is local MySQL on the same office computer or barangay-controlled local network.
- Residents do not reserve online.
- No cloud database, online booking site, email service, SMS service, or payment service is required.

## Prepare Before Bringing It To The Barangay Office

Use a setup computer first. Internet is only needed here if installers or npm packages are not already available.

1. Install project dependencies once:

```powershell
npm install
```

2. Confirm `node_modules/` exists in the project folder.

3. Create the prepared offline bundle:

```powershell
npm run bundle:offline
npm run verify:bundle
```

This creates:

```text
dist\barangay-court-scheduler-offline
```

4. Copy `dist\barangay-court-scheduler-offline` to a USB drive or local installer folder. It includes:

- `node_modules/`
- `START-HERE.bat`
- `README-FIRST-WINDOWS.txt`
- `TROUBLESHOOT-WINDOWS.txt`
- `package.json`
- `package-lock.json`
- `src/`
- `views/`
- `public/`
- `database/`
- `docs/`
- `scripts/`
- `tests/`
- `backup-database.bat`
- `create-desktop-shortcut.bat`
- `check-office-readiness.bat`
- `run-office-signoff.bat`
- `setup-database-only.bat`
- `setup-barangay-office.bat`
- `start-barangay-office.bat`

The `database/` folder includes `schema.sql`, `seed.sql`, `diagnostics.sql`, and `SQL_ONLY_SETUP.md` with exact manual commands. The root `setup-database-only.bat` file runs those SQL files locally for Windows users.

`npm run verify:bundle` checks that the prepared folder includes the required app files, `node_modules/`, SQL setup files, and docs, and that local-only files such as `.env` and database backups were not copied into the bundle.

5. Bring offline installers if the barangay computer does not already have them:

- Node.js 20+ Windows installer
- MySQL 8+ Windows installer
- Chrome, Edge, or Firefox installer if needed

## Barangay Office Setup

On the barangay office computer:

1. Install Node.js and MySQL from local/offline installers if needed.
2. Make sure MySQL is running.
3. Copy the prepared project folder to the computer.
4. Double-click `START-HERE.bat`.
5. Choose `Check this computer before setup`.
6. Fix any failed checks. The checker confirms Node.js, npm, MySQL tools, `node_modules/`, SQL files, and setup/start scripts are present.
7. Reopen `START-HERE.bat` if needed and choose `First-time setup on this computer`.
8. Enter the local MySQL password when asked.
9. Confirm the setup finishes without errors.
10. Choose `Create desktop shortcut`.
11. For daily use, double-click `Barangay Court Scheduler`. If the browser does not open automatically, use the address shown in the startup window.
12. For setup, backup, checks, or support, double-click `Barangay Court Scheduler - Maintenance` or reopen `START-HERE.bat`.
13. For final deployment sign-off, choose `Create final office sign-off report` and keep the generated report under `reports\office-signoff`.
14. For regular local backups, choose `Back up the database now` from the maintenance launcher.

The start script checks Node.js, npm, `node_modules/`, `.env`, and the configured local MySQL/MariaDB database before starting the app. It opens the browser only after the local server is listening and prints the correct local address from `APP_PORT`. Keep the startup window open while the system is being used. If it reports a missing `.env`, run `setup-barangay-office.bat` first. If it reports a local database check failure, start MySQL/MariaDB or rerun setup.

If a Windows setup or startup error is unclear, open `TROUBLESHOOT-WINDOWS.txt` in the prepared folder.

The older individual batch files remain in the folder for technical staff, but barangay personnel can use the daily Desktop shortcut for normal startup and the maintenance shortcut for setup/support tasks.

`backup-database.bat` runs the local MySQL backup command and writes timestamped `.sql` files under `backups\` by default. Keep backup files on a protected local drive or barangay-controlled external drive.

`create-desktop-shortcut.bat` creates two current-user Desktop shortcuts: `Barangay Court Scheduler` opens `start-barangay-office.bat` for daily staff use, and `Barangay Court Scheduler - Maintenance` opens `START-HERE.bat` for setup, backup, database checks, sign-off, and support.

If only the database needs to be created or checked, double-click `setup-database-only.bat` instead. It does not start the app UI.

Starter login after setup:

- Username: `admin`
- Temporary password: `admin123`

Change the starter password from Account > Change Password, or create a new Admin account before regular office use.

`run-office-signoff.bat` runs local-only automated checks for prerequisites, configured database readiness, live MySQL/app smoke verification, UI smoke verification, and a local MySQL backup. It also writes a manual verification checklist into the report so the office can record the actual MySQL/MariaDB service version, browser, login, password change, account creation, reservation, overlap rejection, status, activity-log, CSV, printer name, readable printed output, and barangay personnel sign-off on the actual barangay computer. Reports are local records under `reports\office-signoff` and are not included in the prepared offline bundle.

## Important

The one-click setup does not download packages. If `node_modules/` is missing, setup stops and asks for a prepared offline project folder.
