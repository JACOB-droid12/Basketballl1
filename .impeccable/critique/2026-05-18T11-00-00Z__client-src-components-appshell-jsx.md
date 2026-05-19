---
target: client/src/components/AppShell.jsx
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-05-18T11-00-00Z
slug: client-src-components-appshell-jsx
---
# AppShell Sidebar — Critique (run 5, browser-verified, 1440 + 820 — post-fix)

## What Changed This Round

The 11 nav items are now grouped into three labeled sections in `NAV_GROUPS`:

- **Operate** (Home / Calendar / New Reservation / All Bookings) — the four surfaces a clerk lives on day-to-day.
- **Records** (Resident Directory / Reservation History / Summary / Activity Logs) — the four "look something up" surfaces.
- **Account** (Password / Court Policy / Accounts) — the three login + admin surfaces.

Section labels render as small uppercase eyebrows (11px/700, 0.08em letter-spacing, ink-muted) at the top of each group. Adjacent groups are separated by a 14px top-margin only — no horizontal rule, in line with DESIGN.md "Border First Rule" (use spacing for grouping; reserve rules for content separation).

At ≤820px the sidebar collapses to its existing horizontal scroll-strip mode. Group labels hide via `display: none` and groups become inline rows because section headers don't read well in a one-line nav. Verified in the live browser at 820×900: 11 nav items still scroll horizontally, no labels visible, sidebar height stays at 156px.

## Anti-Patterns Verdict

- The eyebrow label uses muted-ink (`var(--ink-muted)`) and is `aria-hidden="true"` so screen-reader users hear the items as a flat list (already grouped logically by content). Sighted users get the visual scanning structure.
- No new icons or surfaces introduced; reuses `.nav-item` and the existing nav-icon primitive.
- Detector clean for `AppShell.jsx`.

## Outstanding

- The "Need help?" footer is still the only thing pinned to the bottom of the sidebar via `margin-top: auto`. Acceptable.
- Adjacent-group spacing of 14px reads cleanly at 1440 but compresses on shorter viewports where the sidebar is constrained vertically. Worth re-checking at 1100×768 if the office monitor profile changes.

## Trend
First run for sidebar grouping; no historical baseline.
