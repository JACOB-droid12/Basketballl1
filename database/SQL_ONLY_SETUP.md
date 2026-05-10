# SQL-Only Setup

Use this when the barangay computer already has MySQL installed and you only want to apply the database files manually.

## What This Does

`setup-database-only.bat` runs the SQL files in the correct order:

1. `database/schema.sql` creates the local database, tables, foreign keys, checks, and overlap-prevention triggers.
2. `database/seed.sql` inserts the starter Admin account, statuses, time slots, and court settings.
3. `database/diagnostics.sql` prints read-only PASS/FAIL checks for the installed database.

## Run From The Project Root

Easiest Windows option: double-click this from the project folder:

```text
setup-database-only.bat
```

It asks for the local MySQL host, port, username, database name, and password, then applies `schema.sql`, `seed.sql`, and `diagnostics.sql` as separate local MySQL commands. This is compatible with Oracle MySQL 9 and MariaDB.

For a manual PowerShell command, use Command Prompt redirection through `cmd /c`:

```powershell
$env:MYSQL_PWD = Read-Host "MySQL password (leave blank if none)"
cmd /c "mysql -h127.0.0.1 -P3306 -u root < database\schema.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\seed.sql"
cmd /c "mysql -h127.0.0.1 -P3306 -u root barangay_court_scheduler < database\diagnostics.sql"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
```

This keeps the password out of the command line while each SQL file is redirected into `mysql`.

`database/setup.sql` remains as a convenience for clients that support `SOURCE` from redirected input, but the batch file and the three commands above are the recommended Windows path because Oracle MySQL 9 does not execute `SOURCE` from redirected stdin.

## Expected Result

The diagnostics output should show `PASS` for:

- Database charset/collation
- Required tables
- InnoDB and utf8mb4 table setup
- Reservation foreign keys
- Overlap triggers
- Reservation statuses
- Default time slots
- Starter admin password hash
- Court settings

## Important

This is still fully offline. The command talks only to the local MySQL server installed on the barangay office computer.

The app still needs Node.js and the prepared project folder with `node_modules/` to run. SQL setup alone creates the database, but it does not start the reservation system UI.
