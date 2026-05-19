---
target: "client/src/pages/LoginPage.jsx"
total_score: 32
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T20-30-00Z
slug: client-src-pages-loginpage-jsx
---
# Login — Critique (run 2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Signing in..." button label, no progress hint on long auth waits |
| 2 | Match System / Real World | 4 | Republika eyebrow, "see the Kapitan", install-note read like the actual office |
| 3 | User Control and Freedom | 2 | No password recovery beyond "see the Kapitan" |
| 4 | Consistency and Standards | 4 | Skip link, autoComplete tokens, autoFocus, role="alert" |
| 5 | Error Prevention | 3 | HTML5 required + clear 401 copy |
| 6 | Recognition Rather Than Recall | 3 | Seal letter "N" still abstract, but fewer competing chrome elements |
| 7 | Flexibility and Efficiency | 3 | Enter submits via form, no remember-me |
| 8 | Aesthetic and Minimalist Design | 4 | Decorative circles gone, single welcome paragraph (was 4 lines, now 2) |
| 9 | Error Recovery | 2 | Bad-credential message is one line, no recovery affordance |
| 10 | Help and Documentation | 4 | Bilingual welcome reads as one help moment |
| **Total** | | **32/40** | up from 29/40 |

## Anti-Patterns Verdict

**LLM**: Now passes the AI-slop test cleanly. No decorative wallpaper, italic Court Orange Warm "Maligayang pagdating" still earns its rare-color sanction. The login side panel went from chrome-heavy to typography-led — the change you can see at a glance.

**Deterministic**: No banned patterns.

## What's Working

- **Italic Court Orange Warm emphasis word** — still the system's signature. One italic word inside a serif headline, on the system's accent color, used exactly once on this page. Textbook "Color Sparingly" execution.
- **Two-line bilingual welcome** ("Sign in to start the basketball court reservation system. *Mag-sign in upang magsimula.*") — the Tagalog now rides as an inline span sibling instead of a stacked paragraph, which makes it feel like translation, not duplication.
- **Login form remains the strongest 2-field form in the system** — autoComplete, autoFocus, required, role="alert" all wired correctly.

## Priority Issues

- **[P3] What**: Recovery hint still reads "If you forgot your password, please see the Kapitan."
- **Why it matters**: Warm and local, but it's policy buried in helper copy. A staff member who forgot their password under pressure won't find this.
- **Fix**: Promote it to a small "Need help?" button row, or add an admin contact link. Carried from run 1.
- **Suggested command**: `/impeccable harden client/src/pages/LoginPage.jsx`

- **[P3] What**: 401 message says "Please check the staff credentials and try again."
- **Why it matters**: The user can't *check* credentials they've forgotten. The message names the next action, but the action is impossible without the recovery path above.
- **Fix**: Pair the 401 with the recovery affordance in the same alert.

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: The page reads cleaner now. Her recovery problem hasn't changed.

**Carlo (assistant, 20s)**: No friction.

## Minor Observations

- `.field` class still differs from `.staff-field` used on other pages. This was flagged in run 1 as a system-wide drift. Login chose not to align with it; defensible (login has its own context), but worth a deliberate decision.
- Office time "Installed at the Barangay Office · Version 1.0" still grounds the page in physical reality. Keep.

## Trend for `client-src-pages-loginpage-jsx` (last 5 runs): 29 → **32**
