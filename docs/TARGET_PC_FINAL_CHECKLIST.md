# Target PC Final Checklist

Use this on the actual Barangay Sto. Nino office computer before live use.

Result options: PASS, FAIL, or NOT RUN. Do not mark a line PASS unless it was performed on the target PC.

## Before Starting

- Confirm this is the actual office computer that will store barangay records.
- Confirm power is stable or the PC is on a UPS if available.
- Confirm the deployment folder is copied locally, not run directly from a USB drive.
- Confirm the folder is not inside a public/shared Downloads folder.

## Setup And Runtime

1. Open the deployment folder.
2. Double-click `START-HERE.bat`.
3. Choose `Check this computer before setup`.
4. Expected: Node.js, npm, local MySQL/MariaDB tools, `node_modules`, SQL files, and start scripts pass.
5. Choose `First-time setup on this computer`.
6. Expected: `.env` is created, database setup finishes, diagnostics pass, and no password is printed on screen.
7. Choose `Create desktop shortcut`.
8. Expected: `Barangay Court Scheduler` and `Barangay Court Scheduler - Maintenance` appear on the current user's Desktop.

## Daily Startup

1. Double-click `Barangay Court Scheduler`.
2. Expected: a black startup window stays open, the browser opens to the local dashboard/login page, and `http://localhost:3000/dashboard` works.
3. Close the browser tab only, then reopen the shortcut.
4. Expected: duplicate startup reuses the running local app or shows a clear local message.

## Login And Roles

1. Log in with the starter admin account only for setup.
2. Immediately change the starter admin password or create a real Admin account and deactivate the starter account.
3. Create a Staff account.
4. Log in as Staff.
5. Expected: Staff can create and manage reservations but cannot see or directly use account management, court policy updates, maintenance block creation, or Clear for Public Use.
6. Log back in as Admin.
7. Expected: Admin-only tools are visible and usable.

## Reservation Workflow

1. Create a test resident in Resident Directory.
2. Click Use from the resident row.
3. Expected: New Reservation opens with requester, contact number, and address prefilled.
4. Create a future-dated test reservation.
5. Attempt an overlapping reservation for the same time.
6. Expected: overlap is blocked.
7. Create an adjacent reservation.
8. Expected: adjacent reservation is allowed.
9. Edit the first reservation.
10. Cancel one test reservation.
11. Mark one test reservation completed.
12. Mark one test reservation missed.
13. Confirm Activity Logs show the actions and reservation reference numbers.

## Print Verification

1. Open a reservation slip.
2. Use browser print preview.
3. Expected: only the slip prints, with no navigation, readable text, reference number, barangay/court name, requester, contact, address, date/time, purpose, status, encoder, issued timestamp, and signature lines.
4. Print one physical slip.
5. Open Daily print from Schedule.
6. Use browser print preview.
7. Expected: only the daily schedule prints, with readable slots, status labels, references, block section, totals, and issued timestamp.
8. Print one physical daily schedule.
9. Record printer name, paper size, scaling, and whether output is readable.

## Backup And Restore

1. Open `Barangay Court Scheduler - Maintenance`.
2. Choose `Back up the database now`.
3. Expected: a timestamped `.sql` backup appears in `backups\`.
4. Copy the backup to barangay-controlled external storage.
5. Do not restore into the live office database during sign-off unless this is a disposable setup with no real records.
6. For restore training, use an IT-controlled disposable database or a copied test environment.

## Restart And Recovery

1. Stop the app after creating test records.
2. Start it again from the desktop shortcut.
3. Expected: records remain.
4. Restart the PC if allowed.
5. Start the app again.
6. Expected: database starts, app opens, login works, records remain.
7. Simulate browser close and reopen.
8. Expected: local URL works while startup window remains open.

## Final Signoff

Do not deploy for daily barangay use until all of these are PASS:

- Target PC setup
- Daily startup
- Admin login and password change
- Staff role restriction
- Reservation create/edit/status/cancel
- Overlap rejection
- Resident Directory Use prefill
- Slip print preview and physical print
- Daily schedule print preview and physical print
- Backup creation
- Restart persistence
- Staff handover completed

