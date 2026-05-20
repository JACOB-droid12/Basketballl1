import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { formatReferenceNo } from "../api/referenceNo.js";
import { Field } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ResidentPickerDialog } from "../components/ResidentPickerDialog.jsx";

const TIME_OPTIONS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00"
];

// Group the start-time chips by time of day so the staff scans for a
// shorter list of options at once instead of a 14-chip grid (Req.
// OPUS-UI-002). Backend validation rules and the underlying
// `TIME_OPTIONS` array do not change — this is presentation-only,
// so any time the backend allows is still selectable here.
const TIME_PERIODS = [
  {
    id: "morning",
    label: "Morning",
    match: (time) => time < "12:00"
  },
  {
    id: "afternoon",
    label: "Afternoon",
    match: (time) => time >= "12:00" && time < "17:00"
  },
  {
    id: "evening",
    label: "Evening",
    match: (time) => time >= "17:00"
  }
];

const EMPTY_FORM = {
  representativeName: "",
  contactNo: "",
  address: "",
  purpose: "",
  reservationDate: getManilaDate(),
  startTime: "07:00",
  endTime: "08:00",
  remarks: "",
  statusCode: "RESERVED"
};

// Pick the first start time on the standard hourly grid that has not
// already passed in Manila. Used to seed the New Reservation form with
// a slot the staff can actually book today (UI-AUD-002). When every
// slot for today is already in the past, leave startTime/endTime
// empty so a disabled chip is never the active selection — the staff
// member must explicitly pick a non-disabled slot before Save enables.
function buildInitialForm() {
  const date = getManilaDate();
  const currentTime = getManilaTime();
  const startCandidates = TIME_OPTIONS.slice(0, -1);
  const firstFuture = startCandidates.find((time) => time > currentTime);

  let startTime = "";
  let endTime = "";
  if (firstFuture) {
    startTime = firstFuture;
    const startIndex = TIME_OPTIONS.indexOf(firstFuture);
    endTime = TIME_OPTIONS[startIndex + 1] || "";
  }

  return {
    representativeName: "",
    contactNo: "",
    address: "",
    purpose: "",
    reservationDate: date,
    startTime,
    endTime,
    remarks: "",
    statusCode: "RESERVED"
  };
}

// Field length caps mirror the DB columns in database/schema.sql so we never
// let the user type past what the server can store. Remarks is TEXT in the DB
// but we cap it at 1000 chars on the client to keep the form printable and
// the Activity Log readable.
const MAX_REPRESENTATIVE_NAME = 140;
const MAX_CONTACT_NO = 30;
const MAX_ADDRESS = 255;
const MAX_PURPOSE = 120;
const MAX_REMARKS = 1000;
const CONTACT_NUMBER_PATTERN = String.raw`[0-9+\x2d\(\)\s]{7,30}`;

export function ReservationFormPage({ reservationId, onNavigate }) {
  const isEdit = Boolean(reservationId);
  const residentIdFromQuery = getResidentIdFromLocation();
  const [form, setForm] = useState(() => (isEdit ? EMPTY_FORM : buildInitialForm()));
  const [originalSlot, setOriginalSlot] = useState(null);
  const [state, setState] = useState({ loading: isEdit, saving: false, error: "", fieldErrors: {} });
  const [availability, setAvailability] = useState({ loading: false, data: null, error: "", errors: {} });
  const [timeTouched, setTimeTouched] = useState(false);
  const [endTimeOverride, setEndTimeOverride] = useState(false);
  // The saved reservation returned by the backend after a successful create
  // or edit. We hold it locally so the staff member can read the freshly
  // assigned `referenceNo` from the saved-confirmation surface (Req. 1.1)
  // before navigating back to the reservations list.
  const [savedReservation, setSavedReservation] = useState(null);
  // Toggles the resident directory picker. The picker is mounted only when
  // open so its mount-time fetch (`GET /api/residents`) doesn't fire on
  // every form load — it should only run when the staff actively asks
  // to "Choose from directory" (Req. 9.3).
  const [residentPickerOpen, setResidentPickerOpen] = useState(false);
  // Bumping availabilityRetry retriggers the availability check after a
  // network or server error without the user having to re-touch a time field.
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [todayInManila, setTodayInManila] = useState(getManilaDate);
  const [currentManilaTime, setCurrentManilaTime] = useState(getManilaTime);
  // Court_Policy_Settings loaded once when the form mounts so the Save
  // button can be gated against the same min/max-duration policy the
  // backend enforces (UI-AUD-002, Req. 1.4). On a load failure we leave
  // `policy` as null and let the backend stay authoritative — the
  // existing 4xx flow already surfaces a duration error inline.
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest("/api/settings/court-policy")
      .then((data) => {
        if (!active) return;
        if (data && data.policy) setPolicy(data.policy);
      })
      .catch(() => {
        // Fail open: the backend remains the authoritative validator.
      });
    return () => {
      active = false;
    };
  }, []);

  // Keep the "is this slot in the past?" check fresh while the form is
  // open. The previous version memoized these once at mount, so a clerk
  // who let the form sit open for a few minutes could still pick a slot
  // that had quietly slipped into the past (UI-AUD-011). A 30-second
  // tick is more than fine for hour-grid slots.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayInManila(getManilaDate());
      setCurrentManilaTime(getManilaTime());
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    let active = true;
    setState((current) => ({ ...current, loading: true, error: "", fieldErrors: {} }));

    apiRequest(`/api/reservations/${reservationId}`)
      .then((data) => {
        if (!active) return;
        const reservation = data.reservation || {};
        const nextForm = {
          representativeName: reservation.representativeName || "",
          contactNo: reservation.contactNo || "",
          address: reservation.address || "",
          purpose: reservation.purpose || "",
          reservationDate: reservation.reservationDate || getManilaDate(),
          startTime: normalizeTime(reservation.startTime) || "07:00",
          endTime: normalizeTime(reservation.endTime) || "08:00",
          remarks: reservation.remarks || "",
          statusCode: reservation.statusCode || "RESERVED"
        };
        setForm(nextForm);
        setOriginalSlot({
          reservationDate: nextForm.reservationDate,
          startTime: nextForm.startTime,
          endTime: nextForm.endTime
        });
        setTimeTouched(false);
        setState({ loading: false, saving: false, error: "", fieldErrors: {} });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, saving: false, error: friendlyLoadError(error), fieldErrors: {} });
      });

    return () => {
      active = false;
    };
  }, [isEdit, reservationId]);

  useEffect(() => {
    if (isEdit || !residentIdFromQuery) return;

    let active = true;
    setState((current) => ({ ...current, error: "" }));

    apiRequest(`/api/residents/${residentIdFromQuery}`)
      .then((data) => {
        if (!active) return;
        const resident = data?.resident || null;
        if (!resident) {
          setState((current) => ({
            ...current,
            error: "This resident directory entry could not be found. You can still encode the reservation manually."
          }));
          return;
        }

        setForm((current) => ({
          ...current,
          representativeName: resident.name || resident.group || current.representativeName,
          contactNo: resident.contactNumber || current.contactNo,
          address: resident.address || current.address
        }));
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          error: friendlyResidentPrefillError(error)
        }));
      });

    return () => {
      active = false;
    };
  }, [isEdit, residentIdFromQuery]);

  const hasEditedTimeChanged = useMemo(() => {
    if (!isEdit) return true;
    if (!originalSlot) return false;

    return originalSlot.reservationDate !== form.reservationDate ||
      originalSlot.startTime !== form.startTime ||
      originalSlot.endTime !== form.endTime;
  }, [form.endTime, form.reservationDate, form.startTime, isEdit, originalSlot]);

  const canCheckAvailability = useMemo(() => {
    // In create mode, hold the availability check until the user has touched a
    // time field. Otherwise the success banner pops on page load for the
    // default 7-8am slot — pre-emptive helper text that creates anxiety.
    if (!isEdit && !timeTouched) return false;
    return hasEditedTimeChanged && isValidDate(form.reservationDate) && isValidTimeRange(form.startTime, form.endTime);
  }, [form.endTime, form.reservationDate, form.startTime, hasEditedTimeChanged, isEdit, timeTouched]);

  const hasKnownConflict = Boolean(availability.data && availability.data.available === false);

  // Same-day past-time guard. The backend already rejects today-with-
  // a-past-start, but the staff should not be able to press Save and
  // wait for a 400. We disable the Save button as soon as the form
  // points at today and the chosen start time has already passed,
  // and we surface the reason as a tooltip so the clerk knows why
  // (UI-AUD-002, UI-AUD-011).
  // Set of start-time values rendered as disabled chips for today's
  // form. Used by the chip render loop below so a disabled chip is
  // never marked as the active selection (UI-AUD-002, Req. 1.2) and
  // by `cannotSaveReason` so the Save button stays disabled while
  // `form.startTime` is one of those past values (Req. 1.3).
  const disabledStartTimes = useMemo(() => {
    if (form.reservationDate !== todayInManila) return new Set();
    return new Set(TIME_OPTIONS.filter((time) => time <= currentManilaTime));
  }, [currentManilaTime, form.reservationDate, todayInManila]);

  const cannotSaveReason = (() => {
    // Order matters: surface the most specific reason first so the
    // tooltip matches the field the staff member needs to fix.
    if (!form.startTime) return "Pick a start time before saving.";
    if (disabledStartTimes.has(form.startTime)) {
      return "This time has already passed today. Pick a later start time.";
    }
    if (!isValidDate(form.reservationDate)) {
      return "Pick a date before saving";
    }
    if (!isValidTimeRange(form.startTime, form.endTime)) {
      return "Pick a valid start and end time before saving";
    }
    if (durationOutsidePolicy(form, policy)) {
      const min = Number(policy?.minimumReservationMinutes);
      const max = Number(policy?.maximumReservationMinutes);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `End time is outside the policy's min/max duration (${min} to ${max} minutes).`;
      }
      return "End time is outside the policy's min/max duration.";
    }
    if (hasKnownConflict) return "Pick a different time before saving";
    return "";
  })();

  useEffect(() => {
    if (!canCheckAvailability) {
      setAvailability({ loading: false, data: null, error: "", errors: {} });
      return;
    }

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        date: form.reservationDate,
        startTime: form.startTime,
        endTime: form.endTime
      });
      if (isEdit) {
        params.set("reservationId", reservationId);
      }

      setAvailability({ loading: true, data: null, error: "", errors: {} });
      apiRequest(`/api/availability?${params.toString()}`, { signal: controller.signal })
        .then((data) => {
          if (!active) return;
          setAvailability({ loading: false, data, error: "", errors: {} });
        })
        .catch((error) => {
          // An aborted request is not a real error — it just means the user
          // moved to a different time before the response landed.
          if (!active || error?.name === "AbortError") return;
          setAvailability({
            loading: false,
            data: null,
            error: friendlyAvailabilityError(error),
            errors: error.data?.errors || {}
          });
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
    // availabilityRetry is intentionally a dependency so the user's "Try
    // again" tap re-runs this effect even when no other input changed.
  }, [canCheckAvailability, form.endTime, form.reservationDate, form.startTime, isEdit, reservationId, availabilityRetry]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // If the staff member moved the reservation onto today's date and
      // the saved start time has already passed, gently bump the start
      // forward to the next future slot so the form does not re-enter
      // the disabled-past-time state. End time follows the existing
      // duration so the duration controls below stay accurate
      // (UI-AUD-002).
      if (field === "reservationDate" && value === todayInManila) {
        if (TIME_OPTIONS.includes(current.startTime) && current.startTime <= currentManilaTime) {
          const startCandidates = TIME_OPTIONS.slice(0, -1);
          const firstFuture = startCandidates.find((time) => time > currentManilaTime);
          if (firstFuture) {
            const startIndex = TIME_OPTIONS.indexOf(firstFuture);
            const currentDuration = Math.max(1, durationHours(current.startTime, current.endTime) || 1);
            const nextEnd = TIME_OPTIONS[startIndex + currentDuration] || TIME_OPTIONS[TIME_OPTIONS.length - 1];
            next.startTime = firstFuture;
            next.endTime = nextEnd;
          }
        }
      }
      return next;
    });
    setState((current) => ({
      ...current,
      fieldErrors: { ...current.fieldErrors, [field]: "" },
      error: ""
    }));
    if (field === "reservationDate" || field === "startTime" || field === "endTime") {
      setTimeTouched(true);
    }
  }

  function applyDuration(hours) {
    const startIndex = TIME_OPTIONS.indexOf(form.startTime);
    if (startIndex < 0) return;
    const nextEnd = TIME_OPTIONS[startIndex + hours];
    if (nextEnd) updateField("endTime", nextEnd);
  }

  function applyStartTime(time) {
    const startIndex = TIME_OPTIONS.indexOf(time);
    if (startIndex < 0) return;
    const currentDuration = Math.max(1, durationHours(form.startTime, form.endTime) || 1);
    const nextEnd = TIME_OPTIONS[startIndex + currentDuration] || TIME_OPTIONS[TIME_OPTIONS.length - 1];
    setForm((current) => ({ ...current, startTime: time, endTime: nextEnd }));
    setState((current) => ({
      ...current,
      fieldErrors: { ...current.fieldErrors, startTime: "", endTime: "", timeRange: "" },
      error: ""
    }));
    setTimeTouched(true);
  }

  function applySuggestion(slot) {
    setForm((current) => ({
      ...current,
      reservationDate: slot.date || current.reservationDate,
      startTime: normalizeTime(slot.startTime) || current.startTime,
      endTime: normalizeTime(slot.endTime) || current.endTime
    }));
    setState((current) => ({ ...current, error: "", fieldErrors: {} }));
    setTimeTouched(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Defense-in-depth against double-submit: the button is already disabled
    // while saving, but this catches the rare Enter-key path where the focus
    // lands on a non-button element.
    if (state.saving) return;
    // Enter-key safeguard for the disabled-Save state (Req. 1.6, UI-AUD-002).
    // The Save button is already wired with `disabled={state.saving ||
    // Boolean(cannotSaveReason)}`, but a stray Enter from inside an input
    // can still trigger form submission. When `cannotSaveReason` is set we
    // keep the form open, surface the reason in the existing inline alert,
    // and preserve any backend-supplied per-field errors so the staff sees
    // the blocking field by name without sending a request.
    if (cannotSaveReason) {
      setState((current) => ({
        ...current,
        saving: false,
        error: cannotSaveReason,
        fieldErrors: { ...current.fieldErrors }
      }));
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "", fieldErrors: {} }));

    try {
      const payload = isEdit ? { ...form } : { ...form, statusCode: "RESERVED" };
      const response = await apiRequest(isEdit ? `/api/reservations/${reservationId}` : "/api/reservations", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      // Surface the just-saved reservation so the staff member can read the
      // backend-assigned `referenceNo` before navigating away (Req. 1.1).
      // The list page is still one click away via the confirmation panel.
      const reservation = response && response.reservation ? response.reservation : null;
      setSavedReservation(reservation);
      setState((current) => ({ ...current, saving: false, error: "", fieldErrors: {} }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: buildSubmitError(error),
        fieldErrors: error.data?.errors || {}
      }));
    }
  }

  function handleResidentSelect(prefill) {
    // The dialog hands us only the three fields the reservation form needs
    // to prefill — representativeName, contactNo, and address (Req. 9.3).
    // We update each field through the existing `updateField` path so
    // per-field error state and the form's "edited" markers clear in
    // the same way as a manual edit.
    if (!prefill) return;
    if (prefill.representativeName) updateField("representativeName", prefill.representativeName);
    if (prefill.contactNo) updateField("contactNo", prefill.contactNo);
    if (prefill.address) updateField("address", prefill.address);
  }

  if (state.loading) return <LoadingState label="Loading reservation..." />;

  if (savedReservation) {
    // Saved-confirmation surface: shows the backend-assigned `referenceNo`
    // (Req. 1.1) so the clerk can write it on the resident's slip before
    // moving on. Reuses the existing `.banner.banner-ok`/`alert` markup
    // and the `EmptyState`-style state card so we don't introduce any new
    // CSS class vocabulary (Req. 18.1).
    return (
      <ReservationSavedPanel
        reservation={savedReservation}
        isEdit={isEdit}
        onNavigate={onNavigate}
        onCreateAnother={() => {
          setSavedReservation(null);
          setForm(buildInitialForm());
          setOriginalSlot(null);
          setTimeTouched(false);
          setEndTimeOverride(false);
          setAvailability({ loading: false, data: null, error: "", errors: {} });
        }}
      />
    );
  }

  return (
    <section className="page staff-form-page">
      <div className="page-header page-head staff-page-head">
        <div>
          <h1 className="page-title">{isEdit ? "Edit Reservation" : "New Reservation"}</h1>
          <div className="page-sub">Fill this out while the resident is at the counter.</div>
          <div className="page-sub-fil">Punan habang nasa counter ang residente.</div>
        </div>
        <button className="btn btn-light btn-big" type="button" onClick={() => onNavigate("/reservations")}>
          Back to Bookings
        </button>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <form
        className="card staff-reservation-form"
        onSubmit={handleSubmit}
        aria-busy={state.saving ? "true" : undefined}
        noValidate
      >
        <section className="form-section">
          <h2><span className="section-num">1</span>Who is booking?</h2>
          <div className="section-hint">Sino ang magpapa-reserba?</div>
          <div className="slot-picker" aria-label="Resident directory shortcut">
            <span className="field-hint">
              Pick a saved resident or group to prefill the requester fields.
            </span>
            <div>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setResidentPickerOpen(true)}
              >
                <Icon name="info" size={16} />
                <span>Choose from directory</span>
              </button>
            </div>
          </div>
          <div className="form-grid">
            <Field
              id="representativeName"
              label="Requester or group"
              filipino="Pangalan o grupo"
              hint="Example: Liga ng Kabataan, Rodriguez Family, Purok 3 Youth"
              error={state.fieldErrors.representativeName}
              wide
            >
              <input
                autoComplete="name"
                maxLength={MAX_REPRESENTATIVE_NAME}
                value={form.representativeName}
                onChange={(event) => updateField("representativeName", event.target.value)}
                required
              />
            </Field>
            <Field id="contactNo" label="Contact number" filipino="Cellphone number" error={state.fieldErrors.contactNo}>
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={MAX_CONTACT_NO}
                pattern={CONTACT_NUMBER_PATTERN}
                value={form.contactNo}
                onChange={(event) => updateField("contactNo", event.target.value)}
                required
              />
            </Field>
            <Field id="address" label="Address" filipino="Tirahan" error={state.fieldErrors.address}>
              <input
                autoComplete="street-address"
                maxLength={MAX_ADDRESS}
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                required
              />
            </Field>
            <Field
              id="purpose"
              label="Purpose"
              filipino="Para saan"
              hint="Example: League game, practice, birthday, community meeting"
              error={state.fieldErrors.purpose}
              wide
            >
              <input
                autoComplete="off"
                maxLength={MAX_PURPOSE}
                value={form.purpose}
                onChange={(event) => updateField("purpose", event.target.value)}
                required
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2><span className="section-num">2</span>When will they use the court?</h2>
          <div className="section-hint">Kailan nila gustong gamitin?</div>

          <Field
            id="reservationDate"
            label="Date"
            filipino="Petsa"
            hint={isPastDate(form.reservationDate, todayInManila) ? "This date is in the past. Use this only when recording a walk-in that already happened." : undefined}
            error={state.fieldErrors.reservationDate}
          >
            <input
              type="date"
              autoComplete="off"
              value={form.reservationDate}
              onChange={(event) => updateField("reservationDate", event.target.value)}
              required
            />
          </Field>

          {isLegacyTimeSlot(form.startTime, form.endTime) && (
            <div className="banner banner-info availability-panel" role="status">
              <div className="b-ic"><Icon name="info" /></div>
              <div>
                <h4>Saved time uses an old slot</h4>
                <p>This reservation was saved at {formatTime(form.startTime)} to {formatTime(form.endTime)}, which is not on the current hourly grid. Pick a Start time below to move it onto the standard schedule, or open Adjust end time manually to keep a custom end.</p>
              </div>
            </div>
          )}

          <div className="slot-picker time-chip-picker" aria-label="Start time picker">
            <span className="field-label">
              Start time <span className="fil">· Anong oras magsisimula</span>
              <span className="req"> *</span>
            </span>
            <span className="field-hint">Tap when the court time begins. The end time is calculated from the duration below.</span>
            <div
              className="time-period-groups"
              role="radiogroup"
              aria-label="Start time"
              onKeyDown={(event) => handleTimeChipKeyDown(event, form.startTime, applyStartTime)}
            >
              {TIME_PERIODS.map((period) => {
                const periodTimes = TIME_OPTIONS.slice(0, -1).filter((time) => period.match(time));
                if (periodTimes.length === 0) return null;
                return (
                  <div className="time-period-group" key={period.id}>
                    <div className="time-period-label" aria-hidden="true">
                      {period.label}
                    </div>
                    <div className="time-grid">
                      {periodTimes.map((time) => {
                        const selected = form.startTime === time;
                        const disabled = disabledStartTimes.has(time);
                        const activeSelection = selected && !disabled;
                        return (
                          <button
                            key={time}
                            type="button"
                            role="radio"
                            aria-checked={activeSelection}
                            tabIndex={selected ? 0 : -1}
                            data-time={time}
                            className={`time-chip ${activeSelection ? "selected" : ""}`}
                            onClick={() => applyStartTime(time)}
                            disabled={disabled}
                            title={disabled ? "This time has already passed today" : undefined}
                          >
                            {formatTime(time)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {state.fieldErrors.startTime && <span className="field-error">{state.fieldErrors.startTime}</span>}
          </div>

          <div className="slot-picker" aria-label="Quick duration controls">
            <span className="field-label">Duration <span className="fil">· Gaano katagal</span></span>
            <div className="duration-pick">
              {[1, 2, 3, 4].map((hours) => (
                <button key={hours} type="button" className={durationHours(form.startTime, form.endTime) === hours ? "on" : ""} aria-pressed={durationHours(form.startTime, form.endTime) === hours} onClick={() => applyDuration(hours)}>
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          <div className="end-time-summary" aria-live="polite">
            <div className="end-time-summary-main">
              <span>Will end at</span>
              <strong>{formatTime(form.endTime)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-light end-time-override-toggle"
              onClick={() => setEndTimeOverride((current) => !current)}
              aria-expanded={endTimeOverride}
              aria-controls="end-time-override-panel"
            >
              <Icon name={endTimeOverride ? "x" : "clock"} size={16} />
              <span>{endTimeOverride ? "Use auto end time" : "Adjust end time manually"}</span>
            </button>
            {endTimeOverride && (
              <div id="end-time-override-panel" className="end-time-override-panel">
                <Field id="endTime" label="End time" filipino="Tapos" error={state.fieldErrors.endTime || state.fieldErrors.timeRange}>
                  <select value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required>
                    {TIME_OPTIONS.slice(1).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </div>

          <AvailabilityNotice
            availability={availability}
            canCheck={canCheckAvailability}
            isEdit={isEdit}
            hasEditedTimeChanged={hasEditedTimeChanged}
            timeTouched={timeTouched}
            suppressUnchangedHint={isLegacyTimeSlot(form.startTime, form.endTime)}
            onApplySuggestion={applySuggestion}
            onRetry={() => setAvailabilityRetry((value) => value + 1)}
          />
        </section>

        <section className="form-section">
          <h2><span className="section-num">3</span>Any notes?</h2>
          <div className="section-hint">Mga paalala</div>
          <Field id="remarks" label="Remarks (optional)" filipino="Paalala" error={state.fieldErrors.remarks} wide>
            <textarea
              autoComplete="off"
              maxLength={MAX_REMARKS}
              value={form.remarks}
              onChange={(event) => updateField("remarks", event.target.value)}
              rows="4"
            />
          </Field>
        </section>

        <div className="form-footer">
          <button className="btn btn-light btn-big" type="button" onClick={() => onNavigate("/reservations")} disabled={state.saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-big"
            type="submit"
            disabled={state.saving || Boolean(cannotSaveReason)}
            title={cannotSaveReason || undefined}
          >
            {state.saving ? "Saving..." : isEdit ? "Save Changes" : "Save Reservation"}
          </button>
        </div>
      </form>

      <ResidentPickerDialog
        open={residentPickerOpen}
        onClose={() => setResidentPickerOpen(false)}
        onSelect={handleResidentSelect}
      />
    </section>
  );
}

function ReservationSavedPanel({ reservation, isEdit, onNavigate, onCreateAnother }) {
  // The backend is the only source of truth for the reference number — we
  // render whatever it returned via `formatReferenceNo`, which falls back
  // to a clear placeholder if the field is missing rather than throwing
  // (Req. 1.1, 1.2, 1.4).
  const referenceNo = formatReferenceNo(reservation && reservation.referenceNo);
  const representativeName = (reservation && reservation.representativeName) || "";
  const reservationDate = (reservation && reservation.reservationDate) || "";
  const startTime = (reservation && reservation.startTime) || "";
  const endTime = (reservation && reservation.endTime) || "";

  return (
    <section className="page staff-form-page">
      <div className="page-header page-head staff-page-head">
        <div>
          <h1 className="page-title">{isEdit ? "Reservation updated" : "Reservation saved"}</h1>
          <div className="page-sub">Hand the reference number to the resident.</div>
          <div className="page-sub-fil">Ibigay ang reference number sa residente.</div>
        </div>
        <button
          className="btn btn-light btn-big"
          type="button"
          onClick={() => onNavigate("/reservations")}
        >
          Back to Bookings
        </button>
      </div>

      <div className="banner banner-ok availability-panel" role="status" aria-live="polite" aria-atomic="true">
        <div className="b-ic"><Icon name="check" /></div>
        <div>
          <h4>Reference number</h4>
          <p>
            <strong>{referenceNo}</strong>
          </p>
          {representativeName && (
            <p>
              {representativeName}
              {reservationDate && ` · ${formatDate(reservationDate)}`}
              {startTime && endTime && ` · ${formatTime(startTime)} to ${formatTime(endTime)}`}
            </p>
          )}
        </div>
      </div>

      <div className="form-footer">
        <button
          className="btn btn-light btn-big"
          type="button"
          onClick={() => onNavigate("/reservations")}
        >
          View bookings
        </button>
        {!isEdit && (
          <button
            className="btn btn-primary btn-big"
            type="button"
            onClick={onCreateAnother}
          >
            Encode another reservation
          </button>
        )}
      </div>
    </section>
  );
}

function AvailabilityNotice({ availability, canCheck, isEdit, hasEditedTimeChanged, timeTouched, suppressUnchangedHint, onApplySuggestion, onRetry }) {
  // Don't show the idle "pick a valid date and time" panel until the user has
  // touched a time field. On a fresh form it would be pre-emptive helper text
  // that creates anxiety where there shouldn't be any.
  if (!timeTouched && !canCheck && !availability.loading && !availability.data && !availability.error) {
    return null;
  }

  if (!canCheck) {
    const unchangedEditSlot = isEdit && !hasEditedTimeChanged;
    // If the legacy-time-slot notice above already explains "this saved time
    // is off the standard grid, pick a Start time below," we'd be repeating
    // ourselves with a second info banner. Skip it.
    if (unchangedEditSlot && suppressUnchangedHint) return null;

    return (
      <div className="banner banner-info availability-panel">
        <div className="b-ic"><Icon name="info" /></div>
        <div>
          <h4>{unchangedEditSlot ? "Current saved time" : "Pick a valid date and time"}</h4>
          <p>{unchangedEditSlot ? "Change the date or time to check availability again." : "The system will check the real court schedule before saving."}</p>
        </div>
      </div>
    );
  }

  if (availability.loading) {
    return (
      <div className="banner banner-info availability-panel">
        <div className="b-ic"><Icon name="info" /></div>
        <div>
          <h4>Checking court availability</h4>
          <p>Please wait while the schedule is checked.</p>
        </div>
      </div>
    );
  }

  if (availability.error) {
    return (
      <div className="banner banner-warn availability-panel" role="alert">
        <div className="b-ic"><Icon name="warn" /></div>
        <div>
          <h4>Availability could not be confirmed</h4>
          <p>{availability.error}</p>
          <ValidationErrorList errors={availability.errors} />
          {typeof onRetry === "function" && (
            <button
              type="button"
              className="btn btn-light availability-retry"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!availability.data) return null;

  if (availability.data.available) {
    return (
      <div className="banner banner-ok availability-panel" role="status" aria-live="polite" aria-atomic="true">
        <div className="b-ic"><Icon name="check" /></div>
        <div>
          <h4>This time is available</h4>
          <p>Available. The system will confirm once the reservation is saved.</p>
        </div>
      </div>
    );
  }

  const conflict = availability.data.conflict;
  const suggestions = Array.isArray(availability.data.suggestions) ? availability.data.suggestions : [];

  return (
    <div className="banner banner-warn availability-panel" role="alert">
      <div className="b-ic"><Icon name="warn" /></div>
      <div>
        <h4>This time is already booked</h4>
        {conflict && (
          <p>
            Conflict: #{conflict.reservationId} for {conflict.representativeName} on {formatDate(conflict.reservationDate)} {formatTime(conflict.startTime)} to {formatTime(conflict.endTime)}.
          </p>
        )}
        {suggestions.length > 0 ? (
          <div className="suggestion-list" aria-label="Suggested available slots">
            {suggestions.slice(0, 4).map((slot) => (
              <button key={`${slot.date}-${slot.startTime}-${slot.endTime}`} type="button" className="time-chip suggestion-chip" onClick={() => onApplySuggestion(slot)}>
                <strong>{formatDate(slot.date)}</strong>
                <span>{slot.name || `${formatTime(slot.startTime)} to ${formatTime(slot.endTime)}`}</span>
              </button>
            ))}
          </div>
        ) : (
          <p>No suggested time is available. Please choose another date.</p>
        )}
      </div>
    </div>
  );
}

function ValidationErrorList({ errors }) {
  const messages = Object.values(errors || {}).filter(Boolean);
  if (messages.length === 0) return null;

  return (
    <ul className="validation-list">
      {messages.map((message) => <li key={message}>{message}</li>)}
    </ul>
  );
}

function buildSubmitError(error) {
  if (error?.name === "AbortError") {
    return "The save was interrupted. Please try again.";
  }

  if (isNetworkError(error)) {
    return "The system is offline or the office network is down. Reservation was not saved. Try again once the network is back.";
  }

  if (error?.status === 409 && error.data?.overlap) {
    const overlap = error.data.overlap;
    return `${error.message} Conflict: #${overlap.reservationId} ${overlap.representativeName} on ${formatDate(overlap.reservationDate)} ${formatTime(overlap.startTime)} - ${formatTime(overlap.endTime)}.`;
  }

  if (error?.status === 401) {
    return "Your session has expired. Sign in again, then re-open this reservation.";
  }

  if (error?.status === 403) {
    return "You do not have permission to save this reservation. Ask the staff lead.";
  }

  if (error?.status === 404) {
    return "This reservation no longer exists. It may have been deleted by another staff member.";
  }

  if (error?.status === 429) {
    return "Too many save attempts in a row. Wait a moment and try again.";
  }

  if (error?.status >= 500) {
    return "The system could not save the reservation. The office computer may need a restart.";
  }

  return error?.message || "Reservation was not saved.";
}

function friendlyLoadError(error) {
  if (isNetworkError(error)) {
    return "The system is offline or the office network is down. Bukas hindi makakonekta. Try again once the network is back.";
  }

  if (error?.status === 401) {
    return "Your session has expired. Sign in again to keep editing.";
  }

  if (error?.status === 403) {
    return "You do not have permission to view this reservation.";
  }

  if (error?.status === 404) {
    return "This reservation could not be found. It may have been deleted.";
  }

  if (error?.status >= 500) {
    return "The system could not load this reservation. The office computer may need a restart.";
  }

  return error?.message || "This reservation could not be loaded.";
}

function friendlyAvailabilityError(error) {
  if (isNetworkError(error)) {
    return "Could not reach the court schedule. Check the office network, then tap Try again.";
  }

  if (error?.status === 401) {
    return "Your session has expired. Sign in again to check availability.";
  }

  if (error?.status >= 500) {
    return "The schedule check did not respond. Tap Try again before saving.";
  }

  return error?.message || "Availability could not be confirmed.";
}

function friendlyResidentPrefillError(error) {
  if (isNetworkError(error)) {
    return "The system is offline or the office network is down. The resident was not prefilled, but you can still encode the reservation manually.";
  }

  if (error?.status === 404) {
    return "This resident directory entry could not be found. You can still encode the reservation manually.";
  }

  if (error?.status === 401) {
    return "Your session has expired. Sign in again, then choose the resident from the directory.";
  }

  if (error?.status >= 500) {
    return "The resident directory could not be loaded. The office computer may need a restart, but you can still encode the reservation manually.";
  }

  return error?.message || "The resident was not prefilled. You can still encode the reservation manually.";
}

function isNetworkError(error) {
  if (!error) return false;
  // fetch() throws a TypeError with no `status` when the request never reached
  // the server (offline, DNS failure, CORS preflight blocked, etc.).
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}

function isPastDate(date, today) {
  if (!isValidDate(date) || !isValidDate(today)) return false;
  return date < today;
}

function isLegacyTimeSlot(startTime, endTime) {
  // Detect saved reservations whose times don't fall on the standard hourly
  // grid the chip picker offers (legacy data, half-hour slots from older
  // imports). Show a calm explanation rather than leaving the chip strip
  // looking unselected.
  if (!isValidTimeRange(startTime, endTime)) return false;
  const startKnown = TIME_OPTIONS.includes(startTime);
  const endKnown = TIME_OPTIONS.includes(endTime);
  return !startKnown || !endKnown;
}

function normalizeTime(time) {
  return String(time || "").slice(0, 5);
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));
}

function isValidTimeRange(startTime, endTime) {
  if (!/^\d{2}:\d{2}$/.test(String(startTime || "")) || !/^\d{2}:\d{2}$/.test(String(endTime || ""))) {
    return false;
  }

  return startTime < endTime;
}

function durationHours(startTime, endTime) {
  const start = TIME_OPTIONS.indexOf(startTime);
  const end = TIME_OPTIONS.indexOf(endTime);
  if (start < 0 || end < 0 || end <= start) return 0;
  return end - start;
}

// Returns true when the form's start/end times produce a duration that
// the loaded `Court_Policy_Settings` rejects (under min, over max).
// Returns false when the policy hasn't loaded yet, when the times don't
// parse, or when the duration is within the policy bounds — the
// backend remains authoritative on save (Req. 1.4, 24.1).
function durationOutsidePolicy(form, policy) {
  if (!policy) return false;
  const min = Number(policy.minimumReservationMinutes);
  const max = Number(policy.maximumReservationMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  const startMinutes = parseTimeToMinutes(form.startTime);
  const endMinutes = parseTimeToMinutes(form.endTime);
  if (startMinutes === null || endMinutes === null) return false;
  const duration = endMinutes - startMinutes;
  if (duration <= 0) return false;
  return duration < min || duration > max;
}

function parseTimeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function handleTimeChipKeyDown(event, currentStart, applyStart) {
  // ARIA radiogroup: arrows cycle, Home/End jump to ends.
  // Only the available start times (TIME_OPTIONS minus the last slot) participate.
  const choices = TIME_OPTIONS.slice(0, -1);
  const currentIndex = choices.indexOf(currentStart);
  if (currentIndex < 0) return;

  let nextIndex = null;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIndex = (currentIndex + 1) % choices.length;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      nextIndex = (currentIndex - 1 + choices.length) % choices.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = choices.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const nextTime = choices[nextIndex];
  applyStart(nextTime);

  // Move keyboard focus to the newly-selected chip so the next arrow press
  // continues from the right anchor.
  const target = event.currentTarget.querySelector(`[data-time="${nextTime}"]`);
  if (target instanceof HTMLElement) target.focus();
}

function getResidentIdFromLocation() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const residentId = String(params.get("residentId") || "").trim();
  return /^[1-9]\d*$/.test(residentId) ? residentId : "";
}

function getManilaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getManilaTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.hour}:${values.minute}`;
}
