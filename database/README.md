# Database Setup

The final system targets a local MySQL database running on the same barangay office computer or local network.

## Requirements

- MySQL 8.0 or newer
- A local database account allowed to create databases, tables, triggers, and foreign keys

The current Codex sandbox does not have the `mysql` command installed, so the SQL files were prepared and statically checked but not applied to a live MySQL server in this milestone.

## Create Schema

From the project root:

```powershell
mysql -u root -p < database/schema.sql
```

This creates the `barangay_court_scheduler` database if it does not exist, then creates:

- `users`
- `residents`
- `reservation_statuses`
- `time_slots`
- `court_settings`
- `reservations`
- `activity_logs`

It also creates MySQL triggers that block overlapping active reservations.

## Seed Reference Data

```powershell
mysql -u root -p barangay_court_scheduler < database/seed.sql
```

Seed data includes:

- A starter `admin` account with a bcrypt-hashed temporary password
- Reservation status labels: Available, Reserved, Missed, Cancelled, Completed
- Default hourly time slots from 7:00 AM to 9:00 PM
- Court settings for Barangay Sto. Niño, Parañaque City

## Passwords

The schema stores `password_hash`, not plaintext passwords. The seed includes a starter account for local setup:

- Username: `admin`
- Temporary password: `admin123`

Change this password during the authentication/account-management milestone before presenting or deploying the system.

## Overlap Rule

Only statuses marked with `is_blocking = 1` block future active reservations. The seed marks `Reserved` as blocking. `Cancelled`, `Missed`, and `Completed` do not block new reservations.
