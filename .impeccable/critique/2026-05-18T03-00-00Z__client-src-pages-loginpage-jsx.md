---
target: client/src/pages/LoginPage.jsx
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T03-00-00Z
slug: client-src-pages-loginpage-jsx
---
# Login — Critique (run 4, browser-verified, 1440 + 820)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live "Today" line, ready-dot, spinner button state |
| 2 | Match System / Real World | 4 | "Magandang hatinggabi" auto-greeting matches Manila clock |
| 3 | User Control and Freedom | 3 | autoFocus + Enter, but no "show password" toggle |
| 4 | Consistency and Standards | 4 | Standard `field` + `input` primitives, paper card |
| 5 | Error Prevention | 3 | Caps-Lock surfacing, 401 message helpful |
| 6 | Recognition Rather Than Recall | 3 | Bilingual labels under each input |
| 7 | Flexibility and Efficiency | 3 | Single ID/password path; no recovery affordance |
| 8 | Aesthetic and Minimalist Design | 4 | Two-panel split, civic blue + warm paper |
| 9 | Error Recovery | 3 | 401 names "ask the administrator"; no in-app reset |
| 10 | Help and Documentation | 3 | Forgot-password hint with Filipino subline |
| **Total** | | **34/40** | up from 32/40 |

## Anti-Patterns Verdict

**LLM (browser-verified)**: Login still avoids the AI-slop traps. No gradient text, no glassmorphism, no hero-metric template, no decorative pseudo-circles (kept clean from earlier passes). The italic Court Orange Warm "hatinggabi" is the system's signature emphasis word, used exactly once on the page, and it carries personality without screaming. The auto-rotated greeting word ("Magandang umaga / hapon / gabi / hatinggabi") gives the page a sense of time-of-day awareness that a category-reflex login would never bother with.

**Deterministic**: Detector returns `[]` for `LoginPage.jsx` (run on the file directly).

## What's Working

- **Single italic emphasis word** on a static cream-and-blue surface is doing more identity work than three decorative elements would. Emphasis-by-restraint, not emphasis-by-volume.
- **Bilingual welcome line** ("Sign in to start the basketball court reservation system. *Mag-sign in upang magsimula.*") sits on one paragraph rather than two stacked sentences. Reads as one thought with a Filipino footnote, not two redundant copies of the same instruction.
- **System-ready dot** that pulses after fonts load is a small but real "the office computer is ready" affordance. Most login pages would never bother; this one earned it.

## Priority Issues

- **[P3] What**: Forgot-password copy ("Ask the administrator to reset your account at the barangay office") is a policy line, not a recovery affordance.
- **Why it matters**: Carried from runs 2 and 3. The 401 message ("If you forgot your password, ask the administrator to reset your account") names an action the user can't take from the screen. For a clerk locked out at the desk, this is workflow theatre.
- **Fix**: Replace the static "Forgot password?" string with a tel-link to the barangay office contact (read from PRODUCT.md or a `OFFICE_PHONE` env var), or surface the admin's username so the clerk knows who to walk over to. If neither is available, the line is fine as-is — but stop pretending it's a "Forgot password?" affordance.
- **Suggested command**: `clarify`

- **[P3] What**: No "show password" toggle on the password input.
- **Why it matters**: 17px Inter password masking is fine for a typing user, but staff who fat-fingered a credential have no way to confirm before submit. With the bilingual context (some users may type Filipino password phrases), surface visibility matters more than usual.
- **Fix**: Add a 24×24 eye icon button inside the password field's right padding. Toggle `type="text" / "password"`. Default off, no persistence.
- **Suggested command**: `clarify` or `harden`

## Persona Red Flags

**Tita Marisol (clerk, 50s)**: Path remains clean. "Magandang hatinggabi" greeting matches her morning login window in Manila. Caps-Lock banner triggers correctly during password entry, which she will hit at least once a week.

**Carlo (assistant, 20s)**: At 820 the form-side stacks cleanly under the marketing side. The "Sign in" headline still anchors the form below the fold-line on his viewport; he'd appreciate the form moving above the marketing card on mobile, but that's a delight-tier change.

## Minor Observations

- The italic-emphasis "Maligayang pagdating" mentioned in run 2 is no longer present in the rendered DOM; the headline now uses the rotated greeting word. Worth confirming this was intentional (it's documented behavior in `getGreeting`) and not a regression.
- `aria-live="polite"` on the Today line is correct.
- The system-ready dot has no visible textual fallback; the "Office computer · System ready · v1.0" line is descriptive enough that the dot is decorative-only, but the contrast on the dot itself (when not yet ready) is borderline against the deep civic-blue panel. Not a blocker.
