# Full Staff-Friendly Replacement Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Keep each task independently verifiable. Do not introduce pending, approved, or declined backend statuses in this phase.

**Goal:** Replace every normal user-facing UI with the `Barangay (1)` Staff-Friendly design and workflows while preserving the existing backend, database, authentication, reservation validation, status model, offline packaging, backup/restore, and verification scripts.

**Approved Spec:** `docs/superpowers/specs/2026-05-15-full-staff-friendly-replacement-design.md`

**Architecture:** Express remains the local backend and offline app host. React/Vite becomes the only normal staff-facing UI. Existing EJS handlers may remain internally for compatibility or CSV export, but staff should not normally land on old EJS pages.

**Status Rule:** The only stored reservation statuses in this phase are `RESERVED`, `MISSED`, `CANCELLED`, and `COMPLETED`. Any `Barangay (1)` pending/approval/decline language must be removed or mapped to the current model.

---

## Scope Notes

This plan supersedes the earlier React staff console plan. The current React app already exists and is backend-backed, so this work is a replacement/refinement rather than a first-time React setup.

Do not change the database schema unless a blocking issue is discovered and separately approved. Do not add cloud services, CDN scripts, remote fonts, or internet-dependent runtime assets.

Reference files to preserve visually:

- `C:\Users\Emmy Lou\Downloads\Barangay (1)\Barangay Court Scheduling - Staff Friendly.html`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\styles-staff.css`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\staff-components.jsx`
- `C:\Users\Emmy Lou\Downloads\Barangay (1)\staff-app.jsx`

---

## Target File Changes

Modify:

- `client/src/styles.css`
- `client/src/App.jsx`
- `client/src/components/AppShell.jsx`
- `client/src/components/ConfirmDialog.jsx`
- `client/src/components/StatusBadge.jsx`
- `client/src/components/EmptyState.jsx`
- `client/src/components/LoadingState.jsx`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/CalendarPage.jsx`
- `client/src/pages/ReservationFormPage.jsx`
- `client/src/pages/ReservationsPage.jsx`
- `client/src/pages/ReportsPage.jsx`
- `client/src/pages/ActivityLogsPage.jsx`
- `client/src/pages/AccountsPage.jsx`
- `client/src/api/mappers.js`
- `src/features/frontend/reactAppRoutes.js`
- `src/app.js`
- `tests/reactAppRoutes.test.js`
- `tests/reactFrontendStatic.test.js`
- `tests/apiRoutes.test.js`
- `tests/app.test.js`
- `scripts/verify-ui-smoke.mjs`

Create if useful:

- `client/src/components/Toast.jsx`
- `client/src/components/ReservationDetailDrawer.jsx`
- `client/src/components/Field.jsx`
- `client/src/components/Icon.jsx`
- `client/src/pages/AttentionPage.jsx`
- `tests/staffFriendlyReplacement.test.js`

Preserve:

- `src/features/api/*`
- `src/features/reservations/*`
- `src/features/schedule/*`
- `src/features/users/*`
- `/prototype` reference route unless the user separately asks to remove it.
- `/reservations/export.csv` CSV export behavior.

---

## Task 1: Lock Route Replacement Behavior

**Purpose:** Make sure every normal staff route serves the Staff-Friendly React app and old EJS pages are no longer the visible workflow.

**Files:**

- Modify: `src/features/frontend/reactAppRoutes.js`
- Modify: `src/app.js`
- Modify: `tests/reactAppRoutes.test.js`
- Modify: `tests/app.test.js`

- [ ] **Step 1: Add complete Staff-Friendly route coverage**

Update `MAIN_ROUTES` so React covers:

- `/`
- `/login`
- `/dashboard`
- `/schedule`
- `/reservations`
- `/reservations/new`
- `/reservations/:reservationId(\\d+)`
- `/reservations/:reservationId(\\d+)/edit`
- `/reports`
- `/activity-logs`
- `/account`
- `/account/password`

If an attention/no-shows route is implemented as a separate page, also add `/attention`. If it is implemented as a bookings tab or dashboard panel, do not add a separate route.

- [ ] **Step 2: Ensure route order cannot expose old pages**

In `src/app.js`, keep API, prototype, health, static files, and CSV export reachable, but make normal authenticated staff page routes render React before legacy route handlers can render EJS.

Keep `/reservations/export.csv` available. It may continue to use the legacy reservation route handler if that is the narrowest low-risk path.

- [ ] **Step 3: Update route tests**

Update `tests/reactAppRoutes.test.js` and `tests/app.test.js` to prove:

- Main routes return the React shell.
- `/` returns or redirects to the React shell.
- Old EJS page markers are absent from normal staff routes.
- `/reservations/export.csv` still downloads CSV.
- Remote assets are not referenced.

Run:

```powershell
npm test
```

Expected: route tests pass before moving to broad UI replacement.

---

## Task 2: Replace The Visual System With Staff-Friendly Tokens

**Purpose:** Make the app visually match the Staff-Friendly `Barangay (1)` source before deeper page work.

**Files:**

- Modify: `client/src/styles.css`
- Modify: `client/src/components/AppShell.jsx`
- Create: `client/src/components/Icon.jsx`

- [ ] **Step 1: Port Staff-Friendly tokens**

Replace current app CSS tokens with the Staff-Friendly palette and sizing:

- `--bg: #F6F4EE`
- `--surface: #FFFFFF`
- `--surface-2: #F0ECE3`
- `--border: #DCD6C7`
- `--border-strong: #B9B19E`
- `--ink: #1F2937`
- `--primary: #0B4A6F`
- `--accent: #C85C1C`
- `--success: #1F7A43`
- `--warning: #B4761A`
- `--danger: #B83B2A`
- 17px base text.
- 48px minimum controls.
- 64px large task buttons.
- 300px sidebar on desktop.
- Mobile/narrow layout that does not overflow.

Use system fonts or locally available fonts. Do not import Google Fonts.

- [ ] **Step 2: Replace shell layout**

Rebuild the shell to match Staff-Friendly structure:

- Blue topbar.
- Barangay seal and title.
- Time/date.
- User pill.
- Sign-out action.
- Large sidebar buttons with icons and helper text.
- Sidebar help panel.

Use the existing real user session data instead of mock names.

- [ ] **Step 3: Add shared icons locally**

Create a local icon component based on inline SVGs or existing local icon patterns. No external icon runtime is required unless already available locally.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: build succeeds, static tests still reject remote assets and unsupported pending status.

---

## Task 3: Normalize Status Labels And Staff-Friendly Copy

**Purpose:** Remove prototype approval language and enforce the current backend status model everywhere.

**Files:**

- Modify: `client/src/api/mappers.js`
- Modify: `client/src/components/StatusBadge.jsx`
- Modify: `tests/reactFrontendStatic.test.js`

- [ ] **Step 1: Define one status display map**

Use:

- `RESERVED` -> `Reserved`
- `MISSED` -> `Did not show up`
- `CANCELLED` -> `Cancelled`
- `COMPLETED` -> `Done`
- `AVAILABLE` -> `Available` for computed schedule cells only.

- [ ] **Step 2: Reject old approval copy**

Extend or keep tests that prevent unsupported status drift:

- No `PENDING` backend/status token.
- No "pending approval" user text.
- No "Approve" or "Decline" action copy.
- "Decline" should become "Cancel".

Run:

```powershell
npm test
```

Expected: status copy stays aligned with the approved spec.

---

## Task 4: Replace Login And Home

**Purpose:** Establish the first real Staff-Friendly user flow: sign in, land on Home, review today's schedule, and start a reservation.

**Files:**

- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/DashboardPage.jsx`
- Modify: `client/src/components/LoadingState.jsx`
- Modify: `client/src/components/EmptyState.jsx`

- [ ] **Step 1: Replace login screen**

Use the Staff-Friendly centered card:

- Barangay seal.
- Product title.
- Large username/password fields.
- Staff-only helper text.
- Clear invalid login error.

Keep real `/api/login` behavior.

- [ ] **Step 2: Replace Home screen**

Use Staff-Friendly Home patterns:

- Big page title.
- Today's date.
- Large stats.
- New Reservation action.
- Today's booking list.
- Nearest available slot notice.
- Empty state for no reservations.

Connect to existing `/api/dashboard` only.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: login and dashboard tests still pass, and the new UI uses real data.

---

## Task 5: Replace Calendar

**Purpose:** Replace the dense current schedule table with a Staff-Friendly weekly calendar that still uses real schedule data.

**Files:**

- Modify: `client/src/pages/CalendarPage.jsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Build the Staff-Friendly week view**

Use:

- Week navigation.
- Current week label.
- Day columns or responsive stacked day cards.
- Status-colored booking blocks.
- "No bookings" day messaging.
- New Reservation shortcut.

- [ ] **Step 2: Keep backend-backed schedule data**

Use `GET /api/schedule?date=YYYY-MM-DD`. Do not derive schedule rows from seed data.

- [ ] **Step 3: Make reservation blocks interactive**

Clicking a real reservation should open the same detail drawer used by All Bookings where possible. If the drawer integration is deferred to Task 6, keep that dependency tracked in the plan checklist, not in source code.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: calendar renders real weekly data and remains responsive.

---

## Task 6: Replace Reservation Creation, List, And Detail Workflow

**Purpose:** Move the core reservation workflow to the Staff-Friendly app: guided form, live conflict feedback, searchable list, and detail drawer.

**Files:**

- Modify: `client/src/pages/ReservationFormPage.jsx`
- Modify: `client/src/pages/ReservationsPage.jsx`
- Create: `client/src/components/ReservationDetailDrawer.jsx`
- Create: `client/src/components/Field.jsx`
- Modify: `client/src/components/ConfirmDialog.jsx`
- Modify: `client/src/styles.css`
- Modify: `tests/apiRoutes.test.js`

- [ ] **Step 1: Build the guided reservation form**

Use the Staff-Friendly form structure:

- Staff instruction panel.
- Requester/group field.
- Contact.
- Address.
- Purpose.
- Date.
- Start and end time or duration.
- Remarks.
- Slot chips or clear time controls.

New records must save directly as `RESERVED`.

- [ ] **Step 2: Preserve real availability checks**

Use `GET /api/availability` while date/time inputs are valid.

Show:

- Available confirmation.
- Conflict details.
- Suggested available slots.
- Backend validation errors.

- [ ] **Step 3: Replace All Bookings**

Use the Staff-Friendly bookings list:

- Search.
- Status filter tabs or large controls.
- Status counts if data supports them.
- Click row/card to open detail drawer.
- CSV export link preserved.
- Print behavior if practical.

- [ ] **Step 4: Replace reservation detail**

Use a drawer/modal:

- Full reservation details.
- Edit action.
- Mark as missed.
- Cancel.
- Mark as done.

Every status mutation must require confirmation and call the real backend.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: create, edit, list, detail, conflict, and status tests pass.

---

## Task 7: Add Staff-Friendly Attention Surface

**Purpose:** Preserve the `Barangay (1)` "needs attention" idea without inventing unsupported database conflict states.

**Files:**

- Create or modify: `client/src/pages/AttentionPage.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/AppShell.jsx`
- Modify: `client/src/styles.css`
- Modify: `src/features/frontend/reactAppRoutes.js` only if a new `/attention` route is used.

- [ ] **Step 1: Choose placement**

Preferred low-risk placement: implement attention as a Staff-Friendly section or tab inside All Bookings/Home.

Use a separate `/attention` route only if the navigation needs a dedicated page.

- [ ] **Step 2: Show real attention records**

Use real reservation data:

- `MISSED` records.
- `CANCELLED` records if useful.
- Today's `RESERVED` records that may need `MISSED` or `COMPLETED` actions.

Do not claim active overlaps unless the backend returns actual overlap evidence.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: attention surface is real-data backed and does not imply unsupported conflict states.

---

## Task 8: Replace Reports, Activity Logs, And Accounts

**Purpose:** Complete the replacement of admin and review surfaces so no old UI remains necessary for staff work.

**Files:**

- Modify: `client/src/pages/ReportsPage.jsx`
- Modify: `client/src/pages/ActivityLogsPage.jsx`
- Modify: `client/src/pages/AccountsPage.jsx`
- Modify: `client/src/styles.css`
- Modify: `tests/apiRoutes.test.js` if payload expectations need stronger coverage.

- [ ] **Step 1: Replace Reports**

Use Staff-Friendly summary cards and lists backed by `/api/reports`:

- Total reservations.
- Court-hours booked.
- Reserved.
- Missed.
- Completed.
- Cancelled.
- Status totals.
- Top requesters.

Do not hardcode mock trends. Add richer charts only if data is computed from real reservations.

- [ ] **Step 2: Replace Activity Logs**

Use Staff-Friendly layout for:

- Search.
- Action filter.
- Date filter.
- Log list/table.
- Empty state.
- Error state.

- [ ] **Step 3: Replace Accounts**

Use Staff-Friendly layout for:

- Admin-only guard.
- Account creation.
- Local user list.
- Activate/deactivate controls.
- Current account protection.

Run:

```powershell
npm run frontend:build
npm test
```

Expected: reports, logs, and accounts are usable without old EJS pages.

---

## Task 9: Responsive, Offline, And Old-UI Cleanup Pass

**Purpose:** Make the replacement hold up as a complete product surface.

**Files:**

- Modify: `client/src/styles.css`
- Modify: `tests/reactFrontendStatic.test.js`
- Modify: `scripts/verify-ui-smoke.mjs`
- Modify: docs only if user-facing instructions mention old UI.

- [ ] **Step 1: Responsive pass**

Check:

- Login at narrow widths.
- Topbar wrapping.
- Sidebar/mobile navigation.
- Calendar no-overflow behavior.
- Tables/lists on mobile.
- Dialog/drawer sizing.
- Button text does not overflow.

- [ ] **Step 2: Offline static pass**

Confirm:

- No remote scripts.
- No remote fonts.
- No remote images.
- React build assets are local.
- Prototype-only browser globals are not required by the shipped app.

- [ ] **Step 3: Old UI cleanup**

Remove normal navigation to old pages. Update user-facing docs only if they point staff to old screenshots or flows.

Do not delete backend handlers needed for export, tests, or fallback unless covered by tests and clearly safe.

Run:

```powershell
npm run frontend:build
npm run verify:react-build
npm test
```

Expected: static checks enforce the replacement and no unsupported status language returns.

---

## Task 10: End-To-End Verification

**Purpose:** Prove the replacement works as a local offline app, not just as a frontend build.

- [ ] **Step 1: Run core checks**

Run:

```powershell
npm test
npm run verify:foundation
npm run verify:sql
npm run frontend:build
npm run verify:react-build
npm run verify:offline-runtime
npm run verify:bundle:strict
```

- [ ] **Step 2: Run live app/browser QA**

Start the local app and verify:

- Login invalid credentials.
- Login valid credentials.
- Home loads real data.
- New reservation creates `RESERVED`.
- Conflict suggestions appear for blocked slots.
- Calendar renders real schedule.
- Bookings list search/filter works.
- Detail drawer opens.
- Mark missed/cancel/done works.
- CSV export still downloads.
- Reports use real data.
- Accounts are admin-gated.
- Activity logs load.
- Logout returns to login.
- Mobile/narrow viewport has no major overflow.

- [ ] **Step 3: Package verification**

Run:

```powershell
npm run bundle:offline
npm run verify:bundle
npm run verify:bundle:strict
npm run verify:runtime-package
```

If a live database is running and configured, run:

```powershell
npm run verify:mysql
```

Expected: all required checks pass or any environmental blockers are documented with exact command output and next action.

---

## Completion Criteria

The implementation is complete only when:

- Staff-Friendly UI is the only normal user-facing app.
- Old EJS pages do not appear in normal staff navigation.
- Current backend statuses are preserved.
- New reservations save as `RESERVED`.
- `MISSED`, `CANCELLED`, and `COMPLETED` actions work.
- No pending/approval workflow is introduced.
- Every major screen is backend-backed.
- Offline/static checks pass.
- Main browser workflows are manually or automatically verified.
- The offline bundle still includes the replacement React app.

Do not mark this work complete based on visual similarity alone. The replacement must work against the real local system.
