import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { Field } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

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

export function ReservationFormPage({ reservationId, onNavigate }) {
  const isEdit = Boolean(reservationId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [originalSlot, setOriginalSlot] = useState(null);
  const [state, setState] = useState({ loading: isEdit, saving: false, error: "", fieldErrors: {} });
  const [availability, setAvailability] = useState({ loading: false, data: null, error: "", errors: {} });
  const [timeTouched, setTimeTouched] = useState(false);
  const [endTimeOverride, setEndTimeOverride] = useState(false);

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
        setState({ loading: false, saving: false, error: error.message, fieldErrors: {} });
      });

    return () => {
      active = false;
    };
  }, [isEdit, reservationId]);

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

  useEffect(() => {
    if (!canCheckAvailability) {
      setAvailability({ loading: false, data: null, error: "", errors: {} });
      return;
    }

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
      apiRequest(`/api/availability?${params.toString()}`)
        .then((data) => {
          if (!active) return;
          setAvailability({ loading: false, data, error: "", errors: {} });
        })
        .catch((error) => {
          if (!active) return;
          setAvailability({
            loading: false,
            data: null,
            error: error.message,
            errors: error.data?.errors || {}
          });
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [canCheckAvailability, form.endTime, form.reservationDate, form.startTime, isEdit, reservationId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
    setState((current) => ({ ...current, saving: true, error: "", fieldErrors: {} }));

    try {
      const payload = isEdit ? { ...form } : { ...form, statusCode: "RESERVED" };
      await apiRequest(isEdit ? `/api/reservations/${reservationId}` : "/api/reservations", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      onNavigate("/reservations");
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: buildSubmitError(error),
        fieldErrors: error.data?.errors || {}
      }));
    }
  }

  if (state.loading) return <LoadingState label="Loading reservation..." />;

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

      <form className="card staff-reservation-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <h3><span className="section-num">1</span>Who is booking?</h3>
          <div className="section-hint">Sino ang magpapa-reserba?</div>
          <div className="form-grid">
            <Field
              id="representativeName"
              label="Requester or group"
              filipino="Pangalan o grupo"
              hint="Example: Liga ng Kabataan, Rodriguez Family, Purok 3 Youth"
              error={state.fieldErrors.representativeName}
              wide
            >
              <input autoComplete="name" value={form.representativeName} onChange={(event) => updateField("representativeName", event.target.value)} required />
            </Field>
            <Field id="contactNo" label="Contact number" filipino="Cellphone number" error={state.fieldErrors.contactNo}>
              <input autoComplete="tel" value={form.contactNo} onChange={(event) => updateField("contactNo", event.target.value)} required />
            </Field>
            <Field id="address" label="Address" filipino="Tirahan" error={state.fieldErrors.address}>
              <input autoComplete="street-address" value={form.address} onChange={(event) => updateField("address", event.target.value)} required />
            </Field>
            <Field
              id="purpose"
              label="Purpose"
              filipino="Para saan"
              hint="Example: League game, practice, birthday, community meeting"
              error={state.fieldErrors.purpose}
              wide
            >
              <input autoComplete="off" value={form.purpose} onChange={(event) => updateField("purpose", event.target.value)} required />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3><span className="section-num">2</span>When will they use the court?</h3>
          <div className="section-hint">Kailan nila gustong gamitin?</div>

          <Field id="reservationDate" label="Date" filipino="Petsa" error={state.fieldErrors.reservationDate}>
            <input type="date" autoComplete="off" value={form.reservationDate} onChange={(event) => updateField("reservationDate", event.target.value)} required />
          </Field>

          <div className="slot-picker time-chip-picker" aria-label="Start time picker">
            <span className="field-label">
              Start time <span className="fil">· Anong oras magsisimula</span>
              <span className="req"> *</span>
            </span>
            <span className="field-hint">Tap when the court time begins. The end time is calculated from the duration below.</span>
            <div
              className="time-grid"
              role="radiogroup"
              aria-label="Start time"
              onKeyDown={(event) => handleTimeChipKeyDown(event, form.startTime, applyStartTime)}
            >
              {TIME_OPTIONS.slice(0, -1).map((time) => {
                const selected = form.startTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-pressed={selected}
                    tabIndex={selected ? 0 : -1}
                    data-time={time}
                    className={`time-chip ${selected ? "selected" : ""}`}
                    onClick={() => applyStartTime(time)}
                  >
                    {formatTime(time)}
                  </button>
                );
              })}
            </div>
            {state.fieldErrors.startTime && <span className="field-error">{state.fieldErrors.startTime}</span>}
          </div>

          <div className="slot-picker" aria-label="Quick duration controls">
            <span className="field-label">Duration <span className="fil">· Gaano katagal</span></span>
            <div className="duration-pick">
              {[1, 2, 3, 4].map((hours) => (
                <button key={hours} type="button" className={durationHours(form.startTime, form.endTime) === hours ? "on" : ""} onClick={() => applyDuration(hours)}>
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
            onApplySuggestion={applySuggestion}
          />
        </section>

        <section className="form-section">
          <h3><span className="section-num">3</span>Any notes?</h3>
          <div className="section-hint">Mga paalala</div>
          <Field id="remarks" label="Remarks" filipino="Paalala" error={state.fieldErrors.remarks} wide>
            <textarea autoComplete="off" value={form.remarks} onChange={(event) => updateField("remarks", event.target.value)} rows="4" />
          </Field>
        </section>

        <div className="form-footer">
          <button className="btn btn-light btn-big" type="button" onClick={() => onNavigate("/reservations")} disabled={state.saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-big"
            type="submit"
            disabled={state.saving || hasKnownConflict}
            title={hasKnownConflict ? "Pick a different time before saving" : undefined}
          >
            {state.saving ? "Saving..." : isEdit ? "Save Changes" : "Save Reservation"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AvailabilityNotice({ availability, canCheck, isEdit, hasEditedTimeChanged, timeTouched, onApplySuggestion }) {
  // Don't show the idle "pick a valid date and time" panel until the user has
  // touched a time field. On a fresh form it would be pre-emptive helper text
  // that creates anxiety where there shouldn't be any.
  if (!timeTouched && !canCheck && !availability.loading && !availability.data && !availability.error) {
    return null;
  }

  if (!canCheck) {
    const unchangedEditSlot = isEdit && !hasEditedTimeChanged;

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
        </div>
      </div>
    );
  }

  if (!availability.data) return null;

  if (availability.data.available) {
    return (
      <div className="banner banner-ok availability-panel" role="status">
        <div className="b-ic"><Icon name="check" /></div>
        <div>
          <h4>This time is available</h4>
          <p>Final save will still be checked by the backend.</p>
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
  if (error.status === 409 && error.data?.overlap) {
    const overlap = error.data.overlap;
    return `${error.message} Conflict: #${overlap.reservationId} ${overlap.representativeName} on ${formatDate(overlap.reservationDate)} ${formatTime(overlap.startTime)} - ${formatTime(overlap.endTime)}.`;
  }

  return error.message;
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
