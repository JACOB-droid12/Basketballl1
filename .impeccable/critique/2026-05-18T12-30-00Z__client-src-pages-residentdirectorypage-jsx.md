---
target: client/src/pages/ResidentDirectoryPage.jsx
total_score: 39
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T12-30-00Z
slug: client-src-pages-residentdirectorypage-jsx
---
# Resident Directory — Critique (run 2, browser-verified, 1440 + 820 — post-fix)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | "12 residents in directory" + loading state + form success/error |
| 2 | Match System / Real World | 4 | "Use" verb on each row, bilingual page-sub |
| 3 | User Control and Freedom | 4 | Edit / Cancel edit / Use, no destructive action |
| 4 | Consistency and Standards | 4 | Form + responsive list family reused |
| 5 | Error Prevention | 4 | Duplicate-contact-number error focuses the field |
| 6 | Recognition Rather Than Recall | 4 | Search field has helpful placeholder, hint, and Filipino label |
| 7 | Flexibility and Efficiency | 3 | Debounced search; no keyboard shortcut |
| 8 | Aesthetic and Minimalist Design | 4 | 4-column table at 1440 + card list at 820 (was 6 columns) |
| 9 | Error Recovery | 4 | Form errors render next to their field; offline + 401/403/404/500 messages |
| 10 | Help and Documentation | 4 | Form copy explains why (prefill walk-ins faster) |
| **Total** | | **39/40** | up from 36/40 (run 1) |

## What Changed This Round

- **Notes column dropped from the table** (was empty for 9 of 12 rows). Notes still surface on row hover via `title=`, and inline on the card view.
- **Group column dropped**; the Group label now renders as a small italic caption beneath the resident's name when present (`.resident-group`).
- **Edit button collapsed to an icon-only `btn-icon`** with `aria-label` + `title` preserved. Pencil icon added to the Icon component (`name="edit"`).
- **At ≤820px the table swaps to a card list** (`.resident-list-cards`) so the directory reads as a stack, not a horizontally-scrolling table. Card-list and table-list share the same `<ResidentRow>` / `<ResidentCard>` data path.

## Anti-Patterns Verdict

**LLM (browser-verified)**: At 1440 the table reads as Name (with optional italic group caption) / Contact / Address / Actions. The icon-only Edit + labeled Use button keeps the right column tight without forcing two stacked CTA labels per row. At 820 the cards stack vertically with the same label-meta-actions structure used elsewhere in the system.

**Deterministic**: Detector clean for `ResidentDirectoryPage.jsx` (verified run 2).

## Outstanding (deferred)

- **[P2]** Junk data ("32323232", "fdssfsefesfsef", "dad") sits at the top of the directory because the form has no client-side defense against numeric-only "names". Server validation correctly accepts them; a soft warning would help. Out of scope for layout-only fixes.
- **[P3]** Bilingual page-sub still runs three sentences into one paragraph. Cosmetic.

## Trend (2 runs): 36 → **39**
