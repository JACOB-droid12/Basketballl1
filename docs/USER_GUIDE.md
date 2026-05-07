# User Guide

Barangay Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City.

This guide is for authorized barangay personnel who encode and monitor basketball court reservations at the barangay office. Residents do not create online accounts or reserve remotely.

## Daily Use

1. Start the local app on the barangay office computer.
2. Open `http://localhost:3000/login` in the browser.
3. Log in with an Admin or Staff account.
4. Use Home for today's schedule summary.
5. Use Schedule to check available and reserved court slots.
6. Use Reservations to add, edit, cancel, mark missed, or mark completed reservations.
7. Use Activity Logs to review recent reservation actions.

## Starter Admin Login

After `database/seed.sql` is applied:

- Username: `admin`
- Temporary password: `admin123`

Change the starter password after installation by creating a real Admin account, confirming it works, then retiring the seeded account through a database administrator until account deactivation is added in the app.

## Home Dashboard

The Home dashboard shows:

- Today's date
- Today’s reserved slots
- Available slots
- Missed or action-needed reservations
- Upcoming reservations
- Nearest available slot when today is full, when the current data allows a suggestion

Use this screen at the start of the office day to see what needs attention.

## Check Schedule

1. Click Schedule.
2. Choose the date to inspect.
3. Review each time slot:
   - Available slots can be opened to create a reservation.
   - Reserved slots open the reservation detail page.
   - Missed, Cancelled, and Completed slots remain visible for record keeping.
4. Use the weekly schedule view for quick scan of future court usage.

## Add Reservation

1. Click Reservations.
2. Click Add Reservation.
3. Enter:
   - Reservation date
   - Start time
   - End time
   - Resident or group representative name
   - Contact number
   - Address
   - Purpose
   - Remarks, if needed
4. Save the reservation.

The system blocks active overlapping reservations. If the requested time conflicts with another Reserved reservation, choose another time slot.

## Edit Reservation

1. Open Reservations.
2. Click the representative name or open the reservation details page.
3. Click Edit.
4. Update the reservation details.
5. Save changes.

The same overlap and date/time validation rules apply when editing.

## Mark Status

Use the reservation list or detail page to mark:

- Missed: the group did not arrive or did not use the court.
- Completed: the group used the court as scheduled.
- Cancelled: the reservation was cancelled before use.

Cancelled, Missed, and Completed records are kept for reporting and history.

## Account Management

Admin users can create accounts.

1. Log in as Admin.
2. Click Account.
3. Click Create Account.
4. Enter full name, username, password, and role.
5. Save the account.

Validation rules:

- All fields are required.
- Username must be unique.
- Role must be Admin or Staff.
- Passwords are stored as hashes, not plaintext.

Recommended role use:

- Admin: manages users and reservations.
- Staff: manages reservations and schedules.

## Activity Logs

Use Activity Logs to monitor important actions such as:

- Creating reservations
- Editing reservations
- Marking reservations missed, cancelled, or completed

Filters are available for date, action, and user/details search.

## Common Problems

If the app shows a database unavailable message:

1. Confirm MySQL is running.
2. Confirm `.env` has the correct database name, username, and password.
3. Confirm `database/schema.sql` and `database/seed.sql` were applied.
4. Restart the app.

If login fails:

1. Check the username and password.
2. Confirm the account is active in the database.
3. Confirm the seeded admin account exists if this is a new installation.

If a reservation cannot be saved:

1. Check required fields.
2. Confirm end time is after start time.
3. Check the schedule for an active overlapping reservation.

## Data Privacy Reminders

Reservation records include resident names, contact numbers, and addresses. Keep the barangay office computer locked when unattended, limit accounts to authorized personnel, and make regular database backups.
