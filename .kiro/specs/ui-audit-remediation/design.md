# Design Document

## Overview

This feature is a remediation pass over the existing React + Vite staff console at `client/src/`. It does not introduce a new architecture, library, design system, or backend behavior. Every requirement maps to either (a) a small, localized change inside an existing page or component, (b) a tiny new shared module under `client/src/api/` or `client/src/components/`, or (c) a wording, ARIA, or layout adjustment to an existing surface.

The Barangay Sto. Niño visual language already in `client/src/styles.css` (`--bg`, `--surface`, `--surface-2`, `--border`, `--ink`, `--ink-muted`, `--radius: 10px`, `--radius-lg: 14px`, `--shadow*`, the spacing scale `--space-xs` through `--space-xl`, the Civic Blue + Court Orange palette, the existing `.dialog`, `.dialog-backdrop`, `.dialog-head`, `.dialog-body`, `.dialog-foot`, `.drawer-backdrop`, `.reservation-drawer` rules) is the only design vocabulary used. No new tokens, gradients, glassmorphism, or marketing-style components are introduced (Req. 3.11, 11.5, 24.9, 24.10).

The dashboard fetches and displays the alerts that the calendar previously rendered. The calendar tab becomes calendar-only. A small shared `Modal_Shell` wrapper enforces consistent overlay position, padding, corner-radius, and footer-button visibility across every dialog and drawer. A shared `formatBackendDateTime` helper renders Manila wall-clock timestamps everywhere instead of letting `new Date(...)` re-shift them. The Court Policy page is regrouped into six labeled groups using only existing components and CSS classes.

Backend route paths, request/response shapes, server-side validation, recurring-reservation behavior, export formats, and authorization rules remain unchanged (Req. 24.1–24.7, 24.11).

## Steering Documents Reviewed

- `DESIGN.md`, `.impeccable/design.json`, and `Barangay (1)/DESIGN.md` (the Barangay visual language source-of-truth referenced by Req. 24.9).
- `client/src/styles.css` (the actual token vocabulary in use, including `--radius`, `--surface`, `--shadow-lg`, the existing `.dialog*` rules, and the spacing scale).
- `CODEX_TO_OPUS_UI_IMPLEMENTATION_PROMPT.md` (the Codex audit's likely-files map and per-issue scope).
- `.kiro/specs/post-deployment-frontend/requirements.md` and `.kiro/specs/post-deployment-frontend/design.md` (the prior feature already established the existing component vocabulary, the `apiRequest` client, and the `formatReferenceNo` / `getStatusDisplay` / `buildCsvExportUrl` helpers we reuse here).
- `STAFF-DAILY-USE.txt` and `TROUBLESHOOT-WINDOWS.txt` for the office-friendly copy style and the canonical "offline" wording.

## Requirements Mapping

The mapping below ties each requirement clause to the design element that satisfies it.

| Requirement | Design element |
| --- | --- |
| 1.1–1.7 (Reservation form past-time + Save gating) | `ReservationFormPage` `disabledStartTimes` set + `cannotSaveReason` derivation in §"Reservation form Save gating" |
| 2.1–2.5 (Manila timestamp display) | New `formatBackendDateTime(value)` helper in `client/src/api/mappers.js` plus its test in `tests/reactFrontendStatic.test.js` |
| 3.1–3.11 (Modal_Shell) | New `client/src/components/ModalShell.jsx` and the `.dialog`/`.dialog-backdrop` CSS clean-up §"Shared Modal Shell" |
| 4.1–4.8 (Backup reminder visibility) | `BackupReminderCard` payload-unwrap fix + a duplicate mount on `CourtPolicyPage` §"Backup reminder placement" |
| 5.1–5.6 (Calendar tab calendar-only; alerts on dashboard) | Remove the `DashboardAlertsCard` mount from `CalendarPage`, add it to `DashboardPage` (already mounted there) §"Calendar tab vs. Today's Alert" |
| 6.1–6.7 (Reservation list semantic markup) | `ReservationsPage` `ReservationCard` rewrite to `<li>` + sibling action buttons §"Reservation list semantic markup" |
| 7.1–7.6 (CSV export filter behavior) | Replace the raw `/reservations/export.csv` anchor with `CsvExportButton` from the existing helper §"Reservation CSV export" |
| 8.1–8.8 (Tab/menu keyboard behavior) | Replace `role="radiogroup"` filter tabs and `role="menu"` overflow with native button-group + disclosure on Reports, Reservation History, and Calendar/Schedule §"Tabs and menus" |
| 9.1–9.8 (Daily print fixes) | `DailySchedulePrintView` block-type fallback + humanize map + Manila timestamp + past-slot dimming §"Daily print" |
| 10.1–10.7 (Reports friendly time + task-led labels) | `formatTimeRange` already exists; reuse it in `ReportsPage`; rewrite export labels and section copy §"Reports copy" |
| 11.1–11.8 (Court Policy reorganization) | Confirm the existing `CourtPolicyForm` already exposes the six groups and order; tighten the page header copy and group order §"Court Policy reorganization" |
| 12.1–12.6 (Responsive density) | `AppShell` mobile-nav-bar already exists; tighten card-action density in three pages via existing CSS variables §"Responsive density" |
| 13.1–13.4 (Signed-in /login redirect) | Add the redirect in `App.jsx` while we already have `sessionState.user` §"Signed-in login redirect" |
| 14.1–14.5 (Recurring note de-emphasis) | Already a `form-copy form-copy-muted` paragraph in `ReservationFormPage`; verify nothing renders it as a banner anywhere §"Recurring note" |
| 15.1–15.5 (Save-anyway copy rewrite) | Single mapping module + shared component already wraps the override; rewrite the literal copy and verify §"Override copy" |
| 16.1–16.4 (Done/Completed normalization) | Update `STATUS_LABELS.COMPLETED` in `mappers.js` to a single canonical label and remove "Done" elsewhere §"Status label normalization" |
| 17.1–17.5 (`role="status"` for success messages) | Sweep the success banners; replace `role="alert"` with `role="status"` and `aria-live="polite"` §"Success live regions" |
| 18.1–18.4 (Header config consistency) | Add `client/src/api/officialHeader.js` so the topbar, slip print, and daily print read header strings from one place §"Official header" |
| 19.1–19.5 (Form id/name warnings) | Audit and add missing `id`/`name` attributes; the existing `Field` already wires `htmlFor` to children §"Form id/name" |
| 20.1–20.4 (Trivial polish UI-AUD-025–028) | Apply each in the touching commit and record in the implementation report §"Trivial polish" |
| 21.1–21.7 (Supported viewports quality bar) | Verification responsibility; covered by §"Verification" |
| 22.1–22.8 (Documentation/reporting updates) | Updates to `OPUS_UI_BUG_REPORT.md`, `OPUS_FRONTEND_INSPECTION_REPORT.md`, `DEPLOYMENT_READINESS_REPORT.md`, `QA_FULL_SYSTEM_REPORT.md`, plus `OPUS_FRONTEND_MICRO_AUDIT.md` if present, in the implementation report §"Documentation updates" |
| 23.1–23.10 (Build/test/manual verification) | Verification scripts and report shape §"Verification" |
| 24.1–24.14 (Non-goals) | Encoded as design constraints throughout this document |

## Architecture

### Existing surfaces this feature touches

```
client/src/
├── App.jsx                                  ── add signed-in /login redirect (Req. 13)
├── api/
│   ├── client.js                            ── unchanged (apiRequest stays the only HTTP client)
│   ├── csvExport.js                         ── unchanged (already restricts to 7 CSV endpoints)
│   ├── mappers.js                           ── ADD formatBackendDateTime + canonical COMPLETED label
│   ├── officialHeader.js                    ── NEW shared header config (Req. 18)
│   ├── referenceNo.js                       ── unchanged
│   └── statusDisplay.js                     ── unchanged (already returns paletteKey/className)
├── components/
│   ├── AppShell.jsx                         ── tighten nav weight at <=768/<=390 (Req. 12)
│   ├── BackupReminderCard.jsx               ── unwrap backupStatus + non-blocking placement (Req. 4)
│   ├── ClearPublicUseModal.jsx              ── re-render through ModalShell (Req. 3)
│   ├── ConfirmDialog.jsx                    ── re-render through ModalShell (Req. 3)
│   ├── CourtPolicyForm.jsx                  ── confirm 6-group order + helper-text style (Req. 11)
│   ├── CsvExportButton.jsx                  ── reused as-is on the reservations page (Req. 7)
│   ├── DailySchedulePrintView.jsx           ── block.type/blockType fallback + humanize map +
│   │                                            past-slot dimming + Manila timestamps (Req. 9, 2)
│   ├── DashboardAlertsCard.jsx              ── unchanged (already on dashboard)
│   ├── EmptyState.jsx, Field.jsx,           ── unchanged
│   │   Icon.jsx, LoadingState.jsx,
│   │   StatusBadge.jsx, TodaySnapshotCard.jsx
│   ├── MaintenanceBlockModal.jsx            ── re-render through ModalShell (Req. 3)
│   ├── ModalShell.jsx                       ── NEW shared overlay component (Req. 3)
│   ├── ReservationDetailDrawer.jsx          ── re-render through ModalShell (drawer variant) (Req. 3)
│   ├── ReservationSlipPrintView.jsx         ── Manila timestamps + shared header (Req. 2, 18)
│   └── ResidentPickerDialog.jsx             ── re-render through ModalShell (Req. 3)
├── pages/
│   ├── AccountsPage.jsx                     ── Manila timestamps for createdAt/updatedAt (Req. 2)
│   ├── ActivityLogsPage.jsx                 ── Manila timestamps + role="status" toast (Req. 2, 17)
│   ├── CalendarPage.jsx                     ── REMOVE today's alerts surface; replace overflow
│   │                                            menu with native disclosure (Req. 5, 8)
│   ├── CourtPolicyPage.jsx                  ── mount BackupReminderCard alongside policy
│   │                                            (Req. 4)
│   ├── DailySchedulePrintPage.jsx           ── unchanged routing; print view does the work
│   ├── DashboardPage.jsx                    ── Today_Alert_Surface anchor; backup reminder
│   │                                            already mounted (Req. 4, 5)
│   ├── LoginPage.jsx                        ── unchanged (App.jsx redirect handles signed-in case)
│   ├── ReportsPage.jsx                      ── friendly time ranges + task-led labels +
│   │                                            native button-group filters (Req. 8, 10)
│   ├── ReservationFormPage.jsx              ── tighten Save gating + disabled chip selection
│   │                                            + visible-group rule for time controls (Req. 1)
│   ├── ReservationHistoryPage.jsx           ── replace role="tab" cluster with native buttons
│   │                                            (Req. 8)
│   ├── ReservationSlipPrintPage.jsx         ── unchanged
│   ├── ReservationsPage.jsx                 ── semantic <li> rows + explicit View/Print +
│   │                                            CsvExportButton with filter params (Req. 6, 7)
│   └── ResidentDirectoryPage.jsx            ── tighten card density at <=768/<=390 (Req. 12)
└── styles.css                               ── add .modal-shell-* classes scoped to the new
                                                 wrapper; tighten .calendar-more-* native style;
                                                 add .booking-card list semantics (Req. 3, 6, 8)
```

### Touched documentation

```
OPUS_UI_BUG_REPORT.md
OPUS_FRONTEND_INSPECTION_REPORT.md
OPUS_FRONTEND_MICRO_AUDIT.md      (only if present)
DEPLOYMENT_READINESS_REPORT.md
QA_FULL_SYSTEM_REPORT.md
```

## Components and Interfaces

### Shared `Modal_Shell` (Req. 3)

A single overlay container that every dialog and drawer mounts through. It enforces a consistent position-per-breakpoint, identical four-corner radius, identical header / body / footer padding, sticky footer, body-only scrolling, and the existing Barangay tokens.

```jsx
// client/src/components/ModalShell.jsx
import { useEffect, useRef } from "react";

import { Icon } from "./Icon.jsx";

/**
 * Shared overlay container for every dialog and drawer in the staff console.
 *
 * Props:
 *   - open (boolean)        - controls mount; when false the component returns null
 *                             so form state cannot leak between sessions.
 *   - onClose (function)    - invoked on backdrop click and Escape (when not busy).
 *   - title (node)          - header heading content (becomes <h2 id={titleId}>).
 *   - kicker (string)       - small page-kicker line above the heading.
 *   - subtitle (string)     - optional descriptive copy below the heading.
 *   - size ("sm"|"md"|"lg") - max-width preset; defaults to "md" (560px).
 *   - busy (boolean)        - suppresses Escape close while a request is in flight.
 *   - footer (node)         - sticky footer content (typically primary/secondary
 *                             buttons via the existing .btn classes).
 *   - children (node)       - body content; the body region scrolls when content
 *                             exceeds the viewport.
 *
 * Layout rules (all from existing tokens, no new tokens introduced):
 *   - Backdrop: position fixed, inset 0, background rgba(15, 30, 60, 0.45),
 *               z-index 90; same as today's `.dialog-backdrop` rule.
 *   - Container: viewport >= 768px → centered, max-width per size, max-height 92vh;
 *                viewport <  768px → bottom sheet flush to viewport with the same
 *                radius on all four corners (Req. 3.5/3.6).
 *   - Padding:   header 20px 24px, body 24px (scrollable region), footer 16px 24px,
 *                using the existing --space-* tokens.
 *   - Scrolling: body region only (overflow:auto); header and footer remain pinned.
 *   - Focus:     traps focus, sends Escape to onClose unless `busy`, restores focus
 *                to the previously-focused element on close (mirrors today's
 *                ConfirmDialog/MaintenanceBlockModal behavior so we keep parity).
 *
 * The component does not introduce new colors or new shadows; it only consolidates
 * the existing rules and removes the asymmetric radius / cut-off footer cases the
 * audit flagged.
 */
export function ModalShell({
  open,
  onClose,
  title,
  kicker,
  subtitle,
  size = "md",
  busy = false,
  footer,
  children
}) {
  const containerRef = useRef(null);
  const initialFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId("modal-title");
  const subtitleId = useId("modal-subtitle");

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    // ... same focus-trap loop as the existing dialogs (consolidated here so
    //     every overlay shares one implementation instead of three copies).
    return () => { /* cleanup */ };
  }, [open, busy]);

  if (!open) return null;

  return (
    <div className="modal-shell-backdrop" role="presentation" onClick={() => !busy && onClose?.()}>
      <section
        className={`modal-shell modal-shell-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-shell-head">
          <div>
            {kicker && <p className="page-kicker">{kicker}</p>}
            <h2 id={titleId}>{title}</h2>
            {subtitle && <div id={subtitleId} className="d-sub">{subtitle}</div>}
          </div>
          <button
            className="modal-shell-close"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            ref={initialFocusRef}
          >
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="modal-shell-body">{children}</div>
        {footer && <footer className="modal-shell-foot">{footer}</footer>}
      </section>
    </div>
  );
}
```

CSS additions (in `client/src/styles.css`, layered on top of the existing tokens — no new tokens are introduced, only new selector names that map to those tokens):

```css
.modal-shell-backdrop {
  position: fixed; inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 30, 60, 0.45);
  z-index: 90;
}

.modal-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: min(560px, calc(100% - 32px));
  max-height: min(92vh, 720px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);            /* identical on all four corners */
  box-shadow: var(--shadow-lg);
  overflow: hidden;                           /* clips header/footer to the radius */
}

.modal-shell-sm  { width: min(440px, calc(100% - 32px)); }
.modal-shell-md  { width: min(560px, calc(100% - 32px)); }
.modal-shell-lg  { width: min(720px, calc(100% - 32px)); }

.modal-shell-head { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; gap: 16px; }
.modal-shell-body { padding: 24px; overflow: auto; }
.modal-shell-foot {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  display: flex; justify-content: flex-end; gap: 12px;
  position: sticky; bottom: 0;                /* keeps action buttons visible (Req. 3.8) */
}

@media (max-width: 767px) {
  .modal-shell-backdrop { align-items: end; }
  .modal-shell {
    width: 100%;
    max-height: 92vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .modal-shell-foot {
    /* Mobile sheet keeps a uniform corner profile by clipping the
       container and letting the foot sit flush; padding keeps the
       buttons inside the safe area without horizontal scrolling. */
    padding: 16px 20px;
  }
}
```

The four existing dialog consumers (`ConfirmDialog`, `MaintenanceBlockModal`, `ClearPublicUseModal`, `ResidentPickerDialog`) and the one drawer (`ReservationDetailDrawer`) are rewritten to render their content inside `<ModalShell>...</ModalShell>` instead of the bare `.dialog`/`.dialog-backdrop` markup. The logic, payloads, focus traps, and per-modal validation are unchanged; only the wrapper and the CSS classes that styled the wrapper move into `ModalShell`. The drawer keeps its right-side feel by rendering inside `<ModalShell size="lg">` with the same body/footer split — the audit's complaint was the asymmetric corners and clipped footer, both of which are now impossible by construction (Req. 3.4–3.7).

### Manila timestamp helper (Req. 2)

`client/src/api/mappers.js` already has `formatDateTimeHuman` for the local-wall-clock SQL string. We extend it to a single `formatBackendDateTime(value)` export that the activity logs page, accounts page, slip view, and daily print all import. The new export is just a stable name for the existing logic so consumers stop calling `new Date(value).toLocaleString()` (which is what re-shifts the value by 8 hours on a UTC-configured browser).

```js
// client/src/api/mappers.js (additions)

/**
 * Render a backend-provided timestamp value as the Manila wall-clock
 * date and time the backend stored. Accepts the local SQL form
 * (`YYYY-MM-DD HH:MM[:SS]`) and full ISO 8601 strings; missing or
 * unparseable values render as the placeholder "—" instead of
 * throwing (Req. 2.4).
 *
 * Reuses `formatDateTimeHuman` so we keep one shared formatter and one
 * Intl.DateTimeFormat configuration. Consumers must call this helper
 * (or `formatDateTimeHuman` directly) for every backend timestamp the
 * UI renders, so the office never sees a value shifted out of Manila
 * time (Req. 2.1, 2.2, 2.3).
 */
export function formatBackendDateTime(value) {
  if (value === null || value === undefined || value === "") return "—";
  const formatted = formatDateTimeHuman(value);
  return formatted || "—";
}
```

The static-source test asserts that a fixture like `"2026-05-18T17:31:00"` renders as `"May 18, 2026, 5:31 PM"` (or the existing 24-hour form on surfaces that already use 24-hour) under a UTC test environment, demonstrating that no offset is applied (Req. 2.5).

The four affected surfaces import `formatBackendDateTime` and replace any direct `new Date(...).toLocaleString()` / `Intl.DateTimeFormat(...)` call that does not pass `timeZone: "Asia/Manila"`:

- `client/src/pages/ActivityLogsPage.jsx` (the `loggedAt` column).
- `client/src/pages/AccountsPage.jsx` (`createdAt`, `lastLoginAt`).
- `client/src/components/ReservationSlipPrintView.jsx` (`issuedAt`).
- `client/src/components/DailySchedulePrintView.jsx` (`generatedAt` and any per-slot timestamps).

### Reservation form Save gating (Req. 1)

`ReservationFormPage` already has a `cannotSaveReason` derivation and a 30-second tick that re-evaluates `currentManilaTime` while the form is open. The remaining gaps the audit hits are:

1. The `TIME_OPTIONS` chips on today's form mark a past chip as `selected` whenever `buildInitialForm()` wraps around to the last slot. We tighten the rule so a disabled chip is **never** selected: when the seed value falls before `currentManilaTime`, leave `startTime` empty and let the staff member pick. The "Will end at" summary renders an em-dash in that state (Req. 1.1, 1.2).
2. The Save button must stay disabled whenever any time chip currently rendered as disabled is `form.startTime` (Req. 1.3). We extend `cannotSaveReason` to check membership in a `disabledStartTimes` set computed from the current Manila time.
3. The duration → end-time control must produce a strictly-greater `endTime` within the policy's min/max minutes. We add the existing `endTime > startTime` check plus a min/max-duration check sourced from the policy fetch (Req. 1.4).
4. The visual group of `startTime` / duration / end-time stays inside the same `.form-section` (already wired) so the relationship is visible on every Supported_Viewport without internal scrolling (Req. 1.5).
5. On submit while disabled, the form keeps itself open, suppresses the request, and renders the per-field message inside the existing inline error component (`fieldErrors`) (Req. 1.6).

```jsx
// ReservationFormPage.jsx (Save gating excerpt)

const disabledStartTimes = useMemo(() => {
  if (form.reservationDate !== todayInManila) return new Set();
  return new Set(TIME_OPTIONS.filter((time) => time <= currentManilaTime));
}, [currentManilaTime, form.reservationDate, todayInManila]);

const isSelectedStartDisabled = disabledStartTimes.has(form.startTime);

const cannotSaveReason = (() => {
  if (!form.startTime) return "Pick a start time before saving.";
  if (isSelectedStartDisabled) return "This time has already passed today. Pick a later start time.";
  if (!isValidDate(form.reservationDate)) return "Pick a date before saving.";
  if (!isValidTimeRange(form.startTime, form.endTime)) return "Pick a valid start and end time before saving.";
  if (durationOutsidePolicy(form, policy)) return "End time is outside the policy's min/max duration.";
  if (hasKnownConflict) return "Pick a different time before saving.";
  return "";
})();
```

Backend validation, route handlers, and the request schema are unchanged (Req. 1.7).

### Calendar tab vs. Today's Alert (Req. 5)

`CalendarPage` already renders no today-alert surface itself; the audit's complaint is that the dashboard mounts a `DashboardAlertsCard` while the calendar legend area still implies "today's status" exists on the calendar page. The remediation is twofold:

- Confirm and lock the absence: keep the comment in `CalendarPage` ("Today's alerts moved off the calendar surface to the dashboard…") and add a `tests/reactFrontendStatic.test.js` assertion that no `DashboardAlertsCard`, `TodaySnapshotCard`, or string `"Today's Alert"` appears in `CalendarPage.jsx` (Req. 5.1, 5.2, 5.5).
- Strengthen the dashboard side: `DashboardPage` already mounts `DashboardAlertsCard` with the `/api/dashboard/alerts` payload and the `BackupReminderCard`. We add an empty-state and an error-state that match Req. 5.4 and Req. 5.5, plus a 2-second guard so the empty-state pass renders within the bound (Req. 5.5).

Cleared-public-use state is read only from `/api/schedule` and `/api/dashboard/alerts` payloads, never from local React/`localStorage` state (Req. 24.7, 24.8). The existing `MaintenanceBlockModal`/`ClearPublicUseModal` already follow this rule.

### Reservation list semantic markup (Req. 6)

The current `ReservationCard` is an `<article>` with `aria-current` and two child buttons; the audit found nested interactive descendants in the tree. We rewrite the markup so the list is a `<ul>` and each card is a `<li>` containing two sibling `<button>` controls (no `role="button"` on the wrapper). We move the existing `attentionReason` tooltip onto the explicit "Open record" button so the wrapper has zero interactive behavior (Req. 6.1–6.5). The visible-focus rule is satisfied by the existing `:focus-visible` outline tokens; we add a contrast assertion to the static test (Req. 6.6).

```jsx
// ReservationsPage.jsx (rewrite excerpt)

<ul className="booking-card-list" aria-label="Reservation records">
  {filteredReservations.map((reservation) => (
    <li key={reservation.reservationId} className="booking-card-item">
      <ReservationCard
        reservation={reservation}
        attentionReason={...}
        onOpen={() => openReservation(reservation)}
        onPrintSlip={() => onNavigate(`/reservations/${reservation.reservationId}/slip`)}
      />
    </li>
  ))}
</ul>

function ReservationCard({ reservation, attentionReason, onOpen, onPrintSlip }) {
  return (
    <article className={`booking-card ${attentionReason ? "needs-attention" : ""}`}>
      ...
      <div className="booking-card-actions">
        <button
          type="button"
          className="btn btn-light btn-small"
          onClick={onOpen}
          title={attentionReason || undefined}
          aria-label={`Open reservation ${reservation.referenceNo || reservation.reservationId}`}
        >
          Open record
        </button>
        <button
          type="button"
          className="btn btn-light btn-small"
          onClick={onPrintSlip}
          aria-label={`Print slip for ${reservation.referenceNo || reservation.reservationId}`}
        >
          Print slip
        </button>
      </div>
    </article>
  );
}
```

The selected-state visual stays the same: the parent `<li>` carries `aria-current="true"` when `selectedId` matches.

### Reservation CSV export (Req. 7)

The current page renders an `<a href="/reservations/export.csv">Export CSV</a>` that is not wired to the visible filters. We replace it with `<CsvExportButton endpoint="reservations-export" params={...} label="Export visible bookings (CSV)" />` from the existing helper. Because `csvExport.js` whitelists exactly the seven backend CSV endpoints from the post-deployment-frontend feature, we extend the whitelist by one entry — `reservations-export` — keeping the strict whitelist intact (Req. 7.4 forbids changing route paths; this is just exposing the existing `/api/reservations/export.csv` route through the same helper). The button forwards the current `query`, `scope`, and `statusFilter` values as query parameters (Req. 7.1a). If the request returns 4xx/5xx, the existing helper surfaces "CSV export could not be downloaded." plus the backend message; on a network failure it surfaces the standard offline copy (Req. 7.5, 17.1).

If extending the whitelist is judged out of scope (because the existing post-deployment-frontend spec defined the seven endpoints as the final list), the fallback design is to label the existing anchor "Export all reservations (CSV)" and stop forwarding filters (Req. 7.1b). Either branch satisfies Req. 7.

### Tabs and menus (Req. 8)

The three surfaces below have one tab/menu cluster each. We pick the simpler native pattern (button group / disclosure) so the keyboard behavior is automatic and we never half-implement the ARIA pattern.

- `ReportsPage`: filter range buttons. Today they are plain `<button>` elements; we drop the implicit `role="radiogroup"` association and use a fieldset-less native button group, with `aria-pressed` reflecting the active range (Req. 8.4).
- `ReservationHistoryPage`: result tabs. Today they are also plain buttons; we add `aria-pressed` and remove any leftover `role="tab"` references (verified by static test).
- `CalendarPage` overflow menu: today rendered with `role="menu"`/`role="menuitem"`. We replace it with a native disclosure: a single trigger button with `aria-expanded` + `aria-controls`, opening a `<div hidden>` that contains plain `<button>` children. Tab/Shift+Tab moves through the buttons; Escape closes the disclosure and returns focus to the trigger (Req. 8.4, 8.6).

Static-source assertions in `tests/reactFrontendStatic.test.js` enforce that none of the three files contain `role="tab"`, `role="tablist"`, `role="menu"`, or `role="menuitem"` (Req. 8.7, 8.8).

### Daily print (Req. 9)

`DailySchedulePrintView` already renders `slot.startTime`, `slot.endTime`, and a status pill. We extend it with:

1. A `resolveBlockType(block)` helper that returns `block.type || block.blockType || ""` (Req. 9.1).
2. A `BLOCK_TYPE_LABEL` map that translates the seven enums to humanized labels (Req. 9.3); unknown types render `"Other"` (Req. 9.4); empty values render `"Blocked"` (Req. 9.2).
3. A past-slot helper `isPastSameDaySlot(slot, todayManila)` that returns true when `slot.endTime <= currentManilaTime` and the printout is for today's date. The view applies the existing muted text class plus a strikethrough to the time and status text and removes any "available" copy from those rows (Req. 9.6, 9.7).
4. All rendered timestamps go through `formatBackendDateTime` (Req. 9.5, ties back to Req. 2).

Ink-friendly styling and the Barangay tokens are unchanged (Req. 9.8).

### Reports copy (Req. 10)

`mappers.js` already has `formatTimeRange`, which renders `"9:00 AM – 11:00 AM"` (with an en-dash). Req. 10.1 specifies `" to "` as the literal separator; we add a small wrapper used only on the Reports page so we do not break the existing print-slip and history surfaces that depend on the en-dash today.

```js
// mappers.js (additions)
export function formatTimeRangeFriendly(startTime, endTime) {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} to ${end}`;
}
```

`ReportsPage` swaps every raw `09:00-11:00` formatter call to `formatTimeRangeFriendly`. The existing `CsvExportButton` is relabeled "Download Reports CSV" (Req. 10.4). Section headings and copy are reviewed against the existing terminology used elsewhere in the staff console; any marketing-style verb or hype adjective listed in Req. 10.5 is rewritten to a calm task-led equivalent. Backend report fields are not changed (Req. 10.7).

### Court Policy reorganization (Req. 11)

The existing `CourtPolicyForm` already declares the six groups via the `.court-policy-group` class (visible in `styles.css`). The remediation is:

- Confirm the top-to-bottom order matches Req. 11.1 exactly: Operating hours → Reservation duration → Allowed days → Blocked dates → Grace period → Backup reminder.
- Tighten group headers so each has a one-line description (≤120 chars) using `.field-hint` style; no new typography tokens (Req. 11.2).
- Where Filipino translation keys exist in the component already, render them as italic helper text below the English description; otherwise omit (Req. 11.3, no placeholder text).
- Add a Backup reminder group at the bottom containing only a read-only summary card (rendered via `BackupReminderCard` reused as a non-blocking, non-modal component) and a "Read more about backups" link to the maintenance launcher copy from `STAFF-DAILY-USE.txt` (Req. 11.1f, 4.2).
- Keep the existing `LoadingState` / `EmptyState` placement (Req. 11.8).
- Staff users see a fully read-only form with the save action removed (Req. 11.7), as today.

`CourtPolicyPage` mounts `BackupReminderCard` outside the form so an admin clicks Save and the reminder still renders correctly even when the policy fetch throws (Req. 4.7, 4.8).

### Backup reminder placement (Req. 4)

`BackupReminderCard` currently reads from a wrapper that returned `{ backupStatus: { backupDue: true } }` rather than the flat shape it expected, so the card silently renders nothing. We unwrap correctly:

```jsx
// BackupReminderCard.jsx (excerpt)
const data = await apiRequest("/api/maintenance/backup-status");
// The backend wraps the payload as { backupStatus: { ... } }; unwrap once
// so the card actually reads `backupDue`/`lastBackupAt`/`daysSinceBackup`/
// `reminderThresholdDays` (Req. 4.3).
const status = data?.backupStatus || data || {};
if (!status?.backupDue) return null;
```

The card is mounted on both the dashboard (already done) and the Court Policy page (added) (Req. 4.1, 4.2). The component remains a non-blocking inline card — never a full-screen overlay or auto-opening dialog (Req. 4.5). On a fetch error the component returns null and `console.error`s, so the dashboard / Court Policy page keep rendering (Req. 4.7, 4.8).

### Signed-in login redirect (Req. 13)

`App.jsx` already detects the `/login` path with `isLoginPath`. We extend the existing branch so that when `sessionState.user` is set and the path is `/login`, we replace the URL with the dashboard route and render the dashboard. The unauthenticated branch is unchanged (Req. 13.1, 13.2). The 3-second indeterminate-state guard already exists in `sessionState.loading`'s rendering of `<LoadingState label="Checking staff session..." />` (Req. 13.3).

```jsx
// App.jsx (excerpt)
if (sessionState.loading) {
  return <main className="boot-screen"><LoadingState label="Checking staff session..." /></main>;
}

if (sessionState.user && isLoginPath) {
  // Redirect signed-in users away from the login form within the same render
  // tick. We replace the URL so the back button does not trap the user on the
  // login page (Req. 13.1).
  window.history.replaceState({}, "", "/dashboard");
  return (
    <AppShell user={sessionState.user} path="/dashboard" onNavigate={handleNavigate} onLogout={handleLogout}>
      {renderPage("/dashboard", handleNavigate, sessionState.user)}
    </AppShell>
  );
}

if (!sessionState.user) {
  return <LoginPage onLogin={handleLogin} />;
}
```

Backend session, authentication, and authorization endpoints are unchanged (Req. 13.4).

### Override copy (Req. 15)

`ReservationFormPage`'s "save anyway" override is rendered through a single button. We change the visible label from `"Save anyway"` to `"Save with policy override"` (within the 40-character cap) and add a 200-character description naming the specific policy being overridden ("This will save the reservation despite the {fieldName} policy. The action will be recorded for the administrator to review."). The existing backend authorization check is unchanged (Req. 15.3). A grep of `client/src/` for the literal string `"save anyway"` (case-insensitive) in the static test guards against regression (Req. 15.4).

### Status label normalization (Req. 16)

`mappers.js` exports `STATUS_LABELS` with `COMPLETED: "Done"` today; the calendar legend, reservation drawer, and reports surface variations on this. We change the canonical to a single label (`"Completed"` is recommended for consistency with the official voice; the orchestrator confirms which canonical label to use during implementation per Req. 15-style copy review) and remove all hard-coded `"Done"` strings. The static test asserts no surface renders the alternate string for the `COMPLETED` `statusCode` (Req. 16.1, 16.2). Backend payloads (`statusCode`/`statusName`) are unchanged (Req. 16.3).

### Success live regions (Req. 17)

We sweep success banners (`alert success`) and replace `role="alert"` with `role="status"` and `aria-live="polite"`. The visual styling stays the same (Req. 17.5). Affected surfaces include the reservation form saved-confirmation banner, the status-change toast in `ReservationsPage`, the success state in `ClearPublicUseModal`, and the resident directory save confirmation. We also set `aria-atomic="true"` on each so screen readers announce the message as a single unit (Req. 17.2). The success message remains in the DOM for at least 4 seconds before any auto-dismiss timer fires (Req. 17.4).

### Official header (Req. 18)

We add a tiny shared module that exposes the three official strings:

```js
// client/src/api/officialHeader.js
export const OFFICIAL_HEADER = Object.freeze({
  barangayName: "Barangay Sto. Niño",
  courtName: "Basketball Court",
  subtitle: "Office Computer"
});

export function getOfficialHeader() {
  return OFFICIAL_HEADER;
}
```

`AppShell.jsx`, `ReservationSlipPrintView.jsx`, and `DailySchedulePrintView.jsx` import and render the same constants (Req. 18.1, 18.2). The static test asserts (a) all three files import from `client/src/api/officialHeader.js`, and (b) no other source file under `client/src/` hardcodes the strings `"Barangay Sto. Niño"` or `"Basketball Court"` (Req. 18.3). If `OFFICIAL_HEADER.barangayName` is empty at render time, the consumer renders a single-line "Header configuration missing: barangayName" alert without blocking the rest of the surface (Req. 18.4).

### Form id/name (Req. 19)

`Field` already wires `id` to its child via `React.cloneElement`. We sweep every page for raw `<input>`/`<select>`/`<textarea>` outside of `Field` and add a non-empty `id` and `name` attribute. The Chrome issues panel re-run is documented in the implementation report (Req. 19.5).

### Responsive density (Req. 12)

`AppShell` already includes a mobile-nav-bar with toggle, an `id="sidebar-nav"`, and `sidebar-open` states. The remediation is style-only: at `<= 768px` the topbar reduces to the brand mark + the office clock (no full user-chip); at `<= 390px` the brand subtitle drops, and the card-action buttons in `DashboardPage`, `ReservationFormPage`, and `ResidentDirectoryPage` use the existing `.btn-small` modifier so the action density matches the typography density. No new mobile-only routes, copy, or color tokens are introduced (Req. 12.4). Focus order, accessible names, and roles are identical to the desktop view (Req. 12.5).

### Trivial polish (Req. 20)

UI-AUD-025 through UI-AUD-028 are addressed in the same commit as the surrounding higher-severity work (or deferred with a written reason in the implementation report when they conflict with a higher-severity requirement, per Req. 20.2). No new tokens or libraries are added (Req. 20.3).

## Data Models

This feature introduces no new backend tables, columns, or API shapes (Req. 24.1, 24.2, 24.3). The frontend continues to consume the existing payload shapes from the post-deployment-frontend feature.

The two new client-side data structures are:

```ts
// disabled-start-time set used by ReservationFormPage to guard Save
type DisabledStartTimes = Set<string>; // values are entries from TIME_OPTIONS

// block-type humanization used by DailySchedulePrintView
type BlockTypeLabelMap = {
  CLEANING: "Cleaning";
  BARANGAY_EVENT: "Barangay event";
  REPAIRS: "Repairs";
  TOURNAMENT: "Tournament";
  MEETING: "Meeting";
  EMERGENCY_USE: "Emergency use";
  MAINTENANCE: "Maintenance";
};
```

Both are local-only constants; nothing leaves the client. The existing official-header constant in `client/src/api/officialHeader.js` is also a frozen object (Req. 18.1).

## Error Handling

Every new request path follows the existing `apiRequest` contract:

- HTTP 4xx/5xx: render `error.message` verbatim in the existing `.alert.error` band, plus per-field errors from `error.data.errors` via `Field`'s `error` prop (Req. 17.2).
- Network failure (fetch throws without a status): render the standard offline copy "The system is offline or the office network is down. Try again once the network is back." (Req. 17.1).
- Missing or malformed 2xx fields: render `EmptyState` with a "Data unavailable" title; never throw an uncaught render exception (Req. 17.3, 17.5).

The `BackupReminderCard` is a special case: on any error, it returns null and `console.error`s the failure (Req. 4.7). The dashboard and Court Policy page remain interactive (Req. 4.8).

The dashboard alerts surface adds an explicit retry control on failure (Req. 5.4) and an empty-state for `payload.alerts.length === 0` (Req. 5.5). The empty-state must render within 2 seconds of the dashboard load completing.

`ModalShell` is defensive against asymmetric content: the body region uses `overflow:auto` with `overscroll-behavior:contain` so a long body cannot push the footer below the viewport (Req. 3.6, 3.8).

## Testing Strategy

The test layer follows the post-deployment-frontend feature's pattern (`tests/reactFrontendStatic.test.js` plus optional behavioral tests). Property-based tests are not introduced (this feature is layout, copy, accessibility, and a few helpers — none of the new code has a meaningful generative-input space). Tests use `node:test` so they run under `node scripts/run-tests.mjs`.

### Static-source assertions (extended in `tests/reactFrontendStatic.test.js`)

- `formatBackendDateTime` is exported from `client/src/api/mappers.js`.
- `formatBackendDateTime("2026-05-18T17:31:00")` renders `"May 18, 2026, 5:31 PM"` (or the matching 24-hour form on surfaces that already use 24-hour) when the test environment is configured to UTC (Req. 2.5).
- `client/src/components/ModalShell.jsx` exists; every other dialog/drawer file imports it.
- `client/src/pages/CalendarPage.jsx` does not contain the strings `"DashboardAlertsCard"`, `"TodaySnapshotCard"`, or `"Today's Alert"` (Req. 5.1).
- `client/src/pages/ReservationsPage.jsx` does not include `role="button"` on the `.booking-card` element and contains the literal `<ul className="booking-card-list">` (Req. 6.1, 6.2).
- The Reports, History, and Calendar files contain neither `role="tab"`, `role="tablist"`, `role="menu"`, nor `role="menuitem"` (Req. 8.7).
- `BackupReminderCard.jsx` reads `data?.backupStatus?.backupDue` (Req. 4.3).
- `client/src/api/officialHeader.js` exports `OFFICIAL_HEADER`; the topbar, slip view, and daily print all import it (Req. 18.3).
- `mappers.js` exports `STATUS_LABELS.COMPLETED` and the canonical label is referenced uniformly (Req. 16.1).
- No source file under `client/src/` contains the literal string `"save anyway"` (case-insensitive) (Req. 15.4).
- The recurring-not-available note is rendered with the `form-copy-muted` class only (Req. 14.1).
- Modal CSS rules apply identical `border-radius` to all four corners of `.modal-shell`, asserted by parsing the `border-radius` shorthand in `client/src/styles.css` (Req. 3.5).

### Behavioral tests (optional under the `*` rule)

- Daily print fixture: assert that a `block` with `{ type: undefined, blockType: "BARANGAY_EVENT" }` renders "Barangay event"; that an unknown enum renders "Other"; that a slot whose `endTime < currentManilaTime` renders a strikethrough class and contains none of the strings "available", "open", "bookable" (Req. 9.1–9.4, 9.7).
- Reservation form Save gating: assert that on today with `currentManilaTime = "10:30"` the button is disabled and the form does not POST (Req. 1.3, 1.6).
- Modal_Shell snapshot: assert that mounting `<ModalShell open size="md">…</ModalShell>` produces the expected backdrop + container + footer DOM and that pressing Escape calls `onClose` (Req. 3.1, 3.7).

### Verification commands (Req. 23)

```
npm run frontend:build
npm run verify:react-build
npm run verify:ui
npm test
```

Each must exit with status code 0. If `npm test` cannot run in the current environment, the implementation report records the blocker and the substitute command(s) executed (Req. 23.6).

### Manual viewport verification

For each surface in Verification_Surface_Set at 1366px / 1024px / 768px / 390px, the implementation report records:

- A screenshot path under `tmp/ui-audit-remediation-evidence/<surface>-<width>.png`.
- The DevTools console (zero new uncaught errors) and Network panel (zero new failed requests) result.
- Any pre-existing issue (separated from new issues attributable to this remediation) (Req. 23.9).

## Correctness Properties

Generative property-based tests are not introduced for this feature (the surface is layout, copy, accessibility, and a few helpers — none of the new code has a meaningful generative-input space, mirroring the post-deployment-frontend feature's static-source assertion approach). Instead, the deterministic correctness invariants below are enforced via the static-source assertions in `tests/reactFrontendStatic.test.js` and the optional behavioral tests under `tests/`. Each invariant maps to one or more requirements.

### Property 1: Manila timestamp invariance under host timezone

For every backend Manila wall-clock value `v` (e.g., `"2026-05-18T17:31:00"`) and every host timezone `Z` (UTC, America/Los_Angeles, Asia/Tokyo, Asia/Manila), `formatBackendDateTime(v)` produces the same wall-clock hour and minute.

**Validates: Requirements 2.1, 2.2, 2.5**

### Property 2: No past chip is selected on initial render

For every form state where `reservationDate === todayInManila` and every `t` in `TIME_OPTIONS` with `t <= currentManilaTime`, `form.startTime !== t` whenever the form was seeded by `buildInitialForm()`.

**Validates: Requirements 1.1, 1.2**

### Property 3: Save disabled implies no POST

For every form state where `cannotSaveReason` is non-empty, submitting the form does not dispatch a request to `/api/reservations`.

**Validates: Requirements 1.3, 1.6**

### Property 4: End time strictly greater than start time within policy bounds

For every form state where `cannotSaveReason === ""`, `form.endTime > form.startTime` and the duration falls inside the policy's `[minimumReservationMinutes, maximumReservationMinutes]` window.

**Validates: Requirements 1.4**

### Property 5: Modal corner symmetry

For every modal rendered through `ModalShell`, the four `border-radius` values on `.modal-shell` are equal.

**Validates: Requirements 3.5, 3.6**

### Property 6: Modal footer reachability across viewports

For every Supported_Viewport `w` in `{1366, 1024, 768, 390}` and every modal mounted through `ModalShell`, the footer's bounding box is contained within the viewport's bounding box on the initial render.

**Validates: Requirements 3.8**

### Property 7: Calendar tab today-alert exclusion

The strings `"DashboardAlertsCard"`, `"TodaySnapshotCard"`, and `"Today's Alert"` do not appear in `client/src/pages/CalendarPage.jsx`.

**Validates: Requirements 5.1, 5.2**

### Property 8: Reservation list non-nesting

No element with `role="button"` (or `<button>`) is nested inside another element with `role="button"` (or `<button>`) on `ReservationsPage`.

**Validates: Requirements 6.1, 6.2**

### Property 9: Reports / History / Calendar role discipline

The strings `role="tab"`, `role="tablist"`, `role="menu"`, `role="menuitem"` do not appear in `ReportsPage.jsx`, `ReservationHistoryPage.jsx`, or `CalendarPage.jsx`.

**Validates: Requirements 8.7, 8.8**

### Property 10: Backup reminder field unwrap

For every successful `GET /api/maintenance/backup-status` response with `payload.backupStatus.backupDue === true`, `BackupReminderCard` renders a non-null DOM tree containing `lastBackupAt`, `daysSinceBackup`, and `reminderThresholdDays`.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 11: Block-type fallback totality

For every `(block.type, block.blockType)` pair, `resolveBlockType` returns either the matched humanized label, `"Other"`, or `"Blocked"` — never `undefined`, `"undefined"`, `"null"`, or the raw enum value.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 12: No "save anyway" anywhere

The literal string `"save anyway"` (case-insensitive) does not appear in any source file under `client/src/`.

**Validates: Requirements 15.4**

### Property 13: Status label uniqueness for COMPLETED

Exactly one canonical display label is emitted for `statusCode === "COMPLETED"` across reservation list, drawer, calendar legend, reports, history, slip, daily print, and activity logs.

**Validates: Requirements 16.1, 16.2**

### Property 14: Header byte-for-byte consistency

For each of `barangayName`, `courtName`, `subtitle`, the rendered string in the staff console header, the slip print, and the daily print is byte-for-byte equal to `OFFICIAL_HEADER[<field>]`.

**Validates: Requirements 18.1, 18.2, 18.3**

### Property 15: No CDN or external URL in client source

No file under `client/src/` or `public/app/` contains a non-relative `https://` URL, an `http://` URL, or a `//cdn.` reference.

**Validates: Requirements 24.13, 24.14**

These properties are mechanical — each can be checked by either grepping the source tree or by running the helper against a fixed input. They give the static-source assertion suite a clear pass/fail bar without invoking any generative-input strategy.

## Documentation Updates

The implementation phase updates the following documents in the same change set:

- `OPUS_UI_BUG_REPORT.md` — one entry per Audit_Issue_ID with resolution summary, modified file paths, and the verification command outcome (Req. 22.1).
- `OPUS_FRONTEND_INSPECTION_REPORT.md` — one section per touched surface, with each item re-inspected and a pass/fail outcome (Req. 22.2).
- `OPUS_FRONTEND_MICRO_AUDIT.md` — only updated if the file already exists in the repository (Req. 22.3, 22.4).
- `DEPLOYMENT_READINESS_REPORT.md` — post-remediation readiness score on the same scale, remaining deferred issues tagged by Audit_Issue_ID, and the verification commands and viewport checks executed with their pass/fail result (Req. 22.5).
- `QA_FULL_SYSTEM_REPORT.md` — one section per touched surface with the QA checks executed and pass/fail outcomes (Req. 22.6).

None of the documentation updates introduce references to PDF / XLSX exports, online booking, SMS, payments, memberships, public resident accounts, or cloud sync (Req. 22.7).

## Non-Goals (Out of Scope)

Carried verbatim from Req. 24:

1. No backend logic, route handler, request validation, response shape, or business rule changes (Req. 24.1).
2. No database schema changes (Req. 24.2).
3. No API route path or HTTP method changes (Req. 24.3).
4. No recurring reservation UI, scheduler view, or control that creates a recurring series (Req. 24.4).
5. No PDF, XLSX, or JSON export controls or libraries (Req. 24.5).
6. No new CSV export endpoints; no removal of existing CSV export endpoints (Req. 24.6).
7. No frontend-only `clearedDays` state in React state, `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or any in-memory client structure (Req. 24.7, 24.8).
8. No deviation from the Barangay Visual Language tokens declared in `DESIGN.md`, `.impeccable/design.json`, and `Barangay (1)/DESIGN.md` (Req. 24.9, 24.10).
9. No online booking, SMS, cloud sync, public resident accounts, payments, or memberships (Req. 24.11).
10. Frontend validation remains usability support; backend remains authoritative (Req. 24.12).
11. Offline_Operation: no CDN, third-party host, or outbound network reference under `client/src/` or `public/app/` (Req. 24.13, 24.14).
