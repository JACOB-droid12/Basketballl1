# Implementation Verification Report

Generated: May 13, 2026

This report compares the proposal, presentation slides, database diagram, and actual codebase. The rule used here is conservative: a feature is marked implemented only when there is code, SQL, script, view, or test evidence in the repository.

Current normal staff use is through the backend-backed React console served from local `public/app` assets. Legacy EJS/prototype screens remain in the repository as compatibility/reference surfaces and are still useful as supporting evidence where listed.

## Source Materials

| Source | Location | Use |
| --- | --- | --- |
| Project proposal | Provided file: Project Proposal.pdf | Available and text-extracted with PyMuPDF. |
| Presentation slides | Provided file: Presentation Slides.pptx | Available and slide text extracted from the PPTX package. |
| Database diagram | Provided file: Database Diagram.jpg | Available and visually inspected. |
| Actual codebase | Project repository | Inspected from source files, SQL, scripts, views, tests, and existing docs. |

## Proposed Requirements vs Actual Implementation

| Requirement / feature | Source from proposal/slides | Implementation status | Evidence from code files | Notes / recommended action |
| --- | --- | --- | --- | --- |
| Offline barangay-office deployment | Proposal pages 2 and 4; slides 10, 13, 34, 36 | Implemented | README.md; docs/DEPLOYMENT_GUIDE.md; START-HERE.bat; start-barangay-office.bat | Browser is local interface; backend and database run locally. |
| Residents coordinate in person, not remotely | Proposal page 2; slides 10, 13 | Implemented by scope | No resident self-service public booking routes; auth protects office routes | The prototype/API is for personnel after login. |
| Monitor available court schedules | Proposal page 3; slide 28; slide 34 | Implemented | src/features/schedule/scheduleRoutes.js; views/schedule/index.ejs | Shows available/reserved/missed/cancelled/completed slot states. |
| Display reserved and available time slots | Proposal page 4; slides 8 and 34 | Implemented | scheduleService.js; dashboard.ejs; schedule/index.ejs | Available slots are derived from active time slots minus blocking reservations. |
| Prevent overlapping schedules | Proposal objectives page 2; expected benefits page 3 | Implemented | reservationRepository.js; reservationOverlap.js; database/schema.sql triggers | App-level and database-level conflict protection. |
| Maximize court utilization | Proposal objective page 2; slide 6 | Implemented support | Dashboard counts; nearest available slot; schedule visibility | The system supports utilization through visibility, not automated allocation. |
| Reservation encoding by barangay personnel | Proposal pages 2-3; slide 10 | Implemented | POST /reservations; prototype POST /api/prototype/reservations | Requires authenticated session. |
| Reservation records administrative interface | Proposal page 4; slide 34 | Implemented | views/reservations/index.ejs; reservationRoutes.js | List/filter/export/print/status actions. |
| Nearest available time if no slot is available today | Proposal page 4; slide 34 | Implemented | scheduleService.js findNearestAvailableSlot; dashboardRoutes.js | Dashboard shows nearest available slot in 14-day search window. |
| Mark missed request as Missed | Proposal page 4; slide 34 | Implemented | POST /reservations/:reservationId/status; reservation_statuses seed | Missed is non-blocking after status change. |
| Admin account creation | Slides 20-26 | Implemented | authRoutes.js; userRepository.js; account/create.ejs | Admin-only workflow with required fields and duplicate username validation. |
| Duplicate username validation | Slide 21 | Implemented | DuplicateUsernameError; userValidation.js; users unique index | Both application and database uniqueness exist. |
| Activity logs | Slide 10; slide 28 | Implemented | activity_logs table; activityLogRoutes.js | Reservation create/update/status actions and account create/status/password-change actions are recorded. Login/logout and backup/restore maintenance events are not logged. |
| ISO 25010 evaluation | Proposal page 2; slide 36 | Documented, not an automated test suite | docs/ISO_25010_EVALUATION.md | The repo provides mapping and suggested evaluation tasks. |
| Formal turnover with documentation and user guides | Slide 36 | Implemented documentation; turnover not verifiable | README.md; docs/USER_GUIDE.md; docs/DEPLOYMENT_GUIDE.md | Actual barangay training/sign-off remains an external activity. |
| Online public booking | Not in scope; slide 13 says offline preferred | Not implemented | No public resident booking routes | Correctly outside current scope. |
| Online payment | Not proposed | Not implemented | No payment dependencies or routes | Future enhancement only. |
| Mobile app | Not proposed | Not implemented | No Android/iOS project | Future enhancement only. |
| Multi-court scheduling | Proposal says the basketball court located in Barangay Sto. Niño | Not implemented | Schema has no courts table | Future enhancement only. |

## Database Diagram Comparison

| Diagram concept | Implemented schema | Status | Comment |
| --- | --- | --- | --- |
| STAFF | users | Adapted / implemented | Admin and Staff are unified in users with role and account_status. |
| password | password_hash | Improved | Implementation stores bcrypt hash instead of plaintext password. |
| RESIDENTS | residents | Implemented | Fields align with full name, contact number, and address. |
| RESERVATIONS | reservations | Implemented and expanded | Implementation stores exact start/end time, purpose, remarks, creator/approver, and timestamps. |
| TIME_SLOTS | time_slots | Implemented | Seeded one-hour active slots from 07:00 to 21:00. |
| RESERVATION_STATUS | reservation_statuses | Implemented and expanded | Adds status_code, is_blocking, and display_order. |
| LOGS | activity_logs | Implemented | Stores reservation/user/action/details/timestamp. |

## Feature Evidence Summary

| Feature | Status | Primary evidence |
| --- | --- | --- |
| Login and session authentication | Implemented | views/login.ejs / src/features/users/authRoutes.js:27, src/features/users/userRepository.js:17 / users |
| Role-based access control | Implemented | views/partials/navigation.ejs, views/account/*.ejs / src/features/users/authRoutes.js:204, src/features/users/sessionMiddleware.js:1 / users.role, users.account_status |
| Admin account creation | Implemented | views/account/index.ejs, views/account/create.ejs, views/account/success.ejs / src/features/users/authRoutes.js:119, src/features/users/userValidation.js:1, src/features/users/userRepository.js:38 / users |
| Account deactivate/reactivate | Implemented | views/account/index.ejs / src/features/users/authRoutes.js:179, src/features/users/userRepository.js:120 / users.account_status |
| Change password | Implemented | views/account/password.ejs / src/features/users/authRoutes.js:77, src/features/users/userValidation.js:37, src/features/users/userRepository.js:129 / users.password_hash |
| Dashboard / Home schedule overview | Implemented | views/dashboard.ejs / src/features/schedule/dashboardRoutes.js:18, src/features/schedule/scheduleService.js:86 / time_slots, reservations, reservation_statuses |
| Daily schedule viewing | Implemented | views/schedule/index.ejs / src/features/schedule/scheduleRoutes.js:12, src/features/schedule/scheduleService.js:11 / time_slots, reservations |
| Reservation creation | Implemented | views/reservations/new.ejs / src/features/reservations/reservationRoutes.js:182, src/features/reservations/reservationRepository.js:233, src/features/reservations/reservationValidation.js:5 / reservations, residents, reservation_statuses, activity_logs |
| Reservation overlap prevention | Implemented | Reservation form error display / src/features/reservations/reservationRepository.js:135, src/features/reservations/reservationOverlap.js:41 / database/schema.sql:147, database/schema.sql:183 |
| Reservation editing | Implemented | views/reservations/edit.ejs / src/features/reservations/reservationRoutes.js:90, src/features/reservations/reservationRepository.js:285 / reservations, residents, activity_logs |
| Reservation status updates | Implemented | views/reservations/index.ejs, views/reservations/show.ejs / src/features/reservations/reservationRoutes.js:214, src/features/reservations/reservationRepository.js:328 / reservation_statuses, reservations, activity_logs |
| Reservation list, filtering, print, and CSV export | Implemented | views/reservations/index.ejs / src/features/reservations/reservationRoutes.js:29, src/features/reservations/reservationExport.js:13 / reservations, residents, reservation_statuses, users |
| Activity logs | Implemented | React Activity Logs screen; views/activityLogs/index.ejs legacy page / src/features/activityLogs/activityLogRoutes.js:13, src/features/activityLogs/activityLogRepository.js:1 / activity_logs |
| Nearest available slot suggestion | Implemented | views/dashboard.ejs / src/features/schedule/scheduleService.js:66 / time_slots, reservations |
| Prototype frontend and API bridge | Implemented | public/prototype/sto-nino-court-reservation-system-prototype.html, public/js/prototype-backend.js / src/features/prototype/prototypeRoutes.js:18, src/features/prototype/prototypeApiRoutes.js:36 / users, reservations, residents |
| Offline startup and maintenance scripts | Implemented | START-HERE.bat, start-barangay-office.bat, maintenance-tools/*.bat / scripts/*.mjs, scripts/*.ps1, src/serverStartup.js / Local MySQL/MariaDB from .env or bundled runtime |
| Database backup and restore | Implemented as scripts, not in-app buttons | maintenance-tools/backup-database.bat, maintenance-tools/restore-database.bat / scripts/backup-mysql.mjs, scripts/restore-mysql.mjs / MySQL/MariaDB database dump |

## Open Questions and Verification Gaps

- Final barangay-office deployment sign-off is not provable from the repository alone; it must be rerun on the actual target computer.
- Printer output requires office browser/printer checking.
- Barangay policy rules for approval priority, maximum reservation duration, and allowed reservation days are not encoded beyond date/time conflict prevention.
- Login/logout, backup/restore, and full maintenance events are not currently written to activity_logs; reservation actions and account create/status/password-change actions are logged.
- There is no in-app backup/restore screen; backup/restore exists as maintenance tooling.
