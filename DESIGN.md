---
name: Barangay Sto. Niño Court Scheduler
description: Offline staff-friendly reservation system for the Barangay Sto. Niño basketball court.
colors:
  warm-office-bg: "#F6F4EE"
  paper-surface: "#FFFFFF"
  muted-paper: "#F0ECE3"
  civic-blue: "#0B4A6F"
  civic-blue-deep: "#083A57"
  civic-blue-soft: "#DCEAF2"
  civic-blue-softer: "#EFF5F8"
  court-orange: "#C85C1C"
  court-orange-soft: "#FDEEDE"
  court-orange-strong: "#A14816"
  court-orange-warm: "#FFCCA0"
  on-accent: "#FFFAF2"
  success-green: "#1F7A43"
  success-soft: "#DEF0E3"
  warning-gold: "#B4761A"
  warning-soft: "#FBEFCF"
  danger-red: "#B83B2A"
  danger-soft: "#FADEDA"
  ink: "#1F2937"
  ink-secondary: "#3F4754"
  ink-muted: "#6B7280"
  border: "#DCD6C7"
  border-strong: "#B9B19E"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, Times New Roman, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Instrument Serif, Georgia, Times New Roman, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  pill: "100px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.civic-blue}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.civic-blue-deep}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-primary-large:
    backgroundColor: "{colors.civic-blue}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.md}"
    padding: "0 28px"
    height: "64px"
  button-light:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.danger-red}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "54px"
  status-badge:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  nav-item-active:
    backgroundColor: "{colors.civic-blue-softer}"
    textColor: "{colors.civic-blue}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "68px"
---

# Design System: Barangay Sto. Niño Court Scheduler

## 1. Overview

**Creative North Star: "The Barangay Desk Ledger"**

This system reads like a well-organized barangay office ledger translated to a screen: warm paper surfaces, civic blue for official action, a court-orange accent for local identity, large readable controls, and labels that speak to staff instead of software specialists. It is a product surface, not a campaign. The design serves the scheduling workflow and stays calm even when conflicts, missed bookings, and approvals demand attention all at once.

The persistent left sidebar, 17px body text, 48px minimum control height, and bilingual helper text (Filipino italic underneath English) carry the staff-friendly direction. Instrument Serif appears only at orientation moments (page titles, hero stats, section heads), giving each screen a small civic formality before Inter takes over for the working surfaces. Status colors are always paired with words.

The system explicitly rejects the previous prototype's claustrophobic cream-and-red spreadsheet feel, public startup landing-page polish, sports-entertainment energy, dark command-center dashboards, tiny admin-table density, and any cloud-booking language that implies residents reserve remotely.

**Key Characteristics:**
- Warm office-paper background (`#F6F4EE`) with white card surfaces and civic blue (`#0B4A6F`) for primary action.
- 17px body baseline, 48px minimum standard controls, 64px for the main screen action.
- Persistent left sidebar with large labeled targets, 44px icon wells, and visible active state.
- Status pills paired with words, never relying on color alone.
- Borders and tonal surfaces do most structural work; shadows reserved for overlays and hover lift.
- Short, functional motion only: 120 to 160ms transitions on hover, focus, dialogs, and skeleton shimmer.

## 2. Colors

A restrained civic-office palette: warm paper neutrals carry the surfaces, civic blue carries action and identity, court orange carries local accent, and a clear set of operational status colors carries reservation state. Implementation maps these descriptive token names to CSS custom properties (`civic-blue` is `--primary`, `warm-office-bg` is `--bg`, etc.) in `client/src/styles.css`.

### Primary
- **Civic Blue** (`#0B4A6F`): Primary actions, active navigation labels and icon wells, topbar background, hero card, selected duration/time chips, calendar today-marker, primary button background.
- **Civic Blue Deep** (`#083A57`): Primary button hover only. Never appears as a default surface or text color.
- **Soft Civic Blue** (`#DCEAF2`): Selected table rows, focus ring tint, info banner border.
- **Softer Civic Blue** (`#EFF5F8`): Active nav row background, hover state for booking rows and quick actions, sidebar help panel, attention-count panel, info banner background.

### Secondary
- **Court Orange** (`#C85C1C`): User avatar background, login illustration accent. The basketball-court identity color, used sparingly so it never competes with primary action.
- **Court Orange Strong** (`#A14816`): Eyebrow and page-kicker text only. A darker variant tuned for 12px legibility on the warm-cream background; 700 weight, 0.04em letter-spacing.
- **Court Orange Warm** (`#FFCCA0`): The italic emphasis color inside the login marketing headline (`<em>Maligayang pagdating</em>`). Used exactly once.
- **On Accent** (`#FFFAF2`): The text color riding on top of Court Orange surfaces (avatar initials). A warm off-white that holds the cream tone instead of going pure white.
- **Court Orange Soft** (`#FDEEDE`): Reserved for the Barangay seal-on-blue treatment; not used as a surface tint elsewhere.

### Tertiary
- **Success Green** (`#1F7A43`) on **Success Soft** (`#DEF0E3`): Approved, completed, and positive confirmation.
- **Warning Gold** (`#B4761A`) on **Warning Soft** (`#FBEFCF`): Pending, attention-required, conflict warning. The attention-reason chip uses warning-soft with a darker text (`#6D4A0D`) for reading contrast.
- **Danger Red** (`#B83B2A`) on **Danger Soft** (`#FADEDA`): Missed, cancelled, declined, destructive intent.

### Neutral
- **Warm Office Background** (`#F6F4EE`): Main app background. Carries the paper feeling.
- **Paper Surface** (`#FFFFFF`): Cards, forms, tables, dialogs, top-level panels.
- **Muted Paper** (`#F0ECE3`): Hover rows, secondary panels (table headers, action-code chips, dialog feet, form footers), icon wells for non-active nav, lock chip.
- **Ink** (`#1F2937`): Primary text.
- **Ink Secondary** (`#3F4754`): Body copy inside info banners and other contained reading surfaces.
- **Ink Muted** (`#6B7280`): Secondary labels, Filipino helper italics, timestamps, metadata, table column labels.
- **Office Border** (`#DCD6C7`): Dividers, card borders, input strokes, table rules.
- **Office Border Strong** (`#B9B19E`): Hover and focus border lift on light buttons.

### Named Rules

**The Blue Means Action Rule.** Civic Blue is reserved for primary intent, active navigation, and confirmed selected states. Do not spend it on decoration, illustration, or default body copy.

**The Status Must Read Rule.** Never rely on color alone. Every status pill, calendar block, and table row state must carry text or an icon alongside its color. The `status-badge` primitive bakes this in: a colored dot precedes a labeled word.

**The Court Orange Sparingly Rule.** Court Orange (`#C85C1C`) appears in three places only: the page eyebrow line, the user-chip avatar, and the login serif "em" accent. It does not serve as a button background, an alert color, or a decorative surface tint.

## 3. Typography

**Display Font:** Instrument Serif (with Georgia, Times New Roman, serif fallbacks). Self-hosted from `client/public/fonts/InstrumentSerif-{Regular,Italic}.woff2` under SIL Open Font License. Loaded with `font-display: swap`; Regular is preloaded in `index.html` for instant rendering.
**Body Font:** Inter (with system-ui, Segoe UI, Arial, sans-serif fallbacks). Self-hosted from `client/public/fonts/Inter-{Regular,Medium,SemiBold,Bold}.woff2` under SIL Open Font License. Loaded with `font-display: swap`; Regular is preloaded.

**Character:** Instrument Serif gives orientation moments a local civic formality, the kind of typography you see on barangay seals and certificates. Inter does the working UI: fast, clear, low reading effort for staff who navigate the same screens dozens of times a shift. The pairing is restrained on purpose. Serif appears only at the moment of orientation (page title, hero number, card head); Inter takes over the moment work starts.

### Hierarchy
- **Display** (Serif, 400, 40 to 64px clamp, 1 line-height): Login marketing headline (`clamp(48px, 5vw, 64px)`), home dashboard headline (`clamp(40px, 5vw, 58px)`), staff page-head titles (`clamp(36px, 5vw, 44px)`), report summary numbers (`56px`), attention-count number (`46px`), home-hero number (`80px`).
- **Headline** (Serif, 400, 26 to 36px, 1.05 to 1.1 line-height): Hero card title (`36px`), staff filter head (`28px`), dialog head (`30px`), card title (`26px`).
- **Title** (Inter, 700, 18 to 22px, 1.1 to 1.35 line-height): Card-head h2 (`22px`), card-section-head h2 (`22px`), booking row name (`18px`), nav label (`16px/700`), brand title (`19px`).
- **Body** (Inter, 400 to 600, 17px, 1.5 line-height): General copy, helper text, drawer descriptions, info banners. Cap reading lines at 75ch.
- **Label** (Inter, 600 to 700, 12 to 14px, 1.25 line-height, 0.06em letter-spacing on uppercase): Table column headers, eyebrow, page-kicker, status badge text, nav helper text (`13px/normal`), date-field label, status-account-* badges.

### Named Rules

**The Staff Can Read It Rule.** Working text never drops below 14px. Forms, cards, and navigation stay at 16px or larger. The body baseline is 17px and that is the floor, not the ceiling.

**The Title Has a Job Rule.** Use Instrument Serif only for orientation and emphasis (page titles, hero numbers, card heads, section heads inside the reservation form, calendar day numbers). Never inside dense tables, repeated metadata, button labels, badges, or table cells.

**The Bilingual Italic Rule.** Filipino helper text appears as `font-style: italic` muted Inter at 13 to 14px directly under the English label, prefixed with `· ` in field labels. It is never the primary label and never replaces the English label. Pattern: `<span>English Label <span class="fil">· Tagalog Label</span></span>`.

## 4. Elevation

The system is flat-by-default with bordered surfaces. Shadows are reserved for surfaces that float, move, or block the page. Tonal layering (paper-surface on warm-office-bg, muted-paper for inset zones) does the day-to-day depth work.

### Shadow Vocabulary
- **Shadow Sm** (`0 1px 2px rgba(15, 30, 60, 0.06)`): Subtle contained surfaces when a border alone is not enough.
- **Shadow Md** (`0 4px 14px rgba(15, 30, 60, 0.10)`): Calendar toolbar, staff day cards (resting elevation), hover lift on form cards.
- **Shadow Lg** (`0 24px 60px rgba(15, 30, 60, 0.18)`): Reservation drawer, dialogs, blocking confirmations.
- **Detail Panel Shadow** (`0 10px 28px rgba(32, 35, 38, 0.08)`): The sticky reservation detail rail beside lists.

### Named Rules

**The Border First Rule.** Use 1px Office Border and tonal layers for normal structure. Use shadows only when the surface floats above the page (drawer, dialog, sticky detail), moves (hover lift on form cards), or signals a major rest state (calendar toolbar, day card).

**The No Glass Rule.** Backdrop blur and translucent glass surfaces are not part of this system. Backdrops behind dialogs use opaque dark fill (`rgba(15, 30, 60, 0.5)`) or muted-ink fill (`rgba(32, 35, 38, 0.46)`), never `backdrop-filter`.

## 5. Components

### Buttons
- **Shape:** 10px radius, 2px transparent border at rest, transition `background 160ms ease, border-color 160ms ease, color 160ms ease`.
- **Primary** (`.btn-primary`): Civic Blue background, white text, 48px min-height, 0 20px padding, 16px/700 Inter, gap 8px for icon-text pairs. Hover darkens to Civic Blue Deep. Focus shows a 3px Civic Blue ring at 32% opacity, offset 3px, plus a stronger border.
- **Large Primary** (`.btn-big`): 64px min-height, 0 28px padding, 18px font, 100% width on mobile. The main action of a screen (Save Reservation, New Reservation, Approve).
- **Light** (`.btn-light`): Paper Surface background, Office Border, ink text. The neutral secondary action. On the topbar (over Civic Blue), it inverts to translucent white-on-blue.
- **Danger** (`.btn-danger`): Paper Surface background, Danger Red text, Danger Red border, hover fills Danger Soft. Destructive action stays visible without competing visually with primary.
- **Disabled:** opacity 0.72, cursor not-allowed, no hover treatment.

### Status Badges (Pills)
- **Shape:** Pill (100px radius), 30px min-height, `0 12px` padding, 1px Office Border, gap 7px.
- **Construction:** A 8x8px filled circle (`::before`) precedes a 12px/600 label word. Color comes from the variant, label always present.
- **Variants:** `status-available` (success), `status-reserved` (civic-blue-soft on civic-blue-soft border, civic-blue-deep text), `status-missed` and `status-cancelled` (danger), `status-completed` (civic-blue-softer surface, civic-blue text), `status-account-active`, `status-account-inactive`.

### Staff Page Header
- **Component:** `client/src/components/StaffPageHeader.jsx`.
- **Construction:** Renders the shared `page-header page-head staff-page-head` wrapper, optional `page-kicker`, required `page-title`, optional `page-sub`, optional Filipino helper copy, and an optional action cluster.
- **Use When:** A staff task page needs the standard orientation block at the top of the screen. Right-side actions should be passed as a `button-row`, preserving the 48px / 64px button vocabulary.
- **Do Not Use For:** Print-only document headers that need semantic `<header>` markup, modal headers, or compact card headings.

### Card Section Header
- **Component:** `client/src/components/CardSectionHeader.jsx`.
- **Construction:** Renders the shared `card-section-head` wrapper with an `h2`, optional id, and optional caption span.
- **Use When:** A `card padded-card` starts with a section title plus one supporting sentence. This is the default for report cards and other repeated analysis sections.
- **Do Not Use For:** Dense table column labels, filter-card heads, modal titles, or one-off hero/stat blocks.

### Cards / Containers
- **Corner Style:** 10px radius for standard cards (`.card`, `.stat-card`, `.padded-card`); 12px for staff day cards and calendar toolbar; 14px for hero cards and dialogs.
- **Background:** Paper Surface for primary cards; Muted Paper for grouped inner zones (table headers, dialog feet, form footers, attention-count rest state); Civic Blue for hero card and active calendar day-head.
- **Shadow Strategy:** Flat with 1px Office Border at rest. Calendar toolbar and staff day cards carry shadow-md as their resting state. Form-card and detail-panel use the lighter detail-panel shadow.
- **Internal Padding:** 20px standard (`.padded-card`); 22px for stat-card and attention-panel; 32px for hero-card; 24px 28px for dialog body.

### Inputs / Fields
- **Shape:** 10px radius, 2px Office Border, 54px min-height, 14px 16px padding, 17px Inter.
- **Construction:** A `<label class="field staff-field">` wraps an Inter 600 16px label, an optional muted italic Filipino sibling, an optional 14px/600 muted hint line, the input itself, and (when present) a 13px/600 Danger Red error line under the field with `role="alert"`.
- **Focus:** 2px Civic Blue border with a 4px Soft Civic Blue glow ring (`box-shadow: 0 0 0 4px var(--primary-soft)`).
- **Error:** 13px Danger Red text below the input. The input border itself remains Office Border; the error message and `aria-invalid="true"` carry the state.
- **Date input** (`.date-input`): Same shape, 8px radius, 48px min-height, white background, ink text, 700 weight.
- **Search input** (`.search-input .input`): Same as standard, with 48px left padding to clear an absolutely positioned 24x24 search icon at 14px from the left edge.

### Time Chips and Duration Picker
- **Shape:** 10px radius, 2px Office Border, 60px min-height, 16px/600 Inter, centered text.
- **Default:** Paper Surface, ink text.
- **Hover:** Civic Blue border, Softer Civic Blue background.
- **Selected:** Civic Blue border and background, white text, plus a small "Selected" caption rendered via `::after` at 11px/500.
- **Busy/Disabled:** Muted Paper background, Ink Muted text, dashed border, plus a "Booked" caption in Danger Red rendered via `::after`.

### Sidebar Navigation
- **Item shape:** 10px radius, 2px transparent border, 68px min-height, 14px 16px padding, three-column grid (`44px | 1fr | auto`).
- **Default:** Transparent background, Ink label, Ink Muted helper text, Muted Paper icon-well with Ink stroke.
- **Hover:** Muted Paper background.
- **Active:** Soft Civic Blue border, Softer Civic Blue background, Civic Blue label, white-on-civic-blue icon well. `aria-current="page"` is set on the active item.
- **Mobile (≤820px):** Sidebar becomes a horizontal scroll strip; nav-item shrinks to 60px height with a 36px icon well.

### Dialogs and Drawers
- **Confirm dialog:** Paper Surface card, `min(440px, 100%)` width, 14px radius, 22px padding. Body uses ceremonial centering: 72px circular icon well (variant-tinted: ok=success-soft, warn=warning-soft, danger=danger-soft, default=civic-blue-soft), 30px Instrument Serif title, 17px Ink Secondary body. Foot uses Muted Paper background with right-aligned actions.
- **Reservation drawer:** Paper Surface card, `min(620px, 100%)` width, 16px radius, max-height `92vh`. Head uses 30px serif title, body uses a two-column detail grid (150px label / flex value), foot uses Muted Paper with a 130px min-width on action buttons.
- **Backdrops:** `rgba(15, 30, 60, 0.5)` for the drawer backdrop, `rgba(32, 35, 38, 0.46)` for the dialog backdrop. No blur. Z-index: 20 for dialog, 50 for drawer, 90 for confirm dialog.

### Empty / Loading States
- **State Card:** Paper Surface, 10px radius, 1px Office Border, 32px padding, centered, 220 to 260px min-height. 52px circular `state-mark` icon well, 28px Instrument Serif title, 17px ink-muted body capped at 560px.
- **Loading mark:** 5px Soft Civic Blue ring with a Civic Blue top arc, 0.9s linear `spin` animation.
- **Skeleton line:** 12px tall pill with a `linear-gradient(90deg, border, primary-soft, border)` shimmer at 1.4s ease-in-out infinite.

### Booking Row and Calendar Block
- **Booking row** (`.booking-row`, list view): 92px min-height, three-column grid (`140px | 1fr | auto`), Civic Blue serif time on the left (22px Instrument Serif), 18px/700 Inter name, 15px/500 purpose, 13px/500 muted meta. Hover fills Softer Civic Blue. Missed and cancelled rows drop to 0.76 opacity with line-through name and Danger Red time.
- **Staff booking block** (`.staff-booking-block`, calendar view): 8px radius, 1px Office Border, white background tinted Softer Civic Blue, 4px Civic Blue left bar. Hover lifts (`translateY(-1px)`) with a 3px Civic Blue ring at 26% opacity. Status variants tint the left bar and background (missed and cancelled use Danger Soft and a Danger Red bar).

## 6. Do's and Don'ts

### Do:
- **Do** keep the product offline-first and staff-mediated in language and workflow. Use phrases like "Encode walk-in", "Office computer", "Today's schedule", not "Book online", "User account", or "Cloud sync".
- **Do** use 48px minimum control height for staff-touched controls and 64px for the main screen action.
- **Do** pair English labels with Filipino helper italics whenever it lowers staff hesitation (`Encode walk-in · I-encode ang walk-in`). The English label is the primary; the Filipino is a service.
- **Do** keep reservation status visible in lists, calendars, dialogs, and reports. The `status-badge` primitive must accompany every reservation reference.
- **Do** use Civic Blue for action and identity, Court Orange sparingly for local accent, and Paper Surface tones for everything that holds content.
- **Do** lift overlay surfaces with shadow-lg and bordered surfaces with 1px Office Border at rest.

### Don't:
- **Don't** make it look like a public startup landing page or a marketing campaign.
- **Don't** make it look like a sports entertainment app: no team-color saturation, no neon, no display gradients.
- **Don't** ship a dark command-center dashboard as the default staff experience. Dark mode is not part of this system; the only "dark" surface is the Civic Blue topbar and login side panel.
- **Don't** use tiny admin-table typography for primary workflows. Working text stays at 14px or larger; data-table cells stay at 15px or larger.
- **Don't** use jargon-heavy workflow labels (Provision, Initialize, Onboard) where plain civic verbs work (Add, Save, Approve, Cancel).
- **Don't** use decorative glassmorphism, neon gradients, gradient text (`background-clip: text` is forbidden), or hidden controls that require training to discover.
- **Don't** use `border-left` greater than 1px as a colored stripe on cards, list items, callouts, or alerts. The single sanctioned exception is the calendar `staff-booking-block`'s 4px Civic Blue or Danger Red bar; no other surface in the system carries one.
- **Don't** imply residents can reserve remotely. The system is staff-mediated and offline. Copy never invites a self-service flow.
- **Don't** use Court Orange as a button background, alert color, or surface tint. It belongs on the eyebrow line, the avatar, and the login serif accent only.
- **Don't** rely on color alone for status. If a booking is missed, "Missed" must read as a word, not just a red color.
