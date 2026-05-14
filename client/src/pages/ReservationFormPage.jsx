import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatDate, formatTime } from "../api/mappers.js";
import { LoadingState } from "../components/LoadingState.jsx";

const EMPTY_FORM = {
  representativeName: "",
  contactNo: "",
  address: "",
  purpose: "",
  reservationDate: getManilaDate(),
  startTime: "",
  endTime: "",
  remarks: "",
  statusCode: "RESERVED"
};

export function ReservationFormPage({ reservationId, onNavigate }) {
  const isEdit = Boolean(reservationId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, setState] = useState({ loading: isEdit, saving: false, error: "", fieldErrors: {} });
  const [availability, setAvailability] = useState({ loading: false, data: null, error: "" });

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
          startTime: reservation.startTime || "",
          endTime: reservation.endTime || "",
          remarks: reservation.remarks || "",
          statusCode: reservation.statusCode || "RESERVED"
        };
        setForm(nextForm);
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

  const shouldCheckAvailability = !isEdit && Boolean(form.reservationDate && form.startTime && form.endTime);

  useEffect(() => {
    if (!shouldCheckAvailability) {
      setAvailability({ loading: false, data: null, error: "" });
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        date: form.reservationDate,
        startTime: form.startTime,
        endTime: form.endTime
      });

      setAvailability({ loading: true, data: null, error: "" });
      apiRequest(`/api/availability?${params.toString()}`)
        .then((data) => {
          if (!active) return;
          setAvailability({ loading: false, data, error: "" });
        })
        .catch((error) => {
          if (!active) return;
          setAvailability({ loading: false, data: null, error: error.message });
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.endTime, form.reservationDate, form.startTime, shouldCheckAvailability]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setState((current) => ({
      ...current,
      fieldErrors: { ...current.fieldErrors, [field]: "" },
      error: ""
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", fieldErrors: {} }));

    try {
      await apiRequest(isEdit ? `/api/reservations/${reservationId}` : "/api/reservations", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(form)
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
    <section className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">Reservations</p>
          <h1>{isEdit ? "Edit reservation" : "New reservation"}</h1>
          <p className="page-subtitle">Encode real court booking details. The backend still enforces overlap prevention on save.</p>
        </div>
        <button className="btn btn-light" type="button" onClick={() => onNavigate("/reservations")}>
          Back to Reservations
        </button>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Representative" error={state.fieldErrors.representativeName}>
            <input value={form.representativeName} onChange={(event) => updateField("representativeName", event.target.value)} required />
          </Field>
          <Field label="Contact number" error={state.fieldErrors.contactNo}>
            <input value={form.contactNo} onChange={(event) => updateField("contactNo", event.target.value)} required />
          </Field>
          <Field label="Address" error={state.fieldErrors.address} wide>
            <input value={form.address} onChange={(event) => updateField("address", event.target.value)} required />
          </Field>
          <Field label="Purpose" error={state.fieldErrors.purpose} wide>
            <input value={form.purpose} onChange={(event) => updateField("purpose", event.target.value)} required />
          </Field>
          <Field label="Reservation date" error={state.fieldErrors.reservationDate}>
            <input type="date" value={form.reservationDate} onChange={(event) => updateField("reservationDate", event.target.value)} required />
          </Field>
          <Field label="Start time" error={state.fieldErrors.startTime}>
            <input type="time" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} required />
          </Field>
          <Field label="End time" error={state.fieldErrors.endTime || state.fieldErrors.timeRange}>
            <input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required />
          </Field>
          <Field label="Remarks" error={state.fieldErrors.remarks} wide>
            <textarea value={form.remarks} onChange={(event) => updateField("remarks", event.target.value)} rows="4" />
          </Field>
        </div>

        <AvailabilityNotice availability={availability} shouldCheck={shouldCheckAvailability} />

        <div className="button-row form-actions">
          <button className="btn btn-light" type="button" onClick={() => onNavigate("/reservations")} disabled={state.saving}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={state.saving}>
            {state.saving ? "Saving..." : isEdit ? "Save Changes" : "Create Reservation"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, error, children, wide }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}

function AvailabilityNotice({ availability, shouldCheck }) {
  if (!shouldCheck) return null;

  if (availability.loading) {
    return <div className="alert info">Checking court availability...</div>;
  }

  if (availability.error) {
    return <div className="alert warning" role="alert">Availability could not be confirmed: {availability.error}</div>;
  }

  if (!availability.data) return null;

  if (availability.data.available) {
    return <div className="alert success" role="status">This slot is currently available. Final save will still be checked by the backend.</div>;
  }

  const conflict = availability.data.conflict;
  const suggestions = Array.isArray(availability.data.suggestions) ? availability.data.suggestions : [];

  return (
    <div className="alert warning" role="alert">
      <strong>This slot is not available.</strong>
      {conflict && (
        <span>
          Conflicts with #{conflict.reservationId} for {conflict.representativeName} on {formatDate(conflict.reservationDate)} {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}.
        </span>
      )}
      {suggestions.length > 0 && (
        <span>
          Suggested slots: {suggestions.slice(0, 3).map((slot) => slot.name || `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`).join(", ")}.
        </span>
      )}
    </div>
  );
}

function buildSubmitError(error) {
  if (error.status === 409 && error.data?.overlap) {
    const overlap = error.data.overlap;
    return `${error.message} Conflict: #${overlap.reservationId} ${overlap.representativeName} on ${formatDate(overlap.reservationDate)} ${formatTime(overlap.startTime)} - ${formatTime(overlap.endTime)}.`;
  }

  return error.message;
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
