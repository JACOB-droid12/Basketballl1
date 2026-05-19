import { useEffect, useId, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { Field } from "./Field.jsx";
import { ModalShell } from "./ModalShell.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const WARNING_COPY =
  "overlapping active reservations will be cancelled but their records will be kept";

const MODES = [
  { value: "WHOLE_DAY", label: "Whole day" },
  { value: "TIME_RANGE", label: "Time range" },
  { value: "FROM_TIME_ONWARD", label: "From a time onward" }
];

const EMPTY_FORM = Object.freeze({
  mode: "WHOLE_DAY",
  date: "",
  startTime: "",
  endTime: "",
  reason: ""
});

/**
 * Three-step "Clear for Public Use" modal for Admin_User accounts.
 *
 * The modal renders through the shared `ModalShell` so every overlay
 * shares one set of layout, focus-trap, Escape, and backdrop-dismissal
 * rules (Req. 3.1, 3.7, 3.10). The local focus-trap loop, the
 * `getFocusableElements` helper, and the `FOCUSABLE_SELECTORS` list
 * that used to live in this file have been consolidated into
 * `ModalShell`. The admin-gating early-return stays outside `ModalShell`
 * so the dialog markup is never mounted for Staff_User accounts.
 *
 * Step 1 ("config") gathers `mode`, `date`, `startTime`, `endTime`, and
 * `reason`. The time inputs are hidden by mode:
 *   - `WHOLE_DAY`        hides both `startTime` and `endTime`.
 *   - `FROM_TIME_ONWARD` hides only `endTime`.
 *
 * Step 2 ("warning") renders the literal copy
 *   "overlapping active reservations will be cancelled but their records
 *    will be kept"
 * and requires the explicit second confirm "Yes, clear public use" before
 * any backend request is dispatched (the second-confirm gating).
 *
 * Step 3 ("success") renders the cancellations panel from the backend
 * response.
 *
 * `POST /api/schedule/clear-public-use` is sent only after that second
 * confirm. On success the modal renders a "Cancellations" panel listing
 * `cancelledReservations[i].referenceNo` and invokes `onCleared(response)`
 * so the calendar can re-fetch from the backend; cleared-public-use state
 * is never stored in React state, `localStorage`, or any in-memory
 * `clearedDays` structure (only the just-returned response is held long
 * enough to render the cancellations panel — Req. 24.7, 24.8).
 *
 * On any failure to send the request (network error, unsent request, or
 * session expired) the modal stays open, the readable error is rendered,
 * and no local cleared-public-use state is applied.
 *
 * The deprecated `promptClearDay` / `clearDay` local-state helper is not
 * referenced.
 *
 * Each step renders its own body content and footer buttons through the
 * single shared `ModalShell` (Req. 3.7, 3.10):
 *   - config:  body holds the form; footer holds Cancel + Continue.
 *   - warning: body holds the warning copy + context band; footer holds
 *              Go back + Yes, clear public use.
 *   - success: body holds the success alert + cancellations panel; footer
 *              holds Done.
 *
 * Requirements: 3.7, 3.10, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7,
 *               13.8, 13.9, 13.10, 13.11, 16.1, 17.1, 17.2, 24.7, 24.8
 */
export function ClearPublicUseModal({ open, onClose, onCleared, user, defaultDate }) {
  // Admin gating: never mount the modal for Staff_User accounts.
  // (Req. 13.10, 16.1.) The component is also unmounted while `open`
  // is false so the form state does not leak between sessions. Both
  // early-returns stay outside `ModalShell` so its body, focus trap,
  // and DOM nodes are never created when the dialog should not be
  // visible.
  if (!open) return null;
  if (!user || user.role !== "ADMIN") return null;

  return <ClearPublicUseModalContent onClose={onClose} onCleared={onCleared} defaultDate={defaultDate} />;
}

function ClearPublicUseModalContent({ onClose, onCleared, defaultDate }) {
  const [step, setStep] = useState("config");
  // Prefill the calendar's currently-selected schedule date so the
  // admin sees the date they were viewing reflected at the top of
  // the modal (Req. OPUS-UI-005). Backend validation still rejects
  // missing or invalid dates; this only changes the UX entry point.
  const initialDate = isValidDateKey(defaultDate) ? defaultDate : "";
  const [form, setForm] = useState({ ...EMPTY_FORM, date: initialDate });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Holds the immediate response from a successful POST so the
  // "Cancellations" panel can list the cancelled reference numbers.
  // This is read straight from the backend; subsequent cleared-state
  // is derived from later /api/schedule and /api/dashboard/alerts
  // fetches by the parent. Nothing is mirrored into React state or
  // localStorage beyond the lifetime of this modal (Req. 24.7, 24.8).
  const [result, setResult] = useState(null);

  // Focus target for the active step. `ModalShell` focuses this ref on
  // mount; the effect below refocuses it whenever the step transitions
  // so keyboard users land on the most-relevant control of the new
  // step (the mode select on config, the safer "Go back" on warning,
  // the "Done" button on success).
  const stepFocusRef = useRef(null);

  // The submit button for the config step sits in the modal footer
  // (rendered by `ModalShell`) but the form lives in the body slot.
  // The HTML `form` attribute on a button can target a form by id
  // from anywhere on the page, so wiring the footer button to this
  // id preserves both pointer-click submission and Enter-key
  // submission (mirrors `MaintenanceBlockModal`).
  const reactId = useId();
  const formId = `clear-public-use-form-${reactId}`;

  // Move focus to the step's initial control after the body re-renders.
  // The shell's own focus effect handles initial mount; this effect
  // covers transitions between config -> warning -> success.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const timer = window.setTimeout(() => {
      stepFocusRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [step]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // Hide-by-mode also clears the value of the hidden inputs so a
      // stale value cannot accidentally reach the backend.
      if (field === "mode") {
        if (value === "WHOLE_DAY") {
          next.startTime = "";
          next.endTime = "";
        } else if (value === "FROM_TIME_ONWARD") {
          next.endTime = "";
        }
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setError("");
  }

  function validateStepOne() {
    const errors = {};

    if (!form.date) errors.date = "Date is required.";
    if (!form.reason || form.reason.trim() === "") errors.reason = "Reason is required.";

    if (form.mode === "TIME_RANGE") {
      if (!form.startTime) errors.startTime = "Start time is required.";
      if (!form.endTime) errors.endTime = "End time is required.";
      if (form.startTime && form.endTime && form.startTime >= form.endTime) {
        errors.endTime = "End time must be after start time.";
      }
    } else if (form.mode === "FROM_TIME_ONWARD") {
      if (!form.startTime) errors.startTime = "Start time is required.";
    }

    return errors;
  }

  function handleContinueToWarning(event) {
    event.preventDefault();
    const errors = validateStepOne();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setError("");
    setStep("warning");
  }

  function handleBackToConfig() {
    if (busy) return;
    setError("");
    setStep("config");
  }

  function buildPayload() {
    const payload = {
      mode: form.mode,
      date: form.date,
      reason: form.reason
    };
    if (form.mode === "TIME_RANGE") {
      payload.startTime = form.startTime;
      payload.endTime = form.endTime;
    } else if (form.mode === "FROM_TIME_ONWARD") {
      payload.startTime = form.startTime;
    }
    return payload;
  }

  async function handleConfirmClear() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const data = await apiRequest("/api/schedule/clear-public-use", {
        method: "POST",
        body: JSON.stringify(buildPayload())
      });
      setResult(data);
      setStep("success");
      // Hand the backend response to the parent so the calendar /
      // dashboard can refetch their public-use state. We do not
      // persist any local cleared-day structure ourselves
      // (Req. 24.7, 24.8).
      if (typeof onCleared === "function") onCleared(data);
    } catch (caught) {
      // Per Req. 13.7 / 17.1: on any failure to send the request
      // (network, unsent, or session expired) keep the modal open,
      // surface the readable error, and do not apply any local
      // cleared-public-use state.
      if (isNetworkError(caught)) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(caught?.message || "Clear for public use failed.");
      }
      // Surface field-level errors when the backend returned them.
      if (caught?.data?.errors && typeof caught.data.errors === "object") {
        setFieldErrors(caught.data.errors);
        // Drop back to the config step so the field errors are
        // visible next to their inputs.
        setStep("config");
      }
    } finally {
      setBusy(false);
    }
  }

  const showStartTime = form.mode !== "WHOLE_DAY";
  const showEndTime = form.mode === "TIME_RANGE";

  const titleByStep = {
    config: "Clear for public use",
    warning: "Clear for public use",
    success: "Public use cleared"
  };
  const subtitleByStep = {
    config: "Open the court for free public play.",
    warning: "Confirm the cancellation effect.",
    success: "The backend has applied the public-use clearance."
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      kicker="Clear for public use"
      title={titleByStep[step]}
      subtitle={subtitleByStep[step]}
      busy={busy}
      initialFocusRef={stepFocusRef}
      footer={renderFooter()}
    >
      {renderBody()}
    </ModalShell>
  );

  function renderBody() {
    if (step === "config") {
      return (
        <form id={formId} onSubmit={handleContinueToWarning} noValidate>
          {error && <div className="alert error" role="alert">{error}</div>}

          {/* Selected-schedule context band: shows what date and
            time range will be cleared in plain words so the admin
            can see at a glance what they're about to do
            (Req. OPUS-UI-005). The text reflects the live form. */}
          <div className="modal-context-banner" role="note" aria-live="polite">
            <span className="modal-context-label">Will clear for public use</span>
            <strong className="modal-context-value">{describeClearTarget(form)}</strong>
          </div>

          <div className="form-grid">
            <Field
              id="clear-public-use-mode"
              label="Mode"
              error={fieldErrors.mode}
              wide
            >
              <select
                name="mode"
                value={form.mode}
                onChange={(event) => updateField("mode", event.target.value)}
                ref={stepFocusRef}
              >
                {MODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="clear-public-use-date" label="Date" error={fieldErrors.date} wide>
              <input
                name="date"
                type="date"
                autoComplete="off"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
            </Field>

            {showStartTime && (
              <Field
                id="clear-public-use-startTime"
                label="Start time"
                error={fieldErrors.startTime}
                wide={!showEndTime}
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
                id="clear-public-use-endTime"
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
              id="clear-public-use-reason"
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
      );
    }

    if (step === "warning") {
      return (
        <>
          {error && <div className="alert error" role="alert">{error}</div>}

          <div className="modal-context-banner modal-context-banner-strong" role="note">
            <span className="modal-context-label">Clearing</span>
            <strong className="modal-context-value">{describeClearTarget(form)}</strong>
          </div>

          <div className="alert warning" role="alert">
            <strong>Heads up: </strong>
            {WARNING_COPY}.
          </div>

          <p className="form-copy">
            This is different from a Maintenance block. Clearing for public use opens
            the court for free public play and {WARNING_COPY}. Maintenance blocks only
            mark the court as unavailable and do not cancel reservations.
          </p>
        </>
      );
    }

    // step === "success"
    return (
      <>
        <div className="alert success" role="status" aria-live="polite" aria-atomic="true">
          The court has been cleared for public use.
        </div>

        <CancellationsPanel
          cancelledReservations={result?.cancelledReservations}
        />
      </>
    );
  }

  function renderFooter() {
    if (step === "config") {
      return (
        <>
          <button className="btn btn-light" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            form={formId}
            disabled={busy}
          >
            Continue
          </button>
        </>
      );
    }

    if (step === "warning") {
      return (
        <>
          <button
            className="btn btn-light"
            type="button"
            onClick={handleBackToConfig}
            disabled={busy}
            ref={stepFocusRef}
          >
            Go back
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleConfirmClear}
            disabled={busy}
          >
            {busy ? "Clearing..." : "Yes, clear public use"}
          </button>
        </>
      );
    }

    // step === "success"
    return (
      <button
        className="btn btn-primary"
        type="button"
        onClick={onClose}
        ref={stepFocusRef}
      >
        Done
      </button>
    );
  }
}

function CancellationsPanel({ cancelledReservations }) {
  const list = Array.isArray(cancelledReservations) ? cancelledReservations : [];

  return (
    <section className="card padded-card" aria-labelledby="cancellations-heading">
      <div className="card-section-head">
        <h2 id="cancellations-heading">Cancellations</h2>
        <span>
          {list.length === 0
            ? "No active reservations were affected."
            : `${list.length} reservation${list.length === 1 ? "" : "s"} cancelled`}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="form-copy">
          No overlapping active reservations were found, so nothing was cancelled.
        </p>
      ) : (
        <ul className="detail-grid staff-detail-grid">
          {list.map((entry, index) => (
            <li key={entry?.reservationId ?? index} className="detail-row">
              <dt>Cancelled reservation</dt>
              <dd>{formatReferenceNo(entry?.referenceNo)}</dd>
            </li>
          ))}
        </ul>
      )}
    </section>
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
// including any from-time-onward language so the admin sees exactly
// what range will be cleared. Falls back gently when the form is still
// being filled out.
function describeClearTarget(form) {
  const datePart = form.date ? formatDate(form.date) : "";
  if (!datePart) return "Pick a date below.";

  if (form.mode === "WHOLE_DAY") {
    return `${datePart} (whole day)`;
  }

  if (form.mode === "FROM_TIME_ONWARD") {
    return form.startTime
      ? `${datePart} from ${formatTime(form.startTime)} onward`
      : `${datePart} (pick a start time below)`;
  }

  if (form.startTime && form.endTime) {
    return `${datePart} from ${formatTime(form.startTime)} to ${formatTime(form.endTime)}`;
  }

  if (form.startTime) {
    return `${datePart} starting ${formatTime(form.startTime)}`;
  }

  return `${datePart} (pick a time below)`;
}
