# Deployment Guide

Offline local deployment guide for the Barangay Sto. Niño Basketball Court Scheduling System.

The final target is a barangay office computer running the app and local MySQL. Internet access is only needed to install prerequisites or dependencies the first time.

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

## Configure Environment

Copy `.env.example` to `.env`.

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
```

Use a strong `APP_SESSION_SECRET` for the barangay office installation.

## Create Local MySQL Database

Run these commands from the project folder:

```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p barangay_court_scheduler < database/seed.sql
```

The schema creates:

- Users
- Residents
- Reservation statuses
- Time slots
- Court settings
- Reservations
- Activity logs
- Overlap-prevention triggers

## Verify Installation

Run:

```powershell
npm run verify:foundation
npm test
```

Expected result:

- Foundation verification passes.
- Automated tests pass.

## Start the App

Run:

```powershell
npm start
```

Open:

```text
http://localhost:3000/login
```

Seeded starter account:

- Username: `admin`
- Temporary password: `admin123`

## Office Startup Procedure

1. Turn on the barangay office computer.
2. Start MySQL if it does not start automatically.
3. Open PowerShell in the project folder.
4. Run `npm start`.
5. Open `http://localhost:3000/login`.
6. Log in as Admin or Staff.

## Optional Windows Shortcut

Create a file named `start-scheduler.bat` outside the repo, for example on the desktop:

```bat
@echo off
cd /d C:\BarangayCourtScheduler
npm start
pause
```

Use the real installed folder path if it is different.

## Backup Database

Back up the database before system changes and at the end of regular office intervals.

Example backup command:

```powershell
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
mysqldump -u root -p barangay_court_scheduler > "backups\barangay_court_scheduler_$stamp.sql"
```

Create the `backups` folder first:

```powershell
mkdir backups
```

Keep backup files on a protected external drive or barangay-controlled storage.

## Restore Database

Use restore only when necessary and only after confirming the target database can be replaced.

```powershell
mysql -u root -p barangay_court_scheduler < backups\backup-file.sql
```

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
- Lock the computer when unattended.
- Restrict database access to authorized technical staff.

## Current Deployment Limitation

The Codex sandbox used to build this version does not include a running MySQL server. The SQL files and application code are prepared for local MySQL, but final live verification must be performed on the barangay office computer or another Windows computer with MySQL installed.
