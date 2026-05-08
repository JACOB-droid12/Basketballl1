# Barangay Basketball Court Scheduling System

Offline barangay-office reservation management system for the basketball court in Barangay Sto. Niño, Parañaque City.

The system is designed for authorized barangay personnel. Residents request reservations in person; staff encode and manage the schedule locally.

## Current Milestone

Milestone 4 authentication/account management is now partially implemented:

- Local Node.js + Express application skeleton
- Local MySQL target schema
- Seed data for reservation statuses, court settings, and hourly time slots
- Architecture and reference review documents
- Handoff document for future Codex turns
- Login handling with bcrypt password verification
- Admin account management, create-account, and activate/deactivate screens
- Add-reservation, reservation-list, reservation-detail, and schedule routes
- Date/time validation and active-overlap prevention logic
- Schedule slot display logic with clickable reserved/available slots
- Activity-log viewing with date, action, and user/details filters
- Reservation CSV export from the filtered reservation list
- Print controls and print-friendly styling for reservation records and schedules
- Tests for validation, overlap rules, query builders, route validation, schedule mapping, login, and account creation

## Target Stack

- Node.js + Express for a simple local web app
- EJS server-rendered pages for straightforward offline deployment
- Local MySQL for reservation, schedule, user, and activity-log records
- bcrypt password hashes for user accounts

The app does not use cloud services for core functionality.

## Quick Start

1. Install Node.js 20+ and MySQL 8+ on the barangay office computer.
2. Copy `.env.example` to `.env` and update the database password and session secret.
3. Install dependencies:

```powershell
npm install
```

4. Create the database:

```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p barangay_court_scheduler < database/seed.sql
```

5. Run the foundation check:

```powershell
npm run verify:foundation
```

6. Run the automated tests:

```powershell
npm test
```

7. Start the local app:

```powershell
npm start
```

Useful local URLs:

- `http://localhost:3000/login`
- `http://localhost:3000/account`
- `http://localhost:3000/schedule`
- `http://localhost:3000/reservations`
- `http://localhost:3000/reservations/new`
- `http://localhost:3000/activity-logs`

Seeded starter login after applying `database/seed.sql`:

- Username: `admin`
- Temporary password: `admin123`

The current sandbox does not have MySQL installed, so live reservation saves still need verification on a computer with local MySQL.

## Documentation

- `docs/USER_GUIDE.md` explains the daily workflow for barangay Admin and Staff users.
- `docs/DEPLOYMENT_GUIDE.md` explains offline Windows + local MySQL installation, startup, backup, restore, and update steps.
- `docs/ISO_25010_EVALUATION.md` maps the system to ISO 25010 quality characteristics for project evaluation.
- `docs/ARCHITECTURE.md` explains the chosen stack and module boundaries.
- `docs/CODEX_HANDOFF.md` records the current milestone state, verification, risks, and next step.
