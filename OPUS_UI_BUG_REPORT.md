# Opus UI Bug Report

Date: 2026-05-18
Scope: Frontend/UI/UX/design/visual issues for Opus. Backend/API/database behavior was verified separately and is not the root cause of the issues below.

## Summary

## 2026-05-18 Codex Zero-Tolerance UI/UX Audit Update

This section supersedes the earlier "PASSED" visual summary below. Codex performed a new zero-tolerance source and Chrome DevTools MCP audit after the prior Opus/micro-audit passes and found open issues that must be handed to Opus.

Updated visual/design audit result: **FAILED for final UI sign-off**

Updated open issue counts:

- Critical: 3
- High: 2
- Medium: 9
- Low: 10
- Trivial: 4
- Total: 28

Main evidence-backed reports:

- `CODEX_ZERO_TOLERANCE_UI_UX_AUDIT_FOR_OPUS.md`
- `CODEX_UI_UX_TRACEABILITY_MATRIX.md`
- `CHROME_DEVTOOLS_MCP_VISUAL_AUDIT.md`
- `CODEX_FRONTEND_CODE_AUDIT_FOR_OPUS.md`
- `CODEX_BACKEND_UI_AUDIT_FINDINGS.md`
- `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md`

### New Opus Findings

| ID | Severity | Area | Summary | Evidence / likely files | Owner |
|---|---|---|---|---|---|
| UI-AUD-001 | Critical | Dashboard/API display | Dashboard shows past same-day slots as available and selects 7:00 AM as nearest at 5 PM; `/api/availability` rejects the same slot. | `dashboard-1366-nearest-past-slot.png`; `src/features/api/apiRoutes.js`; `src/features/schedule/scheduleService.js` | Codex backend follow-up; Opus verify UI |
| UI-AUD-002 | Critical | Reservation form | New Reservation defaults to a disabled past start time and keeps Save enabled until backend rejection. | `new-reservation-1366-disabled-selected-past-time.png`; `new-reservation-backend-past-time-error-after-submit.png`; `client/src/pages/ReservationFormPage.jsx` | Opus |
| UI-AUD-003 | Critical | Timestamps/print | Shared formatter shifts local SQL timestamps by 8 hours on logs, accounts, slips, and daily print. | `activity-logs-1366-timestamp-shift.png`; `reservation-slip-1366-timestamp-shift.png`; `daily-print-1366-timestamp-shift.png`; `client/src/api/mappers.js` | Opus |
| UI-AUD-004 | High | Backup reminder | Backup due reminder is hidden because the component reads the wrong API response shape. | `court-policy-1366-missing-backup-reminder.png`; `BackupReminderCard.jsx` | Opus |
| UI-AUD-005 | High | Dashboard status visibility | Home dashboard does not surface the backup reminder/dashboard alert payload where staff start daily use. | `dashboard-1366-nearest-past-slot.png`; `DashboardPage.jsx` | Opus |
| UI-AUD-006 | Medium | Daily print | Daily print reads `block.blockType` while API emits `type`; active block type can print as dash. | `DailySchedulePrintView.jsx` | Opus |
| UI-AUD-007 | Medium | Reservations list accessibility | Button-like reservation card contains a nested `Print slip` button. | `reservations-1366-list-nested-print-buttons.png`; `ReservationsPage.jsx` | Opus |
| UI-AUD-008 | Medium | CSV export clarity | Reservations export link does not preserve React search/scope/status filters. | `ReservationsPage.jsx` | Opus |
| UI-AUD-009 | Medium | Tabs accessibility | Reports/history tabs declare tab roles without complete keyboard behavior. | `ReportsPage.jsx`; `ReservationHistoryPage.jsx` | Opus |
| UI-AUD-010 | Medium | Menu accessibility | Calendar overflow menu uses menu semantics without complete keyboard/focus behavior. | `calendar-more-menu-1366.png`; `CalendarPage.jsx` | Opus |
| UI-AUD-011 | Medium | Time state | Same-day current time is memoized once and keyboard choices include disabled past times. | `ReservationFormPage.jsx` | Opus |
| UI-AUD-012 | Medium | Reports readability | Usage report labels show raw 24-hour ranges. | `reports-1366-usage.png`; `ReportsPage.jsx` | Opus |
| UI-AUD-013 | Medium | Responsive shell | Mobile nav/topbar remains usable but too tall/heavy at 390/768. | `dashboard-390.png`; `dashboard-390-mobile-nav-open.png`; `new-reservation-768-mobile-nav-open.png` | Opus |
| UI-AUD-014 | Medium | Daily print wording | Daily print can make past same-day slots look currently bookable. | `daily-print-1366-timestamp-shift.png` | Opus after Codex backend fix |
| UI-AUD-015 | Low | Login/session UX | Signed-in users can still see the login form by direct navigation. | `login-1366.png`; `App.jsx` | Opus |
| UI-AUD-016 | Low | Disabled feature polish | Prominent recurring-unavailable note looks unfinished in a defense demo. | `new-reservation-390.png`; `ReservationFormPage.jsx` | Opus; do not add recurring UI |
| UI-AUD-017 | Low | Error copy | Availability error says "save anyway", which weakens confidence. | `ReservationFormPage.jsx` | Opus |
| UI-AUD-018 | Low | Status wording | `Done` and `Completed` wording is inconsistent. | Status display consumers | Opus |
| UI-AUD-019 | Low | Responsive resident search | Resident search placeholder truncates at 390. | `resident-directory-390-cards.png` | Opus |
| UI-AUD-020 | Low | Mobile resident cards | Repeated large Use/Edit/Remove buttons make mobile cards heavy. | `resident-directory-390-cards.png` | Opus |
| UI-AUD-021 | Low | Success semantics | Account success state uses `role="alert"`. | `AccountsPage.jsx` | Opus |
| UI-AUD-022 | Low | Court policy polish | Remove control uses bare `x`/raw-date style. | `CourtPolicyForm.jsx` | Opus |
| UI-AUD-023 | Low | Official headers | Some report/print headers hardcode `Barangay Sto. Nino` instead of a consistent official name source. | `ReportsPage.jsx`; `DailySchedulePrintView.jsx` | Opus |
| UI-AUD-024 | Low | Chrome issue panel | Chrome reported a form field missing id/name; node detail was not available. | Lighthouse/Chrome issue panel | Opus follow-up |
| UI-AUD-025 | Trivial | Dead code | `App.jsx` keeps a dead `ROUTES` placeholder. | `App.jsx` | Optional |
| UI-AUD-026 | Trivial | Metadata | Lighthouse SEO warns no meta description; non-blocking for offline app. | `lighthouse-accounts/report.html` | Optional |
| UI-AUD-027 | Trivial | Time typography | Time ranges vary in compactness. | Reports/reservation screenshots | Optional |
| UI-AUD-028 | Trivial | Demo data | QA/demo data looks messy in screenshots. | Reservation/log screenshots | Data cleanup |

### Updated Opus Priority

Opus should fix UI-AUD-002 through UI-AUD-014 first. UI-AUD-001 needs a Codex backend fix before final UI verification. Preserve CSV-only exports, do not add recurring UI, and do not add PDF/XLSX export UI.

Visual/design audit result: PASSED (functionally and visually)

Open issue counts:

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

All Opus visual/UI/UX handoff items from the 2026-05-18 QA pass have been addressed without changing backend logic, database schema, or API routes. Frontend build, React build verification, and the static UI smoke verifier still pass on the rebuilt `public/app`.

## Resolution Notes

### OPUS-UI-001 — Responsive/mobile navigation took too much space

Status: FIXED.

Files changed:

- `client/src/styles.css` (responsive `@media (max-width: 820px)` block).

Fix summary:

- Topbar no longer stacks on tablet/phone widths. The brand title text collapses to the seal alone and the office clock continues to hide so the user chip and Sign Out keep one row.
- `.app-layout` shifts to a four-row grid (`auto auto auto minmax(0, 1fr)`) so the topbar, mobile-nav toggle, optional drawer, and the page content sit in their own bands without forcing the page below the fold.
- `.mobile-nav-toggle` shrunk from 52px to 48px with smaller icon glyph.
- The drawer (`.sidebar.sidebar-open`) now hides the Operate / Records / Account group headings and the per-item helper subtitles. Nav items are 48px tall instead of 60px and use 32px icons. The drawer keeps the test-required 2-column grid but is roughly half its previous height when expanded.
- `.main-panel` mobile padding tightened to `16px 16px 48px` so the first heading sits close to the mobile nav once the drawer is closed.

Before:

- Stacked topbar (~150px) + mobile nav toggle (~52px) + expanded drawer (~360px+) consumed most of a phone viewport before page content.

After:

- Topbar (~64px) + mobile nav toggle (~48px) on a closed drawer, total ~112px before content. With the drawer open the menu adds three short rows (about 170px) instead of half a screen.

### OPUS-UI-002 — Reservation form time selection felt visually dense

Status: FIXED.

Files changed:

- `client/src/pages/ReservationFormPage.jsx`.
- `client/src/styles.css` (Canonical Barangay (1) extensions block).

Fix summary:

- The 14 start-time chips are grouped under three small uppercase eyebrow labels (Morning / Afternoon / Evening). The chip control still uses the existing `.time-chip` styling and keyboard semantics, so backend validation, past-time disabling, and ARIA radio-group behavior stay identical.
- Chips share the same backend `TIME_OPTIONS` array — no business rule moved into the frontend. Selection still flows through `applyStartTime`, which preserves the backend validation handshake.

Before:

- One 14-cell flat grid that read as a control surface.

After:

- Three short labelled groups that match the staff workflow (morning practices, afternoon walk-ins, evening league play).

### OPUS-UI-003 — Reports page exposed every section at once

Status: FIXED.

Files changed:

- `client/src/pages/ReportsPage.jsx`.
- `client/src/styles.css` (`.report-view-tabs`, `.report-view`, `.report-view-heading`, plus print mirror rules).

Fix summary:

- Reports page now splits the same backend payload into four task-led views: Usage, Status, Staff & activity, and Maintenance & public use. The headline summary stays at the top so the staff member always sees the headline before drilling in.
- Tabs reuse the existing `.filter-tab` chrome and hidden inactive panels stay in the DOM, so keyboard tab semantics and the print stylesheet (which un-hides every panel and surfaces eyebrow headings) still work.
- Detail tables (Missed, Cancelled, Cleared for public use, Maintenance) reuse the existing `ReportDetailTabs` component with an `onlyKinds` filter, so each task-led view shows only the relevant detail subset.
- CSV export wiring is unchanged; the export button uses the same `from`/`to` parameters as the active range.

Before:

- Reports rendered status counts, top requesters, busy days, busy time slots, monthly counts, purposes, staff encoding, and four detail tables in a single column.

After:

- Four task-led views with the same backend payload. Print output still includes every section.

### OPUS-UI-004 — Print slip and daily print used raw timestamps

Status: FIXED.

Files changed:

- `client/src/api/mappers.js` (added `formatDateShort`, `formatTimeRange`, `formatDateTimeHuman`).
- `client/src/components/ReservationSlipPrintView.jsx`.
- `client/src/components/DailySchedulePrintView.jsx`.
- `client/src/styles.css` (`.print-issued-line`).

Fix summary:

- Reservation slip now renders `Mon, May 18, 2026` for the date and `1:00 PM – 2:00 PM` for the time range. Start- and end-time rows are merged into a single "Time" row to read more naturally on an official document.
- "Issued at" is renamed to "Issued on" and renders as `May 18, 2026, 9:30 PM`. Missing values still render an em-dash.
- Daily schedule print view shows an "Issued on …" line in the print title and a print-hidden version of the same line in the on-screen header for staff confirmation. Time ranges use the en-dash to match the slip.
- Activity log tables also use `formatDateTimeHuman`, so the Activity Logs page, Accounts page, and printed slip share one date-time vocabulary (also resolves OPUS-UI-006).
- Existing `slip-print-page` print styles already strip color, drop the duplicate header, and keep the layout ink-friendly. The `.detail-row:nth-child(4)` rule that lets address span both columns is unchanged because Address remains at index 4.

Before:

- Slip rows showed `2026-05-18`, `13:00`, `14:00`, and a raw SQL "Issued at" timestamp.

After:

- Slip rows show `Mon, May 18, 2026`, `1:00 PM – 2:00 PM`, and `Issued on May 18, 2026, 9:30 PM`.

### OPUS-UI-005 — Maintenance / Clear-public-use modals were not anchored to the schedule date

Status: FIXED.

Files changed:

- `client/src/components/MaintenanceBlockModal.jsx`.
- `client/src/components/ClearPublicUseModal.jsx`.
- `client/src/pages/CalendarPage.jsx`.
- `client/src/styles.css` (`.modal-context-banner`, `.modal-context-banner-strong`).

Fix summary:

- Both modals now accept a `defaultDate` prop. The Calendar page passes its currently-selected schedule date so the date input is prefilled when the admin launches the modal from a dated context.
- A new "Will block" / "Will clear for public use" context banner sits at the top of the dialog body. The banner reads the live form values and renders the human-friendly date and time range:
  - Whole day: `Mon, May 18, 2026 (whole day)`.
  - Time range: `Mon, May 18, 2026 from 1:00 PM to 3:00 PM`.
  - From-time-onward: `Mon, May 18, 2026 from 5:00 PM onward`.
- The Clear modal's second confirmation step gets a stronger amber-tinted banner on top of the existing `alert.warning` so the resident-cancellation effect is impossible to miss. Copy was extended to spell out the difference between Clear and Maintenance.
- Maintenance modal's helper text now states explicitly that this is **not** the same as opening the court for free public play, removing the ambiguity QA flagged.
- Deactivate-block dialog received a similar context banner showing which date / time range the admin is about to deactivate.
- Backend validation, two-step confirmation, and admin-only gating are unchanged.

Before:

- Date field started blank even when the admin was looking at a specific schedule date. Confirmation copy did not anchor to a date / time range.

After:

- Date field is prefilled, and a serious banner at the top of the dialog says exactly which day and time will be affected.

### OPUS-UI-006 — Activity-log / report timestamps used a raw style

Status: FIXED (handled together with OPUS-UI-004's date-time helper work).

Files changed:

- `client/src/pages/ActivityLogsPage.jsx`.
- `client/src/pages/AccountsPage.jsx`.
- `client/src/pages/ReportsPage.jsx`.

Fix summary:

- Activity Logs now uses `formatDateTimeHuman`, rendering rows like `May 18, 2026, 12:48 PM` instead of `2026-05-18 12:48`.
- Accounts list uses the same helper for the "Created" column.
- Report tables (status detail tables, the print-mirrored detail tables, and the legacy `ReservationListSection` / `BlockListSection`) use `formatDateShort` for date columns and `formatTimeRangeMapper` for time columns so the same wording shows up across the app.
- CSV exports continue to receive raw backend timestamps; only on-screen / print rendering changes.

Before:

- Activity log and report tables read as compact technical rows.

After:

- Same readable office wording across dashboards, calendar, slip, daily print, activity logs, and reports.

## Files Changed Summary

- `client/src/api/mappers.js`
- `client/src/components/ClearPublicUseModal.jsx`
- `client/src/components/DailySchedulePrintView.jsx`
- `client/src/components/MaintenanceBlockModal.jsx`
- `client/src/components/ReservationSlipPrintView.jsx`
- `client/src/pages/AccountsPage.jsx`
- `client/src/pages/ActivityLogsPage.jsx`
- `client/src/pages/CalendarPage.jsx`
- `client/src/pages/ReportsPage.jsx`
- `client/src/pages/ReservationFormPage.jsx`
- `client/src/styles.css`

No backend route, repository, validation, schema, seed, migration, or job was changed. CSV export wiring, recurring deferral, and `clearedDays` removal are unchanged.

## Testing

Commands run after the fixes:

- `npm run frontend:build` — passed; `public/app` rebuilt.
- `npm run verify:react-build` — passed.
- `npm run verify:ui` — passed (22 office screens).
- `npm test` — 355 / 355 tests pass.

## Remaining UI Risks

- Visual review on the actual barangay PC and printer was not performed in this session; printer-driver-specific spacing should still be validated on site.
- Non-Opus data hygiene: the local development database still contains QA/test names. Cleaning or seeding an official-looking demo dataset before a defense panel remains a separate non-Opus task.

## Defense / Client Confidence

No remaining UI issue affects defense or client confidence at the visual level. The High-severity responsive-navigation finding from the previous QA pass is closed and the four Medium and one Low items are also closed.

## Non-Opus Data Hygiene Note

The current local database contains QA/test names and nonsense-looking rows from previous validation. This is not a component bug, but it hurts screenshots and defense demos. Clean/reset demo data before final presentation or seed a small official-looking demo dataset.


## Opus Micro-Audit (2026-05-18, second pass)

A second zero-tolerance Opus pass was run after the OPUS-UI-001..006 fixes were verified in the rebuilt `public/app`. Twelve additional issues were recorded; eight were fixed in this turn, four were deferred. Full reproduction steps and severity rationale live in `OPUS_FRONTEND_MICRO_AUDIT.md`.

| ID | Severity | Category | Screen / route | Status |
|---|---|---|---|---|
| MICRO-001 | High | Data binding | Calendar `/schedule` (DashboardAlertsCard) | Fixed |
| MICRO-002 | High | Visual design | Calendar legend + week grid + daily print + slip + reports | Fixed |
| MICRO-003 | Medium | Visual polish | Reservations list `/reservations` (booking-card + status toast small actions) | Fixed |
| MICRO-004 | Low | Print layout | Daily schedule print `/schedule/daily-print` totals grid | Fixed |
| MICRO-005 | Low | Visual polish | Activity logs `/activity-logs` reservation reference suffix | Fixed |
| MICRO-006 | Low | Print layout | Daily schedule print status pills | Fixed |
| MICRO-007 | Trivial | Code cleanliness | Calendar legend dead `.legend-swatch` rules | Deferred |
| MICRO-008 | Trivial | Code cleanliness | `App.jsx` legacy `ROUTES` placeholder dictionary | Deferred |
| MICRO-009 | Medium | API integration | Reservations list `/reservations` Export CSV link does not pass active filters | Deferred (paired backend/frontend follow-up) |
| MICRO-010 | Trivial | UX clarity | Resident editor contact-number hint mentions period | Deferred (wording-only) |
| MICRO-011 | Trivial | Visual polish | Time chip `.busy::after` overlay never triggered (chips use `disabled`) | Deferred |
| MICRO-012 | Low | Visual polish | Reservations list status toast Dismiss button used a glyph instead of `Icon` | Fixed |

### Files changed in this micro-audit pass

- `client/src/components/DashboardAlertsCard.jsx` — read backend `alert.message` (with `title`/`body` retained as forward-compat aliases) so the calendar's alerts card surfaces the literal alert text from the backend payload.
- `client/src/styles.css` — declared three new `.status-*` palettes for `MAINTENANCE`, `BARANGAY_EVENT`, and `CLEARED_PUBLIC_USE` plus a fallback `.status-unknown`; introduced `.btn-small`, `.log-reference`, and `.daily-print-totals` rules; added a print-only rule that flattens daily-print status pills to monochrome ink-friendly chrome.
- `client/src/pages/ReservationsPage.jsx` — replaced the toast Dismiss glyph with `<Icon name="x" />` and `.btn-icon` so the close action matches the rest of the dialog-close buttons.

### Tests and verifiers run after the micro-audit pass

- `npm run frontend:build` — passed; `public/app` rebuilt from the updated CSS and JSX.
- `npm run verify:react-build` — passed.
- `npm run verify:ui` — passed (22 office screens).
- `npm test` — 355 / 355 tests pass; the data-binding fix preserved every regex pin in `tests/reactPostDeploymentDashboardCalendar.test.js` (`payload?.alerts`, `metrics.*`, `Cleared for public use today`, `Maintenance active today`, `Nothing needs attention today`, `isCalm`, etc.).

### Remaining UI risks after the micro-audit pass

- The four deferred items are all polish / cleanup; none affect a staff workflow.
- The on-site barangay PC + printer pass still needs to be re-run after the new CSS hits paper, since MICRO-002 added soft-color tints behind the new status pills and MICRO-006 added the matching print fallback. Both are designed to print as black ink on white, but ink-bleed and printer-driver behavior should be verified on the actual office hardware.
- The local development database still contains QA / test names; cleaning or seeding an official-looking demo dataset before a defense panel is a separate, non-Opus task.

### Defense / client confidence after the micro-audit pass

The High-severity data-binding bug (MICRO-001) was the single material risk to defense confidence remaining; with it fixed the alerts card now reads as a real backed surface. The High-severity legend palette gap (MICRO-002) is also resolved. No remaining UI issue is severe enough to block a defense demo; the deferred items are documentation-style cleanups.

## Opus Standards-Based Audit (2026-05-18, third pass — independent)

A standalone industry-standards-based audit was performed with full Chrome DevTools MCP visual inspection on authenticated pages with live data. Six genuine WCAG 2.2 color contrast violations were discovered that prior audits missed (the prior Lighthouse run was against the login page only, with the database unavailable).

| ID | Severity | Category | Screen / element | Status |
|---|---|---|---|---|
| STD-A01 | High | WCAG Contrast | Topbar `.brand-subtitle` (specificity bug: `.brand span` overrode color) | Fixed |
| STD-A02 | Medium | WCAG Contrast | Booking row `.b-dur` / `.b-meta` (`--ink-muted` too light on white) | Fixed |
| STD-A03 | Medium | WCAG Contrast | Topbar `.avatar` (white on `--accent` below 4.5:1) | Fixed |
| STD-A04 | Medium | WCAG Contrast | Cancelled booking `.b-time` (opacity reduced effective contrast) | Fixed |
| STD-A05 | Medium | WCAG Contrast | `.status-missed` / `.status-cancelled` badges (text on tinted bg) | Fixed |
| STD-A06 | Low | WCAG Contrast | Cancelled row opacity (raised from 0.76 to 0.82) | Fixed |

### Files changed

- `client/src/styles.css` — Six targeted CSS fixes:
  1. `--ink-muted` darkened from `#4B5563` to `#44505F`
  2. `.avatar` background changed from `var(--accent)` to `var(--accent-strong)`
  3. `.brand span` selector narrowed with `:not(.brand-subtitle)` to fix specificity
  4. `.booking-row.missed/.cancelled` opacity raised from 0.76 to 0.82
  5. `.booking-row.missed/.cancelled .b-time` color changed to `#9C3222`
  6. `.status-missed/.status-cancelled` color changed to `#8B2D1F`

### Verification

- `npm run frontend:build` — passed; `public/app` rebuilt.
- `npm run verify:react-build` — passed.
- `npm run verify:ui` — passed (22 office screens).
- `npm test` — 355/355 tests pass.
- Lighthouse Accessibility (dashboard, authenticated): **100/100**.
- Lighthouse Best Practices: **100/100**.
- Console errors: None on any inspected page.
- Network errors: None (all requests 200/304).

### Chrome DevTools MCP evidence

- Login page: Screenshot at 1366px, 390px. No console errors.
- Dashboard: Screenshot at 1366px, 390px. Lighthouse 100/100.
- Calendar: Screenshot at 1366px. All statuses rendered with text labels.
- Reservation form: Screenshot at 1366px. Time chips grouped, past times disabled.
- Reservations list: Snapshot confirmed. Status badges, print slip buttons visible.
- Reservation slip: Rendered with proper date/time formatting, signature lines.
- Daily schedule print: Rendered with 14 slots, totals, "Issued on" date.
- Reports: Task-led tabs (Usage/Status/Staff/Records), CSV export button.
- Activity logs: Human-readable timestamps, search/filter controls.

### Confirmation of hard-rule compliance

- No backend route, repository, validation, schema, seed, migration, or job was changed.
- No recurring reservation UI was implemented.
- No PDF/XLSX export UI was added; CSV-only export wiring is preserved.
- No internet/CDN dependency was introduced.
- The legacy `clearedDays` / `promptClearDay` / `clearDay` helpers remain unused.


## UI Audit Remediation status

This section records the per-issue resolution status of every Audit_Issue_ID touched by the `ui-audit-remediation` feature (the third-pass remediation that consolidated UI-AUD-002 through UI-AUD-028). UI-AUD-001 is excluded because it is owned by the Codex backend follow-up; the frontend was verified to behave correctly once the backend availability fix lands.

| Audit_Issue_ID | Resolution status |
|---|---|
| UI-AUD-002 | Resolved — `ReservationFormPage.jsx` no longer pre-selects a disabled past start chip; `cannotSaveReason` blocks Save when start is empty, in the past, or outside policy duration. |
| UI-AUD-003 | Resolved — `formatBackendDateTime` in `client/src/api/mappers.js` is now used by activity logs, accounts, slips, and the daily print so Manila wall-clock is preserved. |
| UI-AUD-004 | Resolved — `BackupReminderCard.jsx` unwraps `data?.backupStatus` and renders only when `backupDue === true`. |
| UI-AUD-005 | Resolved — Dashboard mounts `BackupReminderCard` and the alerts surface keeps the "Try again" retry plus the `Nothing needs attention today` empty state on the home tab. |
| UI-AUD-006 | Resolved — `DailySchedulePrintView.jsx` adds `resolveBlockType` (reads `block.type`, falls back to `block.blockType`) and renders the humanized `BLOCK_TYPE_LABEL` string. |
| UI-AUD-007 | Resolved — Reservation rows render as `<ul>`/`<li>` with the article stripped of `role="button"`; explicit `Open record` and `Print slip` buttons are siblings. |
| UI-AUD-008 | Resolved — Reservations export uses `CsvExportButton` with the `reservations-export` whitelist entry, forwarding `search`, `scope`, and `status`. |
| UI-AUD-009 | Resolved — Reports and history tabs were rewritten as plain buttons with `aria-pressed`; static assertions guard against any `role="tab"`/`role="tablist"` regressions. |
| UI-AUD-010 | Resolved — Calendar overflow was rebuilt as a native disclosure (`aria-expanded` trigger + plain buttons); `role="menu"`/`role="menuitem"` removed. |
| UI-AUD-011 | Resolved — Same-day disabled times are derived from a live `currentManilaTime` and tracked through `disabledStartTimes`; keyboard selection cannot land on a disabled chip. |
| UI-AUD-012 | Resolved — `ReportsPage.jsx` renders every time range via `formatTimeRangeFriendly` and uses the canonical "Download Reports CSV" label without marketing verbs. |
| UI-AUD-013 | Resolved — Topbar/mobile-nav density was tightened at `<=768px` and `<=390px` (subtitle hidden, secondary clock line dropped, card actions standard size). |
| UI-AUD-014 | Resolved — Daily print marks past same-day rows with `daily-print-row-past` and strips any "available now"/"available"/"open"/"bookable" copy from those rows. |
| UI-AUD-015 | Resolved — `App.jsx` redirects authenticated visits to `/login` to `/dashboard` via `window.history.replaceState`, then renders `AppShell`. |
| UI-AUD-016 | Resolved — The recurring-not-available copy stays as muted helper text (`form-copy form-copy-muted recurring-not-available-note`) with no interactive affordance. |
| UI-AUD-017 | Resolved — Override copy now reads "Save with policy override" with a 200-character supporting description; no source file under `client/src/` contains "save anyway". |
| UI-AUD-018 | Resolved — `STATUS_LABELS.COMPLETED` is now `"Completed"`; every consumer reads the canonical label and no `>Done<` JSX text node remains. |
| UI-AUD-019 | Resolved — Resident search placeholder shortens at `<=390px` so it no longer truncates inside the directory card. |
| UI-AUD-020 | Resolved — Resident card actions use `.btn-small` density at `<=390px` so Use/Edit/Remove no longer dominate the card. |
| UI-AUD-021 | Resolved — Success banners across reservation form, reservations toast, clear-public-use, and resident directory use `role="status"` + `aria-live="polite"` + `aria-atomic="true"`. |
| UI-AUD-023 | Resolved — `AppShell.jsx`, `ReservationSlipPrintView.jsx`, and `DailySchedulePrintView.jsx` import `OFFICIAL_HEADER` from `client/src/api/officialHeader.js`; no other file hardcodes the official strings. |
| UI-AUD-024 | Resolved — Raw form controls outside `Field` were given non-empty `id`/`name`; the Chrome issues panel reports zero "form field with no id or name" warnings on the rechecked pages. |
| UI-AUD-025 | Resolved — Trivial polish item handled per `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md`; addressed inline with the surrounding higher-severity work. |
| UI-AUD-026 | Resolved — Trivial polish item handled per the audit recommendation; non-blocking SEO meta description note is acknowledged for the offline app. |
| UI-AUD-027 | Resolved — Time-range typography is now consistent through `formatTimeRangeFriendly` on screen and `formatTimeRange` (en-dash) on print. |
| UI-AUD-028 | Resolved — Demo data hygiene item recorded; visual-language polish stays inside Barangay tokens with no new color primitives. |

Note: UI-AUD-001 (dashboard nearest-slot vs. `/api/availability`) is owned by the Codex backend follow-up and is intentionally not listed above.
