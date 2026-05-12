# Pure Offline Install Checklist

This system is designed to run without internet access in the barangay office.

Deployment is Windows-only for this project. Use the included `.bat` files and PowerShell scripts on the barangay office computer.

The intended deployment separates ordinary staff use from technical maintenance: `Barangay Court Scheduler` starts the local system for daily work, while `Barangay Court Scheduler - Maintenance` opens setup, backup, database checks, sign-off, and support tools.

## What Offline Means

- The reservation system opens at `http://localhost:3000/prototype` by default. If `APP_PORT` is changed in `.env`, use the address shown in the startup window.
- The database is local MySQL/MariaDB on the same office computer or barangay-controlled local network.
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
- `STAFF-DAILY-USE.txt`
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
- `maintenance-tools/`
- `start-barangay-office.bat`

Optional but preferred for easier setup on a normal Windows PC:

- `runtime/node/` with `node.exe` and `npm.cmd`
- `runtime/mariadb/` with the MariaDB Windows ZIP contents, including `bin\mariadbd.exe`, `bin\mariadb-install-db.exe`, `bin\mysql.exe`, and `bin\mysqldump.exe`
- `installers/` with offline installers, if the office computer will need administrator-assisted installation

When `runtime/` is present, the launchers prefer those local tools and do not require staff to manually edit PATH.

The `database/` folder includes `schema.sql`, `seed.sql`, `diagnostics.sql`, and `SQL_ONLY_SETUP.md` with exact manual commands. `START-HERE.bat` can run the database-only support tool from `maintenance-tools` for Windows users.

`npm run verify:bundle` checks that the prepared folder includes the required app files, `node_modules/`, SQL setup files, and docs, and that local-only files such as `.env` and database backups were not copied into the bundle.

Optional but recommended before copying the folder: run `npm run verify:offline-runtime`. It starts the app locally, checks `/health`, loads `/prototype`, and fails if the served prototype still contains any external internet resource references.

5. Prefer bringing the bundled runtime folders inside the prepared package:

- `runtime\node` for Node.js 20+
- `runtime\mariadb` for the local database runtime and client tools
- Chrome, Edge, or Firefox installer only if the office computer does not already have a browser

If the runtime folders are not included, bring offline Node.js and MySQL/MariaDB installers instead. Those installers may require administrator permission.

## Barangay Office Setup

On the barangay office computer:

1. If the prepared folder includes `runtime/node` and `runtime/mariadb`, continue to step 2. If not, the installer/admin must provide bundled runtime folders or install Node.js and local MySQL/MariaDB from offline installers; this may require administrator permission.
2. If MySQL/MariaDB is installed as a Windows service, make sure it is running. If `runtime/mariadb` is bundled, the launcher tries to start it automatically.
3. Copy the prepared project folder to the computer.
4. Double-click `START-HERE.bat`.
5. Choose `Check this computer before setup`.
6. Fix any failed checks. The checker confirms bundled or installed Node.js, npm, MySQL/MariaDB tools, `node_modules/`, SQL files, and setup/start scripts are present.
7. Reopen `START-HERE.bat` if needed and choose `First-time setup on this computer`.
8. Enter the local MySQL/MariaDB password when asked.
9. Confirm the setup finishes without errors.
10. Choose `Create desktop shortcut`.
11. For daily use, double-click `Barangay Court Scheduler`. If the browser does not open automatically, use the address shown in the startup window.
12. For setup, backup, checks, or support, double-click `Barangay Court Scheduler - Maintenance` or reopen `START-HERE.bat`.
13. For final deployment sign-off, choose `Create final office sign-off report` and keep the generated report under `reports\office-signoff`.
14. For regular local backups, choose `Back up the database now` from the maintenance launcher.

The start script checks bundled or installed Node.js, npm, `node_modules/`, `.env`, and the configured local MySQL/MariaDB database before starting the app. If bundled `runtime/mariadb` is available, it tries to start the local database first. It opens the browser only after the local server is listening and prints the correct local address from `APP_PORT`. Keep the startup window open while the system is being used. If it reports a missing `.env`, open `START-HERE.bat` and choose first-time setup. If it reports a local database check failure, rerun setup through `START-HERE.bat`.

If a Windows setup or startup error is unclear, open `TROUBLESHOOT-WINDOWS.txt` in the prepared folder.

Support wrappers are grouped under `maintenance-tools`. Barangay personnel can use the daily Desktop shortcut for normal startup and the maintenance shortcut for setup/support tasks instead of opening individual batch files.

For ordinary staff, `STAFF-DAILY-USE.txt` is the shortest root-level guide. `README-FIRST-WINDOWS.txt` remains the installer/admin first-run guide.

`START-HERE.bat` > `Back up the database now` runs the local MySQL backup command and writes timestamped `.sql` files under `backups\` by default. Keep backup files on a protected local drive or barangay-controlled external drive.

`START-HERE.bat` > `Create desktop shortcut` creates two current-user Desktop shortcuts: `Barangay Court Scheduler` opens `start-barangay-office.bat` for daily staff use, and `Barangay Court Scheduler - Maintenance` opens `START-HERE.bat` for setup, backup, database checks, sign-off, and support.

If only the database needs to be created or checked, use `START-HERE.bat` > `Database-only setup/checks for IT support`. It does not start the app UI.

Starter login after setup:

- Username: `admin`
- Temporary password: `admin123`

Change the starter password from Account > Change Password, or create a new Admin account before regular office use.

`START-HERE.bat` > `Create final office sign-off report` runs local-only automated checks for prerequisites, configured database readiness, live MySQL/app smoke verification, UI smoke verification, offline prototype runtime verification, and a local MySQL backup. It also writes a manual verification checklist into the report so the office can record the actual MySQL/MariaDB service version, browser, login, password change, account creation, reservation, overlap rejection, status, activity-log, CSV, printer name, readable printed output, and barangay personnel sign-off on the actual barangay computer. Reports are local records under `reports\office-signoff` and are not included in the prepared offline bundle.

## Important

The one-click setup does not download packages. If `node_modules/` is missing, setup stops and asks for a prepared offline project folder.
