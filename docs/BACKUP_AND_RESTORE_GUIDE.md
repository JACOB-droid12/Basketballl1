# Backup And Restore Guide

This system stores barangay reservation records in a local MySQL/MariaDB database. Backups are plain SQL files and must be protected like confidential barangay records.

## What A Backup Contains

Each `.sql` backup may contain:

- Resident names, contact numbers, addresses, groups, and notes.
- Reservation dates, times, purposes, statuses, remarks, and reference numbers.
- User account metadata, roles, and password hashes.
- Activity logs for account, reservation, backup, and restore actions.

Do not post backup files in chat, email them casually, or store them on personal drives. Use barangay-controlled storage only.

## Create A Backup

Preferred staff/admin path:

1. Double-click `Barangay Court Scheduler - Maintenance`.
2. Choose `Back up the database now`.
3. Wait for the success message.
4. Confirm the new `.sql` file exists under `backups\`.
5. Copy the backup to barangay-controlled external storage.

Command-line equivalent:

```powershell
npm run backup:mysql
```

The backup script uses the MySQL password through the child process environment, not in the visible command text. It uses transaction-safe dump options and includes triggers and routines.

## Backup Schedule

- End of each office day during the first deployment week.
- Before any app update.
- Before any database setup, repair, or restore attempt.
- Weekly after the system is stable, or more often if reservation volume is high.

Keep at least two recent backups:

- One on the office computer.
- One on barangay-controlled external storage.

## Restore Safely

Restore replaces database contents. Use it only when the database is corrupted, records are missing after a failed maintenance action, or IT support instructs a restore.

Before restoring:

1. Stop regular staff use.
2. Create a fresh backup unless the database is already unusable.
3. Confirm the selected backup file is the intended one.
4. Confirm the restore target is the correct database.
5. If practicing, restore only into a disposable test database or copied environment.

Command-line equivalent:

```powershell
npm run restore:mysql -- backups\backup-file.sql
```

After restore:

1. Start the app.
2. Log in as Admin.
3. Check dashboard, reservations, schedule, accounts, activity logs, and reports.
4. Create a new backup after confirming the restored data is correct.

## Power Loss Recovery

1. Turn the PC back on.
2. Start `Barangay Court Scheduler`.
3. If the database does not start, use `Barangay Court Scheduler - Maintenance` and run the database check.
4. If records are missing or corrupted, stop staff use and restore the newest known-good backup.
5. Record what happened in the barangay deployment notes.

## Files And Folders To Protect

Protect these on the office computer:

- `.env`
- `data\mariadb-data\`
- `backups\`
- `reports\office-signoff\`
- The full deployment folder

Do not delete `data\mariadb-data\` after setup. It contains the local database files.

