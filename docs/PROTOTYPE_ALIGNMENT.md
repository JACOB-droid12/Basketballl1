# Prototype Alignment

## Source

The UI baseline is the local prototype file:

`C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html`

This prototype is a single-file browser mockup. The production system now serves this file as the visible frontend at `/`, `/prototype`, and `/app`, with a hidden backend adapter injected by Express. Reservation and account data still go through the offline Node.js backend and local MySQL database.

## Prototype Elements To Preserve

- Red top header with one clear page title.
- Gold left sidebar with primary `Home` and `Schedule` navigation.
- `Account` action pinned near the bottom beside the Barangay Sto. Nino logo.
- Tan workspace background.
- Home weekly schedule table with Sunday through Saturday columns.
- Centered week range selector above the schedule table.
- Status color language:
  - `Reserved` and `Confirmed`: green schedule cells or cards.
  - `Completed`: gray schedule cells or cards.
  - Cleared or available slots: light-yellow or open styling.
- Day-based clickable schedule cards.
- Reservation form opened from a selected schedule slot.
- Representative-focused reservation detail screen.
- Account screen for login and account management.

## Production Adjustments

- Residents still cannot book remotely; barangay personnel encode requests in person.
- The production app keeps office functions required beyond the prototype, including reservation records, activity logs, local exports, print controls, backup/restore, and local MySQL verification.
- The copied prototype file is kept intact as much as possible; backend behavior is attached through `public/js/prototype-backend.js` instead of changing the visible HTML layout.
- Prototype PDF helper libraries are served from local `public/vendor/` files instead of CDN URLs so the page can load while offline.
- The served prototype hides the login-page forgotten-password control through a backend-injected style in the real document head because password recovery is not part of the offline milestone; signed-in users change passwords from Account instead.
- The final target remains fully offline on a Windows barangay office computer with local Node.js and local MySQL.
- No cloud database, email/SMS, online payment, OCR, or resident self-service is part of this version.
