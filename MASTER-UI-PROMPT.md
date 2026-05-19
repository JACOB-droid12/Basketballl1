# MASTER PROMPT
## Basketball Court Scheduling System — Barangay Sto. Niño, Parañaque City
### Direction: **Modern & Premium** — a single committed aesthetic, executed with precision.

> You are a senior product designer for a premium civic tool. Your brief is to design a refined, production-grade interface for an **offline** basketball court scheduling system used daily by barangay staff. Commit to one modern-premium language across every screen. Execute it with the restraint, typographic care, and detail-obsession of a considered product studio — not a SaaS template.

---

## 0 — THE ANTI-BRIEF

Modern-premium is NOT:

- Inter, Roboto, Arial, Poppins, or Space Grotesk
- Purple-to-blue gradients, glassmorphism, "frosted" blurs, floating orbs
- Dark mode with neon cyan accents
- Stock hero illustrations of a basketball player or a barangay seal
- "Welcome back, Admin 👋" greeting banners
- Emoji in status chips, notification bells on an offline system, random sparklines
- Oversized rounded cards (20px+ radius) piled on a gray background
- 14 icons in the sidebar when only 6 screens exist
- Generic analytics widgets copied from a dashboard template
- Copy that sounds generated ("Seamlessly manage your reservations…")

If screenshots of this UI could appear unchanged on a crypto dashboard, a CRM, and a fitness app — the brief has failed.

Modern-premium **is**:

- Editorial discipline. Typography carries the design, not decoration.
- Generous whitespace, strict grid, tabular numerics, hairline rules.
- One signature accent color, used rarely and meaningfully.
- Motion that is subtle, fast, and purposeful — never showy.
- Every pixel has a reason.

---

## 1 — PRODUCT FACTS (Non-Negotiable)

| | |
|---|---|
| Name | Barangay Sto. Niño Basketball Court Scheduling System |
| Location | Parañaque City, Metro Manila, Philippines |
| Deployment | **Offline**, single desktop in the barangay office |
| Primary users | Barangay Admin, Barangay Staff (non-technical, 25–55 y/o) |
| Beneficiaries | Residents, youth orgs, sports groups, officials |
| Court | One ("Main Court"), operating ~06:00–22:00 daily |
| Display target | 1366×768 and 1920×1080 Windows monitors |
| Input | Mouse + keyboard (tablet as secondary consideration) |
| Language | English primary, light Filipino in sample data |

Residents cannot self-book. Staff encode on their behalf after a walk-in or phone call.

---

## 2 — ROLES

**Admin** — full access: reservations, user accounts, activity logs, settings.
**Staff** — reservations only: check availability, encode, update status, view records.

---

## 3 — DATA MODEL (Exact Field Names)

**Reservation:** `id`, `date`, `start_time`, `end_time`, `party_name`, `representative`, `contact_no`, `address`, `purpose`, `participants`, `status`, `encoded_by`, `created_at`, `updated_at`, `notes`.

`status ∈ { Reserved, Pending, Completed, Missed, Cancelled, Maintenance }`
`purpose ∈ { Practice, Game, League, Training, Open Play, Event, Community Activity, Maintenance }`

**User:** `full_name`, `username`, `password_hash`, `role ∈ { Admin, Staff }`, `active`, `last_login`.

---

## 4 — THE AESTHETIC DIRECTION

### 4.1 Concept in one sentence
> A quiet, confident civic tool — the feel of a premium scheduling product crossed with the dignity of a well-made municipal form. Warm light surfaces. Editorial serif display for identity. Precision sans for interface. One signature accent.

### 4.2 Typography — commit exactly

- **Display (page titles, numeric heroes, brand):** **Fraunces** — Opsz 144, weights 400 & 500. Tabular figures ON. Use the *Soft* variation for civic warmth.
- **Interface (body, forms, tables, buttons, nav):** **Söhne** (or fallback **Neue Haas Grotesk Display**). Weights 400 & 500 only.
- **Mono (IDs, times, counts, contact numbers):** **Söhne Mono** or **JetBrains Mono**. Always tabular.

Never mix in a third display family. Never use italic for UI chrome. Labels in uppercase use tracking 0.06em.

Type scale (px / line-height):
- Display L · 56 / 60 — dashboard numerals
- Display M · 40 / 44 — page titles
- Display S · 28 / 32 — section titles
- Body L · 17 / 26 — form fields, primary reading
- Body M · 15 / 22 — table rows, default UI
- Body S · 13 / 18 — captions, metadata
- Mono · 13 / 18 — data, times, IDs
- Label · 11 / 14, tracking 0.08em, uppercase — eyebrow labels

### 4.3 Color Tokens (CSS variables, hex — use verbatim)

**Surface**
- `--paper: #F7F5F0` (warm off-white background)
- `--surface: #FFFFFF` (cards, panels)
- `--inset: #F1EEE8` (subtle insets, empty cells)

**Ink**
- `--ink: #14161A` (primary text, near-black)
- `--ink-2: #3A3E45` (secondary text)
- `--ink-3: #72777F` (tertiary, metadata)
- `--ink-4: #A6A9AE` (disabled, placeholders)

**Rule & Border**
- `--rule: #E6E2D8` (default hairline)
- `--rule-strong: #1A1C20` (emphasis hairline, always 1px)

**Signature Accent (used sparingly — primary CTA, active states, brand mark)**
- `--accent: #0F3D2E` (deep forest green)
- `--accent-hover: #0A2E22`
- `--accent-contrast: #F7F5F0`

**Status (muted, never neon)**
- `--reserved: #1E3A5F`
- `--pending: #8A6414`
- `--completed: #2F6B4A`
- `--missed: #8A2A1F`
- `--cancelled: #7A7A7A`
- `--maintenance: #3F3D38`
- Each status also has a `-soft` tint at 10% luminance for block fills: `--reserved-soft`, `--pending-soft`, etc.

No purple. No gradients. No pure black. No pure white as the page background.

### 4.4 Space, Grid, Geometry

- Baseline grid: **8px**. 4px permitted only for chip and icon-to-text gaps.
- Page grid: 12 columns, 24px gutter, max content width 1320px, side margins 48px.
- Card radius: **10px** — commit and hold. Buttons: **8px**. Chips: **4px**.
- Borders: 1px `--rule` on cards and tables. No box-shadows for elevation — use hairlines and background contrast instead. Exception: 0 1px 0 `--rule` beneath the app header.
- Negative space over ornament. Cards breathe (24px padding minimum, 32px on hero cards).

### 4.5 Components

- **Buttons:** Primary = `--accent` fill, Söhne 500, 40px height, 16px horizontal padding, 8px radius. Secondary = 1px `--ink` border on `--surface`, same geometry. Ghost = text-only with animated underline on hover. No shadows.
- **Inputs:** 1px `--rule` border, 44px height, label-above in Label style, helper text Body S `--ink-3`. Focus = 2px `--accent` ring offset 1px. Error = `--missed` border + helper.
- **Status chips:** filled soft tint + solid text color + short label (e.g., "Reserved"). Never color-only; always labeled.
- **Tables:** row height 56px, hairline row rules, hover row fills with `--inset`. Tabular numerics for all numeric columns.
- **Nav:** left sidebar, 240px wide, `--paper` background, hairline right rule. Nav items 40px tall. Active item = 2px left `--accent` bar + `--ink` text. No icons-only mode.
- **Modals:** centered 560px wide, 24px padding, hairline border, `--surface` background, scrim `--ink` at 24%.

### 4.6 Motion

- Default easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Default duration: **180ms** for micro, **280ms** for panels
- Page load: hero elements stagger in at 60ms intervals (opacity + 6px translate up)
- Hover on table rows: 120ms background shift
- Modal: fade + 8px translate up, 240ms
- Schedule time blocks: 200ms ease-out on state change (color + soft tint cross-fade)
- Respect `prefers-reduced-motion: reduce` — collapse all durations to 0ms and remove translate
- One **signature** motion: the **"Now" line** — a 1px `--accent` line across the Schedule Calendar marking the current time, with the current time label in mono on its right. It pulses at 4s cadence at 20–40% opacity.

### 4.7 Illustrative Detail — the premium touches
- Tabular numerics everywhere numbers appear
- Ligatures ON for Fraunces display titles
- A hairline 1px `--rule-strong` anchors the top of every page, beneath the breadcrumb
- Dates rendered editorially: "Wed · 13 May 2026" — not "5/13/2026"
- Times rendered with a thin spacer: "08:00 – 10:00" using en-dash + hair space
- Empty schedule cells use `--inset` fill with a single 1px dotted rule at the half-hour mark
- The primary CTA carries a Mono right-aligned keyboard hint (e.g., `N` for New Reservation)

---

## 5 — SCREENS

### 5.1 Login
- Centered 400px card on `--paper`
- Fraunces M title: "Barangay Sto. Niño Basketball Court Scheduling System" — two lines, tight leading
- Söhne caption: "Parañaque City"
- Inputs: Username, Password
- Primary button: "Log In" (full-width)
- Footer micro-row: `● Offline System` chip (left) · "Data stored locally on this device." Body S muted (right)
- No forgot-password, no sign-up, no social login, no imagery

### 5.2 Dashboard
- Left sidebar persistent
- Topbar: page title "Today" in Display M + editorial date string + user menu
- Four summary tiles in a row (not five — restraint):
  - `RESERVATIONS TODAY` · Display L numeral · small delta note
  - `AVAILABLE SLOTS` · Display L numeral
  - `NEXT AVAILABLE` · mono time range
  - `PENDING` · Display L numeral
- Below: compact horizontal timeline strip for today (06:00 → 22:00), status-colored soft blocks with labels
- Below that: "Upcoming" list — next 4 reservations as single-line rows with time · party · purpose · status chip
- Single primary CTA top-right: "New Reservation" with `N` keyboard hint
- No charts, no widgets, no greetings

### 5.3 Schedule Calendar *(the hero screen)*
- Day view default; toggle for Week
- Left column: hours 06:00 → 22:00 in Fraunces M, tabular, right-aligned, with hairline rule dividing each hour
- Main column: 30-min grid, blocks render as `--status-soft` fills with a 2px left bar in solid `--status` color
- Block content: party name in Body M 500, purpose Body S `--ink-3`, time range mono Body S
- Empty cells: `--inset`, clickable, hover reveals a hairline border + faint "Click to reserve" hint in Body S
- The **"Now" line** cuts across the grid in `--accent` with the current time labeled
- Top bar: date picker, Day/Week toggle, filter button, "New Reservation" primary
- Clicking a block opens a right-hand detail panel (360px), NOT a modal — panel slides in 280ms, contains full reservation info and actions (Edit, Cancel, Mark Completed, Mark Missed)

### 5.4 Create Reservation
- Opens as a right-side panel (480px) on top of whatever screen invoked it — keeps context
- Three labeled sections with generous spacing:
  1. **Schedule** — date picker, start time, end time, "Check Availability" ghost button
  2. **Party** — name, representative, contact, address
  3. **Details** — purpose (select), participants (number), notes (textarea)
- The **availability result** renders inline between Schedule and Party:
  - Available — 1px `--completed` rule + label "Slot available" in `--completed`
  - Conflict — 1px `--missed` rule + "Slot taken by [Name] · [Purpose] · [Time]"
  - Suggestion — beneath conflict, a card offering the nearest free slot with an "Use this slot" mini-button that pre-fills the fields
- Footer: "Cancel" ghost + "Save Reservation" primary, right-aligned
- Required fields marked with a subtle `*` in `--ink-3`, validated on blur

### 5.5 Reservation Records
- Full-width table
- Filters bar above: date range, status multi-select, purpose multi-select, search
- Columns: `ID` (mono), `Date` (editorial), `Time` (mono), `Party`, `Purpose`, `Status` (chip), `Encoded By`, row action menu
- 56px rows, hairline rules, hover fill with `--inset`
- Row click opens the right-hand detail panel (same panel pattern as Schedule)
- Pagination: "← Previous · Page 1 of 12 · Next →" in Söhne, tabular page count
- Export action: "Print Records" ghost button top-right (opens a print-friendly stylesheet, not a PDF)

### 5.6 Account Management *(Admin only)*
- User table: `Full Name`, `Username`, `Role`, `Status`, `Last Login` (mono), row actions (Edit, Deactivate, Reset Password)
- Primary CTA: "New Account"
- Create panel (right-side, 480px): Full name, Username (with live uniqueness check), Password, Confirm Password, Role toggle (Admin / Staff)
- No email, no avatar, no MFA — offline system

### 5.7 Activity Logs
- Chronological list, read-only
- Each entry: mono timestamp · actor username · action verb · affected record
- Example: `2026-05-13 14:32` · `mvillanueva` · Marked as Missed · `RSV-00124`
- Filters: date range, user, action type
- No mutation controls of any kind

---

## 6 — UX FLOW THE UI MUST EXPRESS

```
Resident walks in → Staff opens Schedule → Staff checks date + time
                                                │
            ┌─────── AVAILABLE ─────────────────┼──────── CONFLICT ────────┐
            ▼                                   ▼                           ▼
      Click empty cell          See who holds the slot        System suggests nearest free slot
      Panel opens pre-filled    See purpose and time          Shown inline with "Use this slot"
      Staff fills party info                                  One click accepts the suggestion
      Save
            ▼                                                          ▼
      Block appears on grid                                    Staff continues in the same panel
            ▼
      Later: Mark Completed / Missed / Cancelled / Edit from the detail panel
```

The **conflict → nearest-slot suggestion** is the single most important interaction. Design and animate it with care.

---

## 7 — REALISTIC SAMPLE DATA (Use Verbatim)

**Users**
- Admin — Emmy Lou Reyes · `ereyes` · last login 2026-05-13 08:12
- Staff — Mark Anthony Villanueva · `mvillanueva` · last login 2026-05-13 07:58
- Staff — Jessa Mae Gonzales · `jgonzales` · last login 2026-05-12 17:04

**Today's schedule — Wed · 13 May 2026**

| Time | Party | Purpose | Status |
|---|---|---|---|
| 06:00 – 08:00 | Juan Dela Cruz | Morning Practice | Completed |
| 08:00 – 10:00 | Team Solid | League Game | Reserved |
| 10:00 – 12:00 | — | — | Available |
| 13:00 – 15:00 | SNBC Youth Team | Training | Reserved |
| 15:00 – 17:00 | Maria Santos | Community Activity | Pending |
| 17:00 – 19:00 | Purok 3 Ballers | Inter-Purok Practice | Reserved |
| 19:00 – 21:00 | Brgy. Maintenance | Court Maintenance | Maintenance |

**Contacts:** `0917 412 8834`, `0956 228 1190`, `0998 714 5023`
**Addresses:** Purok 1 Sto. Niño · 42 Sto. Niño St. · Blk 7 Lt 12 Purok 3

---

## 8 — OFFLINE SIGNALS

- Login: `● Offline System` chip in `--completed` + caption "Data stored locally on this device."
- App footer: persistent one-line status — "Offline System · Local Database · v1.0" in Body S `--ink-3`
- No cloud icons, no sync spinners, no Share buttons, no email fields, no notification bells

---

## 9 — ACCESSIBILITY FLOOR

- Contrast ≥ WCAG AA for all text and status indicators against their backgrounds
- Every status encoded by **more than color** — always a text label, often a left-bar or pattern
- Full keyboard navigation across the Schedule Calendar (arrow keys move across slots, Enter opens, N creates)
- Custom focus states in `--accent` with 2px ring, offset 1px — never default browser outline
- Target size ≥ 40×40px
- `prefers-reduced-motion` respected

---

## 10 — FINAL QUALITY GATE

Every item must pass:

- [ ] A non-technical 45-year-old staff member can complete a reservation in under 90 seconds
- [ ] The Schedule Calendar is legible from 2 feet on a 1366×768 monitor
- [ ] The conflict → nearest-slot flow is the most polished interaction in the product
- [ ] No element exists that doesn't help manage the court
- [ ] Typography is Fraunces + Söhne + Söhne/JetBrains Mono — no Inter, Roboto, Poppins, Space Grotesk, Arial
- [ ] No purple gradients, no glassmorphism, no decorative orbs, no faux-3D
- [ ] Numbers are tabular everywhere; times use en-dash; dates are editorial
- [ ] The accent `--accent: #0F3D2E` appears only on primary CTAs, active nav states, the "Now" line, and the brand mark
- [ ] Sample data is the exact data above
- [ ] Offline status is communicated at least once per session
- [ ] The design could be screenshotted, printed, and framed in the barangay office without embarrassment

---

## 11 — DELIVERABLE

Produce working frontend code (choose React + Motion **or** vanilla HTML/CSS/JS — commit to one):

```
/app
  index.html            ← Login
  dashboard.html
  schedule.html
  reservation-new.html
  records.html
  accounts.html
  logs.html
  styles/
    tokens.css          ← all CSS variables from §4.3
    base.css            ← reset, typography, grid
    components.css      ← buttons, inputs, chips, tables, panels
    motion.css          ← transitions + keyframes
  scripts/
    app.js              ← panel open/close, filters, availability check
    data.js             ← sample data verbatim from §7
  fonts/                ← self-hosted Fraunces + Söhne (or fallbacks)
  README.md             ← one-page rationale + setup notes
```

Ship one cohesive, premium, implementable system. Not five variants. Not a mood board. A real product.

---

*End of Master Prompt · Modern & Premium · Barangay Sto. Niño Basketball Court Scheduling System*
