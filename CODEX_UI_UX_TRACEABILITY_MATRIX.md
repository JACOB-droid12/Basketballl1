# Codex UI/UX Traceability Matrix

Date: 2026-05-18
Evidence root: `tmp/codex-zero-tolerance-ui-audit`

| Standard/framework | Generic principle | Screen/workflow checked | State checked | Result | Issue IDs | Evidence path | Suggested Opus fix status |
|---|---|---|---|---|---|---|---|
| ISO/IEC 25010-style quality | Functional suitability: UI must show correct data and support correct workflows. | Dashboard availability | Default authenticated dashboard | Fail | UI-AUD-001 | `dashboard-1366-nearest-past-slot.png`; API comparison | Needs Codex backend fix plus Opus display verification |
| ISO/IEC 25010-style quality | Reliability: UI should remain understandable after mutation/error. | New Reservation | Validation error after backend rejection | Fail | UI-AUD-002 | `new-reservation-backend-past-time-error-after-submit.png` | Opus fix |
| ISO/IEC 25010-style quality | Maintainability: shared formatting should be centralized and correct. | Activity logs, slips, daily print, accounts | Timestamp display | Fail | UI-AUD-003 | `activity-logs-1366-timestamp-shift.png`; `reservation-slip-1366-timestamp-shift.png` | Opus fix |
| ISO 9241-210 human-centered design | Fit real staff tasks and office context. | New Reservation | Same-day booking | Fail | UI-AUD-002, UI-AUD-011 | `new-reservation-1366-disabled-selected-past-time.png` | Opus fix |
| ISO 9241-210 human-centered design | Fit offline office operating needs. | Backup reminder | Backup due state | Fail | UI-AUD-004, UI-AUD-005 | `court-policy-1366-missing-backup-reminder.png` | Opus fix |
| Nielsen: visibility of system status | Important system status must be visible. | Backup reminder and dashboard alerts | Due/no backup state | Fail | UI-AUD-004, UI-AUD-005 | `calendar-1366-alerts.png`; `court-policy-1366-missing-backup-reminder.png` | Opus fix |
| Nielsen: match with real world | Use staff-friendly time/status language. | Reports, daily print, reservation cards | Populated data | Partial | UI-AUD-012, UI-AUD-018, UI-AUD-027 | `reports-1366-usage.png` | Opus fix |
| Nielsen: user control and freedom | Signed-in users should not be sent to misleading states. | Login | Signed-in direct navigation | Partial | UI-AUD-015 | `login-1366.png` | Opus fix |
| Nielsen: consistency and standards | Controls, labels, status words, and timestamps should match. | Reports/history/reservations/print | Populated states | Partial | UI-AUD-003, UI-AUD-018, UI-AUD-027 | Multiple screenshots | Opus fix |
| Nielsen: error prevention | Prevent wrong date/time before Save. | New Reservation | Invalid selected past start | Fail | UI-AUD-002, UI-AUD-011 | `new-reservation-1366-disabled-selected-past-time.png` | Opus fix |
| Nielsen: recognition rather than recall | Export controls should say what will be exported. | Reservations and Reports | CSV export controls | Partial | UI-AUD-008 | `reservations-1366-list-nested-print-buttons.png` | Opus fix |
| Nielsen: flexibility/efficiency | Keyboard and compact workflows should be efficient. | Reports tabs, history tabs, menu | Keyboard expectation | Partial | UI-AUD-009, UI-AUD-010 | Source inspection; menu screenshot | Opus fix |
| Nielsen: aesthetic/minimalist | Avoid visual clutter and unfinished features. | Mobile nav, resident cards, recurring notice | 390/768 viewports | Partial | UI-AUD-013, UI-AUD-016, UI-AUD-020 | `dashboard-390.png`; `resident-directory-390-cards.png` | Opus fix |
| Nielsen: error recovery | Error messages should guide without weakening trust. | Reservation availability failure | Error-copy source | Partial | UI-AUD-017 | Source inspection | Opus fix |
| Nielsen: help/documentation | Staff-facing labels should explain disabled/unavailable features. | New Reservation | Recurring note | Partial | UI-AUD-016 | `new-reservation-390.png` | Opus fix without adding recurring UI |
| WCAG 2.2 perceivable | Text and status should be readable and not color-only. | Reports/status/print | Populated states | Partial | UI-AUD-012, UI-AUD-018 | `reports-1366-usage.png` | Opus fix |
| WCAG 2.2 operable | Interactive components must be keyboard operable. | Reservation cards, tabs, menu | Keyboard/source inspection | Partial | UI-AUD-007, UI-AUD-009, UI-AUD-010 | `reservations-1366-list-nested-print-buttons.png` | Opus fix |
| WCAG 2.2 understandable | Fields and states must communicate valid action. | New Reservation | Same-day invalid state | Fail | UI-AUD-002 | `new-reservation-1366-disabled-selected-past-time.png` | Opus fix |
| WCAG 2.2 robust | HTML semantics should work with assistive tech. | Reservation list, forms | Accessibility tree/issue panel | Partial | UI-AUD-007, UI-AUD-024 | Screenshot plus Chrome issue | Opus fix/follow-up |
| WAI-ARIA APG / semantic HTML | Prefer native semantics; if ARIA roles are used, implement expected behavior. | Tabs and menus | Source inspection | Partial | UI-AUD-009, UI-AUD-010 | Source references | Opus fix |
| Public-service design | Printouts must look official and accurate. | Reservation slip, daily schedule print | Print route rendering | Fail | UI-AUD-003, UI-AUD-006, UI-AUD-014, UI-AUD-023 | `reservation-slip-1366-timestamp-shift.png`; `daily-print-1366-timestamp-shift.png` | Opus fix |
| Public-service design | UI should not feel like a generic SaaS/data dump. | Reports/dashboard/residents | Populated states | Partial | UI-AUD-012, UI-AUD-013, UI-AUD-020, UI-AUD-028 | Reports and resident screenshots | Opus fix/data cleanup |
| Responsive design | Layout remains usable at 1366/1024/768/390. | App shell, dashboard, reservations, residents | Four required viewports | Partial | UI-AUD-013, UI-AUD-019, UI-AUD-020 | Responsive screenshot set | Opus fix |
| OWASP-style validation | Frontend should prevent obvious invalid input while backend remains authoritative. | Reservation create | Past same-day time | Fail | UI-AUD-002, UI-AUD-011 | POST 400 evidence screenshot | Opus fix |
| Testing/evidence discipline | Findings should include route, state, expected/actual result, and evidence. | Whole audit | Code + runtime | Pass | All | This report set | Complete for audit; rerun after fixes |
| Project-specific Barangay consistency | Match Barangay reference/current design, official tone, and workflow priority. | All major staff routes | Default/populated/print | Partial | UI-AUD-003 through UI-AUD-028 | Full evidence set | Opus fix |
