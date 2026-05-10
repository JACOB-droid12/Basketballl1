# Prototype Offline Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use `C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html` as the visual and workflow foundation while keeping the reservation system fully offline and Windows/local-MySQL deployable.

**Architecture:** Keep the current Express + EJS + local MySQL implementation because it already satisfies the offline barangay-office target and has tests. Treat the supplied single-file HTML prototype as the UI source of truth for shell structure, visual tokens, Home/Schedule/Account workflow, schedule table/card anatomy, and status color language. Preserve required production screens that the prototype does not fully cover, such as reservation records, activity logs, backup/verification docs, and local setup scripts.

**Tech Stack:** Node.js, Express, EJS, local MySQL, PowerShell/Windows batch setup scripts, Node test runner, CSS.

---

## File Structure

- Modify `scripts/setup-barangay-office.ps1`: finish safe `.env` read/write quoting for local MySQL passwords.
- Modify `tests/oneClickSetup.test.js`: lock the PowerShell setup safety requirements and prototype setup expectations.
- Create `docs/PROTOTYPE_ALIGNMENT.md`: document how the HTML prototype maps into the production offline app.
- Modify `docs/REFERENCE_REVIEW.md`: reference the new prototype file and its role as the UI baseline.
- Modify `views/partials/navigation.ejs`: keep the prototype Home/Schedule/Account structure prominent while retaining production office tools.
- Modify `views/dashboard.ejs`: align the Home screen title/legend with the prototype.
- Modify `views/schedule/index.ejs`: keep the schedule screen visually closer to the prototype card-by-day schedule.
- Modify `public/css/styles.css`: align shared shell, colors, sidebar, schedule table, slot cards, and status visuals with the prototype.
- Modify `scripts/verify-ui-smoke.mjs`: update smoke markers for prototype-aligned visible text.
- Modify `docs/FIRST_USABLE_VERSION_AUDIT.md` and `docs/CODEX_HANDOFF.md`: record prototype alignment, offline-only correction, and verification results.

## Task 1: Stabilize One-Click Offline Setup Safety

**Files:**
- Modify: `tests/oneClickSetup.test.js`
- Modify: `scripts/setup-barangay-office.ps1`

- [ ] **Step 1: Write the failing setup-safety test**

In `tests/oneClickSetup.test.js`, make the `one-click PowerShell setup applies schema, seed, diagnostics, and live verification` test assert that `.env` values are encoded/decoded instead of written raw:

```js
  assert.match(script, /function Convert-ToEnvFileValue/);
  assert.match(script, /function Convert-FromEnvFileValue/);
  assert.match(script, /Convert-ToEnvFileValue \$Value/);
  assert.match(script, /Convert-FromEnvFileValue \$Parts\[1\]/);
  assert.doesNotMatch(script, /"\$Key=\$Value"/);
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run:

```powershell
npm test -- tests/oneClickSetup.test.js
```

Expected before implementation: one setup-safety assertion fails because `scripts/setup-barangay-office.ps1` still writes `"$Key=$Value"` directly.

- [ ] **Step 3: Implement quoted `.env` encoding/decoding in PowerShell**

In `scripts/setup-barangay-office.ps1`, update `Read-EnvFile` so parsed values are decoded:

```powershell
$Values[$Parts[0].Trim()] = Convert-FromEnvFileValue $Parts[1]
```

Add these helpers above `Set-EnvValue`:

```powershell
function Convert-FromEnvFileValue {
  param([string] $Value)

  $Text = $Value.Trim()

  if ($Text.Length -ge 2 -and $Text.StartsWith('"') -and $Text.EndsWith('"')) {
    $Inner = $Text.Substring(1, $Text.Length - 2)
    return $Inner.Replace('\"', '"').Replace('\\', '\')
  }

  return $Text
}

function Convert-ToEnvFileValue {
  param([string] $Value)

  if ($null -eq $Value) {
    return ""
  }

  $Text = [string] $Value
  if ($Text -match '^[A-Za-z0-9_./:@-]*$') {
    return $Text
  }

  $Escaped = $Text.Replace('\', '\\').Replace('"', '\"')
  return '"' + $Escaped + '"'
}
```

In `Set-EnvValue`, compute the encoded value once and write that instead of raw `$Value`:

```powershell
$EncodedValue = Convert-ToEnvFileValue $Value
```

Use:

```powershell
"$Key=$EncodedValue"
```

for both replacement and append cases.

- [ ] **Step 4: Verify setup script syntax and targeted test**

Run:

```powershell
powershell -NoProfile -Command "$null = [scriptblock]::Create((Get-Content -Raw -LiteralPath 'scripts\setup-barangay-office.ps1')); 'parse ok'"
npm test -- tests/oneClickSetup.test.js
```

Expected: `parse ok`, then 4 passing tests.

## Task 2: Record Prototype As The UI Baseline

**Files:**
- Create: `docs/PROTOTYPE_ALIGNMENT.md`
- Modify: `docs/REFERENCE_REVIEW.md`
- Test: `scripts/verify-foundation.mjs` only if it already tracks reference docs; otherwise use `rg` checks.

- [ ] **Step 1: Create prototype alignment document**

Create `docs/PROTOTYPE_ALIGNMENT.md` with this content:

```markdown
# Prototype Alignment

## Source

The UI baseline is the local prototype file:

`C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html`

This prototype is a single-file browser mockup. The production system keeps the same office-controlled workflow but implements it as an offline Express/EJS app backed by local MySQL.

## Prototype Elements To Preserve

- Red top header with one clear page title.
- Gold left sidebar with primary `Home` and `Schedule` actions.
- `Account` action pinned near the bottom beside the Barangay Sto. Niño logo.
- Tan workspace background.
- Home screen weekly schedule table with Sunday through Saturday columns.
- Week range selector centered above the schedule.
- Status color language:
  - Confirmed or Reserved: green-tinted schedule cell.
  - Completed: gray schedule cell or card.
  - Cleared or available public-use slots: light/yellow or open styling.
- Schedule screen organized by day, with clickable time cards.
- Reservation form opened from a selected schedule slot.
- Reservation detail screen focused on representative information.
- Account screen for logged-in account details, Admin account creation, and account management.

## Production Adjustments

- Residents still cannot book remotely; barangay personnel encode requests in person.
- The production app keeps extra office tools not shown as main prototype buttons: reservation records, activity logs, CSV export, print controls, backup/restore, and live MySQL verification.
- The final deployment target remains fully offline. It runs on a Windows barangay office computer with local Node.js and local MySQL.
- No cloud database, email/SMS, online payment, OCR, or resident self-service accounts are part of this version.
```

- [ ] **Step 2: Link prototype alignment from reference review**

Append this short note to `docs/REFERENCE_REVIEW.md`:

```markdown
## HTML Prototype Reference

The file `C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html` is now the UI baseline for shell layout, Home/Schedule workflow, account flow, status colors, and prototype-style form/detail screens. See `docs/PROTOTYPE_ALIGNMENT.md`.
```

- [ ] **Step 3: Verify the reference is searchable**

Run:

```powershell
rg -n "HTML Prototype Reference|Prototype Elements To Preserve|fully offline" docs\REFERENCE_REVIEW.md docs\PROTOTYPE_ALIGNMENT.md
```

Expected: matches in both docs.

## Task 3: Align Shared UI Shell And Schedule Screens

**Files:**
- Modify: `views/partials/navigation.ejs`
- Modify: `views/dashboard.ejs`
- Modify: `views/schedule/index.ejs`
- Modify: `public/css/styles.css`
- Modify: `scripts/verify-ui-smoke.mjs`
- Test: `tests/uiSmokeVerifier.test.js`

- [ ] **Step 1: Update UI smoke expectation for Home title**

In `scripts/verify-ui-smoke.mjs`, set the dashboard smoke marker to the prototype title:

```js
{ path: "/dashboard", expectedText: "Basketball Court Schedule" },
```

- [ ] **Step 2: Run UI smoke test to verify it fails until the view is aligned**

Run:

```powershell
npm test -- tests/uiSmokeVerifier.test.js
```

Expected before the dashboard text change: failure for `/dashboard` missing `Basketball Court Schedule`.

- [ ] **Step 3: Update navigation structure**

In `views/partials/navigation.ejs`, make `Home` and `Schedule` the primary visible nav, keep production tools in a smaller grouped section, and keep Account/logo at the bottom:

```ejs
<aside class="sidebar" aria-label="Main navigation">
  <nav class="nav-links">
    <a class="<%= active === 'dashboard' ? 'active' : '' %>" href="/dashboard">Home</a>
    <a class="<%= active === 'schedule' ? 'active' : '' %>" href="/schedule">Schedule</a>
    <div class="sidebar-tools" aria-label="Office tools">
      <a class="<%= active === 'reservations' ? 'active' : '' %>" href="/reservations">Reservations</a>
      <a class="<%= active === 'activityLogs' ? 'active' : '' %>" href="/activity-logs">Activity Logs</a>
    </div>
  </nav>
  <div class="sidebar-footer">
    <% const accountHref = typeof currentUser !== "undefined" && currentUser && currentUser.role !== "ADMIN" ? "/account/password" : "/account"; %>
    <a class="<%= active === 'account' ? 'active' : '' %>" href="<%= accountHref %>">Account</a>
    <img src="/images/barangay-logo.jpg" alt="Sto. Niño Barangay Council logo">
  </div>
</aside>
```

- [ ] **Step 4: Update dashboard title and legend**

In `views/dashboard.ejs`, replace the old long heading with:

```ejs
<h2 id="home-title">Basketball Court Schedule</h2>
```

Add this legend under the error message area and before the week selector:

```ejs
<div class="prototype-legend" aria-label="Schedule status legend">
  <span><i class="legend-dot reserved"></i> Reserved</span>
  <span><i class="legend-dot completed"></i> Completed</span>
  <span><i class="legend-dot available"></i> Available</span>
</div>
```

- [ ] **Step 5: Align CSS tokens and shell**

In `public/css/styles.css`, align the shared tokens and app shell with the prototype:

```css
:root {
  --barangay-red: #b53325;
  --barangay-red-dark: #8f291f;
  --barangay-gold: #d4872a;
  --barangay-gold-light: #d4872a;
  --slot-gold: #d4872a;
  --page-bg: #edd8bc;
  --panel-bg: #f2e2c8;
  --cream: #f2e2c8;
  --ink: #1a1a1a;
  --muted: #6f5d55;
  --line: #b53325;
  --table-line: #b53325;
  --confirmed-bg: #d4edda;
  --confirmed-text: #155724;
  --confirmed-border: #28a745;
  --completed-bg: #e0e0e0;
  --completed-text: #666;
  --cleared-bg: #fff9c4;
  --cleared-text: #7a6500;
  font-family: Lato, Arial, Helvetica, sans-serif;
}
```

Set `.mockup-topbar` to a compact 48px red header with white text, `.app-shell` to `grid-template-columns: 150px 1fr`, `.sidebar` to compact gold layout, `.sidebar a` to 14px rounded buttons, and `.sidebar-tools` to a smaller grouped office-tool area.

- [ ] **Step 6: Align schedule cards and weekly table**

In `public/css/styles.css`, keep weekly rows compact like the prototype and make `.slot-list` wrap day cards:

```css
.slot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.slot-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  width: min(240px, 100%);
  min-height: 118px;
  padding: 10px 14px;
  border: 2px solid var(--barangay-red);
  border-radius: 10px;
  background: var(--slot-gold);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.slot-row.available {
  background: var(--cream);
  color: var(--ink);
}
```

- [ ] **Step 7: Add legend styles**

In `public/css/styles.css`, add:

```css
.prototype-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
}

.prototype-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}

.legend-dot.reserved {
  background: var(--confirmed-bg);
  border: 1px solid var(--confirmed-border);
}

.legend-dot.completed {
  background: var(--completed-bg);
  border: 1px solid #aaa;
}

.legend-dot.available {
  background: #fff;
  border: 1px solid var(--table-line);
}
```

- [ ] **Step 8: Verify UI smoke**

Run:

```powershell
npm test -- tests/uiSmokeVerifier.test.js
npm run verify:ui
```

Expected: UI smoke tests pass and the verifier reports 11 office screens.

## Task 4: Final Verification, Bundle, And Handoff

**Files:**
- Modify: `docs/FIRST_USABLE_VERSION_AUDIT.md`
- Modify: `docs/CODEX_HANDOFF.md`

- [ ] **Step 1: Update audit and handoff**

Record these facts in both docs:

```markdown
- Corrected the requirement back to fully offline deployment after the temporary online wording was explicitly withdrawn.
- Added `docs/PROTOTYPE_ALIGNMENT.md` and used `C:\Users\Emmy Lou\Downloads\Sto. Nino Court Reservation System Prototype final.html` as the UI baseline.
- Aligned the shared shell, Home title/legend, compact sidebar, weekly schedule table, and schedule cards with the prototype while keeping production office tools available.
- Hardened one-click setup `.env` value writing so local MySQL passwords with spaces or special characters are quoted safely.
```

- [ ] **Step 2: Run final local checks**

Run:

```powershell
npm test
npm run verify:sql
npm run verify:foundation
npm run verify:ui
npm audit --omit=dev --json
git diff --check
```

Expected:

- `npm test` passes all tests.
- `npm run verify:sql` passes.
- `npm run verify:foundation` passes.
- `npm run verify:ui` passes for 11 office screens.
- `npm audit --omit=dev --json` reports zero production vulnerabilities.
- `git diff --check` passes, allowing only Windows line-ending warnings.

- [ ] **Step 3: Refresh and verify offline bundle**

Run:

```powershell
npm run bundle:offline
npm run verify:bundle
```

Expected: `dist\barangay-court-scheduler-offline` exists and contains required runtime, SQL, setup, docs, views, CSS, `node_modules`, and excludes `.env` and backups.

- [ ] **Step 4: Confirm live MySQL blocker remains explicit**

Run:

```powershell
npm run verify:prereqs
npm run verify:mysql
```

Expected in this sandbox: both fail in the controlled way because `mysql`, `mysqldump`, or local MySQL server are unavailable. Do not mark the whole goal complete until live MySQL is verified on a machine with local MySQL installed.

## Self-Review

- Spec coverage: The plan covers the supplied prototype as UI baseline, the corrected fully offline requirement, Windows/local setup, current partial setup-safety changes, UI alignment, docs, tests, and bundle verification.
- Placeholder scan: No `TBD`, `TODO`, or vague "add tests" steps remain.
- Type and name consistency: File paths match the current Express/EJS app and existing test/verifier commands.
