import { useId, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { Field } from "./Field.jsx";
import { ModalShell } from "./ModalShell.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const MODES = [
  { value: "WHOLE_DAY", label: "Whole day" },
  { value: "TIME_RANGE", label: "Time range" }
];

const BLOCK_TYPES = [
  { value: "CLEANING", label: "Cleaning" },
  { value: "BARANGAY_EVENT", label: "Barangay event" },
  { value: "REPAIRS", label: "Repairs" },
  { value: "TOURNAMENT", label: "Tournament" },
  { value: "MEETING", label: "Meeting" },
  { value: "EMERGENCY_USE", label: "Emergency use" },
  { value: "MAINTENANCE", label: "Maintenance" }
];

const EMPTY_FORM = Object.freeze({
  date: "",
  mode: "WHOLE_DAY",
  startTime: "",
  endTime: "",
  blockType: "MAINTENANCE",
  reason: ""
});

/**
 * Admin-only modal for creating maintenance / unavailable Schedule_Blocks
 * and (optionally) deactivating an existing block via a confirm action.
 *
 * The modal is only mounted when the signed-in user is an Admin_User
 * (`user.role === "ADMIN"`); for any other role the component returns
 * `null` regardless of the `open` flag (Req. 4.7, 16.1). The
 * admin-gating early return stays outside the shared `ModalShell`
 * so the dialog markup is never mounted for staff users.
 *
 * Both the Create and Deactivate bodies render through the shared
 * `ModalShell` (Req. 3.7, 3.10). The local focus-trap loop, the
 * `getFocusableElements` helper, and the `FOCUSABLE_SELECTORS` list
 * that used to live in this file have been consolidated into
 * `ModalShell` so every overlay shares one implementation.
 *
 * Create form:
 *   - Inputs for `date`, `mode` (`WHOLE_DAY` / `TIME_RANGE`), `startTime`,
 *     `endTime`, `blockType` (one of `CLEANING`, `BARANGAY_EVENT`,
 *     `REPAIRS`, `TOURNAMENT`, `MEETING`, `EMERGENCY_USE`, `MAINTENANCE`)
 *     and `reason` (Req. 4.1).
 *   - When `mode === "WHOLE_DAY"`, the `startTime` and `endTime` inputs
 *     are hidden so a stale value cannot be sent to the backend (Req. 4.2).
 *   - On submit the modal sends `POST /api/schedule/blocks`; `onCreated()`
 *     is only invoked on a 2xx response so the calendar refresh is
 *     backend-driven (Req. 4.3).
 *   - The submit button lives in the modal footer slot and is wired to
 *     the body form via the standard HTML `form` attribute so pressing
 *     Enter in any input still submits and the footer button still
 *     fires the same handler.
 *
 * Deactivate flow (when the parent passes `blockToDeactivate`):
 *   - The modal swaps to a confirm action body; on confirm it sends
 *     `DELETE /api/schedule/blocks/:blockId` and only invokes
 *     `onCreated()` after a 2xx response (Req. 4.4).
 *
 * Errors:
 *   - Validation/authorization errors surface backend `errors` next to
 *     each `Field` via the `error` prop and the top-level `error`
 *     message in an `.alert.error` band (Req. 4.5, 17.2).
 *   - Network failures surface the standard offline copy (Req. 17.1).
 *   - Local schedule state is never mutated by this modal; the parent
 *     re-fetches `/api/schedule` from `onCreated()` on success (Req. 4.5,
 *     4.6).
 *
 * Requirements: 3.7, 3.10, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 16.1, 17.1, 17.2
 */
export function MaintenanceBlockModal({
  open,
  onClose,
  onCreated,
  user,
  blockToDeactivate,
  defaultDate
}) {
  // Admin gating: the modal is never mounted for Staff_User accounts.
  // Closing the modal also unmounts it so form state does not leak
  // between sessions. Both early-returns stay outside `ModalShell`
  // so its body, focus trap, and DOM nodes are never created when
  // the dialog should not be visible.
  if (!open) return null;
  if (!user || user.role !== "ADMIN") return null;

  if (blockToDeactivate && blockToDeactivate.blockId !== undefined && blockToDeactivate.blockId !== null) {
    return (
      <DeactivateBlockBody
        block={blockToDeactivate}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  return <CreateBlockBody onClose={onClose} onCreated={onCreated} defaultDate={defaultDate} />;
}

function CreateBlockBody({ onClose, onCreated, defaultDate }) {
  // Prefill the selected schedule date when the admin opens the modal
  // from a dated calendar context, so the action feels anchored to
  // the day the admin was looking at (Req. OPUS-UI-005). Backend
  // validation still rejects missing/invalid dates, so this only
  // changes UX: the staff sees the target date in plain words at
  // the top of the modal and can still edit it before submitting.
  const initialDate = isValidDateKey(defaultDate) ? defaultDate : "";
  const [form, setForm] = useState({ ...EMPTY_FORM, date: initialDate });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The submit button sits in the modal footer (rendered by
  // `ModalShell`) but the form lives in the body slot. The HTML
  // `form` attribute on a button can target a form by id from
  // anywhere on the page, so wiring the footer button to this id
  // preserves both pointer-click submission and Enter-key submission.
  const reactId = useId();
  const formId = `maintenance-block-form-${reactId}`;

  const dateInputRef = useRef(null);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // Hide-by-mode also clears the value of the hidden inputs so a
      // stale value cannot accidentally reach the backend.
      if (field === "mode" && value === "WHOLE_DAY") {
        next.startTime = "";
        next.endTime = "";
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setError("");
  }

  function validate() {
    const errors = {};
    if (!form.date) errors.date = "Date is required.";
    if (!form.blockType) errors.blockType = "Block type is required.";
    if (!form.reason || form.reason.trim() === "") errors.reason = "Reason is required.";

    if (form.mode === "TIME_RANGE") {
      if (!form.startTime) errors.startTime = "Start time is required.";
      if (!form.endTime) errors.endTime = "End time is required.";
      if (form.startTime && form.endTime && form.startTime >= form.endTime) {
        errors.endTime = "End time must be after start time.";
      }
    }

    return errors;
  }

  function buildPayload() {
    const payload = {
      date: form.date,
      mode: form.mode,
      blockType: form.blockType,
      reason: form.reason
    };
    if (form.mode === "TIME_RANGE") {
      payload.startTime = form.startTime;
      payload.endTime = form.endTime;
    }
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    setError("");
    setFieldErrors({});

    try {
      await apiRequest("/api/schedule/blocks", {
        method: "POST",
        body: JSON.stringify(buildPayload())
      });
      // Only on 2xx: notify the parent so the calendar can re-fetch
      // from the backend. Local schedule state is never mutated here
      // (Req. 4.3, 4.5, 4.6).
      if (typeof onCreated === "function") onCreated();
      if (typeof onClose === "function") onClose();
    } catch (caught) {
      // On error, render the backend message via Field's error prop
      // and an alert; never mutate local schedule state (Req. 4.5,
      // 17.1, 17.2).
      if (isNetworkError(caught)) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(caught?.message || "Maintenance block could not be saved.");
      }
      if (caught?.data?.errors && typeof caught.data.errors === "object") {
        setFieldErrors(caught.data.errors);
      }
    } finally {
      setBusy(false);
    }
  }

  const showStartTime = form.mode !== "WHOLE_DAY";
  const showEndTime = form.mode !== "WHOLE_DAY";

  return (
    <ModalShell
      open
      onClose={onClose}
      kicker="Maintenance block"
      title="Add maintenance block"
      subtitle={
        <>
          Marks the court as unavailable for cleaning, repairs, or events. This is
          <strong> not </strong>
          the same as opening the court for free public play.
        </>
      }
      busy={busy}
      initialFocusRef={dateInputRef}
      footer={
        <>
          <button className="btn btn-light" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" form={formId} disabled={busy}>
            {busy ? "Saving..." : "Add block"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        {error && <div className="alert error" role="alert">{error}</div>}

        {/* Selected-schedule context band: shows the date and time
          range the admin is about to block in plain words so the
          decision is unambiguous before they submit (Req. OPUS-UI-005).
          The text reflects the live form, so editing the date or mode
          updates this preview in real time. */}
        <div className="modal-context-banner" role="note" aria-live="polite">
          <span className="modal-context-label">Will block</span>
          <strong className="modal-context-value">{describeMaintenanceTarget(form)}</strong>
        </div>

        <div className="form-grid">
          <Field
            id="maintenance-block-date"
            label="Date"
            error={fieldErrors.date}
            wide
          >
            <input
              name="date"
              type="date"
              autoComplete="off"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              ref={dateInputRef}
            />
          </Field>

          <Field
            id="maintenance-block-mode"
            label="Mode"
            error={fieldErrors.mode}
            wide
          >
            <select
              name="mode"
              value={form.mode}
              onChange={(event) => updateField("mode", event.target.value)}
            >
              {MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {showStartTime && (
            <Field
              id="maintenance-block-startTime"
              label="Start time"
              error={fieldErrors.startTime}
            >
              <input
                name="startTime"
                type="time"
                autoComplete="off"
                value={form.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
              />
            </Field>
          )}

          {showEndTime && (
            <Field
              id="maintenance-block-endTime"
              label="End time"
              error={fieldErrors.endTime}
            >
              <input
                name="endTime"
                type="time"
                autoComplete="off"
                value={form.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
              />
            </Field>
          )}

          <Field
            id="maintenance-block-blockType"
            label="Block type"
            error={fieldErrors.blockType}
            wide
          >
            <select
              name="blockType"
              value={form.blockType}
              onChange={(event) => updateField("blockType", event.target.value)}
            >
              {BLOCK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="maintenance-block-reason"
            label="Reason"
            error={fieldErrors.reason}
            wide
          >
            <input
              name="reason"
              type="text"
              autoComplete="off"
              maxLength={200}
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
            />
          </Field>
        </div>
      </form>
    </ModalShell>
  );
}

function DeactivateBlockBody({ block, onClose, onCreated }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The Deactivate body lands focus on the secondary "Go back" button
  // so the destructive action is never the default keyboard target.
  const goBackButtonRef = useRef(null);

  const blockDateLabel = block?.date ? formatDate(block.date) : "";
  const blockTimeLabel = block && block.startTime && block.endTime
    ? `${formatTime(block.startTime)} \u2013 ${formatTime(block.endTime)}`
    : block?.startTime
    ? `from ${formatTime(block.startTime)}`
    : "Whole day";

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const blockId = encodeURIComponent(String(block.blockId));
      await apiRequest(`/api/schedule/blocks/${blockId}`, {
        method: "DELETE"
      });
      // Only on 2xx: notify the parent so the calendar can re-fetch
      // from the backend (Req. 4.4, 4.5).
      if (typeof onCreated === "function") onCreated();
      if (typeof onClose === "function") onClose();
    } catch (caught) {
      if (isNetworkError(caught)) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(caught?.message || "Block could not be deactivated.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      kicker="Maintenance block"
      title="Deactivate block?"
      subtitle={
        block?.reason
          ? `This will deactivate "${block.reason}" on the calendar.`
          : "This will deactivate the selected block on the calendar."
      }
      busy={busy}
      initialFocusRef={goBackButtonRef}
      footer={
        <>
          <button
            className="btn btn-light"
            type="button"
            onClick={onClose}
            disabled={busy}
            ref={goBackButtonRef}
          >
            Go back
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Deactivating..." : "Yes, deactivate"}
          </button>
        </>
      }
    >
      {error && <div className="alert error" role="alert">{error}</div>}

      {blockDateLabel && (
        <div className="modal-context-banner" role="note">
          <span className="modal-context-label">Will deactivate</span>
          <strong className="modal-context-value">
            {blockDateLabel} · {blockTimeLabel}
            {block?.reason ? ` · ${block.reason}` : ""}
          </strong>
        </div>
      )}

      <p className="form-copy">
        Deactivating sends a request to the backend; the calendar will refresh
        once the backend confirms the change.
      </p>
    </ModalShell>
  );
}

function isNetworkError(error) {
  if (!error) return false;
  // `apiRequest` re-throws non-2xx responses with an `error.status`.
  // A network failure (offline, DNS, CORS preflight blocked, unsent
  // request, or expired session that never produced a JSON body) leaves
  // `status` undefined and surfaces as a `TypeError` from `fetch`.
  if (typeof error.status === "number") return false;
  if (error.name === "TypeError") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}

function isValidDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Render the selected schedule context as a single staff-readable line,
// e.g. "Mon, May 18, 2026 (whole day)" or "Mon, May 18, 2026 from 1:00 PM
// to 3:00 PM". When inputs are still incomplete it falls back to a
// gentle "Pick a date" string so the banner never shows a confusing
// half-built sentence.
function describeMaintenanceTarget(form) {
  const datePart = form.date ? formatDate(form.date) : "";
  if (!datePart) return "Pick a date below.";

  if (form.mode === "WHOLE_DAY") {
    return `${datePart} (whole day)`;
  }

  if (form.startTime && form.endTime) {
    return `${datePart} from ${formatTime(form.startTime)} to ${formatTime(form.endTime)}`;
  }

  if (form.startTime) {
    return `${datePart} starting ${formatTime(form.startTime)}`;
  }

  return `${datePart} (pick a time below)`;
}
