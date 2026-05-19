---
target: client/src/pages/ResidentDirectoryPage.jsx
total_score: 36
p0_count: 0
p1_count: 1
timestamp: 2026-05-18T11-30-00Z
slug: client-src-pages-residentdirectorypage-jsx
---
# Resident Directory — Critique (run 1, browser-verified, 1440 + 820)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | "12 residents in directory" + loading state + form success/error |
| 2 | Match System / Real World | 4 | "Use" verb on each row, bilingual page-sub |
| 3 | User Control and Freedom | 4 | Edit / Cancel edit / Use, no destructive action |
| 4 | Consistency and Standards | 4 | `admin-grid` form+table primitive reused from Accounts |
| 5 | Error Prevention | 4 | Duplicate-contact-number error focuses the field |
| 6 | Recognition Rather Than Recall | 3 | Search field has helpful placeholder, hint, and Filipino label |
| 7 | Flexibility and Efficiency | 3 | Debounced search, no keyboard shortcut |
| 8 | Aesthetic and Minimalist Design | 2 | 6-column table at 1440 with 2 columns often empty |
| 9 | Error Recovery | 4 | Form errors render next to their field; offline + 401/403/404/500 messages |
| 10 | Help and Documentation | 4 | Form copy explains why (prefill walk-ins faster) |
| **Total** | | **36/40** | first run baseline |

## Anti-Patterns Verdict

**LLM (browser-verified, 1440)**: Two-column admin grid (form left, list right) reads cleanly. The form's left column is the "save a resident" surface; the right column is the directory list with search. The pattern matches Accounts page so a clerk who's used one knows how the other works. The "Use" / "Edit" button pair on each row is the right resolution of the "what do I do with this row?" question — `Use` jumps to a new reservation prefilled, `Edit` swaps the form into edit mode.

**Deterministic**: Detector clean for `ResidentDirectoryPage.jsx`.

## What's Working

- **The "Use" verb on each row** is the right name for the action. Not "Select", not "Open", not "Add to Reservation" — just "Use". A clerk reading the row will press Use without hesitation.
- **Form-error focus management.** When `errors.contactNumber` comes back, focus moves to the contact input via `contactInputRef`. Most React forms skip this; this one wired it correctly.
- **Bilingual labels**: "Pangalan o grupo / Cellphone number / Tirahan / Grupo o organisasyon" pair with English. The "Search by name, group, contact number, or address" hint is direct, not jargon.
- **Notes column at 1000-char cap**, mirroring DB schema. Form-side cap defends the inline UX even though the backend validator is the source of truth on save.

## Priority Issues

- **[P1] What**: 6-column data table at 1440 with three of the columns frequently blank (Address, Group, Notes).
- **Why it matters**: Browser inspection: in this run 9 of 12 rows show empty Group and Notes columns; some show empty Address. The table reads as a sparse spreadsheet — column heads "GROUP" and "NOTES" stand on top of empty columns for most rows. At 820 the table overflows horizontally (scrollWidth 900 vs parent 415) and the user has to scroll sideways to find the Edit/Use actions.
- **Fix**: Three changes. (1) Drop the Notes column from the table view; surface it on hover or in the edit form only. (2) Drop Group as a column; render it inline under the name as a small "Liga ng Kabataan · Purok 3 Youth" caption when present. (3) At 820, switch the table to a card list (reuse `.booking-card-list` pattern from the Reservation History page).
- **Suggested command**: `layout` (table → card-list collapse) followed by `distill` (drop Notes column)

- **[P2] What**: Junk data ("32323232", "fdssfsefesfsef", "dad") sits at the top of the directory.
- **Why it matters**: Not a UI defect per se, but the directory has no defense against junk save: the form requires Name + Contact + Address but does nothing to validate the "name" looks like a name. A clerk can type "32323232" into the name field and hit save. The list then displays it.
- **Fix**: Server-side defense is correct (it's a name field, not a phone field) but the client could refuse pure-numeric names with a per-field hint. Optional: add a "Hide test entries" toggle that filters rows whose `name` is purely digits or starts with `test`/`qa`. Out of scope for a small tweak.
- **Suggested command**: `harden`

- **[P2] What**: The page-header's bilingual subline runs the English and Filipino into one continuous sentence.
- **Why it matters**: The line reads "Search saved residents and groups. Pick one to prefill a new reservation. Para mabilis ang pagpapareserba ng paulit-ulit na requester." — three sentences, two languages, one paragraph, no separators. The Filipino sentence isn't a translation of the English; it adds a *reason* ("so repeat-requester reservations are fast"). That reason is good — but it loses its purpose by sitting at the end of an unbroken English run.
- **Fix**: Break to a second line for the Filipino reason, prefixed with `· `, or use `<span className="page-sub-fil">` separately so the visual hierarchy matches the rest of the system.
- **Suggested command**: `clarify`

- **[P3] What**: Each row's `Edit` button is `btn btn-light` and the `Use` button is `btn btn-primary` — two CTAs per row × 12 rows = 24 buttons in the right column.
- **Why it matters**: Carried family from the Bookings critique (every row carrying multiple CTAs is visually loud). At 12 rows it's manageable; at 100 rows it would be aggressive.
- **Fix**: Drop `Edit` to a small icon button (pencil), keep `Use` as the primary verb. Or move both into a 2-item action menu opened by an ellipsis button.
- **Suggested command**: `distill`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: She'll type "Rodriguez" into the search and watch the list filter to one row. The Use button takes her to a prefilled reservation. The form on the left is "save someone new for next time" — she'll use it once a week, not daily.

**Carlo (assistant, 20s)**: He'll spot the junk-data rows immediately. He'll also notice that 9 of 12 rows have empty Group and Notes columns, and ask "why are those columns even there?" Good question.

## Minor Observations

- Save success message ("Saved Liga ng Kabataan to the directory.") names the entity. Solid.
- The form's `noValidate` is correct (server validation is authoritative).
- `aria-busy` on the form during save is wired, even though there's no visible spinner indicator. Worth adding a small spinner inside the submit button to match Reservation Form's pattern.
- The submit button label "Saving..." appears in both create and edit, which is fine for the verb-led pattern.
