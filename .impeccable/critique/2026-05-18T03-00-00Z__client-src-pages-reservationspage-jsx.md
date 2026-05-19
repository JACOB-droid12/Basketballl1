---
target: client/src/pages/ReservationsPage.jsx
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-reservationspage-jsx
---
# All Bookings — Critique (run 4, browser-verified, 1440 + 820, drawer verified)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | actionError + todayKey refresh + busy state |
| 2 | Match System / Real World | 4 | "Needs attention", "Past", "Did not show up" |
| 3 | User Control and Freedom | 4 | Two-axis filter + drawer 3-exit |
| 4 | Consistency and Standards | 4 | Toolbar pattern stable; drawer uses standard primitives |
| 5 | Error Prevention | 4 | Confirmation dialogs for status changes (verified) |
| 6 | Recognition Rather Than Recall | 4 | Search + scope tabs + status select |
| 7 | Flexibility and Efficiency | 3 | Two filters compose; no keyboard shortcut |
| 8 | Aesthetic and Minimalist Design | 3 | "Status:" prefix still missing on the select |
| 9 | Error Recovery | 3 | actionError as top-of-page alert |
| 10 | Help and Documentation | 3 | Attention-panel body explains the surface |
| **Total** | | **36/40** | up from 34/40 |

## Anti-Patterns Verdict

**LLM (browser-verified)**: The two-axis filtering ("All / Needs attention / Past" + status select) reads cleanly at both 1440 and 820. The reservation drawer at 1440 covers most of the right column and lays out the detail rows in a 150px label / flex value grid; at 820 it spans the full viewport — both verified by browser inspection. Mark-as-done / Mark-as-missed / Cancel buttons sit at the drawer foot in a Muted Paper band, with the Edit and Print Slip on the left side. No competing CTAs, no badge stacking inside the drawer body.

**Deterministic**: Detector clean for `ReservationsPage.jsx`.

## What's Working

- **Drawer body is a real two-column detail grid.** Reference number, Date, Time, Requester, Contact, Address, Purpose, Remarks. Each row reads as a label/value pair instead of stacked text. 150px label column gives a hard left edge so the values align — much easier to scan than the cards.
- **Status pill inside the drawer head** ("Reserved") sits next to the reservation number "#24" and reference "BCS-2026-000007" at the top of the body. Three identifiers, three different visual weights — pill, gray reference number, monospaced "#24" — separation is good.
- **The action row at the drawer foot lays out four buttons**: Edit / Print slip / Mark as missed / Cancel / Mark as done. They sit in a Muted Paper foot band, which keeps them distinct from the drawer body but doesn't compete with primary action elsewhere on the page.

## Priority Issues

- **[P3] What**: Status filter `<select>` still has no visible "Status:" prefix label.
- **Why it matters**: Carried from run 3. The toolbar reads "search input · scope tabs · dropdown" with no visible word telling the user the dropdown narrows to a status. Sighted users have to hover or click to discover.
- **Fix**: Replace the sr-only label with a visible 12px/700 muted "Status" prefix, the way the calendar legend handles its label. Currently the sr-only "STATUS" pseudo-prefix is rendered (it shows up in the snapshot) but its visual weight isn't anchored to the select — they appear as separate tokens.
- **Suggested command**: `clarify` or `layout`

- **[P3] What**: Card meta column shows status pill **plus** "Print slip" button **plus** (when `attention` scope) the attention reason chip. Three things in one column on a 92px row.
- **Why it matters**: Carried from runs 1, 2, 3. Within an "attention" card, the right column visually has more weight than the actual booking details. At 820 the chip wraps onto a new line, which is fine, but at 1440 it's compressed.
- **Fix**: Move the attention reason into the card's body row (between the booking name and meta), prefixed with a small icon, and let the right column be just status + Print slip.
- **Suggested command**: `layout`

- **[P3] What**: Print-slip button sits next to every row.
- **Why it matters**: Carried from run 1 and 2 and 3. Print is rare; export is the common share-with-Kapitan path. Eleven rows × Print Slip = 11 secondary buttons — visually loud for a low-frequency action.
- **Fix**: Move Print Slip into the drawer foot only. The drawer is a one-click-away surface; a row-level shortcut is over-served.
- **Suggested command**: `distill`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Search box defaults to a placeholder "Search by name, purpose, phone, ID, or reference no." — long but readable. Scope-tab counts are visible at a glance.

**Carlo (assistant, 20s)**: At 820 the toolbar wraps without crowding the search input (verified). Drawer overlay covers the full viewport, escape-to-close works, three-button foot row reads cleanly.

## Minor Observations

- `aria-checked` correct on the radiogroup tabs.
- Drawer uses a real `dialog modal` with `aria-modal` semantics (verified).
- The "Print slip" button on each row uses `event.stopPropagation()` so the row click doesn't fire — correct, but easy to break.
- `attention-reason` chip text ("Today reserved - mark done or missed when finished.") still uses a hyphen with spaces around it where a colon would read as the directive it actually is. Borderline.
