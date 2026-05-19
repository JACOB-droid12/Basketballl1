import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for admin schedule modals: MaintenanceBlockModal and
// ClearPublicUseModal.
//
// Static-source assertion style consistent with the project's testing
// strategy (Req. 20.3) since JSX cannot be loaded directly under
// `node --test`. The assertions pin the API contract, role gating,
// multi-step flow, warning copy, and cancellation rendering to the
// source code so regressions are caught without a full JSX runtime.
//
// Requirements covered: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 13.1, 13.2,
// 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 16.1, 17.1, 17.2
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

// ---------------------------------------------------------------------------
// MaintenanceBlockModal (Req. 4.1–4.7, 16.1, 17.1, 17.2)
// ---------------------------------------------------------------------------

test("MaintenanceBlockModal submit sends POST /api/schedule/blocks with the entered payload", () => {
  const source = readSourceFile("client/src/components/MaintenanceBlockModal.jsx");

  // The create form submits to the correct endpoint with POST method
  // (Req. 4.3).
  assert.match(
    source,
    /apiRequest\(\s*["']\/api\/schedule\/blocks["']\s*,\s*\{/,
    "MaintenanceBlockModal must call apiRequest with /api/schedule/blocks"
  );
  assert.match(
    source,
    /method:\s*["']POST["']/,
    "MaintenanceBlockModal must use POST method"
  );

  // The payload is built from the form fields and serialized as JSON
  // (Req. 4.1).
  assert.match(source, /body:\s*JSON\.stringify\(buildPayload\(\)\)/);

  // buildPayload includes the required fields: date, mode, blockType,
  // reason, and conditionally startTime/endTime (Req. 4.1, 4.2).
  assert.match(source, /payload\.date\s*=\s*form\.date|date:\s*form\.date/);
  assert.match(source, /payload\.mode\s*=\s*form\.mode|mode:\s*form\.mode/);
  assert.match(source, /payload\.blockType\s*=\s*form\.blockType|blockType:\s*form\.blockType/);
  assert.match(source, /payload\.reason\s*=\s*form\.reason|reason:\s*form\.reason/);

  // When mode is TIME_RANGE, startTime and endTime are included in the
  // payload (Req. 4.2).
  assert.match(source, /if \(form\.mode === "TIME_RANGE"\)/);
  assert.match(source, /payload\.startTime\s*=\s*form\.startTime/);
  assert.match(source, /payload\.endTime\s*=\s*form\.endTime/);

  // onCreated is only invoked after a successful 2xx response, never
  // on error (Req. 4.3, 4.5, 4.6).
  assert.match(source, /onCreated\(\)/);
  // The onCreated call is inside the try block, before the catch
  const tryIndex = source.indexOf("await apiRequest(\"/api/schedule/blocks\"");
  const onCreatedIndex = source.indexOf("onCreated()", tryIndex);
  const catchIndex = source.indexOf("} catch", tryIndex);
  assert.ok(
    onCreatedIndex > tryIndex && onCreatedIndex < catchIndex,
    "onCreated() must be called inside the try block (only on 2xx)"
  );
});

test("MaintenanceBlockModal deactivate flow sends DELETE /api/schedule/blocks/:blockId", () => {
  const source = readSourceFile("client/src/components/MaintenanceBlockModal.jsx");

  // The deactivate flow sends a DELETE request to the block-specific
  // endpoint (Req. 4.4).
  assert.match(
    source,
    /apiRequest\(`\/api\/schedule\/blocks\/\$\{blockId\}`/,
    "Deactivate flow must call DELETE /api/schedule/blocks/:blockId"
  );
  assert.match(
    source,
    /method:\s*["']DELETE["']/,
    "Deactivate flow must use DELETE method"
  );

  // The blockId is URL-encoded for safety.
  assert.match(source, /encodeURIComponent\(String\(block\.blockId\)\)/);

  // The deactivate body is rendered when blockToDeactivate is provided
  // (Req. 4.4).
  assert.match(source, /blockToDeactivate && blockToDeactivate\.blockId/);
  assert.match(source, /<DeactivateBlockBody/);

  // onCreated is invoked only after a successful DELETE (Req. 4.4, 4.5).
  assert.match(source, /onCreated\(\)/);
});

test("MaintenanceBlockModal is not mounted for Staff_User accounts", () => {
  const source = readSourceFile("client/src/components/MaintenanceBlockModal.jsx");

  // Admin gating: the modal returns null for non-ADMIN roles (Req. 4.7,
  // 16.1). The check must happen before any rendering.
  assert.match(
    source,
    /if \(!user \|\| user\.role !== "ADMIN"\) return null/,
    "MaintenanceBlockModal must return null for non-ADMIN users"
  );

  // The role check is documented as preventing Staff_User mounting.
  assert.match(source, /Admin gating/);
});

// ---------------------------------------------------------------------------
// ClearPublicUseModal (Req. 13.1–13.11, 16.1, 17.1, 17.2)
// ---------------------------------------------------------------------------

test("ClearPublicUseModal WHOLE_DAY mode sends POST /api/schedule/clear-public-use with correct payload", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // The modal sends to the correct endpoint with POST (Req. 13.5).
  assert.match(
    source,
    /apiRequest\(\s*["']\/api\/schedule\/clear-public-use["']\s*,\s*\{/,
    "ClearPublicUseModal must call apiRequest with /api/schedule/clear-public-use"
  );
  assert.match(
    source,
    /method:\s*["']POST["']/,
    "ClearPublicUseModal must use POST method"
  );

  // Payload is serialized as JSON from buildPayload (Req. 13.5).
  assert.match(source, /body:\s*JSON\.stringify\(buildPayload\(\)\)/);

  // buildPayload always includes mode, date, and reason (Req. 13.1).
  assert.match(source, /mode:\s*form\.mode/);
  assert.match(source, /date:\s*form\.date/);
  assert.match(source, /reason:\s*form\.reason/);

  // WHOLE_DAY mode: the three modes are defined (Req. 13.1).
  assert.match(source, /value: "WHOLE_DAY", label: "Whole day"/);
});

test("ClearPublicUseModal TIME_RANGE mode includes startTime and endTime in payload", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // TIME_RANGE mode includes both startTime and endTime (Req. 13.2).
  assert.match(source, /value: "TIME_RANGE", label: "Time range"/);
  assert.match(
    source,
    /if \(form\.mode === "TIME_RANGE"\)\s*\{[\s\S]*?payload\.startTime\s*=\s*form\.startTime[\s\S]*?payload\.endTime\s*=\s*form\.endTime/,
    "TIME_RANGE mode must include both startTime and endTime in payload"
  );
});

test("ClearPublicUseModal FROM_TIME_ONWARD mode includes only startTime in payload", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // FROM_TIME_ONWARD mode includes startTime but not endTime (Req. 13.3).
  assert.match(source, /value: "FROM_TIME_ONWARD", label: "From a time onward"/);
  assert.match(
    source,
    /else if \(form\.mode === "FROM_TIME_ONWARD"\)\s*\{[\s\S]*?payload\.startTime\s*=\s*form\.startTime/,
    "FROM_TIME_ONWARD mode must include startTime in payload"
  );

  // Verify that endTime is hidden when mode is FROM_TIME_ONWARD
  // (Req. 13.3).
  assert.match(
    source,
    /const showEndTime = form\.mode === "TIME_RANGE"/,
    "endTime input should only show for TIME_RANGE mode"
  );
});

test("ClearPublicUseModal warning step renders the required copy and is required before the request fires", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // The literal warning copy is defined as a constant (Req. 13.4).
  assert.match(
    source,
    /overlapping active reservations will be cancelled but their records will be kept/,
    "ClearPublicUseModal must render the literal warning copy"
  );

  // The warning copy is stored in WARNING_COPY constant.
  assert.match(source, /const WARNING_COPY\s*=\s*\n?\s*["']overlapping active reservations will be cancelled but their records will be kept["']/);

  // The modal has a two-step flow: "config" -> "warning" -> submit
  // (Req. 13.4, 13.5). The POST request is only dispatched from the
  // warning step's confirm handler.
  assert.match(source, /const \[step, setStep\] = useState\("config"\)/);
  assert.match(source, /setStep\("warning"\)/);

  // The config step's submit handler only advances to warning, it does
  // NOT fire the API request (Req. 13.4).
  assert.match(
    source,
    /function handleContinueToWarning\(event\)/,
    "Config step must have a handler that advances to warning"
  );
  assert.match(source, /onSubmit=\{handleContinueToWarning\}/);

  // The actual API call is in handleConfirmClear, which is only
  // reachable from the warning step (Req. 13.5).
  assert.match(
    source,
    /async function handleConfirmClear\(\)/,
    "The API call must be in handleConfirmClear"
  );
  assert.match(
    source,
    /onClick=\{handleConfirmClear\}/,
    "The warning step confirm button must call handleConfirmClear"
  );

  // The warning step renders the WARNING_COPY in an alert element
  // (Req. 13.4).
  assert.match(source, /\{WARNING_COPY\}/);
  assert.match(source, /step === "warning"/);

  // The "Yes, clear public use" button is only in the warning step
  // (Req. 13.5).
  assert.match(source, /Yes, clear public use/);
});

test("ClearPublicUseModal lists cancelledReservations after success", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // On success, the modal transitions to the "success" step and stores
  // the response (Req. 13.6, 13.8).
  assert.match(source, /setResult\(data\)/);
  assert.match(source, /setStep\("success"\)/);

  // The success step renders a CancellationsPanel that lists the
  // cancelled reservations from the response (Req. 13.8, 13.9).
  assert.match(
    source,
    /<CancellationsPanel[\s\S]*?cancelledReservations=\{result\?\.cancelledReservations\}/,
    "Success step must render CancellationsPanel with cancelledReservations from the response"
  );

  // The CancellationsPanel renders each cancelled reservation's
  // referenceNo (Req. 13.8).
  assert.match(source, /function CancellationsPanel\(\{ cancelledReservations \}\)/);
  assert.match(source, /formatReferenceNo\(entry\?\.referenceNo\)/);

  // The panel shows a count of cancelled reservations (Req. 13.8).
  assert.match(source, /reservation.*cancelled|cancelled/);
  assert.match(source, /list\.length/);

  // The panel handles the empty case gracefully (Req. 13.8).
  assert.match(source, /No overlapping active reservations were found/);

  // onCleared is invoked with the backend response so the parent can
  // re-fetch (Req. 13.6, 13.9).
  assert.match(source, /onCleared\(data\)/);
});

test("ClearPublicUseModal is not mounted for Staff_User accounts", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // Admin gating: the modal returns null for non-ADMIN roles
  // (Req. 13.10, 16.1).
  assert.match(
    source,
    /if \(!user \|\| user\.role !== "ADMIN"\) return null/,
    "ClearPublicUseModal must return null for non-ADMIN users"
  );

  // The role check is documented as preventing Staff_User mounting.
  assert.match(source, /Admin gating/);
});

// ---------------------------------------------------------------------------
// Shared error handling (Req. 17.1, 17.2)
// ---------------------------------------------------------------------------

test("Both modals surface the standard offline copy on network failure", () => {
  const maintenance = readSourceFile("client/src/components/MaintenanceBlockModal.jsx");
  const clearPublicUse = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  const offlineCopy =
    "The system is offline or the office network is down. Try again once the network is back.";

  // Both modals define the offline message constant (Req. 17.1).
  assert.match(maintenance, new RegExp(escapeRegex(offlineCopy)));
  assert.match(clearPublicUse, new RegExp(escapeRegex(offlineCopy)));

  // Both modals detect network errors and surface the offline message
  // (Req. 17.1).
  assert.match(maintenance, /isNetworkError\(caught\)/);
  assert.match(clearPublicUse, /isNetworkError\(caught\)/);
  assert.match(maintenance, /setError\(OFFLINE_MESSAGE\)/);
  assert.match(clearPublicUse, /setError\(OFFLINE_MESSAGE\)/);

  // Both modals surface backend field-level errors via the Field
  // component's error prop (Req. 17.2).
  assert.match(maintenance, /caught\?\.data\?\.errors/);
  assert.match(clearPublicUse, /caught\?\.data\?\.errors/);
  assert.match(maintenance, /setFieldErrors\(caught\.data\.errors\)/);
  assert.match(clearPublicUse, /setFieldErrors\(caught\.data\.errors\)/);
});

// ---------------------------------------------------------------------------
// Mode-dependent input visibility (Req. 4.2, 13.2, 13.3)
// ---------------------------------------------------------------------------

test("MaintenanceBlockModal hides time inputs when mode is WHOLE_DAY", () => {
  const source = readSourceFile("client/src/components/MaintenanceBlockModal.jsx");

  // When mode changes to WHOLE_DAY, startTime and endTime are cleared
  // so stale values cannot reach the backend (Req. 4.2).
  assert.match(
    source,
    /if \(field === "mode" && value === "WHOLE_DAY"\)/,
    "Mode change to WHOLE_DAY must clear time fields"
  );
  assert.match(source, /next\.startTime = ""/);
  assert.match(source, /next\.endTime = ""/);

  // The time inputs are conditionally rendered based on mode (Req. 4.2).
  assert.match(source, /const showStartTime = form\.mode !== "WHOLE_DAY"/);
  assert.match(source, /const showEndTime = form\.mode !== "WHOLE_DAY"/);
});

test("ClearPublicUseModal hides time inputs based on mode selection", () => {
  const source = readSourceFile("client/src/components/ClearPublicUseModal.jsx");

  // WHOLE_DAY hides both time inputs (Req. 13.2).
  assert.match(source, /const showStartTime = form\.mode !== "WHOLE_DAY"/);
  assert.match(source, /const showEndTime = form\.mode === "TIME_RANGE"/);

  // Mode changes clear the appropriate time fields (Req. 13.2, 13.3).
  assert.match(source, /if \(value === "WHOLE_DAY"\)/);
  assert.match(source, /else if \(value === "FROM_TIME_ONWARD"\)/);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
