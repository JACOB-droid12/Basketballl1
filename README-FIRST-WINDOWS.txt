BARANGAY STO. NINO BASKETBALL COURT SCHEDULING SYSTEM
WINDOWS OFFLINE FIRST-RUN GUIDE

Use this guide on the barangay office computer.

This system is Windows-only for deployment in this project.
It runs offline on the office computer and uses local MySQL or MariaDB.
Residents do not reserve online.

BEFORE SETUP

1. Install Node.js 20 or newer from an offline Windows installer.
2. Install MySQL 8 or MariaDB from an offline Windows installer.
3. Make sure the MySQL bin folder is available in PATH.
4. Make sure this folder includes node_modules.

FIRST RUN

1. Double-click check-office-readiness.bat.
2. Fix any failed checks.
3. Double-click setup-barangay-office.bat.
4. Enter the local MySQL password when asked.
5. Double-click start-barangay-office.bat.
6. Open http://localhost:3000/login in the office browser.
7. For deployment sign-off, double-click run-office-signoff.bat and keep the
   generated report from reports\office-signoff.

STARTER LOGIN

Username: admin
Temporary password: admin123

After first login, change the starter password from Account > Change Password.

DAILY STARTUP

1. Start MySQL if it is not already running.
2. Double-click start-barangay-office.bat.
3. Open http://localhost:3000/login.

If start-barangay-office.bat says Node.js, npm, node_modules, or .env is missing,
fix that item first. If .env is missing, run setup-barangay-office.bat before
starting the system.

The start file also checks the local MySQL/MariaDB database before opening the
browser. If it says the local database check failed, start MySQL/MariaDB or run
setup-barangay-office.bat again.

If any message is unclear, open TROUBLESHOOT-WINDOWS.txt in this folder.

DATABASE-ONLY SETUP

If only the database needs to be created or checked, double-click:

setup-database-only.bat

That file applies database\schema.sql, database\seed.sql, and database\diagnostics.sql.

IMPORTANT NOTES

- Do not publish this as an online booking website.
- Do not use a cloud database for barangay office deployment.
- Keep .env private.
- Keep backups on a protected local drive or barangay-controlled external drive.
- Use run-office-signoff.bat on the actual office computer before final sign-off.
- Open TROUBLESHOOT-WINDOWS.txt for common Windows setup and startup errors.
- For the detailed guide, open docs\OFFLINE_INSTALL_CHECKLIST.md and docs\DEPLOYMENT_GUIDE.md.
