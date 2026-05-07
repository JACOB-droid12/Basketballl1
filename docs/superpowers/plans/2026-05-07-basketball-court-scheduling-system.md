# Basketball Court Scheduling System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first usable offline barangay-office basketball court scheduling system for Barangay Sto. Niño, Parañaque City.

**Architecture:** Use a local server-rendered Express app backed by local MySQL. Keep residents out of remote booking; barangay personnel encode reservations, manage statuses, and view schedule availability from the office computer.

**Tech Stack:** Node.js, Express, EJS, MySQL, mysql2, bcryptjs, Node's built-in test runner for core logic tests.

---

## File Map

- `database/schema.sql`: MySQL tables, constraints, foreign keys, and overlap-prevention triggers
- `database/seed.sql`: reservation statuses, time slots, and court settings
- `src/app.js`: Express app composition
- `src/server.js`: local server entry point
- `src/config/database.js`: MySQL pool factory
- `src/features/reservations/`: future reservation queries, validation, and routes
- `src/features/schedule/`: future available-slot and nearest-slot logic
- `src/features/auth/`: future login, password hashing, and role checks
- `views/`: server-rendered EJS pages
- `public/css/styles.css`: shared office-tool styling
- `tests/`: future unit and integration tests
- `docs/CODEX_HANDOFF.md`: current state and next-step handoff

## Task 1: Foundation

**Files:**

- Create: `package.json`
- Create: `.env.example`
- Create: `database/schema.sql`
- Create: `database/seed.sql`
- Create: `database/README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/REFERENCE_REVIEW.md`
- Create: `docs/CODEX_HANDOFF.md`
- Create: `scripts/verify-foundation.mjs`
- Create: `src/app.js`
- Create: `src/server.js`
- Create: `src/config/database.js`
- Create: `views/login.ejs`
- Create: `public/css/styles.css`

- [x] **Step 1: Inspect workspace and references**

Run:

```powershell
Get-ChildItem -Force
git status --short --branch
```

Expected: new repo with no source files.

- [x] **Step 2: Choose stack**

Decision: Node.js + Express + EJS + local MySQL because Node/npm are available and MySQL remains the required final database target.

- [x] **Step 3: Create schema**

Create MySQL tables for users, residents, reservation statuses, time slots, court settings, reservations, and activity logs. Include insert/update triggers that reject active overlapping reservations.

- [x] **Step 4: Create foundation verification**

Run:

```powershell
npm run verify:foundation
```

Expected: `Foundation verification passed.`

## Task 2: Core Reservation Logic

**Files:**

- Create: `src/features/reservations/reservationValidation.js`
- Create: `src/features/reservations/reservationRepository.js`
- Create: `src/features/reservations/reservationRoutes.js`
- Create: `tests/reservationValidation.test.js`
- Create: `tests/reservationOverlap.test.js`

- [x] **Step 1: Write validation tests**

Cover required fields, valid date, start time before end time, contact number presence, purpose presence, and status validity.

- [x] **Step 2: Implement validation module**

Return field-specific error messages suitable for form display.

- [x] **Step 3: Write overlap tests**

Cover exact duplicate, partial overlap at start, partial overlap at end, contained overlap, adjacent non-overlap, cancelled non-blocking, missed non-blocking, and completed non-blocking.

- [x] **Step 4: Implement overlap query and add-reservation transaction**

Use parameterized MySQL queries and keep the database trigger as a backstop.

- [x] **Step 5: Add reservation list and add form routes**

Provide date and status filters.

## Task 3: Schedule Dashboard

**Files:**

- Create: `src/features/schedule/scheduleService.js`
- Create: `src/features/schedule/scheduleRoutes.js`
- Create: `tests/scheduleService.test.js`
- Create: `views/dashboard.ejs`
- Create: `views/schedule/index.ejs`

- [ ] **Step 1: Write available-slot tests**

Use seeded time slots and sample reservations to verify available, reserved, missed, cancelled, and completed labels.

- [ ] **Step 2: Implement schedule service**

Generate daily schedule rows from time slots and reservations.

- [ ] **Step 3: Implement nearest-slot suggestion**

Search today first, then future dates in order until the configured search limit.

- [ ] **Step 4: Build dashboard and schedule views**

Show today's date, today's reserved slots, available slots, upcoming reservations, and missed items.

## Task 4: Authentication and Account Management

**Files:**

- Create: `src/features/auth/authService.js`
- Create: `src/features/auth/authRoutes.js`
- Create: `src/features/users/userRepository.js`
- Create: `src/middleware/requireAuth.js`
- Create: `src/middleware/requireRole.js`
- Create: `tests/authService.test.js`
- Create: `views/accounts/index.ejs`
- Create: `views/accounts/new.ejs`

- [ ] **Step 1: Write password and duplicate-username tests**

Verify bcrypt hashing, login failure behavior, required fields, duplicate usernames, and admin/staff role validation.

- [ ] **Step 2: Implement login**

Store user id, full name, and role in the session.

- [ ] **Step 3: Implement admin-only account creation**

Match the presentation flow: Account Management, Create Account, validation, success screen, then login with new credentials.

## Task 5: Deployment, Reporting, and ISO Notes

**Files:**

- Create: `docs/USER_GUIDE.md`
- Create: `docs/DEPLOYMENT.md`
- Create: `docs/ISO_25010_EVALUATION_NOTES.md`
- Create: `src/features/logs/logRepository.js`
- Create: `views/logs/index.ejs`

- [ ] **Step 1: Add activity logging**

Log login, reservation creation, edit, cancel, missed, completed, and account creation.

- [ ] **Step 2: Add print-friendly schedule view**

Use CSS print rules for daily schedule and reservation list.

- [ ] **Step 3: Write deployment and user guide**

Include MySQL setup, `.env`, dependency install, local start command, backup notes, and office-user instructions.

- [ ] **Step 4: Write ISO 25010 notes**

Map finished features and evidence to functional suitability, usability, reliability, security, maintainability, and portability.
