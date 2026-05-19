---
target: "client/src/pages/LoginPage.jsx"
total_score: 29
p0_count: 0
p1_count: 0
timestamp: 2026-05-16T18-00-00Z
slug: client-src-pages-loginpage-jsx
---
# Login — Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Submit shows "Signing in...", but no progress hint on long auth waits |
| 2 | Match System / Real World | 4 | "Republika ng Pilipinas", "see the Kapitan", install-note read like the actual office |
| 3 | User Control and Freedom | 2 | No password recovery path beyond "see the Kapitan" |
| 4 | Consistency and Standards | 4 | Skip link, `role="alert"`, autocomplete tokens, autoFocus |
| 5 | Error Prevention | 3 | HTML5 required, but no client-side username/password constraint hints |
| 6 | Recognition Rather Than Recall | 3 | Seal letter "N" is abstract; no one logo-recognizes a single glyph |
| 7 | Flexibility and Efficiency | 3 | Enter submits via the form, no remember-me or quick switch |
| 8 | Aesthetic and Minimalist Design | 3 | Two pseudo-element circles + 4 stacked greeting lines on the blue panel |
| 9 | Error Recovery | 2 | Bad-credential message is one line, no recovery affordance |
| 10 | Help and Documentation | 2 | Bottom hint is policy-as-help; no link to a manual or admin contact |
| **Total** | | **29/40** | **Competent, with three fixable issues** |

## Anti-Patterns Verdict

**LLM assessment**: Passes the AI-slop test in the first pass. Civic blue + warm cream + the single italic Court Orange Warm "Maligayang pagdating" is location-rooted typography. The italic emphasis is exactly the rare-use exception DESIGN.md sanctions, and it earns its place. **But** the two decorative circles bottom-right of the blue panel are template wallpaper — they fight the seal and add nothing the seal doesn't already do.

**Deterministic scan**: No banned patterns (no gradient text, no glassmorphism, no >1px side stripes). Skipped CLI scan; would re-run if a Puppeteer-capable env was available.

## Overall Impression

Probably the strongest screen in the system. The bilingual welcome treatment is the right kind of warmth for civic software. The form itself is honest: two fields, big primary button, helpful "see the Kapitan" line. The biggest opportunity is on the left panel — fewer stacked greeting lines, no decorative circles, and the orientation moment hits harder.

## What's Working

- **Italic Court Orange Warm on "Maligayang pagdating"** is the system's signature move and it lands. One emphasis word, one rare color — precisely the rule DESIGN.md sets.
- **Skip link, autofocus, autocomplete tokens, and `role="alert"` on errors** are all wired up at the framework level. Real accessibility hygiene, not theater.
- **64px primary button** matches the documented "main screen action" floor for staff-mediated flows.

## Priority Issues

- **[P2] What**: Decorative circles on the blue panel.
- **Why it matters**: Civic surfaces don't decorate. The two pseudo-element circles read as SaaS template wallpaper and dilute the welcome. The seal is already doing the orientation work.
- **Fix**: Remove `.login-side::before` and `.login-side::after`. Let the type carry the panel.
- **Suggested command**: `/impeccable distill client/src/pages/LoginPage.jsx`

- **[P2] What**: Four stacked welcome lines (Republika eyebrow + serif h1 + English para + Tagalog para + install-note).
- **Why it matters**: Two of the lines (English + Tagalog para) restate each other. Stacking translations doubles cognitive load instead of reducing it.
- **Fix**: Either keep the bilingual welcome only on the h1 (already done with the italic), and drop the second Tagalog paragraph — or alternate per-line, never stacking.
- **Suggested command**: `/impeccable clarify client/src/pages/LoginPage.jsx`

- **[P3] What**: Recovery hint reads "If you forgot your password, please see the Kapitan."
- **Why it matters**: Warm and local-feeling, but it's policy buried in helper copy. A staff member who forgot their password under pressure won't find this.
- **Fix**: Promote it to a small "Need help?" button row beneath the form, or add an admin contact link.
- **Suggested command**: `/impeccable harden client/src/pages/LoginPage.jsx`

## Persona Red Flags

**Tita Marisol (clerk, 50s, low digital literacy)**: Lands on the form fast and the field names match her vocabulary. The "Maligayang pagdating" is comforting. But the only recovery path is "see the Kapitan" — if it's 7am and the Kapitan isn't there, she's stuck.

**Carlo (assistant, 20s, fast typist)**: Tab + type + Enter works. Autocomplete fills if he's used the system before. No friction.

## Minor Observations

- `.field` class differs from `.staff-field` used elsewhere in the app — small style drift that costs nothing to align.
- The "Installed at the Barangay Office · Version 1.0" install note is excellent — keep it.
- Login-form-card has 18px gap, login-side has 42px gap; intentional asymmetry but worth verifying it reads on tablet.

## Questions to Consider

- What does the offline recovery path actually look like? Could the system surface a one-time admin-reset key the Kapitan can issue without the database?
- The decorative circles feel like a vestige of the prototype era. Is there a reason to keep them, or is this safe to drop?
