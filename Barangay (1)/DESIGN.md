---
name: Barangay Court Scheduling
description: Offline staff-friendly reservation system for a barangay basketball court.
colors:
  warm-office-bg: "#F6F4EE"
  paper-surface: "#FFFFFF"
  muted-paper: "#F0ECE3"
  civic-blue: "#0B4A6F"
  civic-blue-soft: "#DCEAF2"
  civic-blue-softer: "#EFF5F8"
  court-orange: "#C85C1C"
  court-orange-soft: "#FDEEDE"
  success-green: "#1F7A43"
  success-soft: "#DEF0E3"
  warning-gold: "#B4761A"
  warning-soft: "#FBEFCF"
  danger-red: "#B83B2A"
  danger-soft: "#FADEDA"
  ink: "#1F2937"
  ink-muted: "#6B7280"
  border: "#DCD6C7"
  border-strong: "#B9B19E"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
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
    padding: "13px 22px"
    height: "48px"
  button-primary-large:
    backgroundColor: "{colors.civic-blue}"
    textColor: "{colors.paper-surface}"
    rounded: "12px"
    padding: "18px 28px"
    height: "64px"
  card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
    height: "48px"
---

# Design System: Barangay Court Scheduling

## 1. Overview

**Creative North Star: "The Barangay Desk Ledger"**

This system should feel like a well-organized office ledger translated into a modern screen: warm paper surfaces, clear blue official actions, large readable controls, and labels that speak to staff instead of software specialists. It is a product surface, not a campaign. The design serves the scheduling workflow and should stay calm even when conflicts, missed bookings, and approvals need attention.

The staff-friendly variant is the strongest source of truth. It uses large Inter text, Instrument Serif for civic headings, generous navigation buttons, bilingual support, and visible status badges. The interface rejects dark command-center styling, sports-app excitement, tiny dense admin tables, and cloud-booking assumptions.

**Key Characteristics:**
- Warm office-paper surfaces with civic blue as the primary action color.
- 17px body text and 48px minimum standard controls for staff readability.
- Persistent sidebar navigation with large labeled targets.
- Status colors paired with text labels for reservation state.
- Short, functional motion only for hover, focus, dialogs, and confirmations.

## 2. Colors

The palette is a restrained civic office palette: warm paper neutrals, government blue for ownership and action, court orange as a local accent, and clear operational status colors.

### Primary
- **Civic Blue**: Used for primary actions, active navigation, topbar identity, and selected states.
- **Soft Civic Blue**: Used for selected navigation backgrounds, sidebar help, and low-risk informational panels.

### Secondary
- **Court Orange**: Used sparingly for the basketball-court identity, avatars, and contextual accents. It should not compete with primary actions.

### Tertiary
- **Success Green**: Approved, completed, and positive confirmation states.
- **Warning Gold**: Pending, attention, and waiting states.
- **Danger Red**: Missed, declined, destructive, or error states.

### Neutral
- **Warm Office Background**: Main app background.
- **Paper Surface**: Cards, forms, tables, dialogs, and top-level panels.
- **Muted Paper**: Hover rows, secondary panels, icon wells, and calm grouped areas.
- **Ink**: Primary text.
- **Muted Ink**: Secondary labels, Filipino helper text, timestamps, and metadata.
- **Office Border**: Dividers, card borders, input strokes, and table rules.

### Named Rules

**The Blue Means Action Rule.** Civic Blue is reserved for primary intent, active navigation, and confirmed selected states. Do not spend it on decoration.

**The Status Must Read Rule.** Never rely on color alone for pending, approved, completed, missed, danger, or warning. Pair every status color with a word, icon, or both.

## 3. Typography

**Display Font:** Instrument Serif, with Georgia fallback.
**Body Font:** Inter, with system-ui fallback.
**Label/Mono Font:** The current staff-friendly direction avoids mono for primary UI; use Inter labels unless technical timestamps require a compact treatment.

**Character:** Instrument Serif gives page titles and hero moments a local civic formality. Inter carries the working UI because staff need speed, clarity, and low reading effort.

### Hierarchy
- **Display** (400, 44px, 1 line-height): Page titles and major staff-facing screen names.
- **Headline** (400, 36px, 1.05 line-height): Hero cards, summary titles, and important overview blocks.
- **Title** (600, 17px, 1.25 line-height): Navigation labels, card headings, table emphasis, and form section titles.
- **Body** (400, 17px, 1.5 line-height): General instructions, helper text, field content, and staff-readable copy. Keep long instructional text under 75ch.
- **Label** (600, 13px, 1.25 line-height): Badges, small navigation translations, field helper labels, and status descriptors.

### Named Rules

**The Staff Can Read It Rule.** Do not drop working text below 14px. Primary forms, cards, and navigation should stay at 16px or larger; the staff-friendly baseline is 17px.

**The Title Has a Job Rule.** Use the serif only for orientation and emphasis. Never use it inside dense tables, long forms, or repeated metadata.

## 4. Elevation

The system uses mostly flat bordered surfaces with light shadows reserved for overlays, hover lift, and major panels. Depth should clarify what is interactive or above the page, not decorate static content.

### Shadow Vocabulary
- **Low Shadow** (`0 1px 2px rgba(15,30,60,0.06)`): Subtle contained surfaces when a border alone is not enough.
- **Medium Shadow** (`0 4px 14px rgba(15,30,60,0.10)`): Hover lift and active cards.
- **High Shadow** (`0 24px 60px rgba(15,30,60,0.18)`): Dialogs, drawers, and blocking confirmations.

### Named Rules

**The Border First Rule.** Use borders and tonal layers for normal structure. Use shadows only when the surface floats, moves, or blocks the page.

## 5. Components

### Buttons

- **Shape:** Gently rounded office controls (10px radius), with larger task buttons at 12px.
- **Primary:** Civic Blue background with white text, 48px minimum height, 13px 22px padding. Use for save, approve, new reservation, and primary screen actions.
- **Large Primary:** 64px minimum height, 18px 28px padding. Use when staff are making the main action on a screen.
- **Hover / Focus:** Darken Civic Blue on hover. Focus should keep a visible blue ring or border shift.
- **Danger:** White background with Danger Red text and border by default, Danger Soft on hover. This keeps destructive actions visible without making them look like the primary path.

### Chips

- **Style:** Rounded pill badges with soft status backgrounds and matching text colors.
- **State:** Approved uses Success Green, pending uses Warning Gold, missed uses Danger Red, completed uses Civic Blue Soft. Every chip must contain readable text.

### Cards / Containers

- **Corner Style:** 14px large radius for cards and hero surfaces.
- **Background:** Paper Surface for primary cards, Muted Paper for grouped inner areas.
- **Shadow Strategy:** Flat by default, with elevation only for hoverable or overlay surfaces.
- **Border:** Office Border at 1px for normal cards; stronger borders only for selected navigation and important state panels.
- **Internal Padding:** 20px to 24px for standard cards; 32px for hero and summary panels.

### Inputs / Fields

- **Style:** Paper Surface background, 2px or clearly visible border, 10px radius, 48px minimum height.
- **Focus:** Civic Blue border or a soft Civic Blue focus ring.
- **Error / Disabled:** Danger Red for error text and border, muted paper and muted ink for disabled states.

### Navigation

The staff-friendly navigation uses a persistent left sidebar with large rows, 44px icon wells, English labels, Filipino helper text, and visible active state. Active navigation uses Soft Civic Blue background, Civic Blue text, and a blue icon well.

### Dialogs

Confirmation dialogs should be direct and forgiving. Use plain question titles, a short reservation summary, a neutral "Go back" action, and a clearly named final action such as "Yes, save it" or "Yes, approve".

## 6. Do's and Don'ts

### Do:

- **Do** keep the product offline-first and staff-mediated in language and workflow.
- **Do** use large target sizes for staff actions: 48px minimum, 64px for major task buttons.
- **Do** pair English labels with Filipino helper text when it reduces confusion.
- **Do** keep reservation status visible in lists, calendars, dialogs, and reports.
- **Do** use warm paper backgrounds and civic blue primary actions consistently.

### Don't:

- **Don't** make it look like a public startup landing page.
- **Don't** make it look like a sports entertainment app.
- **Don't** use a dark command-center dashboard as the default staff experience.
- **Don't** use tiny admin-table typography for primary workflows.
- **Don't** use jargon-heavy workflow labels.
- **Don't** use decorative glassmorphism, neon gradients, or hidden controls.
- **Don't** imply residents can reserve remotely unless that workflow is intentionally added.
