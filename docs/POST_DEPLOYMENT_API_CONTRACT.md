# Post-Deployment API Contract

Backend date format is `YYYY-MM-DD`. Time format is `HH:MM` in local Barangay Sto. Nino time. CSV exports are backend-owned and work offline; PDF/XLSX are not added in this pass.

## Status Values

Schedule and calendar payloads may return:

- `AVAILABLE`
- `RESERVED`
- `MISSED`
- `CANCELLED`
- `COMPLETED`
- `MAINTENANCE`
- `BARANGAY_EVENT`
- `CLEARED_PUBLIC_USE`

`RESERVED` blocks new reservations. `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE` also block new reservations through persisted schedule blocks.

## Reservation References

Every reservation has `referenceNo` in the format `BCS-YYYY-000001`.

Changed payloads:

- `GET /api/reservations`
- `GET /api/reservations/:reservationId`
- `POST /api/reservations`
- `PUT /api/reservations/:reservationId`
- `DELETE /api/reservations/:reservationId`
- `POST /api/reservations/:reservationId/status`
- reports, exports, slips, schedule cells, and history

Reservation object:

```json
{
  "reservationId": 1,
  "referenceNo": "BCS-2026-000001",
  "reservationDate": "2026-05-14",
  "startTime": "08:00",
  "endTime": "09:00",
  "representativeName": "Team Alpha",
  "contactNo": "09171234567",
  "address": "Purok 3",
  "purpose": "Practice",
  "remarks": "",
  "statusCode": "RESERVED",
  "statusName": "Reserved",
  "createdByName": "Admin User"
}
```

Reservation create/update server-side validation now also enforces court policy settings and persisted unavailable blocks. Policy validation returns `400 { "errors": { ... } }`. Reservation overlap and unavailable block conflicts return `409`.

Reservation list filters accept real `YYYY-MM-DD` dates and `RESERVED`, `MISSED`, `CANCELLED`, or `COMPLETED` statuses. Invalid filter values return `400 { "errors": { ... } }` before storage is queried.

## Printable Reservation Slip

`GET /api/reservations/:reservationId/slip`

Role: signed-in staff or admin.

Response:

```json
{
  "slip": {
    "reservationId": 1,
    "referenceNo": "BCS-2026-000001",
    "representativeName": "Team Alpha",
    "contactNo": "09171234567",
    "address": "Purok 3",
    "reservationDate": "2026-05-14",
    "startTime": "08:00",
    "endTime": "09:00",
    "purpose": "Practice",
    "statusCode": "CANCELLED",
    "statusName": "Cancelled",
    "staffEncoder": "Admin User",
    "issuedAt": "2026-05-14 06:30:00",
    "barangayName": "Barangay Sto. Nino, Paranaque City",
    "courtName": "Barangay Basketball Court",
    "notes": ""
  }
}
```

Cancelled reservations remain printable but clearly return `statusCode: "CANCELLED"`.

## Daily Schedule Print

`GET /api/schedule/daily-print?date=YYYY-MM-DD`

Role: signed-in staff or admin.

Response:

```json
{
  "date": "2026-05-14",
  "generatedAt": "2026-05-14 06:30:00",
  "slots": [
    {
      "slotId": 1,
      "name": "8:00 AM - 9:00 AM",
      "startTime": "08:00",
      "endTime": "09:00",
      "statusCode": "RESERVED",
      "statusName": "Reserved",
      "isAvailableForBooking": false,
      "reservation": { "referenceNo": "BCS-2026-000001" },
      "block": null
    }
  ],
  "blocks": [],
  "totals": {
    "available": 0,
    "reserved": 1,
    "missed": 0,
    "cancelled": 0,
    "completed": 0,
    "maintenance": 0,
    "clearedPublicUse": 0
  }
}
```

## Schedule Blocks

### Create Maintenance or Unavailable Block

`POST /api/schedule/blocks`

Role: admin only.

Payload:

```json
{
  "date": "2026-05-14",
  "mode": "TIME_RANGE",
  "startTime": "13:00",
  "endTime": "15:00",
  "blockType": "REPAIRS",
  "reason": "Backboard repair"
}
```

Allowed `mode`: `WHOLE_DAY`, `TIME_RANGE`.

Allowed `blockType`: `CLEANING`, `BARANGAY_EVENT`, `REPAIRS`, `TOURNAMENT`, `MEETING`, `EMERGENCY_USE`, `MAINTENANCE`.

`reason` is required and must be 255 characters or fewer.

Response:

```json
{ "block": { "blockId": 1, "statusCode": "MAINTENANCE", "reason": "Backboard repair" } }
```

Blocks do not delete reservations. They block new reservations and display separately from resident reservations.
Maintenance blocks cannot be created over active `RESERVED` reservations; the backend returns `409` with the overlapping reservation so staff/admin can cancel or use the Clear for Public Use workflow first.

### Deactivate Block

`DELETE /api/schedule/blocks/:blockId`

Role: admin only.

Response:

```json
{ "block": { "blockId": 1, "isActive": false } }
```

## Clear For Public Use

`POST /api/schedule/clear-public-use`

Role: admin only.

Payload:

```json
{
  "date": "2026-05-14",
  "mode": "WHOLE_DAY",
  "startTime": "08:00",
  "endTime": "10:00",
  "reason": "Open public play"
}
```

Modes:

- `WHOLE_DAY`: backend uses `07:00` to `21:00`.
- `TIME_RANGE`: requires `startTime` and `endTime`.
- `FROM_TIME_ONWARD`: requires `startTime`; backend uses closing time `21:00`.

`reason` is required and must be 255 characters or fewer.

Behavior:

- Cancels only overlapping active `RESERVED` reservations.
- Does not delete records.
- Creates a persistent `PUBLIC_USE` schedule block with `statusCode: "CLEARED_PUBLIC_USE"`.
- Blocks new reservations inside the cleared range.
- Allows reservations outside the cleared range.
- Writes activity logs for the clear action and each cancelled reservation.

Response:

```json
{
  "block": { "blockId": 20, "statusCode": "CLEARED_PUBLIC_USE" },
  "cancelledReservations": [
    { "reservationId": 1, "referenceNo": "BCS-2026-000001", "statusCode": "CANCELLED" }
  ]
}
```

Legacy prototype bridge:

- `POST /api/prototype/clear-public-use`
- Admin only.
- Used by the old clickable day header so the old visual clear action now persists in the database.

## Calendar And Availability

`GET /api/schedule?date=YYYY-MM-DD`

Returns week data. Each cell includes `statusCode`, `statusName`, `isAvailableForBooking`, optional `reservation`, and optional `block`.

`GET /api/availability?date=YYYY-MM-DD&startTime=HH:MM&endTime=HH:MM&reservationId=optional`

Returns:

```json
{
  "available": false,
  "conflict": null,
  "block": { "statusCode": "CLEARED_PUBLIC_USE" },
  "suggestions": []
}
```

`block` is set when maintenance or clear public-use ranges make the request unavailable.

## Reports

`GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`

Role: signed-in staff or admin.

Response includes:

- `summary`
- `statusCounts`
- `topRequesters`
- `mostUsedDays`
- `mostUsedTimeSlots`
- `monthlyReservationCount`
- `missedReservations`
- `cancelledReservations`
- `reservationsByPurpose`
- `reservationsEncodedByStaff`
- `clearedPublicUseRanges`
- `maintenanceBlocks`

Date filters are inclusive. `from` must be on or before `to`. Without filters, reports use all reservation rows and active/inactive schedule blocks.

## Exports

All export endpoints return `text/csv; charset=utf-8` with a timestamped attachment filename.

- `GET /api/exports/daily-schedule.csv?date=YYYY-MM-DD`
- `GET /api/exports/weekly-schedule.csv?date=YYYY-MM-DD`
- `GET /api/exports/monthly-reservations.csv?month=YYYY-MM`
- `GET /api/exports/activity-logs.csv?action=&date=&from=&to=&search=`
- `GET /api/exports/missed-reservations.csv?from=&to=`
- `GET /api/exports/cancelled-reservations.csv?from=&to=`
- `GET /api/exports/reports.csv?from=&to=`

Exports include reservation reference numbers where relevant. They do not include password hashes or account password data.

## Dashboard Alerts And Backup Reminder

`GET /api/dashboard/alerts`

Role: signed-in staff or admin.

Response:

```json
{
  "date": "2026-05-14",
  "alerts": [
    { "type": "TODAY_RESERVATIONS", "severity": "info", "count": 2 },
    { "type": "BACKUP_DUE", "severity": "warning" }
  ],
  "metrics": {
    "todayReservationCount": 2,
    "missedPendingCount": 1,
    "nextReservation": null,
    "backupStatus": {
      "lastBackupAt": "2026-05-05 12:00:00",
      "daysSinceBackup": 9,
      "reminderThresholdDays": 7,
      "backupDue": true
    },
    "publicUseActiveToday": true,
    "maintenanceActiveToday": true
  }
}
```

`GET /api/maintenance/backup-status`

Returns only the `backupStatus` object. Backup age is based on `activity_logs` action `BACKUP_DATABASE`; default threshold is `7` days from `court_settings.backup_reminder_days`.

## Reservation History

`GET /api/reservations/history?contactNumber=09171234567`

or

`GET /api/reservations/history?name=Team%20Alpha`

Role: signed-in staff or admin.

Response:

```json
{
  "lookup": { "representativeName": "Team Alpha", "contactNo": "09171234567" },
  "summary": {
    "totalReservations": 5,
    "missedCount": 1,
    "cancelledCount": 1,
    "completedCount": 1,
    "activeReservationCount": 2,
    "lastReservationDate": "2026-05-20"
  },
  "pastReservations": [],
  "upcomingReservations": []
}
```

This endpoint returns only reservation-related data.

## Resident Directory

`GET /api/residents?search=&contactNumber=`

Role: signed-in staff or admin.

`POST /api/residents`

`PUT /api/residents/:residentId`

`DELETE /api/residents/:residentId`

Payload:

```json
{
  "name": "Team Alpha",
  "contactNumber": "09171234567",
  "address": "Purok 3",
  "group": "Youth",
  "notes": "Prefers evening"
}
```

Response:

```json
{
  "resident": {
    "residentId": 1,
    "name": "Team Alpha",
    "contactNumber": "09171234567",
    "address": "Purok 3",
    "group": "Youth",
    "notes": "Prefers evening",
    "createdAt": "2026-05-14 08:00:00",
    "updatedAt": "2026-05-14 08:00:00"
  }
}
```

Duplicate contact numbers return:

```json
{ "errors": { "contactNumber": "A resident or group with this contact number already exists." } }
```

Deleting a resident directory entry returns the deleted resident model when it is not linked to reservations. Entries already referenced by reservation history return `409` and are preserved.

## Court Policy Settings

`GET /api/settings/court-policy`

Role: signed-in staff or admin.

`PUT /api/settings/court-policy`

Role: admin only.

Payload fields are partial; omitted fields keep existing values.

```json
{
  "openingTime": "07:00",
  "closingTime": "21:00",
  "minimumReservationMinutes": 30,
  "maximumReservationMinutes": 240,
  "allowedDays": [0, 1, 2, 3, 4, 5, 6],
  "blockedDays": ["2026-05-20"],
  "gracePeriodBeforeMissedMinutes": 15,
  "defaultSlotMinutes": 60
}
```

Reservation creation/update rejects dates outside allowed days, blocked dates, times outside opening/closing hours, and durations outside min/max.

## Recurring Reservations

Recurring reservation creation is deferred. No recurring endpoint is exposed in this backend pass. Reason: safe recurring support needs a dedicated series model and atomic all-or-nothing create/cancel behavior so it cannot leave partial reservation series if one occurrence conflicts.

## Error Responses

Common errors:

```json
{ "error": "Login required." }
```

```json
{ "error": "Admin access required." }
```

```json
{ "errors": { "date": "Date must use YYYY-MM-DD format." } }
```

```json
{
  "error": "Reservation overlaps an existing active reservation.",
  "overlap": { "referenceNo": "BCS-2026-000001" }
}
```

```json
{
  "error": "Reservation overlaps an unavailable court range.",
  "overlap": { "statusCode": "MAINTENANCE" }
}
```
