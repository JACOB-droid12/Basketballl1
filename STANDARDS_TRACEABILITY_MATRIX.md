# Standards Traceability Matrix

Date: 2026-05-18 (Second Independent Pass)
System: Barangay Basketball Court Scheduling System

## Matrix: Standards → Findings

| Standard/Framework | Requirement/Principle | Screen/Workflow | Pass/Partial/Fail | Issue IDs | Evidence | Fix Status |
|---|---|---|---|---|---|---|
| **ISO/IEC 25010** | Functional suitability | All screens | Pass | — | All workflows supported, no unsupported features exposed | N/A |
| ISO/IEC 25010 | Performance efficiency | All screens | Pass | — | 350ms debounce, 50-row limit, no heavy patterns | N/A |
| ISO/IEC 25010 | Compatibility | All screens | Pass | — | `verify:react-build` confirms no remote assets | N/A |
| ISO/IEC 25010 | Usability | All screens | Pass | — | Bilingual, task-led, staff-friendly | N/A |
| ISO/IEC 25010 | Reliability | All screens | Pass | — | Error handling on every fetch, double-click protection | N/A |
| ISO/IEC 25010 | Security | All screens | Pass | — | Admin gating, no innerHTML, backend authoritative | N/A |
| ISO/IEC 25010 | Maintainability | All screens | Pass | — | Shared formatters, constants, documented components | N/A |
| ISO/IEC 25010 | Portability | All screens | Pass | — | `verify:bundle` passes, BASE_URL used | N/A |
| **ISO 9241-210** | Real users fit | All screens | Pass | — | Staff language, walk-in workflow, no technical jargon | N/A |
| ISO 9241-210 | Real context fit | All screens | Pass | — | Offline, local, office PC target | N/A |
| ISO 9241-210 | Real tasks fit | All screens | Pass | — | Encode, check, print, block, clear, report, backup | N/A |
| ISO 9241-210 | Real risk prevention | Forms, modals | Pass | — | Date prefill, two-step confirms, availability check | N/A |
| **Nielsen Heuristics** | Visibility of system status | All screens | Pass | — | Loading, saving, success, error states visible | N/A |
| Nielsen Heuristics | Match with real world | All screens | Pass | — | Barangay terms, Filipino helpers | N/A |
| Nielsen Heuristics | User control and freedom | Modals, forms | Pass | — | Cancel, close, Escape, "Go back" | N/A |
| Nielsen Heuristics | Consistency and standards | All screens | Pass | — | Consistent buttons, forms, dates, modals | N/A |
| Nielsen Heuristics | Error prevention | Forms, modals | Pass | — | Confirmations, date context, pre-check | N/A |
| Nielsen Heuristics | Recognition rather than recall | Calendar, modals | Pass | — | Context banners, legend, reference numbers | N/A |
| Nielsen Heuristics | Flexibility and efficiency | Dashboard, nav | Pass | — | Quick actions, keyboard nav | N/A |
| Nielsen Heuristics | Aesthetic and minimalist design | All screens | Pass | — | No clutter, task-led views | N/A |
| Nielsen Heuristics | Error recovery | Forms, API calls | Pass | — | Clear messages, form data preserved | N/A |
| Nielsen Heuristics | Help and documentation | Login, forms | Pass | — | Forgot password hint, recurring note | N/A |
| **WCAG 2.2** | 1.4.3 Contrast (Minimum) | Topbar brand-subtitle | **Fixed** | STD-A01 | Lighthouse: 1.15:1 → now passes | Fixed |
| WCAG 2.2 | 1.4.3 Contrast (Minimum) | Booking row metadata | **Fixed** | STD-A02 | Lighthouse: 4.1:1 → now ≈4.8:1 | Fixed |
| WCAG 2.2 | 1.4.3 Contrast (Minimum) | Topbar avatar | **Fixed** | STD-A03 | Lighthouse: 4.19:1 → now ≈5.7:1 | Fixed |
| WCAG 2.2 | 1.4.3 Contrast (Minimum) | Cancelled booking time | **Fixed** | STD-A04 | Lighthouse: 3.68:1 → now passes | Fixed |
| WCAG 2.2 | 1.4.3 Contrast (Minimum) | Status badges | **Fixed** | STD-A05 | Lighthouse: 3.24:1 → now ≈6:1 | Fixed |
| WCAG 2.2 | 1.3.1 Info and Relationships | All screens | Pass | — | Semantic HTML, proper headings, labels | N/A |
| WCAG 2.2 | 2.1.1 Keyboard | All screens | Pass | — | Focus visible, tab order, time-chip keyboard nav | N/A |
| WCAG 2.2 | 2.4.1 Bypass Blocks | All screens | Pass | — | Skip link present | N/A |
| WCAG 2.2 | 2.4.7 Focus Visible | All screens | Pass | — | `:focus-visible` styles on all interactive elements | N/A |
| WCAG 2.2 | 4.1.2 Name, Role, Value | All screens | Pass | — | ARIA roles, labels, states properly set | N/A |
| **WAI-ARIA** | Dialog pattern | Modals | Pass | — | `role="dialog"`, `aria-modal`, focus trap, Escape close | N/A |
| WAI-ARIA | Tab pattern | Reports | Pass | — | `role="tablist/tab/tabpanel"`, `aria-selected` | N/A |
| WAI-ARIA | Radio group pattern | Time chips | Pass | — | `role="radiogroup/radio"`, `aria-checked`, keyboard | N/A |
| WAI-ARIA | Alert pattern | Errors | Pass | — | `role="alert"` for errors, `role="status"` for success | N/A |
| **GOV.UK Design** | Plain language | All screens | Pass | — | Bilingual, no jargon, task-focused | N/A |
| GOV.UK Design | Clear task flow | All screens | Pass | — | Numbered form sections, step-by-step | N/A |
| GOV.UK Design | Clear validation errors | Forms | Pass | — | Per-field errors, top-level alert | N/A |
| GOV.UK Design | Official printouts | Print routes | Pass | — | Signature lines, reference numbers, "Issued on" | N/A |
| **USWDS** | Accessibility built-in | All screens | Pass | — | Lighthouse 100/100 | N/A |
| USWDS | Mobile/responsive | All screens | Pass | — | Tested at 1366, 768, 390px | N/A |
| USWDS | Trustworthy presentation | All screens | Pass | — | Civic design, barangay seal, official language | N/A |
| **Responsive** | Desktop (1366px) | All screens | Pass | — | Full sidebar + main panel | N/A |
| Responsive | Narrow (768px) | All screens | Pass | — | Sidebar collapses to toggle + drawer | N/A |
| Responsive | Mobile (390px) | Dashboard | Pass | — | Compact topbar, content accessible | N/A |
| Responsive | Print | Slip, daily print | Pass | — | Print stylesheets strip chrome, monochrome | N/A |
| **OWASP Validation** | Required fields | Reservation form | Pass | — | `required` attribute + field error display | N/A |
| OWASP Validation | Length limits | All text inputs | Pass | — | `maxLength` on all inputs | N/A |
| OWASP Validation | Format validation | Contact number | Pass | — | HTML `pattern` attribute | N/A |
| OWASP Validation | XSS prevention | All screens | Pass | — | No `dangerouslySetInnerHTML` | N/A |
| **ISO 29119 Testing** | Build verification | Frontend | Pass | — | `npm run frontend:build` passes | N/A |
| ISO 29119 Testing | Static verification | Frontend | Pass | — | `verify:react-build`, `verify:ui` pass | N/A |
| ISO 29119 Testing | Automated tests | Full suite | Pass | — | 355/355 tests pass | N/A |
| ISO 29119 Testing | Visual verification | Dashboard | Pass | — | Lighthouse 100/100 accessibility | N/A |

## Summary

- **52 standards requirements checked**
- **47 pass without issues**
- **5 had issues that were fixed** (all WCAG 2.2 contrast)
- **0 fail after fixes**
- **5 previously deferred trivial/low items remain** (no standards violation)
