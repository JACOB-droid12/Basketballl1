# Reference Review

## Project Proposal

Source: `C:\Users\Emmy Lou\Downloads\Project Proposal.pdf`

The proposal describes a Digital Basketball Court Scheduling System for Barangay Sto. Niño, Parañaque City. The basketball court is free for residents, but scheduling is currently unorganized and can create conflicts when multiple groups want to use the court at the same time.

Implementation constraints from the proposal:

- Computer-based offline system
- Installed on a barangay office computer
- Residents coordinate in person with barangay personnel
- Authorized personnel encode reservation details and update schedules
- ISO 25010 will be used for evaluation
- No remote resident booking in the expected deployment

Required functions from the proposal:

- Monitor available court schedules
- Display reserved and available time slots
- Manage reservation records through an administrative interface
- Suggest nearest available time if no slot is available today
- Mark a missed request as `Missed`

## Presentation Slides

Source: `C:\Users\Emmy Lou\Downloads\Presentation Slides.pptx`

The slide text reinforces:

- Offline office deployment
- MySQL database for reservation details, schedule records, and user activity logs
- Data requirements: reservation date, start/end time, representative name, contact number, address, purpose, and status
- Feature modules: schedule monitoring, reservation management, time-slot availability display, administrative dashboard
- Account creation by admin with full name, username, password, and admin/staff role
- Duplicate username and required-field validation

Some extracted slide text showed encoding artifacts for `Niño`, `Parañaque`, and quotation marks. The app and docs should use the correct spellings.

## UI Drafts

The slide media includes these usable UI references:

- Login screen with red top header, tan background, account name, password, and login button
- Home/schedule screen with a left navigation rail
- Weekly schedule grid with hourly slots
- Schedule card layout for daily reservations
- Representative personal information screen
- Account management screen
- Create account form with role selection
- Duplicate username and required-field validation example
- Account created successfully confirmation

The latest uploaded mockup images confirmed the intended visual direction:

- Full-width red page title bars
- Gold left navigation rail with rounded white navigation buttons
- Barangay logo placed near the lower-left account area
- Large bordered weekly schedule table on the Home screen
- Orange/red bordered reservation cards on the Schedule screen
- Large rounded red-bordered panels for details, account management, and forms
- Annotation notes in the mockups are design guidance only and should not be copied as final office UI text

Implementation direction:

- Preserve the red/tan barangay-office visual system
- Use readable form labels and status messages
- Keep navigation simple: Home, Schedule, Account
- Prefer tables and schedule rows over decorative cards for dense office work
- Add confirmation dialogs for cancel, missed, and completed status changes in later milestones

## Database Diagram

Source: `C:\Users\Emmy Lou\Downloads\Database Diagram.jpg`

Entities shown:

- `STAFF`
- `RESIDENTS`
- `RESERVATIONS`
- `TIME_SLOTS`
- `RESERVATION_STATUS`
- `LOGS`

Milestone 1 keeps the same concepts but adapts names for implementation:

- `STAFF` becomes `users` so admin and staff accounts are handled in one table
- `RESIDENTS` is retained
- `RESERVATIONS` is retained and stores exact `start_time` and `end_time`
- `TIME_SLOTS` is retained for schedule display
- `RESERVATION_STATUS` becomes `reservation_statuses`
- `LOGS` becomes `activity_logs`

The diagram includes plaintext `password`. The implementation replaces this with `password_hash`.
