# Backend / API / Database / Script Fix Log

Date: 2026-05-18

## Summary

No backend reservation-integrity, database, API authorization, or business-rule defects remained open after this full-system QA pass.

Codex fixed one deployment/build-script issue directly. Codex also fixed one small frontend validation wiring issue because it was a safe one-line integration fix and not a UI redesign.

## BFIX-001

Severity: High
Area: Deployment build config

Root cause:

`npm run frontend:build` failed on the Windows workspace path with spaces. Vite/Rolldown emitted an invalid relative HTML asset path:

`../../../../../../Emmy Lou/Documents/New project/client/index.html`

The build had `emptyOutDir: true`, so a failed build also risked removing the previous `public/app` assets before stopping.

Files changed:

- `client/vite.config.js`

Fix summary:

- Converted Vite `root`, `outDir`, and Rollup `input` to absolute paths based on `import.meta.url`.
- Preserved `base: "/app/"`, manifest generation, and output location.

Tests added/updated:

- No standalone test added. The regression is covered by running the actual build command on the Windows path with spaces.

Verification result:

- `npm run frontend:build` passed.
- `npm run verify:react-build` passed.
- `public/app` regenerated with local assets only.

Regression risk:

- Low. The change is scoped to Vite path resolution and preserves the same output directory and manifest behavior.

## FWIRE-001

Severity: Medium
Area: Frontend validation wiring

Root cause:

Chromium now parses HTML `pattern` attributes with the Unicode Sets `v` flag. The contact-number pattern `[0-9+\-()\s]{7,30}` emitted a browser console error:

`Invalid regular expression: /[0-9+\-()\s]{7,30}/v`

Backend validation was still safe, but native browser validation and console cleanliness were affected.

Files changed:

- `client/src/pages/ReservationFormPage.jsx`
- `tests/reactFrontendStatic.test.js`

Fix summary:

- Replaced the inline pattern with `CONTACT_NUMBER_PATTERN = String.raw\`[0-9+\x2d\(\)\s]{7,30}\``.
- Added a static regression test that compiles the pattern with `new RegExp(..., "v")` and checks allowed/disallowed values.

Tests added/updated:

- `reservation contact-number browser pattern is valid in current Chromium`

Verification result:

- `npm test -- tests\reactFrontendStatic.test.js` passed.
- Rebuilt app loaded New Reservation with no console errors.

Regression risk:

- Low. Backend validation remains authoritative; this only restores valid browser-side pattern behavior.

## Backend Integrity Result

Reservation overlap protection: PASSED

Clear for Public Use: PASSED

Maintenance blocks: PASSED

Backup/restore: PASSED

Role/permission backend checks: PASSED

No backend bug was deferred to Opus.
