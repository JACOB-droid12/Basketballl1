---
timestamp: 2026-05-18T03-50-59Z
slug: client-src-pages-residentdirectorypage-jsx
target: "Resident Directory"
total_score: 25
p0_count: 0
p1_count: 3
---

# Resident Directory — Critique

## Anti-patterns verdict

No absolute-ban hits. No gradient text, no glass, no decorative side stripes. The two-column `admin-grid` (form on the left, list on the right) is a reasonable shape for a "create-or-edit + browse" surface. The 820px breakpoint that swaps the table for stacked cards is an honest responsive move, not a half-finished spreadsheet.

Where the screen falls into AI-default territory: the **two long parallel columns** at desktop, identical width, equal vertical weight, no visual hierarchy between "the thing I am doing right now" (the form) and "the data I am picking from" (the list). Both columns scream for attention; neither earns it. The form column ends up taller than the visible viewport (≈1115px tall on 1440×900), which means the staff *always* has to scroll past the form to see search results when they enter the page — a scroll cost that compounds because most visits to this screen are "find an existing resident," not "add a brand new one."

Category-reflex test: "barangay directory page → split form/list" is exactly the most-trained shape for this kind of admin screen. Second-order test: even after avoiding shadcn-card-grid, it landed on the very next training-data reflex.

## Heuristic scores

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading spinner shows; saving spinner shows. Search debounce has no "searching..." indicator, so a slow query feels stuck. |
| 2 | Match System / Real World | 4 | "Repeat requesters", "groups, leagues, or barangay committees", bilingual italics — staff vocabulary throughout. |
| 3 | User Control and Freedom | 2 | No delete. No deactivate. The directory only grows; staff cannot retire entries that are obsolete or duplicated. |
| 4 | Consistency and Standards | 3 | Edit button uses an icon-only `btn-light` while Use is a text `btn-primary`; inconsistent affordance weight on a row. The icon-only button has a `title="Edit"` but no visible label, breaking the project's usual pattern of always-visible labels. |
| 5 | Error Prevention | 3 | Maxlengths enforced client-side. Duplicate contact-number focus-on-error is a nice touch. No client-side check on contact-number format until the backend rejects. |
| 6 | Recognition Rather Than Recall | 2 | The form column is always present, even when the staff only wants to *search*. They have to mentally tune out a five-input form to use the search bar. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut to focus search. No multi-select (e.g., "edit two duplicates at once"). No CSV export. The "Use" action is good — one click takes the resident to a prefilled reservation. |
| 8 | Aesthetic and Minimalist Design | 2 | Two equal-weight columns at desktop, both vertically tall, no visual hierarchy. The list column has its own search field inside its own card head, but the page has no global search at all. |
| 9 | Error Recovery | 3 | `buildSubmitError` maps backend statuses to staff-friendly copy — good. Network failure renders the offline message. |
| 10 | Help and Documentation | 4 | Hint lines on every field, including the example "Liga ng Kabataan, Rodriguez Family, Purok 3 Youth" which immediately teaches the format. |
| **Total** | | **25/40** | **Functional, but the layout works against the most-common task** |

## Overall impression

The directory works. The form saves, the list searches, the "Use" handoff is genuinely good. What's holding the page back is its **layout shape** — the equal-weight two-column form/list grid is the AI-default for admin surfaces, and on this app it produces a screen where the "find an existing resident" task (which is most visits) competes for screen real estate with the "create a new resident" task (which happens far less often). The list scrolls vertically with no pagination at 12+ rows; the form blocks the right column from getting any visual prominence. Both columns lose.

The seeded data also exposes a hygiene problem the screen does nothing to surface: rows like `"32323232"` with contact `"fdssfsefesfsef"` and address `"dad"` are obvious test garbage, but the directory has no concept of "stale" or "deactivated" so they sit at the top of the list permanently (the sort is `updated_at DESC`).

## What's working

- **The Use button is a real action.** One click takes the resident to `/reservations/new?residentId=...` and the form prefills. This is the highest-leverage feature on the page and it works exactly as the staff would hope.
- **Bilingual hints land well.** `"Pangalan o grupo"`, `"Cellphone number"`, `"Tirahan"` etc. on every field. Staff who hesitate on English get the Filipino italic right where they need it.
- **820px breakpoint genuinely improves the mobile read.** Cards swap in cleanly, table swaps out, the form collapses below the list. This is a responsive move that thought about the smaller viewport, not just shrunk the desktop.

## Priority issues

### [P1] Equal two-column layout buries the most-common task
**Why it matters**: Live measurement on 1440×900: form column is ~1115px tall, list column ~1265px tall. The user enters the page and the very first thing they see is a five-field form they almost never need. The search field — the actual entry point for 9/10 visits — is below the fold on the right column. New residents are added rarely; existing residents are searched constantly.
**Fix**: Make the list the primary surface. Two options:
1. **Inverse weight**: keep two columns but flip them. List on the left at 0.6fr, form on the right at 0.4fr. Search input pinned at the top of the page.
2. **Drawer pattern**: list takes the full page width; "Add resident" is a button at the top right that opens the form in a drawer (the project already has `ReservationDetailDrawer` chrome). Editing a row also opens the drawer.
Option 2 matches the rest of the system better (the All Bookings page uses a similar drawer pattern). Search becomes the page's primary input. The form is opt-in.
**Suggested command**: `shape` (this is a layout/architecture rethink) then `craft`

### [P1] No delete or deactivate path
**Why it matters**: The seeded list has at least three obvious test entries (`32323232`, `3434343434`, `Codex Browser QA After Cancelled`) that real staff would want to clean up. There is no UI path to remove them. Edit and Use are the only row actions. Over a year of office use the directory will accumulate duplicates, typos, and obsolete groups; without a hide/delete, the search results degrade.
**Fix**: Add a "Remove from directory" action behind a `ConfirmDialog` (the project already has the component). If the directory is referenced by reservations and a hard delete is risky, deactivate instead: a `status` flag that hides the row from the default search but keeps the foreign-key intact for past bookings. Add a "Show retired entries" filter for the rare cleanup pass.
**Suggested command**: `harden`

### [P1] Edit button is icon-only and visually unequal to Use
**Why it matters**: The row's actions cell holds an icon-only Edit (16px pencil, `btn-light`, `title="Edit"`) next to a text "Use" (`btn-primary`). The two actions are not equal in importance — Use is the high-leverage one, Edit is the rarer maintenance task — but the visual treatment makes Edit look like a tooltip, not a button. On mobile and for low-vision users with the title-only label, the affordance is hard to find.
**Fix**: Either label the Edit button explicitly ("Edit") in the `btn-light` style and let Use stay primary; or move Edit into a row context-menu / kebab so the row's primary action surface is purely Use. The current "icon vs label" mix is the worst of both.
**Suggested command**: `clarify`

### [P2] Group field is half-implemented
**Why it matters**: A `group` column exists in the table cell construction (the form has it, the row's name cell renders it as a small italic caption when present). But none of the seeded rows have a group, the search bar text claims to search by group, and there is no "filter by group" affordance. The feature is built halfway and doesn't pull its weight on the screen.
**Fix**: Either commit to it — add a group filter chip row above the search input, render group as a coloured tag in the row, allow grouping the list by group — or pull it from the create form and treat it as an internal annotation only. The current state is "we built the column but never finished the UI for it."
**Suggested command**: `distill` or `craft`

### [P2] Search has no result count when filtering
**Why it matters**: The card head says "12 residents in directory." When the staff types "Codex" and the list narrows to 8, the count still says "12" because it's counting the underlying database, not the filtered view. The staff has to count rows by eye to know how many match.
**Fix**: When `search.trim()` is non-empty, show "8 of 12 match 'Codex'" or "12 saved → 8 match." Use `EmptyState` already wires the empty case; the populated case just needs the same awareness.
**Suggested command**: `clarify`

## Persona red flags

**Maria (counter clerk searching for a repeat customer)**: Resident says her name. Maria opens Resident Directory, sees a tall form she doesn't need, scrolls past it to find search, types the name, finds a match, clicks Use. Three of five steps are friction the screen could remove if search were the front door.

**Romeo (admin doing data hygiene)**: Romeo wants to clean up the test entries (`32323232`, `dad` for an address). He clicks the row, the form populates with the bad data, and he sees… an Edit form. There is no Delete. He saves a slightly less bad version of the same junk because the system won't let him remove it. The directory only grows.

**Tito (older walk-in barangay staff, less keyboard-fluent)**: Sees a screen with two equal columns and no obvious starting point. The page-kicker `DIRECTORY` is small, the page title is far above where he is reading. He scrolls. He scrolls more. The form fields look like he is supposed to fill them in. He fills in a name and gets a "save" button — at which point the page accepts a duplicate resident because the directory has no fuzzy match warning.

## Minor observations

- The `formError` and `formSuccess` alerts render at the top of the form. After a successful save the form clears, but the success alert persists at the top of an empty form, which is mildly confusing. Either auto-dismiss or move the alert next to the now-empty form heading.
- "Save resident" / "Save changes" / "Saving..." button labels are good; "Cancel edit" is the slightly odd one out (the rest are sentence-case verbs, this one is the verb-noun pattern). Consider "Cancel" to match the system elsewhere.
- The seeded data exposes a real validation gap: the form accepts a name like `32323232` and an address like `dad`. Either constrain to a minimum sensible length or add a format-warning sublabel.
- `notes` is rendered as a tooltip on the table row (`title=`) and as a paragraph on the mobile card. Two reading patterns for the same data; the table tooltip is invisible to keyboard users and screen readers don't surface it consistently.
- `inputSize` on day option turned out to be 970×48 — see Court Policy critique. Same fieldset pattern is fine here because the resident form doesn't use it.

## Questions to consider

- What if the page were "Search residents" first and "Add resident" were one button at the top right? How much of the form-shaped area on the page is the staff actually using on a typical visit?
- Could the directory share its row component with the reservation detail "resident" mini-card so the same reading pattern works in both places?
- The `Use` action feels like the strongest design decision on this page. Could other rows in the system (recent reservations, calendar bookings) get a similar one-click "Re-book this resident" affordance?
