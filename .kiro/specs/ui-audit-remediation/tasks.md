# Implementation Plan: UI Audit Remediation

## Overview

This plan converts the UI audit remediation design into discrete coding steps for `client/src/`, `client/src/styles.css`, the `tests/` directory, and the documentation files in Requirement 22. Work is narrowly scoped: every task either (a) edits an existing page or component, (b) adds a small shared module to `client/src/api/` or `client/src/components/`, or (c) updates copy, ARIA, or layout on an existing surface. No backend route handler, database schema, API route path, or server-side validation is modified (Req. 24.1–24.3).

Per the design's testing strategy, no generative property-based tests are introduced. The test layer extends the existing `tests/reactFrontendStatic.test.js` static-source assertions and adds a small set of optional behavioral tests under `tests/`, all discovered by `node scripts/run-tests.mjs`.

Tasks are ordered so foundational helpers (Modal_Shell, timestamp formatter, official header) land before the surfaces that consume them, and so verification + documentation come last.

## Tasks

- [x] 1. Implement shared frontend helper modules
  - [x] 1.1 Add `formatBackendDateTime` to `client/src/api/mappers.js`
    - Export `formatBackendDateTime(value)` that delegates to the existing `formatDateTimeHuman` and returns `"—"` when the value is `null`, `undefined`, empty, or unparseable.
    - Do not change the existing `formatDateTimeHuman` behavior (it already preserves Manila wall-clock through Intl with `timeZone: "UTC"` for the local-SQL form and `timeZone: "Asia/Manila"` for ISO strings).
    - Do not change `STATUS_LABELS`, `formatTime`, `formatDate`, or any other existing export in this task.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Update `STATUS_LABELS.COMPLETED` to a single canonical label in `client/src/api/mappers.js`
    - Change `STATUS_LABELS.COMPLETED` from `"Done"` to `"Completed"` so every consumer reads one string.
    - Keep `STATUS_LABELS` keys for `AVAILABLE`, `RESERVED`, `MISSED`, `CANCELLED` unchanged.
    - Do not change `client/src/api/statusDisplay.js`; its label fallback chain already prefers backend `statusName`, then the canonical `STATUS_LABELS` value.
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 1.3 Add `formatTimeRangeFriendly` to `client/src/api/mappers.js`
    - Export `formatTimeRangeFriendly(startTime, endTime)` that returns `"9:00 AM to 11:00 AM"` (literal `" to "` separator); falls back to whichever bound is present.
    - Do not modify `formatTimeRange` (used by the slip print view with the en-dash).
    - _Requirements: 10.1, 10.2_

  - [x] 1.4 Create `client/src/api/officialHeader.js`
    - Export a frozen `OFFICIAL_HEADER` constant with `barangayName: "Barangay Sto. Niño"`, `courtName: "Basketball Court"`, `subtitle: "Office Computer"`.
    - Export `getOfficialHeader()` for symmetry with the rest of `client/src/api/`.
    - File contains no `https://`/`http://`/`//cdn.` references.
    - _Requirements: 18.1, 18.2, 24.13, 24.14_

  - [x] 1.5 Extend `tests/reactFrontendStatic.test.js` with helper-module assertions
    - Assert `formatBackendDateTime` exports from `client/src/api/mappers.js` and renders a representative Manila value (`"2026-05-18T17:31:00"`) as a string containing `"5:31 PM"` (or the matching 24-hour form already used by the surface) when the test process is forced to UTC via `process.env.TZ = "UTC"`.
    - Assert `STATUS_LABELS.COMPLETED === "Completed"`.
    - Assert `formatTimeRangeFriendly("09:00", "11:00") === "9:00 AM to 11:00 AM"`.
    - Assert `OFFICIAL_HEADER.barangayName === "Barangay Sto. Niño"`.
    - Use `node:test`; no outbound network call.
    - _Requirements: 2.5, 16.1, 10.1, 18.1_

- [x] 2. Implement the shared `Modal_Shell`
  - [x] 2.1 Create `client/src/components/ModalShell.jsx`
    - Component signature `{ open, onClose, title, kicker, subtitle, size = "md", busy, footer, children }`.
    - Returns `null` when `open === false` so form state cannot leak between mounts.
    - Renders one `<div className="modal-shell-backdrop">` containing one `<section className="modal-shell modal-shell-{size}">`, with three child regions in order: `<header className="modal-shell-head">`, `<div className="modal-shell-body">`, `<footer className="modal-shell-foot">`.
    - Implements the focus-trap loop already used by `ConfirmDialog`, `MaintenanceBlockModal`, and `ResidentPickerDialog` (consolidated in this single file): focus the close button or the `initialFocusRef` on mount, trap Tab/Shift+Tab inside the dialog, send Escape to `onCloseRef.current` unless `busy`, restore focus to the previously-focused element on unmount.
    - Backdrop click calls `onClose` only when `busy` is falsy.
    - Sets `aria-modal="true"`, `role="dialog"`, `aria-labelledby` to the heading id, and `aria-describedby` to the subtitle id when a subtitle is rendered.
    - Uses only the existing `--surface`, `--border`, `--shadow-lg`, `--radius-lg`, and spacing tokens; introduces no new tokens.
    - _Requirements: 3.1, 3.4, 3.7, 3.8, 3.9, 3.11_

  - [x] 2.2 Add `.modal-shell-*` rules to `client/src/styles.css`
    - Add `.modal-shell-backdrop` (fixed inset 0, `display: grid`, `place-items: center`, `background: rgba(15, 30, 60, 0.45)`, `z-index: 90`).
    - Add `.modal-shell` (grid `auto 1fr auto`, `width: min(560px, calc(100% - 32px))`, `max-height: min(92vh, 720px)`, `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`, `overflow: hidden`).
    - Add `.modal-shell-sm`, `.modal-shell-md`, `.modal-shell-lg` size variants (max-widths 440/560/720).
    - Add `.modal-shell-head`, `.modal-shell-body` (overflow auto), `.modal-shell-foot` (`position: sticky; bottom: 0; background: var(--surface-2); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px`).
    - Add `@media (max-width: 767px)` rule: backdrop `align-items: end`, `.modal-shell { width: 100%; max-height: 92vh; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }`.
    - Verify `border-radius` resolves to identical values on all four corners on the centered (>=768px) variant; the bottom-sheet variant intentionally squares the bottom edge against the viewport (still equal `border-radius` shorthand on the four declared corners; the squared bottom is from the viewport edge, not the box).
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 3.11_

  - [x] 2.3 Migrate `client/src/components/ConfirmDialog.jsx` to render through `ModalShell`
    - Replace the `<div className="dialog-backdrop">` + `<section className="dialog">` markup with `<ModalShell open onClose={onCancel} title={title} subtitle={body} busy={busy} footer={<>cancel + confirm buttons</>}>{<>icon + body copy</>}</ModalShell>`.
    - Move the icon + body copy into the body region; move the two action buttons into the footer slot.
    - Keep the existing `danger` prop wiring: `<button className={"btn " + (danger ? "btn-danger" : "btn-primary")}>`.
    - Remove the local focus-trap logic (now lives in `ModalShell`).
    - Preserve `confirmLabel`, `busy`, `onConfirm`, `onCancel` semantics; nothing about callers changes.
    - _Requirements: 3.1, 3.7, 3.10_

  - [x] 2.4 Migrate `client/src/components/MaintenanceBlockModal.jsx` to `ModalShell`
    - Wrap both `CreateBlockBody` and `DeactivateBlockBody` in `<ModalShell ...>`; move the existing dialog-foot buttons into the `footer` prop.
    - Drop the local `useFocusTrap`/`getFocusableElements`/`FOCUSABLE_SELECTORS` definitions; rely on `ModalShell`.
    - Keep the admin-gating early-return (`if (!user || user.role !== "ADMIN") return null;`) outside `ModalShell` so the component still does not mount for staff.
    - Keep all `apiRequest` calls, `Field` errors, `modal-context-banner` body copy, and `defaultDate` prefill behavior unchanged.
    - _Requirements: 3.7, 3.10_

  - [x] 2.5 Migrate `client/src/components/ClearPublicUseModal.jsx` to `ModalShell`
    - Wrap each of the three steps (`config`, `warning`, `success`) in one `<ModalShell>` whose body switches by step; the footer buttons (Cancel/Continue, Go back/Yes-clear-public-use, Done) move into the `footer` slot per step.
    - Preserve the literal warning copy `"overlapping active reservations will be cancelled but their records will be kept"` and the second-confirm gating exactly.
    - Preserve the cleared-state derivation rule: nothing local is stored in React state or `localStorage`; only the just-returned response feeds the cancellations panel (Req. 24.7, 24.8).
    - Drop the local focus-trap loop.
    - _Requirements: 3.7, 3.10, 24.7, 24.8_

  - [x] 2.6 Migrate `client/src/components/ResidentPickerDialog.jsx` to `ModalShell`
    - Wrap the existing search field + result list in `<ModalShell size="md">`; move the bottom Cancel button into the `footer` slot.
    - Preserve the debounced `GET /api/residents?search=` behavior, the no-password-fields rule, and the `onSelect` payload (`representativeName`, `contactNo`, `address`, `resident`).
    - Drop the local focus-trap loop.
    - _Requirements: 3.7, 3.10_

  - [x] 2.7 Migrate `client/src/components/ReservationDetailDrawer.jsx` to `ModalShell`
    - Render through `<ModalShell size="lg">` so the drawer keeps a wider surface on desktop.
    - Move the action row (Edit / Print slip / Mark missed / Cancel / Mark done) into the `footer` slot so the buttons stay pinned and visible on every Supported_Viewport.
    - Preserve the `suspendEscape` prop (used by `ReservationsPage` while a `ConfirmDialog` is open) by forwarding it to `ModalShell` via the `busy` prop semantics — when `suspendEscape` is true, suppress Escape close.
    - Keep the existing `Reference number` row (`formatReferenceNo`) and the `STATUS_ACTIONS` filtering by `statusCode`.
    - _Requirements: 3.7, 3.10_

  - [x] 2.8 Behavioral test for `ModalShell` at `tests/reactPostUiAuditModalShell.test.js`
    - Render `<ModalShell open size="md" onClose={spy} title="x" footer={<button>OK</button>}>body</ModalShell>` and assert `aria-modal="true"`, body region has `overflow: auto`, footer is rendered after the body, and pressing Escape calls `onClose` once.
    - Render with `open={false}` and assert nothing is mounted (returns `null`).
    - Use `node:test`.
    - _Requirements: 3.1, 3.7_

- [x] 3. Fix the reservation form Save gating (UI-AUD-002)
  - [x] 3.1 Tighten `buildInitialForm()` and the chip-selection rule in `client/src/pages/ReservationFormPage.jsx`
    - When today's first-future start is unavailable (every slot in the past), return `startTime: ""` and `endTime: ""` instead of `TIME_OPTIONS[TIME_OPTIONS.length - 1]`. Disabled chips must never be the active selection.
    - Add a `disabledStartTimes` `useMemo` that returns `new Set(TIME_OPTIONS.filter((t) => t <= currentManilaTime))` when `form.reservationDate === todayInManila`, else `new Set()`.
    - In the chip render loop, mark a chip as `aria-checked={selected}` only when `selected && !disabled`; the `selected` className continues to apply visually only when both are true.
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Extend `cannotSaveReason` to cover the new gating cases
    - Add a check `if (!form.startTime) return "Pick a start time before saving."`.
    - Add a check `if (disabledStartTimes.has(form.startTime)) return "This time has already passed today. Pick a later start time."`.
    - Keep the existing checks for invalid date, invalid time range, and known conflict.
    - Compute `durationOutsidePolicy(form, policy)` against the loaded `Court_Policy_Settings.minimumReservationMinutes` / `maximumReservationMinutes` and add a corresponding reason string.
    - The Save button stays disabled while `cannotSaveReason !== ""`; `title={cannotSaveReason}` already wires the per-field message, and `state.fieldErrors` continues to surface backend per-field errors.
    - _Requirements: 1.3, 1.4_

  - [x] 3.3 Render `startTime`/duration/`endTime` in one visual group (already in `.form-section` 2)
    - Confirm the existing `.form-section` block holds all three controls (chip group, duration buttons, end-time summary + override panel) without an intervening `.form-section`.
    - If a screen-reader-only "Time" group label is missing, add `<span className="field-label" aria-hidden="false">Time</span>` so the grouping is clear; otherwise leave the existing markup.
    - _Requirements: 1.5_

  - [x] 3.4 Preserve no-POST behavior on disabled Save
    - Confirm the Save button has `disabled={state.saving || Boolean(cannotSaveReason)}` (already wired). Add an `event.preventDefault()` + early return inside `handleSubmit` when `cannotSaveReason` is non-empty so an Enter-key submit cannot bypass the disabled visual.
    - When the early return fires, set `state.fieldErrors` from `cannotSaveReason` so the staff sees the message inline.
    - _Requirements: 1.6_

  - [x] 3.5 Verify no backend reservation route is altered
    - The reservation form continues to POST `/api/reservations` and PUT `/api/reservations/:reservationId`; no new route is introduced.
    - _Requirements: 1.7, 24.1, 24.3_

- [x] 4. Wire Manila timestamps into the affected surfaces (UI-AUD-003)
  - [x] 4.1 Update `client/src/pages/ActivityLogsPage.jsx` to render `loggedAt` via `formatBackendDateTime`
    - Replace any direct `new Date(...).toLocaleString()` / `Intl.DateTimeFormat(...)` for `loggedAt` with `formatBackendDateTime(log.loggedAt)`.
    - Render the placeholder `"—"` for missing timestamps without throwing (Req. 2.4).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Update `client/src/pages/AccountsPage.jsx` to render account timestamps via `formatBackendDateTime`
    - Apply the same replacement for `createdAt`, `updatedAt`, and `lastLoginAt` columns.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Update `client/src/components/ReservationSlipPrintView.jsx`
    - Render `slip.issuedAt` via `formatBackendDateTime`.
    - Read `barangayName`, `courtName`, and the official subtitle from `OFFICIAL_HEADER` instead of hardcoded strings.
    - _Requirements: 2.1, 2.2, 2.3, 18.1, 18.2_

  - [x] 4.4 Update `client/src/components/DailySchedulePrintView.jsx`
    - Render `payload.generatedAt` (and any per-slot timestamp) via `formatBackendDateTime`.
    - Read header strings from `OFFICIAL_HEADER`.
    - _Requirements: 2.1, 2.2, 2.3, 18.1, 18.2_

- [x] 5. Daily print display fixes (UI-AUD-006, UI-AUD-014)
  - [x] 5.1 Add `resolveBlockType(block)` and `BLOCK_TYPE_LABEL` to `client/src/components/DailySchedulePrintView.jsx`
    - `resolveBlockType` reads `block.type` first, falls back to `block.blockType` only when `block.type` is null/undefined/empty string.
    - `BLOCK_TYPE_LABEL` is a frozen map: `CLEANING → "Cleaning"`, `BARANGAY_EVENT → "Barangay event"`, `REPAIRS → "Repairs"`, `TOURNAMENT → "Tournament"`, `MEETING → "Meeting"`, `EMERGENCY_USE → "Emergency use"`, `MAINTENANCE → "Maintenance"`.
    - Render the humanized label only; never render the raw uppercase enum.
    - When `resolveBlockType` returns `""`, render `"Blocked"`; when it returns a value not in `BLOCK_TYPE_LABEL`, render `"Other"`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 5.2 Add past-same-day-slot dimming
    - Add `isPastSameDaySlot(slot, todayManila, currentManilaTime)` that returns true when the print date equals today and `slot.endTime < currentManilaTime`.
    - For past slots, apply a `.daily-print-row-past` class (defined in styles.css with reduced opacity and strikethrough on the time/status cells).
    - Strip any "available now", "available", "open", "bookable" copy from rows that classify as past.
    - _Requirements: 9.6, 9.7_

  - [x] 5.3 Confirm ink-friendly monochrome styling stays on Barangay tokens
    - No new color tokens; the dimming uses `var(--ink-muted)` and the `.daily-print-row-past` class.
    - _Requirements: 9.8, 24.9, 24.10_

- [x] 6. Backup reminder visibility (UI-AUD-004)
  - [x] 6.1 Unwrap `data.backupStatus` in `client/src/components/BackupReminderCard.jsx`
    - Change the post-fetch handling to `const status = data?.backupStatus || data || {};`.
    - Render the card only when `status.backupDue === true`.
    - When mounted, read `status.lastBackupAt`, `status.daysSinceBackup`, `status.reminderThresholdDays` (each via `formatBackendDateTime` for the date, plain numbers for the day counts).
    - On any fetch error, return `null` and `console.error` the failure (already the existing behavior).
    - _Requirements: 4.3, 4.5, 4.7, 4.8_

  - [x] 6.2 Mount `BackupReminderCard` on `client/src/pages/CourtPolicyPage.jsx`
    - Render `<BackupReminderCard />` above the `CourtPolicyForm` so admins see the reminder while reviewing policy.
    - The mount is non-blocking; the rest of the page renders normally even when the card is hidden by an error.
    - _Requirements: 4.2, 4.5_

  - [x] 6.3 Confirm dashboard mount stays unchanged
    - `DashboardPage` already mounts `<BackupReminderCard />`; verify no further change is needed (Req. 4.1 is already satisfied; this task is a confirmation step).
    - _Requirements: 4.1_

- [x] 7. Calendar tab calendar-only + dashboard alerts surface (Req. 5)
  - [x] 7.1 Confirm the calendar tab does not mount any today-alert surface
    - Verify `client/src/pages/CalendarPage.jsx` does not import `DashboardAlertsCard`, `TodaySnapshotCard`, or render any `"Today's Alert"` card/banner/list/badge inside the calendar view tree.
    - The existing comment block ("Today's alerts moved off the calendar surface to the dashboard…") stays.
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Strengthen the dashboard alerts surface in `client/src/pages/DashboardPage.jsx`
    - When `alertsState.error` is set, render the `.alert error` band with a "Try again" button that bumps a local `alertsRetry` counter to refetch `/api/dashboard/alerts` (Req. 5.4 retry control).
    - When `alertsState.payload?.alerts?.length === 0`, render the `DashboardAlertsCard` empty state ("Nothing needs attention today") within 2 seconds of dashboard load (Req. 5.5).
    - The dashboard remains the primary `Today_Alert_Surface`; no Today's Alert is mounted on the calendar tab even on a refresh of `/schedule` (Req. 5.6).
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [x] 8. Reservation list semantic markup + CSV export (Req. 6, Req. 7)
  - [x] 8.1 Rewrite the reservation list shell in `client/src/pages/ReservationsPage.jsx`
    - Replace `<div className="booking-card-list">` with `<ul className="booking-card-list" aria-label="Reservation records">`.
    - Wrap each `<ReservationCard>` in `<li className="booking-card-item">`.
    - Move `aria-current="true"` from the card to the `<li>` so the wrapper carries the selected-state semantics; remove `aria-current` from the article.
    - _Requirements: 6.1_

  - [x] 8.2 Rewrite `ReservationCard` to drop `role="button"` from the card and add explicit View/Print actions
    - The `<article>` no longer has a click handler, no longer carries `role="button"`, no longer has `aria-pressed`.
    - The card body holds two sibling `<button>` actions: `Open record` (calls `onOpen`) and `Print slip` (calls `onPrintSlip`). Each has a non-empty `aria-label` that names the reservation by `referenceNo` or `reservationId`.
    - Move the existing `attentionReason` tooltip from the article to the `Open record` button via `title`.
    - Selected styling continues to use the existing `.selected` class on the article (driven by the parent `<li>`'s `aria-current`).
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 8.3 Replace the raw `<a href="/reservations/export.csv">` with `CsvExportButton`
    - Choose path (a): forward the current `query`, `scope`, and `statusFilter` filter values as query parameters by extending the `csvExport.js` whitelist by one entry — `reservations-export` — and rendering `<CsvExportButton endpoint="reservations-export" params={{ search: query, scope, status: statusFilter }} label="Export visible bookings (CSV)" />`.
    - Path (b) fallback if extending the whitelist is judged out of scope: keep the existing `/api/reservations/export.csv` URL but render a button labeled exactly `"Export all reservations (CSV)"` and forward no filter parameters. Document the chosen branch in the implementation report.
    - The button label always contains the literal substring `"CSV"`.
    - On 4xx/5xx render the existing helper's "CSV export could not be downloaded." message plus the backend message.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.4 Add `.booking-card-item` and `.booking-card-actions` styling tweaks to `client/src/styles.css`
    - Reset list-item bullet / margin so the `<li>` is visually identical to the prior `<div>` row (no marker, no extra inline-padding).
    - Confirm the `:focus-visible` outline on `.booking-card-item button` is at least 2 CSS pixels with a 3:1 contrast ratio against the surrounding background (Req. 6.6).
    - _Requirements: 6.6, 6.7_

- [x] 9. Tab and menu keyboard behavior (UI-AUD-009, UI-AUD-010)
  - [x] 9.1 Replace the `role="menu"` overflow with a native disclosure in `client/src/pages/CalendarPage.jsx`
    - In `CalendarOverflowMenu`, drop `aria-haspopup="menu"`, `role="menu"`, and `role="menuitem"` from the trigger and items.
    - Replace with a single trigger button (`aria-expanded`, `aria-controls="calendar-more-list"`) and a `<div id="calendar-more-list" hidden={!open}>` containing plain `<button>` elements.
    - Tab/Shift+Tab moves through the buttons; Escape closes the disclosure and returns focus to the trigger (existing key handler already does this).
    - _Requirements: 8.3, 8.4, 8.6_

  - [x] 9.2 Replace the `role="radiogroup"` filter tabs in `client/src/pages/ReservationsPage.jsx`
    - Drop `role="radiogroup"`, `role="radio"`, and `aria-checked` from the scope tabs.
    - Render plain `<button>` elements with `aria-pressed={scope === option}`. Tab/Shift+Tab moves into and out of the group with no roving-tabindex behavior.
    - _Requirements: 8.3, 8.4_

  - [x] 9.3 Audit and clean `client/src/pages/ReportsPage.jsx` and `client/src/pages/ReservationHistoryPage.jsx`
    - Remove any `role="tab"`, `role="tablist"`, `role="menu"`, or `role="menuitem"` attributes; replace with plain buttons + `aria-pressed` where the surface needs a selected-state indicator.
    - Visible focus indicator on every button stays (existing tokens already meet contrast).
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 9.4 Static assertion: no ARIA tab/menu role appears on Reports / History / Calendar
    - In `tests/reactFrontendStatic.test.js`, assert that `ReportsPage.jsx`, `ReservationHistoryPage.jsx`, and `CalendarPage.jsx` contain none of the literal strings `role="tab"`, `role="tablist"`, `role="menu"`, `role="menuitem"`.
    - _Requirements: 8.7, 8.8_

- [x] 10. Reports page friendly time + task-led labels (UI-AUD-012)
  - [x] 10.1 Switch every time-range render in `client/src/pages/ReportsPage.jsx` to `formatTimeRangeFriendly`
    - Apply to the "most-used time slot" tile and any other time-range string emitted by the page.
    - Backend report fields are unchanged.
    - _Requirements: 10.1, 10.2, 10.3, 10.7_

  - [x] 10.2 Rewrite the Reports CSV export label
    - Set the `CsvExportButton` label to exactly `"Download Reports CSV"` (within 3–60 chars, begins with `"Download"`, contains `"CSV"`).
    - Drop any marketing-style verbs (`Grab`, `Unlock`, `Boost`, `Supercharge`), hype adjectives (`Amazing`, `Awesome`, `Effortless`, `Powerful`), and trailing exclamation marks from labels and section headings on the page.
    - _Requirements: 10.4, 10.5_

  - [x] 10.3 Audit and align Reports section labels and headings to the rest of the staff console
    - Cross-check each section heading against the equivalent concept used elsewhere (e.g., `ReservationsPage`, `ReservationHistoryPage`, `CalendarPage`); rewrite to the matching wording.
    - _Requirements: 10.6_

- [x] 11. Court Policy reorganization (Req. 11)
  - [x] 11.1 Audit and tighten `client/src/components/CourtPolicyForm.jsx` group order and copy
    - Confirm the six groups render in the exact order `(a) Operating hours → (b) Reservation duration → (c) Allowed days → (d) Blocked dates → (e) Grace period → (f) Backup reminder`.
    - Each group has a visible header and a one-line description (≤120 characters) styled with the existing helper-text class.
    - For each group whose description has an existing Filipino translation key in the component, render the Filipino text as italic helper text below the English description; where no key exists, render no Filipino text and no placeholder (Req. 11.3).
    - The Backup reminder group renders only a read-only summary plus a "See dashboard for backup reminders" link (no backup actions live in the policy form).
    - Preserve all existing field semantics, validation, and submit behavior unchanged (Req. 11.4).
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 11.2 Reuse only existing components and tokens in the Court Policy page
    - Confirm only `Field`, `StatusBadge`, `EmptyState`, `LoadingState`, and the existing `.court-policy-*` CSS classes are used; no new typography, color, or spacing tokens are introduced.
    - _Requirements: 11.5, 11.6_

  - [x] 11.3 Preserve role-gated read-only state for staff users
    - When `user.role !== "ADMIN"`, every input on the Court Policy page is non-editable and the save action is not rendered (already the existing behavior; this task is a verification step).
    - _Requirements: 11.7_

  - [x] 11.4 Confirm loading/error states in `client/src/pages/CourtPolicyPage.jsx`
    - While the policy fetch is pending, render `LoadingState`. On fetch error, render `EmptyState` with an error indication; never render a group as interactive in either state.
    - _Requirements: 11.8, 17.1, 17.2_

- [x] 12. Responsive density at 768/390 (UI-AUD-013, UI-AUD-019, UI-AUD-020)
  - [x] 12.1 Tighten topbar density at <=768/<=390 in `client/src/styles.css`
    - At `<= 768px`, hide the brand subtitle (`.brand-subtitle`) and reduce the user-chip to the avatar + initials only.
    - At `<= 390px`, hide the office clock's secondary line (the date) and keep only the time strong.
    - The existing mobile-nav-bar (`AppShell`) keeps the four affordances (Home, Calendar, New Reservation, current-page context) reachable with one tap; verify the active page label remains visible.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.2 Reduce card-action density on `DashboardPage`, `ReservationFormPage`, `ResidentDirectoryPage`
    - At `<= 768px`, render the page header's primary action (`btn-big`) at standard `.btn` size only on these three pages; the home dashboard's main action keeps its `64px` height to match Barangay_Visual_Language.
    - At `<= 390px`, every card-action button uses `.btn-small` so the card weight matches the typography density.
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 12.3 Preserve focus order, accessible names, and roles across viewports
    - No mobile-only nav patterns, no mobile-only color tokens.
    - Static-source assertion: no `@media`-gated copy strings in any file under `client/src/pages/`.
    - _Requirements: 12.4, 12.5_

- [x] 13. Signed-in `/login` redirect (UI-AUD-015)
  - [x] 13.1 Add the redirect in `client/src/App.jsx`
    - Insert a branch after the `sessionState.loading` early-return: when `sessionState.user && isLoginPath`, call `window.history.replaceState({}, "", "/dashboard")` and render `AppShell` with `path="/dashboard"`.
    - Keep the unauthenticated branch (`!sessionState.user`) rendering `LoginPage` as today.
    - The `sessionState.loading` `LoadingState` already covers the 3-second indeterminate-state guard (Req. 13.3).
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 24.1_

- [x] 14. De-emphasize recurring unavailable note (UI-AUD-016)
  - [x] 14.1 Confirm the recurring note is rendered as muted helper text
    - The literal text `"Recurring reservations are not available. Encode each booking on its own date."` continues to render with classes `form-copy form-copy-muted recurring-not-available-note` only.
    - The note is non-interactive: no click/hover/focus affordance, no link, no button, no cursor-pointer styling.
    - No control elsewhere in `client/src/` creates, schedules, or implies a recurring reservation series.
    - No source file in `client/src/` calls a recurring-reservation backend route.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15. Override copy rewrite (UI-AUD-017)
  - [x] 15.1 Replace the "save anyway" wording in the override surface(s)
    - In any source file under `client/src/` that renders the legacy override label, replace it with `"Save with policy override"` (within 40 characters).
    - Add a 200-character supporting description that names the policy being overridden and notes that the action is recorded for administrator review.
    - Do not change the backend authorization or persistence behavior.
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 15.2 Static assertion: no "save anyway" anywhere
    - Assert that no source file under `client/src/` contains the case-insensitive string `"save anyway"`.
    - _Requirements: 15.4_

- [x] 16. Done/Completed normalization (UI-AUD-018)
  - [x] 16.1 Sweep `client/src/` for hardcoded `"Done"` strings that referred to the COMPLETED status
    - Replace each with the canonical `STATUS_LABELS.COMPLETED` lookup or with the literal `"Completed"` (kept consistent with task 1.2).
    - Surfaces touched include the reservation list, detail drawer, calendar legend, reports view, history view, slip print, daily print, and activity logs.
    - The backend `statusCode`/`statusName` payload contract is unchanged.
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 16.2 Static assertion: no `"Done"` token for COMPLETED
    - Assert that the literal string `">Done<"` (case-sensitive, JSX text node form) does not appear in any source file under `client/src/`.
    - _Requirements: 16.1, 16.2_

- [x] 17. Success messages live region (UI-AUD-021)
  - [x] 17.1 Sweep success banners and replace `role="alert"` with `role="status"` + `aria-live="polite"` + `aria-atomic="true"`
    - Affected surfaces: the reservation form saved-confirmation banner, the `statusToast` in `ReservationsPage`, the success step banner in `ClearPublicUseModal`, the resident directory save confirmation, and any other `.alert.success` band that confirms a successful write action.
    - Visual presentation stays exactly as today.
    - The success message remains in the DOM for at least 4 seconds before any auto-dismiss timer fires.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 18. Official header consistency (UI-AUD-023)
  - [x] 18.1 Replace hardcoded header strings in `client/src/components/AppShell.jsx`
    - Render `OFFICIAL_HEADER.barangayName`, `OFFICIAL_HEADER.subtitle`, and (where the topbar shows the court name) `OFFICIAL_HEADER.courtName`.
    - Drop any other source of the literal strings `"Barangay Sto. Niño"` or `"Basketball Court"` in the topbar.
    - _Requirements: 18.1, 18.2_

  - [x] 18.2 Replace hardcoded header strings in `ReservationSlipPrintView` and `DailySchedulePrintView`
    - Render the same three fields from `OFFICIAL_HEADER`.
    - When `OFFICIAL_HEADER.barangayName === ""` or another required field is empty at render, render a single-line `"Header configuration missing: <field>"` alert without blocking the rest of the surface.
    - _Requirements: 18.1, 18.2, 18.4_

  - [x] 18.3 Static assertion: header config single-source
    - Assert that `AppShell.jsx`, `ReservationSlipPrintView.jsx`, and `DailySchedulePrintView.jsx` each import from `client/src/api/officialHeader.js`.
    - Assert that no other file under `client/src/` contains the literal string `"Barangay Sto. Niño"` or `"Basketball Court"`.
    - _Requirements: 18.1, 18.3_

- [x] 19. Form id/name warnings (UI-AUD-024)
  - [x] 19.1 Audit raw `<input>`/`<select>`/`<textarea>` outside `Field` and add missing `id`/`name`
    - For every raw form control that is not wrapped by `Field`, add a non-empty `id` (1–100 chars, no whitespace) and a non-empty `name` attribute. `Field` already wires `htmlFor` to its child via `React.cloneElement`, so wrappers are already covered.
    - For visible-label controls, ensure a `<label>` is associated via `for`/`id` or via wrapping.
    - Hidden, decorative, or non-labelable controls (`type="hidden"`, `type="submit"`, `type="button"`) still receive an `id`/`name` per Req. 19.1 but do not need a visible `<label>`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 19.2 Re-run the Chrome issues panel on the affected pages and record zero "form field with no id or name" warnings in the implementation report
    - Pages to recheck: `LoginPage`, `ReservationFormPage`, `ResidentDirectoryPage`, `ReservationHistoryPage`, `ReportsPage`, `CourtPolicyPage`, `AccountsPage`, and any other page touched by this remediation.
    - _Requirements: 19.5_

- [x] 20. Trivial polish (UI-AUD-025 through UI-AUD-028)
  - [x] 20.1 Apply the Codex audit's recommendation for each trivial item
    - Look up each Audit_Issue_ID in `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md` and the audit traceability matrix, and apply the recommended copy/spacing/icon adjustment in the same commit as the surrounding higher-severity work.
    - For any trivial item that conflicts with a higher-severity requirement in this plan, defer it and record the deferral in the implementation report with the conflicting requirement identifier and the reason.
    - No new tokens, libraries, or behaviors are introduced.
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 21. Static-source test extensions
  - [x] 21.1 Extend `tests/reactFrontendStatic.test.js` with the property-validating assertions from the design's Correctness Properties section
    - Property 5 (modal corner symmetry): parse `client/src/styles.css` and assert the `.modal-shell` `border-radius` shorthand resolves to four equal corner values; assert the `<= 767px` media-query override only re-squares the bottom edge against the viewport.
    - Property 7: assert `CalendarPage.jsx` contains none of the strings `"DashboardAlertsCard"`, `"TodaySnapshotCard"`, `"Today's Alert"`.
    - Property 8: assert `ReservationsPage.jsx` contains the literal `<ul className="booking-card-list"`; assert the `.booking-card` article does not carry `role="button"`; assert no `role="button"` (nor `<button>`) is nested inside another `role="button"` on the page (regex check).
    - Property 9: assert `ReportsPage.jsx`, `ReservationHistoryPage.jsx`, and `CalendarPage.jsx` contain no `role="tab"`, `role="tablist"`, `role="menu"`, or `role="menuitem"` strings.
    - Property 10 (backup reminder unwrap): assert `BackupReminderCard.jsx` references `data?.backupStatus?.backupDue` (or the equivalent unwrap pattern) and reads `lastBackupAt`, `daysSinceBackup`, `reminderThresholdDays` from the wrapper.
    - Property 12: assert no source file under `client/src/` contains the case-insensitive string `"save anyway"`.
    - Property 13: assert the canonical `COMPLETED` label is `"Completed"` and no surface emits `">Done<"` for that status.
    - Property 14: assert `OFFICIAL_HEADER` import in `AppShell.jsx`, `ReservationSlipPrintView.jsx`, and `DailySchedulePrintView.jsx`; no other file hardcodes the header strings.
    - Property 15: assert no source file under `client/src/` or `public/app/` contains a non-relative `https://` URL, an `http://` URL, or a `//cdn.` reference.
    - ModalShell import sweep: assert `ConfirmDialog.jsx`, `MaintenanceBlockModal.jsx`, `ClearPublicUseModal.jsx`, `ResidentPickerDialog.jsx`, and `ReservationDetailDrawer.jsx` each import `ModalShell` from `client/src/components/ModalShell.jsx`; assert none of those files retain the legacy `<div className="dialog-backdrop">` markup.
    - Recurring-note class assertion: assert the literal recurring-not-available copy in `ReservationFormPage.jsx` is rendered with the `form-copy form-copy-muted` (and `recurring-not-available-note`) classes only — never inside a card, banner, alert, or button container.
    - _Requirements: 3.5, 3.10, 4.3, 5.1, 5.2, 6.1, 6.2, 8.7, 8.8, 14.1, 15.4, 16.1, 16.2, 18.1, 18.3, 24.13, 24.14_

  - [x] 21.2 Behavioral test for `ReservationFormPage` Save gating at `tests/reactPostUiAuditReservationFormGating.test.js`
    - Render the form with `reservationDate === todayInManila` and `currentManilaTime === "10:30"`; assert the 7:00, 8:00, 9:00, 10:00 chips are disabled and not selected.
    - Assert that `cannotSaveReason` evaluates to a non-empty string when `form.startTime === ""`, when `disabledStartTimes.has(form.startTime)`, and when the duration is outside policy bounds.
    - Assert that submitting while disabled does not dispatch `POST /api/reservations`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 21.3 Behavioral test for daily print at `tests/reactPostUiAuditDailyPrint.test.js`
    - Render `DailySchedulePrintView` with a fixture block `{ type: undefined, blockType: "BARANGAY_EVENT" }`; assert the rendered output contains the literal `"Barangay event"`.
    - Render with a fixture block of unknown type; assert the rendered output contains `"Other"`.
    - Render with a fixture block that has neither `type` nor `blockType`; assert `"Blocked"`.
    - Render with a fixture slot whose `endTime < currentManilaTime` and the print date is today; assert the row has the `daily-print-row-past` class and contains none of the strings `"available now"`, `"available"`, `"open"`, `"bookable"`.
    - Use `node:test`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

- [x] 22. Verification checkpoint
  - [x] 22.1 Run the verification command set
    - Execute `npm run frontend:build` and confirm exit code 0 with assets emitted under `public/app/` referencing only locally-bundled paths.
    - Execute `npm run verify:react-build` and confirm exit code 0.
    - Execute `npm run verify:ui` and confirm exit code 0.
    - Execute `npm test` and confirm exit code 0; if `npm test` cannot run in the current environment, record the blocker and the substitute command(s) executed.
    - Record each command's verbatim invocation, exit code, and pass/fail outcome in the implementation report.
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

  - [x] 22.2 Manual viewport verification on every Verification_Surface_Set surface
    - For each surface in {Dashboard, New Reservation, Reservation list, Reservation detail, Calendar/schedule, Maintenance Block modal, Public_Use_Clear modal, Reservation_Slip print, Daily_Schedule_Printout, Reports, CSV export controls, Activity logs, Residents/history, Court Policy, Accounts} at every Supported_Viewport (1366px / 1024px / 768px / 390px), capture a screenshot under `tmp/ui-audit-remediation-evidence/<surface>-<width>.png`.
    - Open the Chrome DevTools Console panel and Network panel on each surface; record zero new uncaught console errors and zero new failed network requests attributable to this remediation.
    - For any pre-existing console error or failed request, record it separately so the report distinguishes pre-existing issues from remediation regressions.
    - _Requirements: 23.7, 23.8, 23.9_

- [x] 23. Documentation updates
  - [x] 23.1 Update `OPUS_UI_BUG_REPORT.md`
    - Add one entry per Audit_Issue_ID addressed by this remediation: the issue ID, a resolution summary, the file paths or surfaces modified, and the verification command outcome.
    - No PDF/XLSX/online-booking/SMS/payments/memberships/public-resident-accounts/cloud-sync references.
    - _Requirements: 22.1, 22.7_

  - [x] 23.2 Update `OPUS_FRONTEND_INSPECTION_REPORT.md`
    - For each touched surface, add the surface identifier, the items re-inspected, and a pass/fail outcome per item.
    - _Requirements: 22.2, 22.7_

  - [x] 23.3 Update `OPUS_FRONTEND_MICRO_AUDIT.md` (if present)
    - For each item previously flagged in this file that falls within the touched surfaces, add the item identifier and a pass/fail outcome.
    - If the file is not present in the repository, skip without treating it as a violation (per Req. 22.4).
    - _Requirements: 22.3, 22.4_

  - [x] 23.4 Update `DEPLOYMENT_READINESS_REPORT.md`
    - Update the readiness score on the same scale as the prior version of the report.
    - List remaining deferred issues, each tagged by Audit_Issue_ID with a reason.
    - List the verification commands and viewport checks executed with each pass/fail result.
    - _Requirements: 22.5, 22.7_

  - [x] 23.5 Update `QA_FULL_SYSTEM_REPORT.md`
    - For each touched surface, add the surface identifier, the QA checks executed, and a pass/fail outcome per check.
    - _Requirements: 22.6, 22.7_

  - [x] 23.6 Implementation report appendix
    - Compose a final implementation report (in the conversation, not as a new repo file unless requested) containing each section required by Req. 23.10: (a) files changed with repository-relative paths, (b) Audit_Issue_IDs resolved, (c) Audit_Issue_IDs intentionally deferred each with a written reason, (d) every command run with verbatim invocation/exit code/pass-fail result, (e) for every (surface, viewport) pair in the Verification_Surface_Set, a repository-relative path to a captured screenshot or evidence file.
    - Include the final UI/UX judgment (PASSED / FUNCTIONALLY PASSED VISUAL FIXES NEEDED / FAILED), the updated readiness score, and the exact next step for Codex's final regression.
    - _Requirements: 23.10_

- [x] 24. Final non-goals review
  - [x] 24.1 Confirm no backend/schema/API changes were made
    - No file under `server/`, `database/`, `routes/`, or any backend folder was modified by this remediation.
    - No CSV export route path or HTTP method was changed; no new export endpoint was added; no existing CSV export endpoint was removed.
    - No recurring-reservation route was added or called.
    - No PDF/XLSX export control, library, or label was added.
    - No online booking, SMS, cloud sync, public resident accounts, payments, or memberships were added.
    - No new color tokens, gradients, glassmorphism, or visual primitives were introduced outside the Barangay_Visual_Language.
    - No frontend-only `clearedDays` state was reintroduced (no React/`localStorage`/`sessionStorage`/`IndexedDB`/cookies/in-memory client structure).
    - No CDN or third-party host URL was added under `client/src/` or `public/app/`.
    - Record each confirmation in the implementation report.
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 24.10, 24.11, 24.13, 24.14_

## Task Dependency Graph

The graph below shows the order tasks can be executed in. Tasks within the same wave may run in parallel; later waves depend on earlier ones. Each `id` is a contiguous integer starting at 0 (per the workflow's parallel-scheduling format); the `description` and `criticalPath` fields are advisory metadata for human reviewers.

```json
{
  "waves": [
    {
      "id": 0,
      "description": "Foundation helpers and shared Modal_Shell — no dependencies",
      "tasks": ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2"]
    },
    {
      "id": 1,
      "description": "Surface migrations and per-page remediations that depend on the wave-0 helpers",
      "tasks": [
        "1.5", "2.3", "2.4", "2.5", "2.6", "2.7",
        "3.1", "3.2", "3.3", "3.4", "3.5",
        "4.1", "4.2", "4.3", "4.4",
        "5.1", "5.2", "5.3",
        "6.1", "6.2", "6.3",
        "7.1", "7.2",
        "8.1", "8.2", "8.3", "8.4",
        "9.1", "9.2", "9.3",
        "10.1", "10.2", "10.3",
        "11.1", "11.2", "11.3", "11.4",
        "12.1", "12.2", "12.3",
        "13.1", "14.1", "15.1",
        "16.1", "17.1",
        "18.1", "18.2",
        "19.1",
        "20.1"
      ]
    },
    {
      "id": 2,
      "description": "Optional static-source and behavioral tests once their target surface is complete",
      "tasks": ["2.8", "9.4", "15.2", "16.2", "18.3", "21.1", "21.2", "21.3"]
    },
    {
      "id": 3,
      "description": "Verification: Chrome issues re-run, build/test commands, and manual viewport screenshots",
      "tasks": ["19.2", "22.1", "22.2"]
    },
    {
      "id": 4,
      "description": "Documentation updates and the final implementation-report appendix; non-goals review last",
      "tasks": ["23.1", "23.2", "23.3", "23.4", "23.5", "23.6", "24.1"]
    }
  ],
  "criticalPath": [
    "1.1", "1.4", "2.1", "2.2",
    "4.3", "4.4", "18.2",
    "22.1", "22.2",
    "23.4", "23.6", "24.1"
  ],
  "notes": "Wave 0 must complete before any wave 1 task that consumes a helper. Wave 1 tasks are largely independent across pages and may be executed in parallel by surface owners. Wave 2 tasks are marked optional in the plan (`*`) and are not on the critical path. Wave 3 verification cannot start until every wave 1 task is complete; if optional wave 2 tests are run, they should land before verification. Wave 4 documentation depends on the recorded outcomes of wave 3."
}
```

## Notes

- Tasks marked with `*` are optional and may be skipped for a faster MVP; all test and static-assertion tasks fall in this category per the workflow's optional-sub-task rule.
- Each task references specific requirement clauses for traceability (granular sub-requirements, not just user stories).
- Generative property-based tests are intentionally not introduced; the test layer is static-source assertions plus a small set of optional behavioral tests, mirroring the post-deployment-frontend feature's pattern.
- Backend route handlers, database schema, server-side validation, deployment scripts, and API contracts are not modified by any task in this plan.
