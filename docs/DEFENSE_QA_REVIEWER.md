# Defense Q&A Reviewer

Generated: May 13, 2026

This reviewer contains 88 likely panel questions. Answers are intentionally realistic and avoid overclaiming.

## General Project Questions

**Q1. What is the project?**

It is an offline computer-based basketball court scheduling system for Barangay Sto. Niño, Parañaque City.

**Q2. Who uses the system?**

Authorized barangay Admin and Staff users use it in the barangay office.

**Q3. Can residents reserve online?**

No. Residents coordinate in person with barangay personnel, who encode reservations.

**Q4. Why is the project needed?**

It reduces informal scheduling conflicts and keeps reservation records organized.

**Q5. What problem does it solve?**

It helps prevent double booking and gives personnel a clear view of available and reserved slots.

**Q6. Is the court still free for residents?**

Yes. The proposal says the court is free; the system only organizes reservation records.

**Q7. What is the project title?**

Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City

**Q8. What is the main defense message?**

The project digitizes office-side scheduling without changing the barangay's in-person reservation policy.

## Problem and Objectives

**Q9. What causes scheduling conflicts?**

The proposal says court use can be informal and multiple groups may want the same time.

**Q10. How does the system organize reservations?**

It stores each reservation with date, start/end time, representative, contact, address, purpose, and status.

**Q11. How does it prevent overlaps?**

The app checks existing blocking reservations, and database triggers reject overlapping active records.

**Q12. How does it maximize usage?**

It shows open slots and a nearest available slot so personnel can offer another schedule.

**Q13. How does it maintain updated records?**

Reservation create/edit/status actions update database records and write activity logs.

**Q14. What feature supports available-slot visibility?**

The Schedule and Dashboard pages derive available slots from active time slots and reservations.

**Q15. What objective is most important?**

Preventing overlapping reservations is central because it directly solves the conflict problem.

**Q16. How should we explain fairness?**

The system gives staff a consistent record-based way to check and assign court times.

## Scope and Limitations

**Q17. What is included in scope?**

Offline office installation, staff encoding, schedule viewing, reservation management, accounts, logs, and setup docs.

**Q18. What is outside scope?**

Public online booking, resident self-service, online payment, mobile app, and multi-court scheduling.

**Q19. Why no online deployment?**

Barangay officials prefer an offline setup and direct management at the office.

**Q20. Is offline a weakness?**

It is a design choice that matches the barangay preference, though cloud backup or online booking can be future work.

**Q21. Can the system be used from another city office?**

Not currently; it is designed for one barangay office computer.

**Q22. Does it support multiple courts?**

No. The current schema has no courts table.

**Q23. Does it send SMS notifications?**

No. SMS is a future enhancement only.

**Q24. What limitation should be admitted?**

Final deployment sign-off must still be done on the actual target office computer and printer.

## Technical Architecture

**Q25. What stack is used?**

Node.js, Express, EJS, MySQL/MariaDB, express-session, bcryptjs, dotenv, and mysql2.

**Q26. Why Express and EJS?**

They support a simple server-rendered local app with no separate frontend build requirement.

**Q27. Where is the app entry point?**

src/server.js starts the app created by src/app.js.

**Q28. How does the frontend communicate with backend?**

EJS pages submit forms to Express routes; the prototype uses JSON routes under /api/prototype.

**Q29. How does backend communicate with database?**

mysql2 promise pool in src/config/database.js executes parameterized SQL.

**Q30. What is localhost?**

It is the local computer address used by the browser to talk to the local server.

**Q31. Is this a public website?**

No. The browser opens a local URL for the local office app.

**Q32. What files start the system?**

START-HERE.bat is the setup launcher and start-barangay-office.bat starts daily office use.

## Database

**Q33. What database is used?**

The target is local MySQL, with MariaDB accepted if it passes verification.

**Q34. What are the main tables?**

users, residents, reservation_statuses, time_slots, court_settings, reservations, and activity_logs.

**Q35. What table stores accounts?**

users.

**Q36. What table stores reservation records?**

reservations, linked to residents, users, statuses, and optionally time_slots.

**Q37. What table stores available status?**

reservation_statuses stores AVAILABLE as a reference, but actual availability is derived.

**Q38. How are time slots stored?**

time_slots stores one-hour active slots from 7:00 AM to 9:00 PM in seed.sql.

**Q39. What does is_blocking mean?**

It marks whether a status blocks another reservation; RESERVED is blocking.

**Q40. What did the implementation improve from the diagram?**

The diagram had password; implementation uses password_hash with bcrypt.

## UI and UX

**Q41. What pages exist?**

Login, Home/Dashboard, Schedule, Reservations, Reservation Details, Add/Edit Reservation, Account, Change Password, Activity Logs, and prototype UI.

**Q42. How is the UI designed for staff?**

It uses office-style forms, tables, schedule rows, and direct navigation.

**Q43. What does Home show?**

Today summary, weekly schedule, available/reserved counts, missed records, upcoming reservations, and nearest available slot.

**Q44. What does Schedule show?**

The selected date's time slots and whether each slot is available or linked to a reservation.

**Q45. How can staff create a reservation from the schedule?**

Available slot links open the Add Reservation page with date/time prefilled.

**Q46. Can staff print schedules?**

Yes, Schedule has Print Schedule and Reservations has Print Records.

**Q47. Can staff export records?**

Yes, the Reservations page exports filtered records as CSV.

**Q48. Does the UI copy the proposal mockups exactly?**

It follows the red/gold/tan barangay-office direction and also serves the supplied prototype.

## Security

**Q49. How are passwords stored?**

As bcrypt hashes in users.password_hash, not plaintext.

**Q50. Who can create accounts?**

Only Admin users through Admin-protected account routes.

**Q51. Can inactive users log in?**

No. findUserByUsername only returns ACTIVE accounts.

**Q52. What protects SQL queries?**

The code uses mysql2 named parameters instead of string-concatenated SQL.

**Q53. Is the system highly secure?**

Do not overclaim. It has basic local-app safeguards: sessions, roles, bcrypt, and parameterized queries.

**Q54. What is a security risk?**

A shared office computer can expose data if left unlocked or if passwords are shared.

**Q55. What should be done after first setup?**

Change the temporary admin password or create a real Admin and deactivate the starter account.

**Q56. Does offline deployment improve security?**

It reduces internet exposure, but local access and backups still need protection.

## Testing

**Q57. Are there automated tests?**

Yes. The repository has 32 Node test files.

**Q58. What do tests cover?**

Routes, repositories, validation, overlap logic, auth, schedule service, SQL static checks, offline tooling, backup/restore helpers, and UI smoke rendering.

**Q59. What command runs tests?**

npm test.

**Q60. Is live MySQL always tested by npm test?**

No. live MySQL verification uses npm run verify:mysql and needs a reachable local database.

**Q61. How should overlap be tested?**

Create one RESERVED record, then attempt an overlapping reservation and confirm it is rejected.

**Q62. How should database failure be tested?**

Stop MySQL and confirm pages show a controlled database-unavailable message.

**Q63. What needs manual office testing?**

Real printer output, actual office database startup, and final barangay sign-off.

**Q64. Why include manual tests?**

Some deployment conditions depend on the actual office computer and printer.

## Deployment

**Q65. How is it deployed?**

As an offline Windows local web app with setup/start scripts and local database configuration.

**Q66. What does START-HERE.bat do?**

It is the setup and maintenance launcher for first-time setup, checks, backup, restore, shortcuts, and sign-off.

**Q67. What does start-barangay-office.bat do?**

It checks runtime and database readiness, starts the app, and opens the local browser URL.

**Q68. Does normal use need internet?**

Core operation is designed not to need internet after dependencies/runtime/database are prepared.

**Q69. What is the daily staff process?**

Double-click Barangay Court Scheduler, keep the startup window open, log in, manage schedules.

**Q70. What is backed up?**

The MySQL/MariaDB database through mysqldump SQL files.

**Q71. Where is configuration stored?**

.env stores app port, session secret, and database connection values.

**Q72. What must be repeated on the actual office PC?**

Run setup, verify database, test browser, print, backup, and sign-off.

## ISO 25010

**Q73. What is ISO 25010?**

A software quality model used to evaluate product quality characteristics.

**Q74. How does functional suitability apply?**

The system provides reservation, schedule, account, and record-management functions aligned with objectives.

**Q75. How does usability apply?**

Screens are simple, local, and designed for barangay personnel workflows.

**Q76. How does reliability apply?**

Validation, database constraints, and overlap triggers reduce invalid records.

**Q77. How does security apply?**

Login, bcrypt hashes, Admin-only account management, sessions, and local data storage support basic security.

**Q78. How does maintainability apply?**

Feature folders, SQL files, scripts, docs, and tests make the system easier to maintain.

**Q79. How does portability apply?**

It can be copied as an offline Windows package when required runtime files are included.

**Q80. What ISO weakness should be admitted?**

Compatibility and portability still need final target-PC verification.

## Future Improvements

**Q81. What future feature is most useful?**

SMS notifications or printable confirmation slips could improve communication without changing the current office workflow.

**Q82. Could it become online later?**

Yes, but online booking is a future enhancement and not current scope.

**Q83. Could residents self-book later?**

Yes, with barangay approval rules, but current design keeps personnel as direct managers.

**Q84. Could it support multiple courts?**

Yes, by adding a courts table and linking reservations/time slots to courts.

**Q85. Could analytics be added?**

Yes, usage reports by date, purpose, or group could help planning.

**Q86. Could cloud backup be added?**

Yes, but it would require internet and data-protection policies.

**Q87. Could QR confirmations be added?**

Yes, future printable or QR-coded reservation receipts could be added.

**Q88. How should future improvements be presented?**

Clearly label them as future work, not current implemented features.
