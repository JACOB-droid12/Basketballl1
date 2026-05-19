import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client.js";
import { Field } from "./Field.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

// Backend `court_settings` allowed_days uses 0..6 with 0 = Sunday
// (see `src/features/settings/courtPolicyRepository.js`). The labels stay
// in the existing English + Filipino italic-helper bilingual pattern used
// elsewhere in the staff console.
const ALLOWED_DAY_OPTIONS = [
  { value: 0, label: "Sun", filipino: "Linggo" },
  { value: 1, label: "Mon", filipino: "Lunes" },
  { value: 2, label: "Tue", filipino: "Martes" },
  { value: 3, label: "Wed", filipino: "Miyerkules" },
  { value: 4, label: "Thu", filipino: "Huwebes" },
  { value: 5, label: "Fri", filipino: "Biyernes" },
  { value: 6, label: "Sat", filipino: "Sabado" }
];

/**
 * Court policy editor form.
 *
 * Renders the eight policy fields returned by `GET /api/settings/court-policy`
 * (`openingTime`, `closingTime`, `minimumReservationMinutes`,
 * `maximumReservationMinutes`, `allowedDays`, `blockedDays`,
 * `gracePeriodBeforeMissedMinutes`, `defaultSlotMinutes`).
 *
 * Read-only for non-admin staff: the inputs are rendered with `readOnly`
 * (or `disabled` for checkboxes) and the save action is not rendered.
 *
 * For `Admin_User`, on submit the form sends `PUT /api/settings/court-policy`
 * via the shared `apiRequest` client. On a `200` response it surfaces a
 * success alert and forwards the latest policy to `onSaved`. When the
 * backend returns a `4xx`/`5xx` body with an `errors` object, each error
 * is rendered next to its corresponding `Field` via the `error` prop.
 * Network failures render the standard offline copy.
 *
 * The form is grouped into four sections (operating hours, reservation
 * durations, calendar, missed-booking grace) with a sticky right-rail
 * preview that visualises the current settings as a single bookable
 * day. Cross-field client-side checks fire on change so an admin sees
 * "Maximum is shorter than minimum" before they round-trip the API.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 17.1, 17.2, 18.1
 */
export function CourtPolicyForm({ user, initialPolicy, onSaved, onNavigate }) {
  const isAdmin = user?.role === "ADMIN";
  const [form, setForm] = useState(() => formFromPolicy(initialPolicy));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => formFromPolicy(initialPolicy));

  useEffect(() => {
    const next = formFromPolicy(initialPolicy);
    setForm(next);
    setSavedSnapshot(next);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
  }, [initialPolicy]);

  // Cross-field client-side checks fire on every form change so an admin
  // doesn't have to round-trip the API to learn min > max. Backend remains
  // the source of truth on save; these are advisory only.
  const crossFieldHints = useMemo(() => buildCrossFieldHints(form), [form]);

  const isDirty = useMemo(() => isFormDifferent(form, savedSnapshot), [form, savedSnapshot]);

  // The "you have unsaved changes" guard: warn before unloading the tab
  // when the admin has typed but not saved. Skipped for non-admin (form
  // is read-only and savedSnapshot stays equal).
  useEffect(() => {
    if (!isAdmin || !isDirty) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      // Older browsers respect returnValue; newer ones show their own copy.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAdmin, isDirty]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field] && !current.timeRange) return current;
      const next = { ...current };
      delete next[field];
      // Time range error spans both opening and closing time inputs.
      if (field === "openingTime" || field === "closingTime") {
        delete next.timeRange;
      }
      return next;
    });
    setFormError("");
    setFormSuccess("");
  }

  function toggleAllowedDay(value) {
    setForm((current) => {
      const days = new Set(current.allowedDays);
      if (days.has(value)) {
        days.delete(value);
      } else {
        days.add(value);
      }
      return {
        ...current,
        allowedDays: [...days].sort((a, b) => a - b)
      };
    });
    setFieldErrors((current) => {
      if (!current.allowedDays) return current;
      const next = { ...current };
      delete next.allowedDays;
      return next;
    });
    setFormError("");
    setFormSuccess("");
  }

  function addBlockedDate(value) {
    if (!value) return;
    setForm((current) => {
      const set = new Set(current.blockedDays);
      set.add(value);
      return { ...current, blockedDays: [...set].sort() };
    });
    setFieldErrors((current) => {
      if (!current.blockedDays) return current;
      const next = { ...current };
      delete next.blockedDays;
      return next;
    });
    setFormError("");
    setFormSuccess("");
  }

  function removeBlockedDate(value) {
    setForm((current) => ({
      ...current,
      blockedDays: current.blockedDays.filter((entry) => entry !== value)
    }));
    setFormError("");
    setFormSuccess("");
  }

  function discardChanges() {
    setForm(savedSnapshot);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAdmin || saving) return;

    setSaving(true);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");

    const payload = {
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      minimumReservationMinutes: toMinutesOrPass(form.minimumReservationMinutes),
      maximumReservationMinutes: toMinutesOrPass(form.maximumReservationMinutes),
      allowedDays: form.allowedDays,
      blockedDays: form.blockedDays,
      gracePeriodBeforeMissedMinutes: toMinutesOrPass(form.gracePeriodBeforeMissedMinutes),
      defaultSlotMinutes: toMinutesOrPass(form.defaultSlotMinutes)
    };

    try {
      const data = await apiRequest("/api/settings/court-policy", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setFormSuccess("Court policy saved.");
      const nextPolicy = data?.policy;
      if (nextPolicy) {
        const nextForm = formFromPolicy(nextPolicy);
        setForm(nextForm);
        setSavedSnapshot(nextForm);
      } else {
        setSavedSnapshot(form);
      }
      if (typeof onSaved === "function" && nextPolicy) {
        onSaved(nextPolicy);
      }
    } catch (error) {
      if (isNetworkError(error)) {
        setFormError(OFFLINE_MESSAGE);
      } else {
        setFieldErrors(error.data?.errors || {});
        setFormError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="court-policy-layout">
      <form className="form-card court-policy-form" onSubmit={handleSubmit} noValidate>
        <header className="form-card-head">
          <p className="page-kicker">Court policy</p>
          <h2>Operating settings</h2>
          <p className="form-copy">
            {isAdmin
              ? "Update opening hours, reservation duration, allowed days, blocked dates, and the grace period before a reservation is marked missed."
              : "These settings can only be changed by an administrator. Ask the office admin if a change is needed."}
          </p>
        </header>

        {formError && <div className="alert error" role="alert">{formError}</div>}
        {formSuccess && <div className="alert success" role="status" aria-live="polite" aria-atomic="true">{formSuccess}</div>}
        {fieldErrors.timeRange && (
          <div className="alert error" role="alert">{fieldErrors.timeRange}</div>
        )}
        {crossFieldHints.length > 0 && (
          <div className="alert warning" role="status">
            <strong>Heads up</strong>
            <ul className="court-policy-hint-list">
              {crossFieldHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="court-policy-group" aria-labelledby="court-policy-group-hours">
          <header className="court-policy-group-head">
            <h3 id="court-policy-group-hours">Operating hours</h3>
            <p>When the court is open for booking each day.</p>
          </header>
          <div className="court-policy-group-body two-up">
            <Field
              id="court-policy-opening-time"
              label="Opening time"
              filipino="Oras ng pagbubukas"
              error={fieldErrors.openingTime}
            >
              <input
                name="openingTime"
                type="time"
                value={form.openingTime}
                readOnly={!isAdmin}
                onChange={(event) => updateField("openingTime", event.target.value)}
              />
            </Field>

            <Field
              id="court-policy-closing-time"
              label="Closing time"
              filipino="Oras ng pagsasara"
              error={fieldErrors.closingTime}
            >
              <input
                name="closingTime"
                type="time"
                value={form.closingTime}
                readOnly={!isAdmin}
                onChange={(event) => updateField("closingTime", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="court-policy-group" aria-labelledby="court-policy-group-durations">
          <header className="court-policy-group-head">
            <h3 id="court-policy-group-durations">Reservation duration</h3>
            <p>How long a single booking can be, and the default slot length.</p>
          </header>
          <div className="court-policy-group-body three-up">
            <Field
              id="court-policy-min-minutes"
              label="Minimum minutes"
              filipino="Pinakamaikling reserbasyon"
              hint="Between 15 and 720."
              error={fieldErrors.minimumReservationMinutes}
            >
              <input
                name="minimumReservationMinutes"
                type="number"
                min={15}
                max={720}
                step={5}
                value={form.minimumReservationMinutes}
                readOnly={!isAdmin}
                onChange={(event) => updateField("minimumReservationMinutes", event.target.value)}
              />
            </Field>

            <Field
              id="court-policy-max-minutes"
              label="Maximum minutes"
              filipino="Pinakamahabang reserbasyon"
              hint="Between 15 and 720; at least the minimum."
              error={fieldErrors.maximumReservationMinutes}
            >
              <input
                name="maximumReservationMinutes"
                type="number"
                min={15}
                max={720}
                step={5}
                value={form.maximumReservationMinutes}
                readOnly={!isAdmin}
                onChange={(event) => updateField("maximumReservationMinutes", event.target.value)}
              />
            </Field>

            <Field
              id="court-policy-default-slot-minutes"
              label="Default slot"
              filipino="Default na haba ng slot"
              hint="Between 15 and 240."
              error={fieldErrors.defaultSlotMinutes}
            >
              <input
                name="defaultSlotMinutes"
                type="number"
                min={15}
                max={240}
                step={5}
                value={form.defaultSlotMinutes}
                readOnly={!isAdmin}
                onChange={(event) => updateField("defaultSlotMinutes", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="court-policy-group" aria-labelledby="court-policy-group-allowed-days">
          <header className="court-policy-group-head">
            <h3 id="court-policy-group-allowed-days">Allowed days</h3>
            <p>Which days of the week the court is open for bookings.</p>
          </header>
          <div className="court-policy-group-body">
            <fieldset
              className="field staff-field wide court-policy-allowed-days"
              aria-describedby={fieldErrors.allowedDays ? "court-policy-allowed-days-error" : undefined}
            >
              <legend className="field-label">
                Allowed days
                <span className="fil">· Mga araw na pwede</span>
              </legend>
              <div className="court-policy-day-options">
                {ALLOWED_DAY_OPTIONS.map((day) => {
                  const checked = form.allowedDays.includes(day.value);
                  const checkboxId = `court-policy-allowed-day-${day.value}`;
                  return (
                    <label key={day.value} htmlFor={checkboxId} className="court-policy-day-option">
                      <input
                        id={checkboxId}
                        name={`allowedDays-${day.value}`}
                        type="checkbox"
                        checked={checked}
                        disabled={!isAdmin}
                        onChange={() => toggleAllowedDay(day.value)}
                      />
                      <span>
                        {day.label}
                        <small className="fil">{day.filipino}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              {fieldErrors.allowedDays && (
                <small id="court-policy-allowed-days-error" className="field-error" role="alert">
                  {fieldErrors.allowedDays}
                </small>
              )}
            </fieldset>
          </div>
        </section>

        <section className="court-policy-group" aria-labelledby="court-policy-group-blocked-dates">
          <header className="court-policy-group-head">
            <h3 id="court-policy-group-blocked-dates">Blocked dates</h3>
            <p>Specific dates the court is closed: holidays, fiestas, or maintenance days.</p>
          </header>
          <div className="court-policy-group-body">
            <BlockedDaysPicker
              isAdmin={isAdmin}
              dates={form.blockedDays}
              error={fieldErrors.blockedDays}
              onAdd={addBlockedDate}
              onRemove={removeBlockedDate}
            />
          </div>
        </section>

        <section className="court-policy-group" aria-labelledby="court-policy-group-grace">
          <header className="court-policy-group-head">
            <h3 id="court-policy-group-grace">Grace period</h3>
            <p>How long a reservation can run past its start time before the system marks it missed.</p>
          </header>
          <div className="court-policy-group-body">
            <Field
              id="court-policy-grace-minutes"
              label="Grace period before missed"
              filipino="Palugit bago markahang hindi dumating"
              hint="Between 0 and 240 minutes."
              error={fieldErrors.gracePeriodBeforeMissedMinutes}
            >
              <input
                name="gracePeriodBeforeMissedMinutes"
                type="number"
                min={0}
                max={240}
                step={1}
                value={form.gracePeriodBeforeMissedMinutes}
                readOnly={!isAdmin}
                onChange={(event) => updateField("gracePeriodBeforeMissedMinutes", event.target.value)}
              />
            </Field>
          </div>
        </section>

        {isAdmin && (
          <div className="button-row form-actions court-policy-actions">
            {isDirty && (
              <button
                className="btn btn-light"
                type="button"
                onClick={discardChanges}
                disabled={saving}
              >
                Discard changes
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save policy"}
            </button>
          </div>
        )}
      </form>

      <CourtPolicyPreview form={form} />
    </div>
  );
}

function BlockedDaysPicker({ isAdmin, dates, error, onAdd, onRemove }) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (dates.includes(trimmed)) {
      setDraft("");
      return;
    }
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <div className={`court-policy-blocked${error ? " has-error" : ""}`}>
      <div className="court-policy-blocked-label">
        <span className="field-label">
          Blocked dates
          <span className="fil">· Mga petsang sarado</span>
        </span>
        <span className="field-hint">Holidays, fiestas, maintenance days. Pick one and add it; remove with the X.</span>
      </div>

      {isAdmin && (
        <div className="court-policy-blocked-add">
          <input
            id="court-policy-blocked-add"
            name="blockedDateDraft"
            type="date"
            className="input court-policy-blocked-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
            aria-label="Pick a date to block"
          />
          <button
            type="button"
            className="btn btn-light"
            onClick={handleAdd}
            disabled={!draft}
          >
            Add date
          </button>
        </div>
      )}

      {dates.length === 0 ? (
        <p className="court-policy-blocked-empty">No blocked dates set.</p>
      ) : (
        <ul className="court-policy-blocked-list" aria-label="Blocked dates">
          {dates.map((date) => (
            <li key={date} className="court-policy-blocked-chip">
              <span>{formatBlockedDate(date)}</span>
              {isAdmin && (
                <button
                  type="button"
                  className="court-policy-blocked-remove"
                  aria-label={`Remove ${date}`}
                  onClick={() => onRemove(date)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <small className="field-error" role="alert">{error}</small>
      )}
    </div>
  );
}

function CourtPolicyPreview({ form }) {
  // Live preview of how the current settings map to a real bookable day.
  // Renders the seven-day strip with allowed/blocked tints, then a single
  // hour ruler from opening to closing tick-marked at the default slot.
  // The preview is informational only; nothing here is editable.
  const opening = parseTimeToMinutes(form.openingTime);
  const closing = parseTimeToMinutes(form.closingTime);
  const slot = numberOrNull(form.defaultSlotMinutes);
  const minMinutes = numberOrNull(form.minimumReservationMinutes);
  const maxMinutes = numberOrNull(form.maximumReservationMinutes);

  const totalMinutes = opening !== null && closing !== null && closing > opening ? closing - opening : null;
  const ticks = totalMinutes !== null && slot !== null && slot > 0
    ? buildSlotTicks(opening, closing, slot)
    : [];
  const previewDayOfWeek = (() => {
    const today = new Date().getDay();
    if (form.allowedDays.includes(today)) return today;
    return form.allowedDays[0] ?? null;
  })();

  return (
    <aside className="court-policy-preview" aria-label="Policy preview">
      <header className="court-policy-preview-head">
        <p className="page-kicker">Preview</p>
        <h2>What staff will see</h2>
        <p>One synthetic day at the current settings. Updates as you edit.</p>
      </header>

      <section className="court-policy-preview-section">
        <h3>Allowed days</h3>
        <ul className="court-policy-preview-week" aria-label="Allowed-day preview">
          {ALLOWED_DAY_OPTIONS.map((day) => {
            const allowed = form.allowedDays.includes(day.value);
            return (
              <li
                key={day.value}
                className={`court-policy-preview-daycell${allowed ? " on" : " off"}`}
                aria-label={`${day.label} ${allowed ? "open" : "closed"}`}
              >
                <span className="court-policy-preview-daylabel">{day.label}</span>
                <span className="court-policy-preview-daystate">{allowed ? "Open" : "Closed"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="court-policy-preview-section">
        <h3>One day, hour by hour</h3>
        {totalMinutes === null ? (
          <p className="court-policy-preview-warn">Set opening before closing time to see slots.</p>
        ) : (
          <div className="court-policy-preview-day">
            <div className="court-policy-preview-meta">
              <span>{formatTimeForPreview(opening)} – {formatTimeForPreview(closing)}</span>
              <span>{Math.round(totalMinutes / 60 * 10) / 10} hours · {ticks.length} slots</span>
            </div>
            <ol className="court-policy-preview-slots" aria-label="Default slot ruler">
              {ticks.length === 0 ? (
                <li className="court-policy-preview-slot empty">Slot is longer than the open window.</li>
              ) : (
                ticks.map((tick) => (
                  <li key={tick.start} className="court-policy-preview-slot">
                    {formatTimeForPreview(tick.start)}
                  </li>
                ))
              )}
            </ol>
            {minMinutes !== null && maxMinutes !== null && (
              <p className="court-policy-preview-rule">
                Each booking lasts {minMinutes} to {maxMinutes} minutes.
              </p>
            )}
            {previewDayOfWeek === null && (
              <p className="court-policy-preview-warn">No days are allowed yet — pick at least one above.</p>
            )}
          </div>
        )}
      </section>

      <section className="court-policy-preview-section">
        <h3>Blocked dates</h3>
        {form.blockedDays.length === 0 ? (
          <p className="court-policy-preview-empty">None set. The court is open every allowed day.</p>
        ) : (
          <ul className="court-policy-preview-blockedlist">
            {form.blockedDays.slice(0, 5).map((date) => (
              <li key={date}>{formatBlockedDate(date)}</li>
            ))}
            {form.blockedDays.length > 5 && (
              <li className="court-policy-preview-more">…and {form.blockedDays.length - 5} more</li>
            )}
          </ul>
        )}
      </section>
    </aside>
  );
}

function buildCrossFieldHints(form) {
  const hints = [];
  const min = numberOrNull(form.minimumReservationMinutes);
  const max = numberOrNull(form.maximumReservationMinutes);
  const slot = numberOrNull(form.defaultSlotMinutes);

  if (min !== null && max !== null && min > max) {
    hints.push("Minimum minutes is longer than the maximum. Bookings will fail validation.");
  }
  if (slot !== null && min !== null && slot < min) {
    hints.push("Default slot is shorter than the minimum reservation length. Staff cannot pick a single slot.");
  }
  if (slot !== null && max !== null && slot > max) {
    hints.push("Default slot is longer than the maximum reservation length. The default chip will be disabled.");
  }

  const opening = parseTimeToMinutes(form.openingTime);
  const closing = parseTimeToMinutes(form.closingTime);
  if (opening !== null && closing !== null) {
    if (closing <= opening) {
      hints.push("Closing time is at or before opening time.");
    } else if (max !== null && closing - opening < max) {
      hints.push("Open window is shorter than the maximum reservation length.");
    }
  }

  if (Array.isArray(form.allowedDays) && form.allowedDays.length === 0) {
    hints.push("No days are allowed. The calendar will be empty for everyone.");
  }

  return hints;
}

function buildSlotTicks(opening, closing, slot) {
  const ticks = [];
  for (let cursor = opening; cursor + slot <= closing && ticks.length < 24; cursor += slot) {
    ticks.push({ start: cursor, end: cursor + slot });
  }
  return ticks;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTimeToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTimeForPreview(minutes) {
  if (minutes === null) return "";
  const safe = Math.max(0, Math.min(24 * 60, minutes));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  const period = hh >= 12 ? "PM" : "AM";
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}:${String(mm).padStart(2, "0")} ${period}`;
}

function formatBlockedDate(date) {
  if (typeof date !== "string") return String(date ?? "");
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;
  const monthIndex = Number(match[2]) - 1;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  if (monthIndex < 0 || monthIndex > 11) return date;
  return `${months[monthIndex]} ${Number(match[3])}, ${match[1]}`;
}

function isFormDifferent(a, b) {
  if (!a || !b) return false;
  if (a.openingTime !== b.openingTime) return true;
  if (a.closingTime !== b.closingTime) return true;
  if (String(a.minimumReservationMinutes) !== String(b.minimumReservationMinutes)) return true;
  if (String(a.maximumReservationMinutes) !== String(b.maximumReservationMinutes)) return true;
  if (String(a.gracePeriodBeforeMissedMinutes) !== String(b.gracePeriodBeforeMissedMinutes)) return true;
  if (String(a.defaultSlotMinutes) !== String(b.defaultSlotMinutes)) return true;
  if (a.allowedDays.length !== b.allowedDays.length) return true;
  for (let index = 0; index < a.allowedDays.length; index += 1) {
    if (a.allowedDays[index] !== b.allowedDays[index]) return true;
  }
  if (a.blockedDays.length !== b.blockedDays.length) return true;
  for (let index = 0; index < a.blockedDays.length; index += 1) {
    if (a.blockedDays[index] !== b.blockedDays[index]) return true;
  }
  return false;
}

function formFromPolicy(policy) {
  return {
    openingTime: normalizeTimeForInput(policy?.openingTime),
    closingTime: normalizeTimeForInput(policy?.closingTime),
    minimumReservationMinutes: stringifyNumber(policy?.minimumReservationMinutes),
    maximumReservationMinutes: stringifyNumber(policy?.maximumReservationMinutes),
    allowedDays: Array.isArray(policy?.allowedDays)
      ? [...new Set(policy.allowedDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
      : [],
    blockedDays: Array.isArray(policy?.blockedDays)
      ? [...new Set(policy.blockedDays.filter((entry) => typeof entry === "string" && entry.trim()))].sort()
      : [],
    gracePeriodBeforeMissedMinutes: stringifyNumber(policy?.gracePeriodBeforeMissedMinutes),
    defaultSlotMinutes: stringifyNumber(policy?.defaultSlotMinutes)
  };
}

function normalizeTimeForInput(value) {
  // <input type="time"> expects HH:MM. Backend may return HH:MM or HH:MM:SS.
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === "") return "";
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

function stringifyNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

function toMinutesOrPass(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function isNetworkError(error) {
  if (!error) return false;
  // fetch() throws a TypeError with no `status` when the request never
  // reached the server (offline, DNS failure, CORS preflight blocked, etc.).
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
