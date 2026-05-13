from __future__ import annotations

import os
import re
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    LongTable,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOWNLOADS = Path.home() / "Downloads"
GENERATED_DATE = "May 13, 2026"
PROJECT_NAME = "barangay-basketball-court-scheduler"
TITLE = "Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City"


GROUP_MEMBERS = [
    "Roviklein P. Fabre",
    "Jacob Ethan R. Gabaldon",
    "Peter T. Guo",
    "Zedrick Lonzaga",
    "Benedict Riley D. Quizon",
    "Rhegille Gabriel L. Rodriguez",
]


SOURCE_FILES = [
    ("Project proposal", "Provided file: Project Proposal.pdf", "Available and text-extracted with PyMuPDF."),
    ("Presentation slides", "Provided file: Presentation Slides.pptx", "Available and slide text extracted from the PPTX package."),
    ("Database diagram", "Provided file: Database Diagram.jpg", "Available and visually inspected."),
    ("Actual codebase", "Project repository", "Inspected from source files, SQL, scripts, views, tests, and existing docs."),
]


FEATURES = [
    {
        "name": "Login and session authentication",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/login.ejs",
        "backend": "src/features/users/authRoutes.js:27, src/features/users/userRepository.js:17",
        "database": "users",
        "workflow": "The user enters username and password. The route lowercases the username, finds an active user, compares the submitted password with the bcrypt hash, stores userId/fullName/username/role in the session, and redirects to /dashboard.",
        "validation": "Invalid credentials return a generic error. Inactive users are not returned by findUserByUsername.",
        "defense": "The system uses account login so only authorized barangay personnel can encode and manage reservations.",
    },
    {
        "name": "Role-based access control",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/partials/navigation.ejs, views/account/*.ejs",
        "backend": "src/features/users/authRoutes.js:204, src/features/users/sessionMiddleware.js:1",
        "database": "users.role, users.account_status",
        "workflow": "All operational routes after auth routes use requireSignedIn. Account management uses requireAdmin. Staff accounts are sent directly to password change from Account navigation.",
        "validation": "Role is constrained to ADMIN or STAFF in SQL and in create-account validation.",
        "defense": "Admin has account-management authority; Staff can operate schedules and reservations but cannot create or deactivate accounts.",
    },
    {
        "name": "Admin account creation",
        "status": "Implemented",
        "roles": "Admin",
        "frontend": "views/account/index.ejs, views/account/create.ejs, views/account/success.ejs",
        "backend": "src/features/users/authRoutes.js:119, src/features/users/userValidation.js:1, src/features/users/userRepository.js:38",
        "database": "users",
        "workflow": "Admin opens Account, clicks Create Account, enters full name, username, password, and role. The system validates fields, checks duplicate username, hashes password, inserts ACTIVE account, and shows success.",
        "validation": "Full name, username, password, and role are required. Duplicate usernames return a username-specific error.",
        "defense": "This matches the slide workflow and limits account creation to an authorized Admin.",
    },
    {
        "name": "Account deactivate/reactivate",
        "status": "Implemented",
        "roles": "Admin",
        "frontend": "views/account/index.ejs",
        "backend": "src/features/users/authRoutes.js:179, src/features/users/userRepository.js:120",
        "database": "users.account_status",
        "workflow": "Admin clicks Deactivate or Reactivate on another user row. The system updates account_status.",
        "validation": "The current Admin cannot deactivate the account currently signed in.",
        "defense": "The barangay can remove access without deleting account history.",
    },
    {
        "name": "Change password",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/account/password.ejs",
        "backend": "src/features/users/authRoutes.js:77, src/features/users/userValidation.js:37, src/features/users/userRepository.js:129",
        "database": "users.password_hash",
        "workflow": "Signed-in user enters current password, new password, and confirmation. Current password is checked with bcrypt, then a new bcrypt hash is stored.",
        "validation": "Current password, new password, and confirmation are required. Confirmation must match.",
        "defense": "The starter password can be replaced after installation, which is important for office security.",
    },
    {
        "name": "Dashboard / Home schedule overview",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/dashboard.ejs",
        "backend": "src/features/schedule/dashboardRoutes.js:18, src/features/schedule/scheduleService.js:86",
        "database": "time_slots, reservations, reservation_statuses",
        "workflow": "The dashboard collects today, upcoming, suggestion, and weekly reservation data, builds daily and weekly schedules, counts available/reserved/missed slots, and displays nearest available slot.",
        "validation": "Database errors are caught and shown as a controlled database-unavailable message.",
        "defense": "Home gives personnel a quick operational view before accepting a resident request.",
    },
    {
        "name": "Daily schedule viewing",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/schedule/index.ejs",
        "backend": "src/features/schedule/scheduleRoutes.js:12, src/features/schedule/scheduleService.js:11",
        "database": "time_slots, reservations",
        "workflow": "Personnel select a date. The system maps active time slots against reservations for that date, marks open slots as Available, and links reserved slots to details.",
        "validation": "Unavailable database returns a clear message instead of crashing the app.",
        "defense": "The schedule screen answers the main office question: what time is free and what time is already reserved?",
    },
    {
        "name": "Reservation creation",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/reservations/new.ejs",
        "backend": "src/features/reservations/reservationRoutes.js:182, src/features/reservations/reservationRepository.js:233, src/features/reservations/reservationValidation.js:5",
        "database": "reservations, residents, reservation_statuses, activity_logs",
        "workflow": "Staff enters date, start time, end time, representative name, contact number, address, purpose, and remarks. The system validates input, checks overlap, creates/reuses resident, inserts reservation, and writes CREATE_RESERVATION log.",
        "validation": "Date, start time, end time, representative, contact, address, and purpose are required. End time must be after start time. Date cannot be before today.",
        "defense": "Reservation creation digitizes the staff encoding process while preserving in-person resident coordination.",
    },
    {
        "name": "Reservation overlap prevention",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "Reservation form error display",
        "backend": "src/features/reservations/reservationRepository.js:135, src/features/reservations/reservationOverlap.js:41",
        "database": "database/schema.sql:147, database/schema.sql:183",
        "workflow": "Before insert/update, the repository searches for a blocking same-date overlap. MySQL triggers also reject direct overlapping writes where both records are blocking.",
        "validation": "The overlap rule is startA < endB and endA > startB. Adjacent slots are allowed. Only RESERVED blocks.",
        "defense": "Double booking is prevented in both application logic and database logic.",
    },
    {
        "name": "Reservation editing",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/reservations/edit.ejs",
        "backend": "src/features/reservations/reservationRoutes.js:90, src/features/reservations/reservationRepository.js:285",
        "database": "reservations, residents, activity_logs",
        "workflow": "Personnel open an existing record, edit details, pass the same validation and overlap checks, then the system updates the row and logs UPDATE_RESERVATION.",
        "validation": "Same reservation validation rules apply. Missing row returns not found.",
        "defense": "Edits support realistic office corrections while keeping the conflict rule active.",
    },
    {
        "name": "Reservation status updates",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/reservations/index.ejs, views/reservations/show.ejs",
        "backend": "src/features/reservations/reservationRoutes.js:214, src/features/reservations/reservationRepository.js:328",
        "database": "reservation_statuses, reservations, activity_logs",
        "workflow": "Personnel mark a record MISSED, CANCELLED, or COMPLETED. The status is updated and an activity log is written.",
        "validation": "Only MISSED, CANCELLED, and COMPLETED are accepted by the route.",
        "defense": "The system preserves schedule history and can record no-shows or finished reservations.",
    },
    {
        "name": "Reservation list, filtering, print, and CSV export",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/reservations/index.ejs",
        "backend": "src/features/reservations/reservationRoutes.js:29, src/features/reservations/reservationExport.js:13",
        "database": "reservations, residents, reservation_statuses, users",
        "workflow": "Personnel filter by date, status, name/contact, or purpose. They can print records or export filtered records as reservations.csv.",
        "validation": "Export uses the same filters as the list.",
        "defense": "Reports and printed records support barangay documentation without adding online services.",
    },
    {
        "name": "Activity logs",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/activityLogs/index.ejs",
        "backend": "src/features/activityLogs/activityLogRoutes.js:13, src/features/activityLogs/activityLogRepository.js:1",
        "database": "activity_logs",
        "workflow": "Reservation create/edit/status actions write logs. The log page filters by date, action, and user/details search.",
        "validation": "Log list is limited to 200 recent records.",
        "defense": "Logs give the barangay traceability for who encoded or changed reservation records.",
    },
    {
        "name": "Nearest available slot suggestion",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "views/dashboard.ejs",
        "backend": "src/features/schedule/scheduleService.js:66",
        "database": "time_slots, reservations",
        "workflow": "The service searches from today across a 14-day window and returns the first non-blocking slot.",
        "validation": "The search depends on seeded active time slots and reservation statuses.",
        "defense": "This supports the proposal requirement to suggest the next possible time when a requested slot is unavailable.",
    },
    {
        "name": "Prototype frontend and API bridge",
        "status": "Implemented",
        "roles": "Admin, Staff",
        "frontend": "public/prototype/sto-nino-court-reservation-system-prototype.html, public/js/prototype-backend.js",
        "backend": "src/features/prototype/prototypeRoutes.js:18, src/features/prototype/prototypeApiRoutes.js:36",
        "database": "users, reservations, residents",
        "workflow": "The app serves the supplied prototype at /, /prototype, and /app, injects a local backend bridge, and exposes prototype API routes for login, reservations, statuses, and accounts.",
        "validation": "Routes require session login; account API requires Admin role.",
        "defense": "The prototype UI is used as the visible office interface while persistence remains in the local backend/database.",
    },
    {
        "name": "Offline startup and maintenance scripts",
        "status": "Implemented",
        "roles": "Installer/Admin, Staff",
        "frontend": "START-HERE.bat, start-barangay-office.bat, maintenance-tools/*.bat",
        "backend": "scripts/*.mjs, scripts/*.ps1, src/serverStartup.js",
        "database": "Local MySQL/MariaDB from .env or bundled runtime",
        "workflow": "START-HERE.bat provides setup and maintenance. start-barangay-office.bat checks runtime, .env, database readiness, starts local app, and opens the browser.",
        "validation": "Scripts verify Node, npm, node_modules, .env, database connectivity, bundle contents, and runtime package readiness.",
        "defense": "The system is offline because the server and database run on the barangay computer and the browser is only the local interface.",
    },
    {
        "name": "Database backup and restore",
        "status": "Implemented as scripts, not in-app buttons",
        "roles": "Installer/Admin or technical support",
        "frontend": "maintenance-tools/backup-database.bat, maintenance-tools/restore-database.bat",
        "backend": "scripts/backup-mysql.mjs, scripts/restore-mysql.mjs",
        "database": "MySQL/MariaDB database dump",
        "workflow": "Backup uses mysqldump with routines/triggers. Restore requires an explicit .sql file path.",
        "validation": "Tests cover backup/restore helpers. Actual restore should be handled carefully because it can replace data.",
        "defense": "Backup/restore exists as maintenance tooling, not as a normal staff screen.",
    },
]


REQUIREMENTS = [
    ("Offline barangay-office deployment", "Proposal pages 2 and 4; slides 10, 13, 34, 36", "Implemented", "README.md; docs/DEPLOYMENT_GUIDE.md; START-HERE.bat; start-barangay-office.bat", "Browser is local interface; backend and database run locally."),
    ("Residents coordinate in person, not remotely", "Proposal page 2; slides 10, 13", "Implemented by scope", "No resident self-service public booking routes; auth protects office routes", "The prototype/API is for personnel after login."),
    ("Monitor available court schedules", "Proposal page 3; slide 28; slide 34", "Implemented", "src/features/schedule/scheduleRoutes.js; views/schedule/index.ejs", "Shows available/reserved/missed/cancelled/completed slot states."),
    ("Display reserved and available time slots", "Proposal page 4; slides 8 and 34", "Implemented", "scheduleService.js; dashboard.ejs; schedule/index.ejs", "Available slots are derived from active time slots minus blocking reservations."),
    ("Prevent overlapping schedules", "Proposal objectives page 2; expected benefits page 3", "Implemented", "reservationRepository.js; reservationOverlap.js; database/schema.sql triggers", "App-level and database-level conflict protection."),
    ("Maximize court utilization", "Proposal objective page 2; slide 6", "Implemented support", "Dashboard counts; nearest available slot; schedule visibility", "The system supports utilization through visibility, not automated allocation."),
    ("Reservation encoding by barangay personnel", "Proposal pages 2-3; slide 10", "Implemented", "POST /reservations; prototype POST /api/prototype/reservations", "Requires authenticated session."),
    ("Reservation records administrative interface", "Proposal page 4; slide 34", "Implemented", "views/reservations/index.ejs; reservationRoutes.js", "List/filter/export/print/status actions."),
    ("Nearest available time if no slot is available today", "Proposal page 4; slide 34", "Implemented", "scheduleService.js findNearestAvailableSlot; dashboardRoutes.js", "Dashboard shows nearest available slot in 14-day search window."),
    ("Mark missed request as Missed", "Proposal page 4; slide 34", "Implemented", "POST /reservations/:reservationId/status; reservation_statuses seed", "Missed is non-blocking after status change."),
    ("Admin account creation", "Slides 20-26", "Implemented", "authRoutes.js; userRepository.js; account/create.ejs", "Admin-only workflow with required fields and duplicate username validation."),
    ("Duplicate username validation", "Slide 21", "Implemented", "DuplicateUsernameError; userValidation.js; users unique index", "Both application and database uniqueness exist."),
    ("Activity logs", "Slide 10; slide 28", "Implemented", "activity_logs table; activityLogRoutes.js", "Reservation actions are recorded; account actions are not logged in current code."),
    ("ISO 25010 evaluation", "Proposal page 2; slide 36", "Documented, not an automated test suite", "docs/ISO_25010_EVALUATION.md", "The repo provides mapping and suggested evaluation tasks."),
    ("Formal turnover with documentation and user guides", "Slide 36", "Implemented documentation; turnover not verifiable", "README.md; docs/USER_GUIDE.md; docs/DEPLOYMENT_GUIDE.md", "Actual barangay training/sign-off remains an external activity."),
    ("Online public booking", "Not in scope; slide 13 says offline preferred", "Not implemented", "No public resident booking routes", "Correctly outside current scope."),
    ("Online payment", "Not proposed", "Not implemented", "No payment dependencies or routes", "Future enhancement only."),
    ("Mobile app", "Not proposed", "Not implemented", "No Android/iOS project", "Future enhancement only."),
    ("Multi-court scheduling", "Proposal says the basketball court located in Barangay Sto. Niño", "Not implemented", "Schema has no courts table", "Future enhancement only."),
]


TEST_MATRIX = [
    ("TC-01", "Login", "Valid active account", "Open login, enter valid username/password, submit.", "Redirect to dashboard.", "Implemented and covered by auth route tests.", "High"),
    ("TC-02", "Login", "Invalid credentials", "Submit wrong username or password.", "Generic invalid username or password error.", "Implemented and covered.", "High"),
    ("TC-03", "Account creation", "Valid Staff account", "Admin opens Account > Create Account, fills all fields.", "Account saved; success screen shown.", "Implemented and covered.", "High"),
    ("TC-04", "Account creation", "Duplicate username", "Create account with existing username.", "Username already exists error.", "Implemented and covered.", "High"),
    ("TC-05", "Account status", "Deactivate Staff", "Admin clicks Deactivate on another account.", "Account becomes inactive.", "Implemented and covered.", "Medium"),
    ("TC-06", "Account status", "Self-deactivation", "Admin attempts to deactivate current account.", "System rejects action.", "Implemented and covered.", "Medium"),
    ("TC-07", "Reservation", "Available slot", "Enter valid reservation for open date/time.", "Reservation saved and listed.", "Implemented and covered.", "High"),
    ("TC-08", "Reservation", "Overlapping slot", "Try to reserve time overlapping a RESERVED record.", "Conflict message; record not saved.", "Implemented and covered.", "High"),
    ("TC-09", "Reservation", "Adjacent slot", "Reserve 8-9 after 7-8 record.", "Allowed.", "Implemented and covered by overlap tests.", "Medium"),
    ("TC-10", "Reservation", "Past date", "Submit date before today.", "Rejected when route requires today/future.", "Implemented and covered.", "Medium"),
    ("TC-11", "Reservation edit", "Change valid reservation", "Open detail, edit date/time/details.", "Updated details displayed.", "Implemented and covered.", "High"),
    ("TC-12", "Reservation edit", "Edit into conflict", "Move reservation into existing blocking slot.", "Rejected.", "Implemented and covered.", "High"),
    ("TC-13", "Status", "Mark Missed", "Click Missed on list/detail.", "Status changes; log written.", "Implemented and covered.", "High"),
    ("TC-14", "Status", "Mark Completed", "Click Completed.", "Status changes; log written.", "Implemented and covered.", "Medium"),
    ("TC-15", "Status", "Cancel", "Click Cancelled.", "Status changes; log written.", "Implemented and covered.", "Medium"),
    ("TC-16", "Schedule", "View schedule", "Open Schedule for date.", "Slots show available or reservation detail links.", "Implemented and covered.", "High"),
    ("TC-17", "Dashboard", "Nearest available", "Open dashboard with mixed slot data.", "Nearest available slot appears when found.", "Implemented and covered.", "Medium"),
    ("TC-18", "Activity logs", "Filter logs", "Open Activity Logs and filter by action/date/search.", "Matching recent logs shown.", "Implemented and covered.", "Medium"),
    ("TC-19", "Export", "CSV export", "Filter reservations and click Export CSV.", "Filtered CSV downloads.", "Implemented and covered.", "Medium"),
    ("TC-20", "Print", "Print records/schedule", "Click Print Records or Print Schedule.", "Browser print dialog with print-friendly content.", "Implemented in UI/CSS; printer output requires office check.", "Medium"),
    ("TC-21", "Offline startup", "Daily launcher", "Run start-barangay-office.bat.", "Checks runtime/database and starts local app.", "Implemented and covered by script tests.", "High"),
    ("TC-22", "Database unavailable", "MySQL stopped", "Open app when database cannot connect.", "Controlled database-unavailable message.", "Implemented and covered.", "High"),
    ("TC-23", "Backup", "Create backup", "Run maintenance backup command.", "Timestamped SQL file created.", "Implemented and tested as script helper; live office check needed.", "Medium"),
    ("TC-24", "Restore", "Restore explicit .sql", "Run restore with backup path.", "Database restored.", "Implemented and tested as script helper; use carefully.", "Medium"),
]


FILES_BY_MODULE = [
    ("Root/runtime", "package.json", "Defines Node/Express app, scripts, dependencies, Node >=20 requirement."),
    ("Root/runtime", ".env.example", "Documents local app/database/verification environment variables."),
    ("Entry point", "src/server.js", "Loads dotenv, creates app, starts local server on APP_PORT."),
    ("Entry point", "src/app.js", "Creates Express app, session middleware, static files, auth routes, protected feature routes."),
    ("Startup", "src/serverStartup.js", "Builds office URL, checks already-running app, opens browser only when requested."),
    ("Database", "src/config/database.js", "Creates mysql2 promise pool from DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD."),
    ("Users", "src/features/users/authRoutes.js", "Login, logout, account list/create/status, and password change routes."),
    ("Users", "src/features/users/userRepository.js", "User queries, duplicate username check, bcrypt hashing, status/password updates."),
    ("Users", "src/features/users/userValidation.js", "Create-account and password-change validation."),
    ("Users", "src/features/users/sessionMiddleware.js", "Redirects unauthenticated users to login."),
    ("Reservations", "src/features/reservations/reservationRoutes.js", "Reservation list/export/new/show/edit/status routes."),
    ("Reservations", "src/features/reservations/reservationRepository.js", "Reservation SQL, resident creation/reuse, status lookup, overlap query, logs."),
    ("Reservations", "src/features/reservations/reservationValidation.js", "Date/time/person/contact/address/purpose/status validation."),
    ("Reservations", "src/features/reservations/reservationOverlap.js", "Pure time-overlap helper logic."),
    ("Reservations", "src/features/reservations/reservationExport.js", "CSV export formatting."),
    ("Schedule", "src/features/schedule/scheduleService.js", "Daily/weekly schedule mapping, nearest slot, dashboard summary."),
    ("Schedule", "src/features/schedule/dashboardRoutes.js", "Home dashboard data assembly."),
    ("Schedule", "src/features/schedule/scheduleRoutes.js", "Daily schedule page."),
    ("Activity logs", "src/features/activityLogs/activityLogRepository.js", "Activity log filter query and row mapping."),
    ("Activity logs", "src/features/activityLogs/activityLogRoutes.js", "Activity log page route."),
    ("Prototype", "src/features/prototype/prototypeRoutes.js", "Serves supplied prototype and injects local backend bridge."),
    ("Prototype", "src/features/prototype/prototypeApiRoutes.js", "JSON API for prototype login, reservations, statuses, and accounts."),
    ("Views", "views/*.ejs", "Server-rendered login, dashboard, schedule, reservation, account, and log pages."),
    ("Assets", "public/css/styles.css", "Barangay-style red/gold/tan interface and print styles."),
    ("Assets", "public/js/prototype-backend.js", "Connects prototype UI to backend API."),
    ("SQL", "database/schema.sql", "Creates database, tables, foreign keys, checks, indexes, and overlap triggers."),
    ("SQL", "database/seed.sql", "Seeds starter admin, statuses, hourly slots, and court settings."),
    ("SQL", "database/diagnostics.sql", "Read-only database setup checks."),
    ("Offline setup", "START-HERE.bat", "Main setup/maintenance launcher."),
    ("Offline setup", "start-barangay-office.bat", "Daily startup launcher."),
    ("Offline setup", "maintenance-tools/*.bat", "Setup, backup, restore, readiness, shortcut, sign-off wrappers."),
    ("Scripts", "scripts/*.mjs and scripts/*.ps1", "Verification, setup, runtime, backup/restore, and bundling automation."),
    ("Tests", "tests/*.test.js", "32 Node test files for routes, repositories, validation, SQL/static checks, offline tooling, and UI smoke checks."),
]


def table(headers, rows):
    out = []
    out.append("| " + " | ".join(headers) + " |")
    out.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for row in rows:
        out.append("| " + " | ".join(str(cell).replace("\n", "<br>") for cell in row) + " |")
    return "\n".join(out)


def feature_markdown():
    chunks = []
    for feature in FEATURES:
        chunks.append(f"### {feature['name']}\n")
        chunks.append(table(
            ["Item", "Verified detail"],
            [
                ("Implementation status", feature["status"]),
                ("Role involved", feature["roles"]),
                ("Frontend/UI reference", feature["frontend"]),
                ("Backend/API reference", feature["backend"]),
                ("Database reference", feature["database"]),
                ("Workflow", feature["workflow"]),
                ("Validation and errors", feature["validation"]),
                ("Defense explanation", feature["defense"]),
            ],
        ))
        chunks.append("")
    return "\n".join(chunks)


def database_codex():
    rows = [
        ("users", "Admin and Staff accounts", "user_id, full_name, username, password_hash, role, account_status", "Unique username; role ADMIN/STAFF; active/inactive status", "Login, account management, reservation creator/approver, activity logs"),
        ("residents", "Resident or group representative records", "resident_id, full_name, contact_no, address", "Indexes on name and contact", "Reservation representative details"),
        ("reservation_statuses", "Reference status list", "status_id, status_code, status_name, is_blocking, display_order", "Unique status code; is_blocking 0/1", "Reserved blocks; Available/Missed/Cancelled/Completed do not block"),
        ("time_slots", "Default schedule slots", "slot_id, name, start_time, end_time, display_order, is_active", "Unique time range; end_time > start_time", "Schedule grid and nearest-slot search"),
        ("court_settings", "Local system settings", "setting_key, setting_value, description, updated_at", "Primary key setting_key", "Barangay/court/timezone/opening/closing settings"),
        ("reservations", "Reservation transaction records", "reservation_id, resident_id, time_slot_id, status_id, approved_by_user_id, created_by_user_id, reservation_date, start_time, end_time, purpose, remarks", "Foreign keys; date/time indexes; end_time > start_time", "Core reservation management"),
        ("activity_logs", "Audit trail for reservation actions", "log_id, reservation_id, user_id, action, details, created_at", "Foreign keys to reservations/users; indexes", "Activity log monitoring"),
    ]
    return table(["Table", "Purpose", "Important fields", "Constraints/indexes", "Supported features"], rows)


def qas():
    groups = {
        "General Project Questions": [
            ("What is the project?", "It is an offline computer-based basketball court scheduling system for Barangay Sto. Niño, Parañaque City."),
            ("Who uses the system?", "Authorized barangay Admin and Staff users use it in the barangay office."),
            ("Can residents reserve online?", "No. Residents coordinate in person with barangay personnel, who encode reservations."),
            ("Why is the project needed?", "It reduces informal scheduling conflicts and keeps reservation records organized."),
            ("What problem does it solve?", "It helps prevent double booking and gives personnel a clear view of available and reserved slots."),
            ("Is the court still free for residents?", "Yes. The proposal says the court is free; the system only organizes reservation records."),
            ("What is the project title?", TITLE),
            ("What is the main defense message?", "The project digitizes office-side scheduling without changing the barangay's in-person reservation policy."),
        ],
        "Problem and Objectives": [
            ("What causes scheduling conflicts?", "The proposal says court use can be informal and multiple groups may want the same time."),
            ("How does the system organize reservations?", "It stores each reservation with date, start/end time, representative, contact, address, purpose, and status."),
            ("How does it prevent overlaps?", "The app checks existing blocking reservations, and database triggers reject overlapping active records."),
            ("How does it maximize usage?", "It shows open slots and a nearest available slot so personnel can offer another schedule."),
            ("How does it maintain updated records?", "Reservation create/edit/status actions update database records and write activity logs."),
            ("What feature supports available-slot visibility?", "The Schedule and Dashboard pages derive available slots from active time slots and reservations."),
            ("What objective is most important?", "Preventing overlapping reservations is central because it directly solves the conflict problem."),
            ("How should we explain fairness?", "The system gives staff a consistent record-based way to check and assign court times."),
        ],
        "Scope and Limitations": [
            ("What is included in scope?", "Offline office installation, staff encoding, schedule viewing, reservation management, accounts, logs, and setup docs."),
            ("What is outside scope?", "Public online booking, resident self-service, online payment, mobile app, and multi-court scheduling."),
            ("Why no online deployment?", "Barangay officials prefer an offline setup and direct management at the office."),
            ("Is offline a weakness?", "It is a design choice that matches the barangay preference, though cloud backup or online booking can be future work."),
            ("Can the system be used from another city office?", "Not currently; it is designed for one barangay office computer."),
            ("Does it support multiple courts?", "No. The current schema has no courts table."),
            ("Does it send SMS notifications?", "No. SMS is a future enhancement only."),
            ("What limitation should be admitted?", "Final deployment sign-off must still be done on the actual target office computer and printer."),
        ],
        "Technical Architecture": [
            ("What stack is used?", "Node.js, Express, EJS, MySQL/MariaDB, express-session, bcryptjs, dotenv, and mysql2."),
            ("Why Express and EJS?", "They support a simple server-rendered local app with no separate frontend build requirement."),
            ("Where is the app entry point?", "src/server.js starts the app created by src/app.js."),
            ("How does the frontend communicate with backend?", "EJS pages submit forms to Express routes; the prototype uses JSON routes under /api/prototype."),
            ("How does backend communicate with database?", "mysql2 promise pool in src/config/database.js executes parameterized SQL."),
            ("What is localhost?", "It is the local computer address used by the browser to talk to the local server."),
            ("Is this a public website?", "No. The browser opens a local URL for the local office app."),
            ("What files start the system?", "START-HERE.bat is the setup launcher and start-barangay-office.bat starts daily office use."),
        ],
        "Database": [
            ("What database is used?", "The target is local MySQL, with MariaDB accepted if it passes verification."),
            ("What are the main tables?", "users, residents, reservation_statuses, time_slots, court_settings, reservations, and activity_logs."),
            ("What table stores accounts?", "users."),
            ("What table stores reservation records?", "reservations, linked to residents, users, statuses, and optionally time_slots."),
            ("What table stores available status?", "reservation_statuses stores AVAILABLE as a reference, but actual availability is derived."),
            ("How are time slots stored?", "time_slots stores one-hour active slots from 7:00 AM to 9:00 PM in seed.sql."),
            ("What does is_blocking mean?", "It marks whether a status blocks another reservation; RESERVED is blocking."),
            ("What did the implementation improve from the diagram?", "The diagram had password; implementation uses password_hash with bcrypt."),
        ],
        "UI and UX": [
            ("What pages exist?", "Login, Home/Dashboard, Schedule, Reservations, Reservation Details, Add/Edit Reservation, Account, Change Password, Activity Logs, and prototype UI."),
            ("How is the UI designed for staff?", "It uses office-style forms, tables, schedule rows, and direct navigation."),
            ("What does Home show?", "Today summary, weekly schedule, available/reserved counts, missed records, upcoming reservations, and nearest available slot."),
            ("What does Schedule show?", "The selected date's time slots and whether each slot is available or linked to a reservation."),
            ("How can staff create a reservation from the schedule?", "Available slot links open the Add Reservation page with date/time prefilled."),
            ("Can staff print schedules?", "Yes, Schedule has Print Schedule and Reservations has Print Records."),
            ("Can staff export records?", "Yes, the Reservations page exports filtered records as CSV."),
            ("Does the UI copy the proposal mockups exactly?", "It follows the red/gold/tan barangay-office direction and also serves the supplied prototype."),
        ],
        "Security": [
            ("How are passwords stored?", "As bcrypt hashes in users.password_hash, not plaintext."),
            ("Who can create accounts?", "Only Admin users through Admin-protected account routes."),
            ("Can inactive users log in?", "No. findUserByUsername only returns ACTIVE accounts."),
            ("What protects SQL queries?", "The code uses mysql2 named parameters instead of string-concatenated SQL."),
            ("Is the system highly secure?", "Do not overclaim. It has basic local-app safeguards: sessions, roles, bcrypt, and parameterized queries."),
            ("What is a security risk?", "A shared office computer can expose data if left unlocked or if passwords are shared."),
            ("What should be done after first setup?", "Change the temporary admin password or create a real Admin and deactivate the starter account."),
            ("Does offline deployment improve security?", "It reduces internet exposure, but local access and backups still need protection."),
        ],
        "Testing": [
            ("Are there automated tests?", "Yes. The repository has 32 Node test files."),
            ("What do tests cover?", "Routes, repositories, validation, overlap logic, auth, schedule service, SQL static checks, offline tooling, backup/restore helpers, and UI smoke rendering."),
            ("What command runs tests?", "npm test."),
            ("Is live MySQL always tested by npm test?", "No. live MySQL verification uses npm run verify:mysql and needs a reachable local database."),
            ("How should overlap be tested?", "Create one RESERVED record, then attempt an overlapping reservation and confirm it is rejected."),
            ("How should database failure be tested?", "Stop MySQL and confirm pages show a controlled database-unavailable message."),
            ("What needs manual office testing?", "Real printer output, actual office database startup, and final barangay sign-off."),
            ("Why include manual tests?", "Some deployment conditions depend on the actual office computer and printer."),
        ],
        "Deployment": [
            ("How is it deployed?", "As an offline Windows local web app with setup/start scripts and local database configuration."),
            ("What does START-HERE.bat do?", "It is the setup and maintenance launcher for first-time setup, checks, backup, restore, shortcuts, and sign-off."),
            ("What does start-barangay-office.bat do?", "It checks runtime and database readiness, starts the app, and opens the local browser URL."),
            ("Does normal use need internet?", "Core operation is designed not to need internet after dependencies/runtime/database are prepared."),
            ("What is the daily staff process?", "Double-click Barangay Court Scheduler, keep the startup window open, log in, manage schedules."),
            ("What is backed up?", "The MySQL/MariaDB database through mysqldump SQL files."),
            ("Where is configuration stored?", ".env stores app port, session secret, and database connection values."),
            ("What must be repeated on the actual office PC?", "Run setup, verify database, test browser, print, backup, and sign-off."),
        ],
        "ISO 25010": [
            ("What is ISO 25010?", "A software quality model used to evaluate product quality characteristics."),
            ("How does functional suitability apply?", "The system provides reservation, schedule, account, and record-management functions aligned with objectives."),
            ("How does usability apply?", "Screens are simple, local, and designed for barangay personnel workflows."),
            ("How does reliability apply?", "Validation, database constraints, and overlap triggers reduce invalid records."),
            ("How does security apply?", "Login, bcrypt hashes, Admin-only account management, sessions, and local data storage support basic security."),
            ("How does maintainability apply?", "Feature folders, SQL files, scripts, docs, and tests make the system easier to maintain."),
            ("How does portability apply?", "It can be copied as an offline Windows package when required runtime files are included."),
            ("What ISO weakness should be admitted?", "Compatibility and portability still need final target-PC verification."),
        ],
        "Future Improvements": [
            ("What future feature is most useful?", "SMS notifications or printable confirmation slips could improve communication without changing the current office workflow."),
            ("Could it become online later?", "Yes, but online booking is a future enhancement and not current scope."),
            ("Could residents self-book later?", "Yes, with barangay approval rules, but current design keeps personnel as direct managers."),
            ("Could it support multiple courts?", "Yes, by adding a courts table and linking reservations/time slots to courts."),
            ("Could analytics be added?", "Yes, usage reports by date, purpose, or group could help planning."),
            ("Could cloud backup be added?", "Yes, but it would require internet and data-protection policies."),
            ("Could QR confirmations be added?", "Yes, future printable or QR-coded reservation receipts could be added."),
            ("How should future improvements be presented?", "Clearly label them as future work, not current implemented features."),
        ],
    }
    lines = []
    count = 0
    for group, items in groups.items():
        lines.append(f"## {group}\n")
        for q, a in items:
            count += 1
            lines.append(f"**Q{count}. {q}**\n\n{a}\n")
    return "\n".join(lines), count


def implementation_report():
    md = []
    md.append(f"# Implementation Verification Report\n")
    md.append(f"Generated: {GENERATED_DATE}\n")
    md.append("This report compares the proposal, presentation slides, database diagram, and actual codebase. The rule used here is conservative: a feature is marked implemented only when there is code, SQL, script, view, or test evidence in the repository.\n")
    md.append("## Source Materials\n")
    md.append(table(["Source", "Location", "Use"], SOURCE_FILES))
    md.append("\n## Proposed Requirements vs Actual Implementation\n")
    md.append(table(["Requirement / feature", "Source from proposal/slides", "Implementation status", "Evidence from code files", "Notes / recommended action"], REQUIREMENTS))
    md.append("\n## Database Diagram Comparison\n")
    md.append(table(
        ["Diagram concept", "Implemented schema", "Status", "Comment"],
        [
            ("STAFF", "users", "Adapted / implemented", "Admin and Staff are unified in users with role and account_status."),
            ("password", "password_hash", "Improved", "Implementation stores bcrypt hash instead of plaintext password."),
            ("RESIDENTS", "residents", "Implemented", "Fields align with full name, contact number, and address."),
            ("RESERVATIONS", "reservations", "Implemented and expanded", "Implementation stores exact start/end time, purpose, remarks, creator/approver, and timestamps."),
            ("TIME_SLOTS", "time_slots", "Implemented", "Seeded one-hour active slots from 07:00 to 21:00."),
            ("RESERVATION_STATUS", "reservation_statuses", "Implemented and expanded", "Adds status_code, is_blocking, and display_order."),
            ("LOGS", "activity_logs", "Implemented", "Stores reservation/user/action/details/timestamp."),
        ],
    ))
    md.append("\n## Feature Evidence Summary\n")
    md.append(table(["Feature", "Status", "Primary evidence"], [(f["name"], f["status"], f"{f['frontend']} / {f['backend']} / {f['database']}") for f in FEATURES]))
    md.append("\n## Open Questions and Verification Gaps\n")
    md.append("- Final barangay-office deployment sign-off is not provable from the repository alone; it must be rerun on the actual target computer.\n- Printer output requires office browser/printer checking.\n- Barangay policy rules for approval priority, maximum reservation duration, and allowed reservation days are not encoded beyond date/time conflict prevention.\n- Account actions are not currently written to activity_logs; reservation actions are logged.\n- There is no in-app backup/restore screen; backup/restore exists as maintenance tooling.\n")
    return "\n".join(md)


def project_codex_md(qa_count: int):
    md = []
    md.append(f"# {TITLE}\n")
    md.append("## Project Documentation and Defense Reviewer\n")
    md.append(f"Generated: {GENERATED_DATE}\n\nRepository / project name: `{PROJECT_NAME}`\n")
    md.append("Group members from proposal:\n")
    for member in GROUP_MEMBERS:
        md.append(f"- {member}")
    md.append("\n## Source Materials and Verification Rule\n")
    md.append(table(["Source", "Location", "Use"], SOURCE_FILES))
    md.append("\nThis document separates proposed requirements from implemented behavior. When the repository contains source-code, SQL, view, script, or test evidence, the feature is labeled Implemented. When a feature appears in the proposal or slides but not in code, it is labeled Proposed / Not yet verified in implementation or Not implemented.\n")
    md.append("## Executive Summary\n")
    md.append("The Basketball Court Scheduling System is an offline office-based system for Barangay Sto. Niño, Parañaque City. It helps barangay personnel encode, view, and manage basketball court reservations. Residents do not reserve remotely. They visit or coordinate with the barangay office, and authorized Admin or Staff users record the request in the system. The system solves the practical problem of unorganized scheduling by showing available and reserved time slots, preventing overlapping active reservations, and keeping updated reservation records. Offline deployment matches the barangay preference stated in the proposal and slides: the system is installed on a barangay office computer and is used locally through a browser interface.\n")
    md.append("## Project Background\n")
    md.append("The proposal describes the basketball court as a community venue for recreation, friendship, and social interaction. Because residents and groups may want the court at the same time, informal scheduling can lead to conflict and misunderstanding. A digital schedule is appropriate because the main problem is not payment or remote access; it is record organization, conflict prevention, and visibility. Barangay personnel remain the direct managers because the proposal states that the court is free for residents and that the barangay wants direct control to ensure proper and fair use.\n")
    md.append("## Project Objectives\n")
    md.append(table(
        ["Objective", "Meaning", "Supporting feature", "Defense talking point"],
        [
            ("Organize the reservation system", "Move from informal arrangements to recorded reservations.", "Reservations list, detail, add/edit forms, statuses.", "The system creates a single office record for court use."),
            ("Prevent overlapping schedules", "Stop two active groups from occupying the same date/time.", "Application overlap query and MySQL triggers.", "Conflict prevention is enforced before save and at database level."),
            ("Maximize court utilization", "Make unused slots visible and easier to offer.", "Schedule view, dashboard counts, nearest available slot.", "Staff can quickly offer another open time."),
            ("Help personnel manage schedules", "Give Admin/Staff a simple office interface.", "Login, Home, Schedule, Reservations, Activity Logs.", "The system supports actual barangay workflow instead of public self-service."),
            ("Maintain updated records", "Keep stored history of reservations and status changes.", "MySQL tables, activity logs, export/print.", "Records remain searchable and printable."),
            ("Provide slot visibility", "Show what is reserved and available.", "Daily schedule and weekly dashboard.", "The schedule is the main evidence that the court is organized."),
        ],
    ))
    md.append("\n## Scope of the Project\n")
    md.append("Included scope verified from proposal, slides, and implementation:\n\n- Offline installation at the barangay office.\n- Reservation encoding by authorized personnel.\n- Schedule monitoring and available/reserved slot display.\n- Reservation create, view, edit, filter, export, print, and status update workflows.\n- Admin account management and Staff/Admin login.\n- Nearest available slot suggestion on the dashboard.\n- Missed, Cancelled, and Completed status marking.\n- Activity logs for reservation actions.\n- Offline setup, startup, backup, restore, diagnostics, and sign-off scripts.\n")
    md.append("Outside scope:\n\n- No online public booking.\n- No resident self-service remote reservation.\n- No online payment system.\n- No mobile app.\n- No multi-court or city-wide scheduling.\n- No SMS/email notification.\n")
    md.append("## Limitations of the Study\n")
    md.append(table(
        ["Limitation", "Reason", "Design choice or constraint", "Defense answer", "Future improvement"],
        [
            ("Offline-only office use", "Barangay officials prefer offline setup.", "Design choice from proposal/slides.", "It matches the barangay workflow and reduces dependence on internet.", "Optional online portal or cloud backup."),
            ("Residents must coordinate with personnel", "The barangay directly manages free court use.", "Design choice.", "The system supports staff encoding, not public self-service.", "Resident request portal with approval workflow."),
            ("Barangay policies govern scheduling", "Policy rules may vary.", "Operational constraint.", "The system enforces technical conflicts; barangay decides approval policy.", "Configurable policy settings."),
            ("Target-PC sign-off needed", "Deployment depends on actual local database/browser/printer.", "Technical verification constraint.", "Development evidence exists, but final deployment must be checked on site.", "Automated installer report and checklist."),
            ("Backup/restore not in staff UI", "Implemented as maintenance tooling.", "Usability/security tradeoff.", "This avoids normal staff accidentally restoring data.", "Admin-only in-app backup screen."),
        ],
    ))
    md.append("\n## Target Beneficiaries\n")
    md.append(table(
        ["Beneficiary", "Benefit"],
        [
            ("Residents of Barangay Sto. Niño", "Fairer access and fewer schedule misunderstandings."),
            ("Youth organizations", "Clearer practice/game schedules and less conflict with other groups."),
            ("Sports groups", "More predictable court-use planning."),
            ("Barangay officials", "Updated local records and easier monitoring."),
            ("Administrators / staff", "Faster encoding, search, printing, status updates, and activity traceability."),
        ],
    ))
    md.append("\n## System Users and Roles\n")
    md.append(table(
        ["Role", "Purpose", "Permissions", "Restrictions", "Login behavior", "Security implication"],
        [
            ("Admin", "Manage users and reservations.", "Login, dashboard, schedule, reservation CRUD/status, activity logs, account list/create/deactivate/reactivate, password change.", "Cannot deactivate own signed-in account.", "Active Admin username/password is checked with bcrypt.", "Admin accounts should be limited and protected."),
            ("Staff", "Operate daily reservation workflow.", "Login, dashboard, schedule, reservation CRUD/status, activity logs, own password change.", "Cannot access account list or create accounts.", "Active Staff username/password is checked with bcrypt.", "Staff can manage reservation data but not user access."),
        ],
    ))
    md.append("\n## Complete Feature Guide\n")
    md.append(feature_markdown())
    md.append("## User Workflow Guide\n")
    md.append(table(
        ["Step", "Actor", "Action", "System behavior", "Implementation status"],
        [
            ("1", "Admin/Staff", "Open local office URL.", "Local Express app serves login/prototype interface.", "Implemented"),
            ("2", "Admin/Staff", "Log in.", "Session created after bcrypt password match.", "Implemented"),
            ("3", "Admin", "Create Staff account if needed.", "User is validated, password-hashed, and inserted.", "Implemented"),
            ("4", "Resident", "Visits or coordinates with barangay office.", "No resident account or remote booking needed.", "Implemented by scope"),
            ("5", "Staff/Admin", "Checks Schedule/Home.", "Available and reserved slots are displayed.", "Implemented"),
            ("6", "Staff/Admin", "Encodes reservation.", "Required fields are validated.", "Implemented"),
            ("7", "System", "Checks conflict.", "Existing blocking reservation overlap is rejected.", "Implemented"),
            ("8", "System", "Saves reservation.", "Resident row is reused/created, reservation inserted, log written.", "Implemented"),
            ("9", "Staff/Admin", "Updates status later.", "MISSED, CANCELLED, or COMPLETED can be applied.", "Implemented"),
            ("10", "Staff/Admin", "Print/export/review logs.", "Records remain available for reporting.", "Implemented"),
        ],
    ))
    md.append("\n## Account Creation Workflow\n")
    md.append(table(
        ["Slide/proposal step", "Implementation verification"],
        [
            ("Admin logs in and navigates to Account Management.", "Implemented: /account is Admin-only."),
            ("Admin clicks Create Account.", "Implemented: views/account/index.ejs links to /account/create."),
            ("Admin enters Full Name, Username, Password, Role.", "Implemented: views/account/create.ejs."),
            ("System validates required fields.", "Implemented: validateCreateUserInput."),
            ("System checks duplicate usernames.", "Implemented: findAnyUserByUsername plus users unique index."),
            ("System saves account.", "Implemented: createUser hashes password and inserts ACTIVE account."),
            ("New user logs in.", "Implemented: login route accepts active Admin/Staff accounts."),
        ],
    ))
    md.append("\n## Reservation Management Workflow\n")
    md.append("Required reservation data verified in code and schema: reservation date, start time, end time, resident/group representative name, contact number, address, purpose, status, and optional remarks. The repository stores resident details in `residents`, reservation timing and status in `reservations`, status definitions in `reservation_statuses`, and action history in `activity_logs`. Overlap prevention checks same date, blocking status, and intersecting time ranges using `new.start < existing.end` and `new.end > existing.start`.\n")
    md.append("## Database Guide\n")
    md.append(database_codex())
    md.append("\n### ERD / Relationship Explanation\n")
    md.append("```mermaid\nerDiagram\n  users ||--o{ reservations : creates_or_approves\n  residents ||--o{ reservations : requests\n  time_slots ||--o{ reservations : optional_slot\n  reservation_statuses ||--o{ reservations : classifies\n  reservations ||--o{ activity_logs : tracked_by\n  users ||--o{ activity_logs : performs\n```\n")
    md.append("The proposal diagram used STAFF, RESIDENTS, RESERVATIONS, TIME_SLOTS, RESERVATION_STATUS, and LOGS. The implementation keeps those concepts but renames STAFF to `users` so both Admin and Staff accounts are handled in one table. The implementation also replaces the diagram's plaintext `password` field with `password_hash`, which is a security improvement.\n")
    md.append("## Backend Architecture\n")
    md.append(table(["Module", "File", "Defense explanation"], FILES_BY_MODULE))
    md.append("\n## Frontend / UI / UX Architecture\n")
    md.append(table(
        ["Page/screen", "Route", "Purpose", "Inputs/actions", "Backend interaction"],
        [
            ("Login", "/login", "Authenticate Admin/Staff.", "Username and password.", "authRoutes compares bcrypt hash."),
            ("Prototype", "/, /prototype, /app", "Visible prototype-style office frontend.", "Prototype login/reservation/account actions.", "prototypeApiRoutes JSON endpoints."),
            ("Home", "/dashboard", "Today/weekly schedule overview.", "Click available/reserved slots, Add Reservation.", "dashboardRoutes and scheduleService."),
            ("Schedule", "/schedule", "Daily slot display.", "Date selector, Reserve/View Details, Print Schedule.", "scheduleRoutes and reservation queries."),
            ("Reservations", "/reservations", "Record list and status actions.", "Filters, print, export, add, edit, status forms.", "reservationRoutes and reservationRepository."),
            ("Reservation detail", "/reservations/:id", "Representative and booking details.", "Edit, status update, back to schedule/list.", "getReservationById."),
            ("Add/Edit reservation", "/reservations/new, /reservations/:id/edit", "Encode or update reservation.", "Date/time/representative/contact/address/purpose/remarks.", "validateReservationInput and create/update repository calls."),
            ("Account", "/account", "Admin user management.", "Create, deactivate/reactivate, change password.", "Admin-only authRoutes."),
            ("Change Password", "/account/password", "Signed-in user password update.", "Current/new/confirm password.", "bcrypt compare and new hash update."),
            ("Activity Logs", "/activity-logs", "Monitor reservation actions.", "Date/action/search filters.", "activityLogRepository query."),
        ],
    ))
    md.append("\n## Offline Deployment Explanation\n")
    md.append("The system is not a public website. It is a local web application: the browser is the interface, Express is the local server, and MySQL/MariaDB is the local database. The barangay office computer hosts the system through `localhost`. The scripts prefer bundled runtime folders when supplied and fall back to locally installed tools for development or technical support. Normal daily use starts from `start-barangay-office.bat`; first-time setup and maintenance start from `START-HERE.bat`.\n")
    md.append("## Installation and Setup Guide\n")
    md.append(table(
        ["Area", "Verified files", "Explanation"],
        [
            ("Prerequisites", "README.md, docs/DEPLOYMENT_GUIDE.md", "Windows, Node.js 20+, local MySQL/MariaDB or bundled runtime, browser, node_modules."),
            ("Environment", ".env.example, scripts/setup-env.mjs", "Defines APP_PORT, APP_SESSION_SECRET, DB connection, backup settings, verifier login values."),
            ("Database setup", "database/schema.sql, seed.sql, diagnostics.sql, setup-database-only.bat", "Creates database/tables/triggers, seeds default records, runs diagnostics."),
            ("First-time setup", "START-HERE.bat, maintenance-tools/setup-barangay-office.bat", "Guides office setup and checks local files/tools."),
            ("Daily startup", "start-barangay-office.bat", "Checks runtime, .env, database, starts app, opens local URL."),
            ("Backup/restore", "scripts/backup-mysql.mjs, scripts/restore-mysql.mjs", "Creates/restores SQL dump files using MySQL tools."),
            ("Verification", "scripts/verify-*.mjs, npm scripts", "Static SQL, UI smoke, bundle, runtime, MySQL, and test verification."),
        ],
    ))
    md.append("\n## Security Explanation\n")
    md.append("Security claims should be realistic. Verified safeguards include bcrypt password hashing, active-account filtering during login, Admin-only account-management middleware, express-session cookies with httpOnly and sameSite=lax, parameterized MySQL queries, duplicate username checks, and offline local storage of resident contact/address data. Risks remain: shared office passwords, unattended unlocked computer, exposed `.env`, unprotected backups, and no advanced audit trail for account actions. Recommended safeguards are changing the starter password, using separate accounts, locking the office computer, restricting backup access, and keeping the database local.\n")
    md.append("## ISO 25010 Evaluation Mapping\n")
    md.append(table(
        ["Characteristic", "Simple definition", "Evidence", "Weakness", "Defense talking point"],
        [
            ("Functional suitability", "Does the system provide needed functions?", "Reservations, schedules, overlap prevention, accounts, logs, export/print.", "Barangay policy rules beyond conflict prevention are not deeply encoded.", "It satisfies the core scheduling problem."),
            ("Performance efficiency", "Does it respond acceptably?", "Server-rendered EJS and indexed SQL queries.", "Needs target-PC test with real data volume.", "Simple local stack is appropriate for one-office use."),
            ("Compatibility", "Does it work in target environment?", "Browser interface, local MySQL/MariaDB, Windows scripts.", "Final office computer sign-off required.", "It is designed for local Windows office use."),
            ("Usability", "Is it understandable for users?", "Login, Home, Schedule, Reservations, Account, print/export.", "Prototype accessibility warnings should be improved later.", "Staff can follow clear office workflows."),
            ("Reliability", "Does it avoid failures and invalid records?", "Validation, SQL constraints, triggers, controlled DB errors.", "Power/database failure still needs backup discipline.", "App and database both protect core conflict rule."),
            ("Security", "Does it protect accounts and data?", "bcrypt, sessions, roles, local DB, parameterized queries.", "No MFA or advanced audit for account changes.", "Security is suitable for a local student office system but not overclaimed."),
            ("Maintainability", "Can it be modified and tested?", "Feature folders, SQL files, 32 test files, docs.", "No migration framework yet.", "The code is organized by feature and backed by tests."),
            ("Portability", "Can it move to another computer?", "Offline bundle scripts and .env configuration.", "Runtime folders must be included or installed.", "It can be prepared as a copyable Windows folder."),
        ],
    ))
    md.append("\n## Testing Guide\n")
    md.append(f"The repository contains 32 automated test files under `tests/`. Existing tests cover route behavior, validation, repositories, schedule logic, SQL static checks, offline bundle checks, startup scripts, backup/restore helpers, UI smoke rendering, and MySQL verification helpers. Live MySQL verification is separate from `npm test` and requires a reachable local database.\n\n")
    md.append(table(["Test ID", "Feature", "Scenario", "Steps", "Expected result", "Actual implementation status", "Priority"], TEST_MATRIX))
    md.append("\n## Defense Explanation by Topic\n")
    md.append(table(
        ["Topic", "Strong answer"],
        [
            ("Why this project?", "The barangay court is a shared community facility, and an organized digital schedule reduces conflicts."),
            ("Why offline?", "The barangay preference is direct office management, and offline use avoids internet dependency for daily operation."),
            ("Who are users?", "Admin and Staff accounts for authorized barangay personnel; residents do not log in."),
            ("How prevent double booking?", "The app checks overlapping blocking reservations and MySQL triggers reject direct overlapping inserts/updates."),
            ("What database?", "Local MySQL target, with MariaDB acceptable if verified."),
            ("Main tables?", "users, residents, reservation_statuses, time_slots, court_settings, reservations, activity_logs."),
            ("How login works?", "Username lookup for ACTIVE account, bcrypt password compare, session stores role and user identity."),
            ("What limitations?", "Offline only, no remote resident booking, one court, no payment, final office sign-off needed."),
            ("How ISO 25010 applies?", "Use the eight quality characteristics to evaluate functions, usability, reliability, security, maintainability, and deployment readiness."),
            ("How improve later?", "Online portal, SMS, mobile-friendly UI, multi-court support, analytics, cloud backup, QR confirmation."),
        ],
    ))
    md.append("\n## Defense Q&A Reviewer\n")
    md.append(f"A separate file, `docs/DEFENSE_QA_REVIEWER.md`, contains {qa_count} likely panel questions with suggested answers grouped by topic.\n")
    md.append("## Implementation Verification Report\n")
    md.append("A separate file, `docs/IMPLEMENTATION_VERIFICATION_REPORT.md`, compares proposed requirements against actual implementation evidence.\n")
    md.append("## Glossary\n")
    md.append(table(
        ["Term", "Meaning"],
        [
            ("Offline system", "A system used locally without requiring internet for normal operation."),
            ("Localhost", "The local computer address used by the browser to reach the local server."),
            ("Database", "Structured storage for accounts, residents, reservations, statuses, settings, and logs."),
            ("MySQL/MariaDB", "Relational database engines used for local data storage."),
            ("Reservation", "A saved request for court use on a specific date and time."),
            ("Time slot", "A defined period such as 7:00 AM to 8:00 AM."),
            ("Admin", "Authorized user who can manage accounts and reservations."),
            ("Staff", "Authorized user who can manage schedules and reservations but not accounts."),
            ("CRUD", "Create, Read, Update, Delete; here the closest workflow is create/read/update/status-change."),
            ("Authentication", "Confirming a user's identity through login."),
            ("Authorization", "Checking what a signed-in user is allowed to do."),
            ("ISO 25010", "Software quality model used for evaluation."),
            ("Backup", "A copy of database data saved for recovery."),
            ("Deployment", "Installing and preparing the system for real use."),
            ("ERD", "Entity Relationship Diagram showing database entities and links."),
            ("API", "Backend endpoint used by UI code to send/receive data."),
            ("Frontend", "User-facing pages and prototype interface."),
            ("Backend", "Server-side Express routes, validation, and database logic."),
        ],
    ))
    md.append("\n## Future Enhancements\n")
    md.append("The following are future enhancements, not current implemented features: online reservation portal, SMS notifications, mobile-friendly resident view, multi-court support, barangay announcement integration, printable reservation reports beyond current print/export, advanced analytics, cloud backup, QR-code reservation confirmation, and stronger audit trail for account actions.\n")
    md.append("## Codebase Explanation for Defense\n")
    md.append("The programming language is JavaScript running on Node.js. The backend framework is Express. The view layer uses EJS templates. The database layer uses mysql2 with named placeholders. Sessions are handled by express-session. Password hashing uses bcryptjs. Environment configuration uses dotenv. The main code flow is: browser request -> Express route -> validation/service/repository -> MySQL query -> EJS page or JSON response.\n\nReservation creation code flow: the user fills the reservation form; `reservationRoutes.js` calls `validateReservationInput`; `reservationRepository.js` checks overlap; the repository creates or reuses a resident; it finds the RESERVED status id; it inserts the reservation; it writes an activity log; then the browser is redirected to the reservation list. Schedule conflict prevention is implemented in the repository overlap query and backed by MySQL triggers in `database/schema.sql`.\n\nThe most important files to explain during defense are `src/app.js`, `src/features/users/authRoutes.js`, `src/features/reservations/reservationRoutes.js`, `src/features/reservations/reservationRepository.js`, `src/features/schedule/scheduleService.js`, `database/schema.sql`, `database/seed.sql`, `views/dashboard.ejs`, `views/schedule/index.ejs`, and `views/reservations/*.ejs`.\n")
    md.append(table(["Major feature", "Frontend file/page", "Backend route/service", "Database table", "Plain code flow"], [(f["name"], f["frontend"], f["backend"], f["database"], f["workflow"]) for f in FEATURES]))
    md.append("\n## Final Defense Summary\n")
    md.append("The system is an offline office-based scheduling tool for Barangay Sto. Niño's basketball court. Its core value is simple: authorized barangay personnel can see available slots, encode reservations, prevent conflicts, update statuses, and keep records without requiring residents to book online.\n\n**60-second project script:** Our project is a Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City. The barangay basketball court is shared by residents, so informal scheduling can lead to conflicts. Our system is installed offline in the barangay office. Residents still coordinate with barangay personnel in person, and authorized Admin or Staff users encode reservations. The system shows available and reserved slots, prevents overlapping active reservations, records resident representative details, supports account management, and keeps activity logs. This improves organization, fairness, and record keeping while matching the barangay's preference for direct office management.\n\n**Technical architecture script:** The system uses Node.js and Express for the local backend, EJS for server-rendered pages, and a local MySQL/MariaDB database. The browser opens localhost, which means it is only talking to the local barangay computer. Express routes handle login, schedules, reservations, accounts, and logs. The database stores users, residents, reservations, time slots, statuses, settings, and activity logs. Passwords are hashed with bcrypt, and reservation conflicts are checked in both code and database triggers.\n\n**Offline deployment script:** We chose offline deployment because the proposal and slides state that barangay officials prefer an office-installed system and residents should coordinate directly with personnel. The browser is only the interface; the server and database run locally. This means normal operation does not require public internet, and the barangay keeps reservation records on its office computer.\n")
    return "\n\n".join(md).replace("\u200b", "")


def write_docs():
    DOCS.mkdir(exist_ok=True)
    qa_md, qa_count = qas()
    qa_doc = f"# Defense Q&A Reviewer\n\nGenerated: {GENERATED_DATE}\n\nThis reviewer contains {qa_count} likely panel questions. Answers are intentionally realistic and avoid overclaiming.\n\n{qa_md}"
    verification_doc = implementation_report()
    codex_doc = project_codex_md(qa_count)
    (DOCS / "DEFENSE_QA_REVIEWER.md").write_text(qa_doc, encoding="utf-8", newline="\n")
    (DOCS / "IMPLEMENTATION_VERIFICATION_REPORT.md").write_text(verification_doc, encoding="utf-8", newline="\n")
    (DOCS / "DEFENSE_PROJECT_CODEX.md").write_text(codex_doc, encoding="utf-8", newline="\n")
    return codex_doc


def split_table_row(line):
    parts = [p.strip() for p in line.strip().strip("|").split("|")]
    return parts


def build_pdf(markdown_text):
    pdf_path = DOCS / "DEFENSE_PROJECT_CODEX.pdf"
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=TITLE,
        author="Project Team",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleCenter", parent=styles["Title"], alignment=TA_CENTER, fontSize=18, leading=22, spaceAfter=12))
    styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontSize=15, leading=18, spaceBefore=12, spaceAfter=8, textColor=colors.HexColor("#8A1F16")))
    styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontSize=12, leading=15, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#B53324")))
    styles.add(ParagraphStyle(name="H3x", parent=styles["Heading3"], fontSize=10.5, leading=13, spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#7A2A20")))
    styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontSize=8.3, leading=11, spaceAfter=4, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontSize=7, leading=9, spaceAfter=2))
    styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontSize=8.1, leading=10.5, leftIndent=12, firstLineIndent=-8, spaceAfter=2))
    styles.add(ParagraphStyle(name="Footerx", parent=styles["BodyText"], fontSize=7, leading=9, alignment=TA_CENTER, textColor=colors.grey))

    story = []
    story.append(Paragraph(TITLE, styles["TitleCenter"]))
    story.append(Paragraph("Project Documentation and Defense Reviewer", styles["TitleCenter"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Generated: {GENERATED_DATE}", styles["Bodyx"]))
    story.append(Paragraph(f"Repository / project name: {PROJECT_NAME}", styles["Bodyx"]))
    story.append(Paragraph("Group members: " + ", ".join(GROUP_MEMBERS), styles["Bodyx"]))
    diagram = DOWNLOADS / "Database Diagram.jpg"
    if diagram.exists():
        story.append(Spacer(1, 0.15 * inch))
        img = Image(str(diagram))
        max_w = 7.2 * inch
        max_h = 3.6 * inch
        scale = min(max_w / img.imageWidth, max_h / img.imageHeight)
        img.drawWidth = img.imageWidth * scale
        img.drawHeight = img.imageHeight * scale
        story.append(img)
        story.append(Paragraph("Database diagram source: Provided file Database Diagram.jpg", styles["Smallx"]))
    story.append(PageBreak())

    lines = markdown_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            story.append(Spacer(1, 2))
            i += 1
            continue
        if line.startswith("# "):
            story.append(Paragraph(escape(line[2:]), styles["H1x"]))
            i += 1
            continue
        if line.startswith("## "):
            story.append(Paragraph(escape(line[3:]), styles["H1x"]))
            i += 1
            continue
        if line.startswith("### "):
            story.append(Paragraph(escape(line[4:]), styles["H2x"]))
            i += 1
            continue
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            story.append(Preformatted("\n".join(code), styles["Smallx"]))
            continue
        if line.startswith("| "):
            table_lines = []
            while i < len(lines) and lines[i].startswith("| "):
                table_lines.append(lines[i])
                i += 1
            rows = [split_table_row(tl) for tl in table_lines if not re.match(r"^\|\s*[-: ]+(\|\s*[-: ]+)+\|?$", tl)]
            if rows:
                col_count = max(len(r) for r in rows)
                widths = [(7.4 * inch) / col_count] * col_count
                data = []
                for row in rows:
                    padded = row + [""] * (col_count - len(row))
                    data.append([Paragraph(escape(cell.replace("<br>", "\n")), styles["Smallx"]) for cell in padded])
                t = LongTable(data, colWidths=widths, repeatRows=1)
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B53324")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#B8B0A6")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFF7EF")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]))
                story.append(t)
                story.append(Spacer(1, 5))
            continue
        if line.startswith("- "):
            story.append(Paragraph("• " + escape(line[2:]), styles["Bulletx"]))
            i += 1
            continue
        story.append(Paragraph(escape(inline_md(line)), styles["Bodyx"]))
        i += 1

    def add_page_number(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(letter[0] / 2, 0.28 * inch, f"Defense Reviewer - Page {doc_obj.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return pdf_path


def build_markdown_report_pdf(markdown_text, pdf_name, report_title):
    pdf_path = DOCS / pdf_name
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=report_title,
        author="Project Team",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1Report", parent=styles["Heading1"], fontSize=16, leading=20, spaceBefore=10, spaceAfter=8, textColor=colors.HexColor("#8A1F16")))
    styles.add(ParagraphStyle(name="H2Report", parent=styles["Heading2"], fontSize=12, leading=15, spaceBefore=8, spaceAfter=5, textColor=colors.HexColor("#B53324")))
    styles.add(ParagraphStyle(name="BodyReport", parent=styles["BodyText"], fontSize=8.5, leading=11, spaceAfter=4))
    styles.add(ParagraphStyle(name="SmallReport", parent=styles["BodyText"], fontSize=7, leading=9, spaceAfter=2))
    styles.add(ParagraphStyle(name="BulletReport", parent=styles["BodyText"], fontSize=8.2, leading=10.5, leftIndent=12, firstLineIndent=-8, spaceAfter=2))

    story = []
    lines = markdown_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            story.append(Spacer(1, 2))
            i += 1
            continue
        if line.startswith("# "):
            story.append(Paragraph(escape(line[2:]), styles["H1Report"]))
            i += 1
            continue
        if line.startswith("## "):
            story.append(Paragraph(escape(line[3:]), styles["H2Report"]))
            i += 1
            continue
        if line.startswith("| "):
            table_lines = []
            while i < len(lines) and lines[i].startswith("| "):
                table_lines.append(lines[i])
                i += 1
            rows = [split_table_row(tl) for tl in table_lines if not re.match(r"^\|\s*[-: ]+(\|\s*[-: ]+)+\|?$", tl)]
            if rows:
                col_count = max(len(r) for r in rows)
                widths = [(7.4 * inch) / col_count] * col_count
                data = []
                for row in rows:
                    padded = row + [""] * (col_count - len(row))
                    data.append([Paragraph(escape(cell.replace("<br>", "\n")), styles["SmallReport"]) for cell in padded])
                t = LongTable(data, colWidths=widths, repeatRows=1)
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B53324")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#B8B0A6")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFF7EF")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]))
                story.append(t)
                story.append(Spacer(1, 5))
            continue
        if line.startswith("- "):
            story.append(Paragraph("• " + escape(line[2:]), styles["BulletReport"]))
            i += 1
            continue
        story.append(Paragraph(escape(inline_md(line)), styles["BodyReport"]))
        i += 1

    def add_page_number(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(letter[0] / 2, 0.28 * inch, f"{report_title} - Page {doc_obj.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return pdf_path


def inline_md(text):
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = text.replace("`", "")
    return text


def escape(text):
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


if __name__ == "__main__":
    codex = write_docs()
    pdf = build_pdf(codex)
    verification_pdf = build_markdown_report_pdf(
        (DOCS / "IMPLEMENTATION_VERIFICATION_REPORT.md").read_text(encoding="utf-8"),
        "IMPLEMENTATION_VERIFICATION_REPORT.pdf",
        "Implementation Verification Report",
    )
    print(f"Wrote {DOCS / 'DEFENSE_PROJECT_CODEX.md'}")
    print(f"Wrote {DOCS / 'DEFENSE_PROJECT_CODEX.pdf'}")
    print(f"Wrote {DOCS / 'DEFENSE_QA_REVIEWER.md'}")
    print(f"Wrote {DOCS / 'IMPLEMENTATION_VERIFICATION_REPORT.md'}")
    print(f"Wrote {verification_pdf}")
    print(f"PDF size: {pdf.stat().st_size} bytes")
