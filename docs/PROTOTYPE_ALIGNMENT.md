# Prototype Alignment

## Source

The UI baseline is the local prototype file:

`C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html`

This prototype is a single-file browser mockup. The production system keeps the same office-controlled workflow but implements it as an offline Express/EJS app backed by local MySQL.

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
- The final target remains fully offline on a Windows barangay office computer with local Node.js and local MySQL.
- No cloud database, email/SMS, online payment, OCR, or resident self-service is part of this version.
