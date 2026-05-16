BARANGAY STO. NINO BASKETBALL COURT SCHEDULING SYSTEM
WINDOWS OFFLINE FIRST-RUN GUIDE

Use this guide on the barangay office computer.

This system is Windows-only for deployment in this project.
It runs offline on the office computer and uses local MySQL or MariaDB.
Residents do not reserve online.

PACKAGE MODES

Deployment candidate mode:
  The folder can run offline when Node.js and MySQL/MariaDB are either already
  installed on the PC or supplied through bundled runtime folders.

True one-stop offline package mode:
  No internet is required if the package is complete. The folder must include
  these files before it can be treated as a one-stop package:

  runtime\node\node.exe
  runtime\node\npm.cmd
  runtime\mariadb\bin\mariadbd.exe
  runtime\mariadb\bin\mariadb-install-db.exe
  runtime\mariadb\bin\mariadb.exe or runtime\mariadb\bin\mysql.exe
  runtime\mariadb\bin\mysqldump.exe
  data\mariadb-data
  node_modules or a built backend output
  database\schema.sql, database\seed.sql, and database\diagnostics.sql
  START-HERE.bat
  start-barangay-office.bat
  maintenance-tools

If runtime\node or runtime\mariadb is missing, the verifier reports
"Runtime package verification failed" and the folder is still deployment
candidate mode only.

After setup, staff should only use the daily launcher after setup:
Barangay Court Scheduler.

IF UNSURE, DOUBLE-CLICK THIS FIRST

START-HERE.bat

For first-time setup, double-click START-HERE.bat and choose
"First-time setup on this computer".

That file shows one clear menu. The first choices are for staff:
daily startup, first-time setup, and quick instructions. The lower section is
Maintenance/admin tools for shortcut creation, computer checks, backups,
restore, sign-off reporting, and database-only support.

For ordinary daily staff use after setup, open:

STAFF-DAILY-USE.txt

That file is the shortest plain-language guide for the daily Desktop shortcut,
login, schedule work, and when to ask for maintenance support.

WHAT SETUP CHECKS AUTOMATICALLY

START-HERE.bat checks whether Node.js, npm, MySQL/MariaDB tools,
node_modules, .env, and the required SQL files are available.

The preferred deployment package can include a bundled runtime:

runtime\node
  Optional bundled Node.js runtime. If present, the launchers use it
  automatically.

runtime\mariadb
  Optional bundled MariaDB runtime from the Windows ZIP distribution. If
  present, the launchers use runtime\mariadb\bin automatically and can start
  the local database without asking staff to edit PATH.

When runtime\mariadb is included, first-time setup creates the local
data\mariadb-data database folder and generates a local database password for
this computer automatically. Staff do not need to type a database password in
that true one-stop package mode.

If the bundled runtime is missing, START-HERE.bat falls back to Node.js and
MySQL/MariaDB already installed on the computer. Installing those programs may
require administrator permission. If node_modules is missing, the deployment
package is incomplete and must be rebuilt on the setup computer.

FIRST RUN

1. Double-click START-HERE.bat.
2. Optional but recommended: choose "Check this computer before setup".
3. Choose "First-time setup on this computer".
4. If the package includes runtime\mariadb, setup generates the local database
   password automatically. If runtime\mariadb is missing and the PC uses an
   already-installed MySQL/MariaDB service, enter that local database password
   when asked by the installer/admin.
5. Choose "Create desktop shortcuts".
6. For daily use, double-click Barangay Court Scheduler on the Desktop.
7. If the browser does not open automatically, use the address shown in the startup window.
8. For deployment sign-off, open START-HERE.bat and choose
   "Create final office sign-off report". Keep the generated report from
   reports\office-signoff. The report asks staff to record the actual
   MySQL/MariaDB version, browser, printer, readable print output, and
   barangay personnel sign-off.

OPTIONAL DESKTOP SHORTCUT

In START-HERE.bat, choose "Create desktop shortcut". This creates two Desktop
shortcuts:

Barangay Court Scheduler
  Daily staff shortcut. Opens the local system directly.

Barangay Court Scheduler - Maintenance
  Setup, backup, database checks, sign-off, and support menu.

STARTER LOGIN

Username: admin
Temporary password: admin123

After first login, change the starter password from Account > Change Password.

DAILY STARTUP

1. Start MySQL/MariaDB if it is installed as a normal Windows service. If the
   prepared folder includes runtime\mariadb, the launcher tries to start the
   bundled local database automatically.
2. For daily use, double-click Barangay Court Scheduler on the Desktop.
3. If the browser does not open automatically, use the address shown in the startup window.
4. Keep the startup window open while the system is being used.

If the Desktop shortcut has not been created yet, double-click START-HERE.bat
and choose "Start the system for daily use".

If the system is already running and the shortcut is clicked again, it should
open the browser again instead of showing a technical error.

If start-barangay-office.bat says Node.js, npm, node_modules, or .env is missing,
fix that item first. If .env is missing, open START-HERE.bat and choose
"First-time setup on this computer" before starting the system.

The start file also checks the local MySQL/MariaDB database before opening the
browser. If it says the local database check failed, start MySQL/MariaDB or run
START-HERE.bat first-time setup again.

If any message is unclear, open TROUBLESHOOT-WINDOWS.txt in this folder.

BACKUP DATABASE

1. Double-click START-HERE.bat.
2. Choose "Back up the database now".
3. Keep the generated backups folder on a protected local drive or barangay-controlled external drive.
4. Copy the backups folder to a USB drive once a week. Keep one copy in the
   barangay office and one off-site.

DATABASE-ONLY SETUP

If only the database needs to be created or checked, open START-HERE.bat and
choose "Database-only setup/checks for IT support".

The underlying support files are inside maintenance-tools. Ordinary staff do
not need to open maintenance-tools directly.

The database-only tool applies database\schema.sql, database\seed.sql, and
database\diagnostics.sql.

IMPORTANT NOTES

- Do not publish this as an online booking website.
- Do not use a cloud database for barangay office deployment.
- Keep .env private.
- Keep backups on a protected local drive or barangay-controlled external drive.
- Copy the backups folder to a USB drive once a week. Keep one copy in the barangay office and one off-site.
- Use START-HERE.bat > "Create final office sign-off report" on the actual office computer before final sign-off.
- Open TROUBLESHOOT-WINDOWS.txt for common Windows setup and startup errors.
- For the detailed guide, open docs\OFFLINE_INSTALL_CHECKLIST.md and docs\DEPLOYMENT_GUIDE.md.
