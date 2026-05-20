import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for the post-deployment pages:
//   - ReportsPage
//   - ReservationHistoryPage
//   - ResidentDirectoryPage
//   - CourtPolicyPage
//
// Uses the same static-source assertion style as the existing
// `reactPostDeploymentDashboardCalendar.test.js` and
// `reactFrontendStatic.test.js` because JSX cannot be loaded directly
// under `node --test` (no JSX runtime configured for the test runner).
//
// Requirements covered: 1.1, 3.1-3.5, 5.1-5.5, 8.1-8.5, 9.1-9.6,
// 15.1, 15.2, 16.1, 17.1, 17.2, 17.4, 18.1
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

// ---------------------------------------------------------------------------
// ReportsPage (Req. 5.1-5.5, 6.1-6.3, 15.1, 15.2, 17.1, 17.2, 17.4, 18.1)
// ---------------------------------------------------------------------------

test("ReportsPage fetches GET /api/reports with from/to derived from the selected range", () => {
  const source = readSourceFile("client/src/pages/ReportsPage.jsx");

  // The page calls `apiRequest(buildReportsPath(range, customRange))` so
  // the request is dispatched with the current range selection (Req. 5.2).
  assert.match(source, /apiRequest\(buildReportsPath\(range, customRange\)\)/);

  // `buildReportsPath` constructs the URL with `from` and `to` query
  // parameters derived from the range preset or custom inputs.
  assert.match(source, /function buildReportsPath\(range, customRange\)/);
  assert.match(source, /\/api\/reports\?\$\{query\}/);
  assert.match(source, /new URLSearchParams\(\)/);

  // `buildReportsParams` maps preset ranges to Manila date ranges and
  // custom ranges to the user-entered from/to values.
  assert.match(source, /function buildReportsParams\(range, customRange\)/);
  assert.match(source, /getManilaDateRange\(range\)/);
  assert.match(source, /if \(customRange\.from\) params\.from = customRange\.from/);
  assert.match(source, /if \(customRange\.to\) params\.to = customRange\.to/);

  // The useEffect re-fires on range or customRange changes so the
  // request is dispatched whenever the selection changes.
  assert.match(source, /\[range, customRange\.from, customRange\.to\]/);
});

test("ReportsPage renders all twelve expanded sections from the backend response", () => {
  const source = readSourceFile("client/src/pages/ReportsPage.jsx");

  // All twelve sections documented in the JSDoc are extracted from the
  // backend response (Req. 5.1, 5.3).
  const sections = [
    "summary",
    "statusCounts",
    "topRequesters",
    "mostUsedDays",
    "mostUsedTimeSlots",
    "monthlyReservationCount",
    "missedReservations",
    "cancelledReservations",
    "reservationsByPurpose",
    "reservationsEncodedByStaff",
    "clearedPublicUseRanges",
    "maintenanceBlocks"
  ];

  for (const section of sections) {
    assert.match(
      source,
      new RegExp(`state\\.report\\?\\.${section}`),
      `ReportsPage must read state.report?.${section} from the backend response`
    );
  }

  // Summary section renders the headline stats (Req. 5.1).
  assert.match(source, /summary\.courtHoursBooked/);
  assert.match(source, /summary\.totalReservations/);
  assert.match(source, /summary\.reservedCount/);
  assert.match(source, /summary\.completedCount/);
  assert.match(source, /summary\.missedCount/);
  assert.match(source, /summary\.cancelledCount/);

  // Section components are rendered for each data group.
  assert.match(source, /<TopRequestersSection\b/);
  assert.match(source, /<MostUsedDaysSection\b/);
  assert.match(source, /<MostUsedTimeSlotsSection\b/);
  assert.match(source, /<MonthlyReservationCountSection\b/);
  assert.match(source, /<ReservationsByPurposeSection\b/);
  assert.match(source, /<ReservationsEncodedByStaffSection\b/);
  assert.match(source, /<StatusCountsSection\b/);
  assert.match(source, /<SummarySection\b/);
});

test("ReportsPage renders EmptyState for each section when the backend returns empty arrays", () => {
  const source = readSourceFile("client/src/pages/ReportsPage.jsx");

  // Each array-based section checks `.length === 0` and renders
  // `EmptyState` with a descriptive title (Req. 5.4, 17.4).
  assert.match(source, /import\s*\{[^}]*EmptyState[^}]*\}\s*from/);

  // Individual section empty-state titles confirm each section has its
  // own empty fallback.
  const emptyTitles = [
    "No requester hours",
    "No day totals",
    "No time-slot totals",
    "No monthly totals",
    "No purpose totals",
    "No staff totals",
    "No status totals",
    "No missed reservations",
    "No cancelled reservations",
    "No cleared public-use ranges",
    "No maintenance blocks"
  ];

  for (const title of emptyTitles) {
    assert.match(
      source,
      new RegExp(title.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")),
      `ReportsPage must render EmptyState with title "${title}"`
    );
  }

  // The top-level empty state when no report data is returned.
  assert.match(source, /No report data/);
});

test("ReportsPage surfaces backend error messages and does not render partial data on failure", () => {
  const source = readSourceFile("client/src/pages/ReportsPage.jsx");

  // On catch, the error message is stored and report is set to null
  // (Req. 5.5, 17.2, 17.6).
  assert.match(source, /setState\(\{ loading: false, report: null, error: error\.message \}\)/);

  // The error is rendered in an alert element.
  assert.match(source, /state\.error && <div className="alert error" role="alert">\{state\.error\}<\/div>/);

  // When error is set, the report sections are not rendered.
  assert.match(source, /!state\.error && \(/);
});

// ---------------------------------------------------------------------------
// ReservationHistoryPage (Req. 1.1, 8.1-8.5, 17.1, 17.2, 18.1)
// ---------------------------------------------------------------------------

test("ReservationHistoryPage fetches the right endpoint for contactNumber and name lookups", () => {
  const source = readSourceFile("client/src/pages/ReservationHistoryPage.jsx");

  // The lookup path is constructed dynamically from the selected
  // lookupType and the trimmed input value (Req. 8.1, 8.2).
  assert.match(
    source,
    /const path = `\/api\/reservations\/history\?\$\{lookupType\}=\$\{encodeURIComponent\(trimmed\)\}`/
  );

  // The two lookup types are "contactNumber" and "name" (Req. 8.1).
  assert.match(source, /value: "contactNumber"/);
  assert.match(source, /value: "name"/);

  // Default lookup type is contactNumber.
  assert.match(source, /useState\("contactNumber"\)/);

  // The form submits via handleSubmit which calls apiRequest with the
  // constructed path.
  assert.match(source, /const data = await apiRequest\(path\)/);
});

test("ReservationHistoryPage renders summary counts exactly from the backend response", () => {
  const source = readSourceFile("client/src/pages/ReservationHistoryPage.jsx");

  // The summary section renders counts from `data.summary` (Req. 8.3).
  assert.match(source, /const summary = data\?\.summary \|\| null/);

  // Individual summary stats rendered (Req. 8.3).
  assert.match(source, /summary\.totalReservations/);
  assert.match(source, /summary\.completedCount/);
  assert.match(source, /summary\.missedCount/);
  assert.match(source, /summary\.cancelledCount/);
  assert.match(source, /summary\.activeReservationCount/);
  assert.match(source, /summary\.lastReservationDate/);

  // The hero number renders the total count directly.
  assert.match(source, /\{totalReservations\}/);

  // SummaryStat components render each count.
  assert.match(source, /<SummaryStat label="Completed" value=\{summary\.completedCount\}/);
  assert.match(source, /<SummaryStat label="Did not show up" value=\{summary\.missedCount\}/);
  assert.match(source, /<SummaryStat label="Cancelled" value=\{summary\.cancelledCount\}/);
  assert.match(source, /<SummaryStat label="Active now" value=\{summary\.activeReservationCount\}/);
});

test("ReservationHistoryPage past and upcoming lists include referenceNo in each row", () => {
  const source = readSourceFile("client/src/pages/ReservationHistoryPage.jsx");

  // Both lists are extracted from the response (Req. 8.4).
  assert.match(source, /const pastReservations = Array\.isArray\(data\?\.pastReservations\)/);
  assert.match(source, /const upcomingReservations = Array\.isArray\(data\?\.upcomingReservations\)/);

  // Each reservation row renders the formatted reference number
  // (Req. 1.1, 8.4).
  assert.match(source, /import\s*\{[^}]*formatReferenceNo[^}]*\}\s*from/);
  assert.match(source, /formatReferenceNo\(reservation\.referenceNo\)/);

  // The reference number appears in the row's small element.
  assert.match(source, /<small>\{formatReferenceNo\(reservation\.referenceNo\)\}<\/small>/);

  // Tabs show counts for upcoming and past lists.
  assert.match(source, /tab\.reservations\.length/);
  assert.match(source, /id: "upcoming"/);
  assert.match(source, /id: "past"/);

  // Empty state when both lists are empty (Req. 8.5, 17.4).
  assert.match(source, /bothListsEmpty/);
  assert.match(source, /No records found for this lookup/);
});

// ---------------------------------------------------------------------------
// ResidentDirectoryPage (Req. 9.1-9.6, 17.1, 17.2, 17.4, 18.1, 18.2)
// ---------------------------------------------------------------------------

test("ResidentDirectoryPage fetches GET /api/residents and supports search", () => {
  const source = readSourceFile("client/src/pages/ResidentDirectoryPage.jsx");

  // The page fetches the resident list from the backend (Req. 9.1).
  assert.match(source, /\/api\/residents\?search=\$\{encodeURIComponent\(trimmed\)\}/);
  assert.match(source, /"\/api\/residents"/);

  // The fetch is debounced to avoid excessive requests while typing.
  assert.match(source, /SEARCH_DEBOUNCE_MS/);
  assert.match(source, /window\.setTimeout/);

  // The response is parsed as an array of residents.
  assert.match(source, /Array\.isArray\(data\?\.residents\)/);
});

test("ResidentDirectoryPage posts new residents and puts updates", () => {
  const source = readSourceFile("client/src/pages/ResidentDirectoryPage.jsx");

  // Create: POST /api/residents (Req. 9.2).
  assert.match(source, /const path = isEdit \? `\/api\/residents\/\$\{resident\.residentId\}` : "\/api\/residents"/);
  assert.match(source, /method: isEdit \? "PUT" : "POST"/);
  assert.match(source, /body: JSON\.stringify\(form\)/);

  // The form collects name, contactNumber, address, group, notes.
  assert.match(source, /name: resident\?\.name \|\| ""/);
  assert.match(source, /contactNumber: resident\?\.contactNumber \|\| ""/);
  assert.match(source, /address: resident\?\.address \|\| ""/);
  assert.match(source, /group: resident\?\.group \|\| ""/);
  assert.match(source, /notes: resident\?\.notes \|\| ""/);
});

test("ResidentDirectoryPage prefills the reservation form on selection via onNavigate", () => {
  const source = readSourceFile("client/src/pages/ResidentDirectoryPage.jsx");
  const app = readSourceFile("client/src/App.jsx");
  const form = readSourceFile("client/src/pages/ReservationFormPage.jsx");

  // The "Use" action routes to the reservation form with the resident
  // ID as a query parameter so the form can prefill (Req. 9.3).
  assert.match(
    source,
    /const target = `\/reservations\/new\?residentId=\$\{encodeURIComponent\(resident\.residentId\)\}`/
  );

  // It calls onNavigate if provided, otherwise uses pushState.
  assert.match(source, /if \(typeof onNavigate === "function"\)/);
  assert.match(source, /onNavigate\(target\)/);
  assert.match(source, /window\.history\.pushState\(\{\}, "", target\)/);

  // The "Use" button is rendered for each resident row.
  assert.match(source, /onClick=\{.*onUse\(resident\)/);

  // The app must preserve the browser URL query string while matching
  // the React route by pathname, otherwise `/reservations/new?residentId=5`
  // misses the exact `/reservations/new` route.
  assert.match(app, /window\.history\.pushState\(\{\}, "", nextPath\)/);
  assert.match(app, /setPath\(normalizePath\(window\.location\.pathname\)\)/);

  // ReservationFormPage consumes the residentId query parameter, fetches
  // that directory row, and pre-fills the resident-facing fields.
  assert.match(form, /const residentIdFromQuery = getResidentIdFromLocation\(\)/);
  assert.match(form, /apiRequest\(`\/api\/residents\/\$\{residentIdFromQuery\}`\)/);
  assert.match(form, /representativeName: resident\.name \|\| resident\.group \|\| current\.representativeName/);
  assert.match(form, /contactNo: resident\.contactNumber \|\| current\.contactNo/);
  assert.match(form, /address: resident\.address \|\| current\.address/);
  assert.match(form, /function getResidentIdFromLocation\(\)/);
  assert.match(form, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(form, /This resident directory entry could not be found/);
});

test("ResidentDirectoryPage shows duplicate-contact backend error next to the contact-number field", () => {
  const source = readSourceFile("client/src/pages/ResidentDirectoryPage.jsx");

  // The editor catches backend validation errors and sets them per-field
  // (Req. 9.4).
  assert.match(source, /const errors = caught\?\.data\?\.errors/);
  assert.match(source, /if \(errors && typeof errors === "object"\)/);
  assert.match(source, /setFieldErrors\(errors\)/);

  // When a contactNumber error is returned, focus moves to the contact
  // input so the user sees the error immediately.
  assert.match(source, /if \(errors\.contactNumber && contactInputRef\.current\)/);
  assert.match(source, /contactInputRef\.current\.focus\(\)/);

  // The Field component for contactNumber receives the error prop so
  // the error renders next to the field (via Field's `error` prop which
  // renders a `<small className="field-error">` element).
  assert.match(source, /error=\{fieldErrors\.contactNumber\}/);

  // The contactNumber input has a ref for focus management.
  assert.match(source, /ref=\{contactInputRef\}/);
});

// ---------------------------------------------------------------------------
// CourtPolicyPage (Req. 3.1-3.5, 16.1, 17.1, 17.2, 18.1)
// ---------------------------------------------------------------------------

test("CourtPolicyPage is read-only for Staff_User and editable for Admin_User", () => {
  const policyForm = readSourceFile("client/src/components/CourtPolicyForm.jsx");

  // The form determines editability from `user.role === "ADMIN"` (Req. 3.1).
  assert.match(policyForm, /const isAdmin = user\?\.role === "ADMIN"/);

  // All inputs use `readOnly={!isAdmin}` so staff cannot edit (Req. 3.2).
  // Count occurrences to ensure all fields are gated.
  const readOnlyMatches = policyForm.match(/readOnly=\{!isAdmin\}/g);
  assert.ok(
    readOnlyMatches && readOnlyMatches.length >= 5,
    `Expected at least 5 readOnly={!isAdmin} bindings, found ${readOnlyMatches?.length || 0}`
  );

  // Checkboxes use `disabled={!isAdmin}` for the allowed-days picker.
  assert.match(policyForm, /disabled=\{!isAdmin\}/);

  // The submit button and discard button only render for admin users.
  assert.match(policyForm, /\{isAdmin && \(/);
  assert.match(policyForm, /Save policy/);
  assert.match(policyForm, /Discard changes/);

  // The form description changes based on role.
  assert.match(policyForm, /isAdmin[\s\S]*?"Update opening hours/);
  assert.match(policyForm, /:\s*"These settings can only be changed by an administrator/);

  // The submit handler early-returns if not admin.
  assert.match(policyForm, /if \(!isAdmin \|\| saving\) return/);
});

test("CourtPolicyPage renders field errors from PUT /api/settings/court-policy next to their fields", () => {
  const policyForm = readSourceFile("client/src/components/CourtPolicyForm.jsx");

  // On save failure, backend errors are extracted and set per-field
  // (Req. 3.3, 3.4).
  assert.match(policyForm, /apiRequest\("\/api\/settings\/court-policy", \{[\s\S]*?method: "PUT"/);
  assert.match(policyForm, /setFieldErrors\(error\.data\?\.errors \|\| \{\}\)/);

  // Each field passes its error to the Field component's `error` prop
  // so the error renders next to the field (Req. 3.4).
  const fieldErrorBindings = [
    "fieldErrors.openingTime",
    "fieldErrors.closingTime",
    "fieldErrors.minimumReservationMinutes",
    "fieldErrors.maximumReservationMinutes",
    "fieldErrors.defaultSlotMinutes",
    "fieldErrors.gracePeriodBeforeMissedMinutes",
    "fieldErrors.blockedDays"
  ];

  for (const binding of fieldErrorBindings) {
    const escaped = binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      policyForm,
      new RegExp(`error=\\{${escaped}\\}`),
      `CourtPolicyForm must pass ${binding} to a Field error prop`
    );
  }

  // allowedDays uses a custom fieldset with inline error rendering
  // (not the Field component) but still renders next to the field.
  assert.match(policyForm, /fieldErrors\.allowedDays/);
  assert.match(policyForm, /court-policy-allowed-days-error/);
  assert.match(policyForm, /<small id="court-policy-allowed-days-error" className="field-error" role="alert">/);

  // The timeRange cross-field error is rendered as a top-level alert.
  assert.match(policyForm, /fieldErrors\.timeRange/);
  assert.match(policyForm, /<div className="alert error" role="alert">\{fieldErrors\.timeRange\}<\/div>/);
});

test("CourtPolicyPage fetches GET /api/settings/court-policy and surfaces errors", () => {
  const source = readSourceFile("client/src/pages/CourtPolicyPage.jsx");

  // The page fetches the policy on mount (Req. 3.1).
  assert.match(source, /apiRequest\("\/api\/settings\/court-policy"\)/);

  // On success, the policy is stored and passed to CourtPolicyForm.
  assert.match(source, /setState\(\{ loading: false, policy: data\?\.policy \|\| null, error: "" \}\)/);

  // On failure, the error message is surfaced (Req. 17.2).
  assert.match(source, /setState\(\{ loading: false, policy: null, error: message \}\)/);
  assert.match(source, /state\.error/);
  assert.match(source, /<div className="alert error" role="alert">\{state\.error\}<\/div>/);

  // The form receives the user prop for role-based rendering.
  assert.match(source, /<CourtPolicyForm[\s\S]*?user=\{user\}/);

  // The page passes onSaved to update local state after a successful PUT.
  assert.match(source, /onSaved=\{handleSaved\}/);
  assert.match(source, /function handleSaved\(updatedPolicy\)/);
});
