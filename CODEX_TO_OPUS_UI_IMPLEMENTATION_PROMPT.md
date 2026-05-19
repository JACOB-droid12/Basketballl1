# Copy-Paste Prompt for Opus UI Implementation

You are Opus 4.7 implementing frontend/UI/UX fixes for the Barangay Basketball Court Scheduling System.

Context:

- Offline local Windows barangay office app for Barangay Sto. Nino staff/admins.
- Residents do not book online. Staff encode walk-in reservations.
- Current backend/system foundation is strong, but Codex zero-tolerance UI/UX audit on 2026-05-18 judged final UI sign-off as FAILED until critical frontend issues are fixed.
- Evidence root: `tmp/codex-zero-tolerance-ui-audit`.
- Main audit files:
  - `CODEX_ZERO_TOLERANCE_UI_UX_AUDIT_FOR_OPUS.md`
  - `CODEX_UI_UX_TRACEABILITY_MATRIX.md`
  - `CHROME_DEVTOOLS_MCP_VISUAL_AUDIT.md`
  - `CODEX_FRONTEND_CODE_AUDIT_FOR_OPUS.md`
  - `CODEX_BACKEND_UI_AUDIT_FINDINGS.md`

Hard rules:

- Do not change backend logic unless Codex explicitly hands off a backend patch separately.
- Do not change database schema.
- Do not change API routes.
- Do not change reservation overlap protection, Clear for Public Use behavior, maintenance block behavior, backup/restore behavior, or export formats.
- Do not add recurring reservation UI.
- Do not add PDF/XLSX UI.
- Preserve CSV-only exports.
- Preserve backend-backed Clear for Public Use.
- Preserve the Barangay/public-office design language: quiet, official, task-first, predictable, not SaaS/marketing-like.
- Keep fixes focused and testable.

Priority fixes:

1. **UI-AUD-002 Critical: New Reservation invalid default selected time**
   - Route: `/reservations/new`
   - Evidence: `new-reservation-1366-disabled-selected-past-time.png`, `new-reservation-backend-past-time-error-after-submit.png`, `new-reservation-390.png`
   - Actual: Today's form selects 7:00 AM after that time has already passed; the chip is disabled but selected; Save remains enabled; backend rejects only after submit.
   - Expected: For today's date, select the first future valid start time or require staff to select one. Save must be disabled until date/start/end are valid. Duration/end-time controls must stay close and clear.
   - Likely file: `client/src/pages/ReservationFormPage.jsx`.

2. **UI-AUD-003 Critical: Timestamp display shifts by 8 hours**
   - Routes: `/activity-logs`, `/account`, `/reservations/:id/slip`, `/schedule/daily-print`
   - Evidence: `activity-logs-1366-timestamp-shift.png`, `reservation-slip-1366-timestamp-shift.png`, `daily-print-1366-timestamp-shift.png`
   - Actual: Backend local SQL `17:31` displays as `9:31 AM`.
   - Expected: UI/print display the same local Manila/office timestamp intended by the backend.
   - Likely files: `client/src/api/mappers.js`, `ActivityLogsPage.jsx`, `AccountsPage.jsx`, `ReservationSlipPrintView.jsx`, `DailySchedulePrintView.jsx`, related tests.

3. **UI-AUD-004 High: Backup reminder hidden**
   - Route: `/settings/court-policy`; dashboard placement also needed.
   - Evidence: `court-policy-1366-missing-backup-reminder.png`.
   - Actual: API returns `{ backupStatus: { backupDue: true } }`, component stores wrapper object and renders nothing.
   - Expected: Backup due reminder appears clearly but non-blockingly.
   - Likely file: `client/src/components/BackupReminderCard.jsx`; consider `DashboardPage.jsx`/`CourtPolicyPage.jsx`.

4. **UI-AUD-007 Medium: Reservation list nested controls**
   - Route: `/reservations`
   - Evidence: `reservations-1366-list-nested-print-buttons.png`
   - Actual: `role="button"` card contains a real Print button.
   - Expected: Semantic list/card with explicit View/Open and Print actions, no nested interactive controls.
   - Likely file: `client/src/pages/ReservationsPage.jsx`.

5. **UI-AUD-008 Medium: Reservations export filter mismatch**
   - Route: `/reservations`
   - Actual: `Export CSV` uses `/reservations/export.csv` and does not preserve React search/scope/status filters.
   - Expected: Either export the current filtered set or explicitly label it as all reservations. Preserve CSV-only support.
   - Likely file: `client/src/pages/ReservationsPage.jsx`; backend only if a new filtered endpoint is approved separately.

6. **UI-AUD-009 and UI-AUD-010 Medium: ARIA tab/menu keyboard gaps**
   - Routes: `/reports`, `/reservations/history`, `/schedule`
   - Expected: Implement proper ARIA keyboard behavior or simplify to native button groups/disclosures without pretending to be tabs/menus.
   - Likely files: `ReportsPage.jsx`, `ReservationHistoryPage.jsx`, `CalendarPage.jsx`.

7. **UI-AUD-006 and UI-AUD-014 Medium: Daily print display**
   - Route: `/schedule/daily-print?date=...`
   - Evidence: `daily-print-1366-timestamp-shift.png`
   - Expected: Fix timestamp, read `block.type || block.blockType`, humanize block type, and avoid implying past same-day slots are bookable-now.
   - Likely file: `client/src/components/DailySchedulePrintView.jsx`.

8. **UI-AUD-012 Medium: Reports raw time labels**
   - Route: `/reports`
   - Evidence: `reports-1366-usage.png`
   - Expected: Friendly time ranges, task-led export labels, official/public-service wording.
   - Likely file: `client/src/pages/ReportsPage.jsx`.

9. **UI-AUD-013, UI-AUD-019, UI-AUD-020 Low/Medium: Responsive density**
   - Routes: `/dashboard`, `/reservations/new`, `/residents`
   - Evidence: `dashboard-390.png`, `dashboard-390-mobile-nav-open.png`, `new-reservation-768-mobile-nav-open.png`, `resident-directory-390-cards.png`
   - Expected: Keep Home, Calendar, New Reservation, and current-page context visible while reducing nav/topbar/card action weight.

10. **Polish cleanup**
    - UI-AUD-015 signed-in `/login`.
    - UI-AUD-016 de-emphasize recurring unavailable note without adding recurring UI.
    - UI-AUD-017 rewrite "save anyway" copy.
    - UI-AUD-018 normalize Done/Completed status wording.
    - UI-AUD-021 use status role for success messages.
    - UI-AUD-023 official header spelling/config consistency.
    - UI-AUD-024 rerun Chrome issues panel for form id/name warning.
    - UI-AUD-025 through UI-AUD-028 are tiny/trivial but should be handled if touched.

Backend note:

- Codex found one backend/API issue: `CODEX-BE-UI-001`, dashboard counts and nearest availability include past same-day slots. Do not solve it with fake frontend-only filtering unless Codex explicitly asks. If Codex fixes backend first, verify the Dashboard UI displays the corrected payload.

Required tests after fixes:

- `npm run frontend:build`
- `npm run verify:react-build`
- `npm run verify:ui`
- `npm test`
- Chrome DevTools MCP screenshots for 1366, 1024, 768, and 390.
- Chrome DevTools MCP console/network check after login, dashboard, schedule, reservation form validation, reservations list, reports, residents, activity logs, court policy, account, slip print, and daily print.
- Print route screenshot checks for reservation slip and daily schedule.

Final output required from Opus:

- List of files changed.
- Issues fixed by ID.
- Issues intentionally deferred, with reason.
- Commands run and exact pass/fail results.
- Screenshot/evidence paths for key fixed screens.
- Confirmation no backend/schema/API/recurring/PDF/XLSX changes were made unless separately approved.
