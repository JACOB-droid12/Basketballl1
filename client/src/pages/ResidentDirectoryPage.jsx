import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Field } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const SEARCH_DEBOUNCE_MS = 250;

const EMPTY_FORM = {
  name: "",
  contactNumber: "",
  address: "",
  group: "",
  notes: ""
};

// Field length caps mirror the residents table columns (database/schema.sql)
// so the form refuses obviously oversized input client-side. The backend
// validator (residentValidation.js) is still the source of truth on save.
const MAX_NAME = 140;
const MAX_CONTACT_NUMBER = 30;
const MAX_ADDRESS = 255;
const MAX_GROUP = 140;
const MAX_NOTES = 1000;

/**
 * Resident directory page.
 *
 * Search-first single-column layout: the staff lands on the resident
 * list with the search input front-and-centre. The create / edit form
 * opens in a slide-in panel triggered by the "Add resident" button,
 * matching the system-wide drawer pattern (`ReservationDetailDrawer`).
 *
 * Data flow:
 *   `GET /api/residents?search=`         (Req. 9.1)
 *   `POST /api/residents`                 (Req. 9.2)
 *   `PUT /api/residents/:residentId`      (Req. 9.2)
 *   `DELETE /api/residents/:residentId`   (cleanup; FK-restricted)
 *
 * Each row carries equally-weighted "Edit", "Use", and "Remove" actions.
 * "Use" routes to `/reservations/new?residentId=...` to prefill the
 * reservation form (Req. 9.3). "Remove" opens a `ConfirmDialog`; the
 * backend rejects the delete if any reservation references the resident
 * (FK `ON DELETE RESTRICT`), surfaced as a friendly in-use message.
 *
 * The page never reads or renders password / password-hash fields
 * (Req. 9.5). Only existing Barangay_Visual_Language components
 * (`Field`, `EmptyState`, `LoadingState`, `ConfirmDialog`) are used
 * (Req. 9.6, 18.1, 18.2).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.1, 17.2, 17.4, 18.1, 18.2
 */
export function ResidentDirectoryPage({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [list, setList] = useState({ loading: true, residents: [], error: "" });
  // Total count tracked separately so the result label can read
  // "8 of 12 match 'Codex'" while the visible list reflects the search.
  const [totalCount, setTotalCount] = useState(null);
  const [drawer, setDrawer] = useState({ open: false, mode: "create", resident: null });
  const [confirmRemove, setConfirmRemove] = useState({ resident: null, busy: false, error: "" });
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);

  // Debounced fetch: a typing burst collapses into a single backend
  // request after `SEARCH_DEBOUNCE_MS` of quiet. The `cancelled` flag
  // discards any in-flight response that loses the race when the user
  // keeps typing (or after a save fires `reloadCounter`).
  useEffect(() => {
    let cancelled = false;
    const trimmed = search.trim();

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      setList((current) => ({ ...current, loading: true, error: "" }));

      try {
        const path = trimmed
          ? `/api/residents?search=${encodeURIComponent(trimmed)}`
          : "/api/residents";
        const data = await apiRequest(path);
        if (cancelled) return;
        const residents = Array.isArray(data?.residents) ? data.residents : [];
        setList({ loading: false, residents, error: "" });
        // The unfiltered total is fetched once on mount and refreshed
        // after a save; while the search is empty we mirror the visible
        // count, otherwise we keep the cached total so the "x of y"
        // label has a denominator.
        if (!trimmed) {
          setTotalCount(residents.length);
        }
      } catch (caught) {
        if (cancelled) return;
        const message = isNetworkError(caught)
          ? OFFLINE_MESSAGE
          : caught?.message || "Resident directory could not be loaded.";
        setList({ loading: false, residents: [], error: message });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, reloadCounter]);

  function openCreate() {
    setDrawer({ open: true, mode: "create", resident: null });
  }

  function openEdit(resident) {
    setDrawer({ open: true, mode: "edit", resident });
  }

  function closeDrawer() {
    setDrawer({ open: false, mode: "create", resident: null });
  }

  function handleSaved(saved, mode) {
    setReloadCounter((value) => value + 1);
    setPageError("");
    setPageSuccess(
      mode === "edit"
        ? `Updated ${saved?.name || "resident"}.`
        : `Saved ${saved?.name || "resident"} to the directory.`
    );
    closeDrawer();
  }

  function handleUse(resident) {
    if (!resident || !Number.isFinite(Number(resident.residentId))) return;
    const target = `/reservations/new?residentId=${encodeURIComponent(resident.residentId)}`;
    if (typeof onNavigate === "function") {
      onNavigate(target);
      return;
    }
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function requestRemove(resident) {
    setConfirmRemove({ resident, busy: false, error: "" });
  }

  function cancelRemove() {
    setConfirmRemove({ resident: null, busy: false, error: "" });
  }

  async function performRemove() {
    const resident = confirmRemove.resident;
    if (!resident || confirmRemove.busy) return;
    setConfirmRemove((current) => ({ ...current, busy: true, error: "" }));
    try {
      await apiRequest(`/api/residents/${resident.residentId}`, { method: "DELETE" });
      setReloadCounter((value) => value + 1);
      setPageError("");
      setPageSuccess(`Removed ${resident.name} from the directory.`);
      setConfirmRemove({ resident: null, busy: false, error: "" });
    } catch (caught) {
      const message = isNetworkError(caught)
        ? OFFLINE_MESSAGE
        : caught?.status === 409
          ? "This resident is referenced by one or more reservations. Cancel or complete those reservations before removing."
          : caught?.message || "Resident could not be removed.";
      setConfirmRemove((current) => ({ ...current, busy: false, error: message }));
    }
  }

  const trimmedSearch = search.trim();
  const visibleCount = list.residents.length;
  const showEmptyState = !list.loading && !list.error && visibleCount === 0;

  const countLabel = useMemo(() => {
    if (list.loading) return "Loading residents...";
    if (trimmedSearch && totalCount !== null) {
      return `${visibleCount} of ${totalCount} match "${trimmedSearch}"`;
    }
    return `${visibleCount} resident${visibleCount === 1 ? "" : "s"} in directory`;
  }, [list.loading, visibleCount, totalCount, trimmedSearch]);

  return (
    <section className="page resident-directory-page">
      <div className="page-header page-head staff-page-head">
        <div>
          <p className="page-kicker">Directory</p>
          <h1 className="page-title">Resident directory</h1>
          <div className="page-sub">
            Search saved residents and groups. Pick one to prefill a new reservation.
            <span className="page-sub-fil-inline">Para mabilis ang pagpapareserba ng paulit-ulit na requester.</span>
          </div>
        </div>
        <button className="btn btn-primary btn-big resident-add-btn" type="button" onClick={openCreate}>
          <Icon name="plus" size={18} />
          Add resident
          <span className="btn-fil">Magdagdag</span>
        </button>
      </div>

      {pageError && <div className="alert error" role="alert">{pageError}</div>}
      {pageSuccess && <div className="alert success" role="status" aria-live="polite" aria-atomic="true">{pageSuccess}</div>}

      <div className="card filter-card staff-filter-card resident-search-card">
        <div className="staff-filter-head">
          <div>
            <h2>Saved residents</h2>
            <p>{countLabel}</p>
          </div>
        </div>

        <div className="form-grid">
          <Field
            id="resident-directory-search"
            label="Search"
            filipino="Hanapin"
            hint="Search by name, group, contact number, or address."
            wide
          >
            <input
              name="search"
              type="search"
              autoComplete="off"
              placeholder="Type a name, group, or contact number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </div>
      </div>

      {list.error && (
        <div className="alert error" role="alert">{list.error}</div>
      )}

      {list.loading && <LoadingState label="Loading residents..." />}

      {showEmptyState && (
        <EmptyState
          title={trimmedSearch ? "No residents found" : "No residents yet"}
          body={
            trimmedSearch
              ? "Try a different name, group, or contact number."
              : "Click Add resident above to save the first one."
          }
        />
      )}

      {!list.loading && !list.error && visibleCount > 0 && (
        <div className="resident-list">
          <div className="resident-list-table-wrap">
            <table className="data-table resident-list-table" aria-label="Resident directory">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact number</th>
                  <th>Address</th>
                  <th className="resident-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.residents.map((resident) => (
                  <ResidentRow
                    key={resident.residentId}
                    resident={resident}
                    onEdit={openEdit}
                    onUse={handleUse}
                    onRemove={requestRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="resident-list-cards" role="list" aria-label="Resident directory">
            {list.residents.map((resident) => (
              <ResidentCard
                key={resident.residentId}
                resident={resident}
                onEdit={openEdit}
                onUse={handleUse}
                onRemove={requestRemove}
              />
            ))}
          </div>
        </div>
      )}

      {drawer.open && (
        <ResidentEditorDrawer
          mode={drawer.mode}
          resident={drawer.resident}
          onClose={closeDrawer}
          onSaved={handleSaved}
        />
      )}

      {confirmRemove.resident && (
        <ConfirmDialog
          danger
          title={`Remove ${confirmRemove.resident.name}?`}
          body={
            confirmRemove.error
              ? confirmRemove.error
              : `This deletes the directory entry for ${confirmRemove.resident.name} (${confirmRemove.resident.contactNumber || "no contact number"}). Past reservations stay on record.`
          }
          confirmLabel={confirmRemove.busy ? "Removing..." : "Remove"}
          busy={confirmRemove.busy}
          onConfirm={performRemove}
          onCancel={cancelRemove}
        />
      )}
    </section>
  );
}

function ResidentEditorDrawer({ mode, resident, onClose, onSaved }) {
  // Slide-in editor for create + edit. Same fields and validation as the
  // legacy two-column page; the new shape just isolates the form so the
  // list isn't crowded by it on every visit. The drawer reuses the shell
  // chrome (`drawer`, `drawer-backdrop`, etc.) the project already uses
  // in ReservationDetailDrawer.
  const isEdit = mode === "edit";
  const formTitle = isEdit ? "Edit resident" : "New resident";
  const submitLabel = (saving) =>
    saving ? "Saving..." : isEdit ? "Save changes" : "Save resident";

  const [form, setForm] = useState(() => ({
    name: resident?.name || "",
    contactNumber: resident?.contactNumber || "",
    address: resident?.address || "",
    group: resident?.group || "",
    notes: resident?.notes || ""
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const contactInputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, saving]);

  useEffect(() => {
    // Auto-focus the first field on open so a keyboard-only flow can
    // start typing immediately.
    const first = dialogRef.current?.querySelector("input, textarea");
    if (first) {
      try {
        first.focus();
      } catch (_focusError) {
        // Some test renderers do not implement focus(); ignore.
      }
    }
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});
    setFormError("");

    const path = isEdit ? `/api/residents/${resident.residentId}` : "/api/residents";

    try {
      const data = await apiRequest(path, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      onSaved(data?.resident, mode);
    } catch (caught) {
      const errors = caught?.data?.errors;
      if (errors && typeof errors === "object") {
        setFieldErrors(errors);
        if (errors.contactNumber && contactInputRef.current) {
          try {
            contactInputRef.current.focus();
          } catch (_focusError) {
            // ignore
          }
        }
      }
      setFormError(buildSubmitError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="resident-editor-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div
        className="resident-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-editor-title"
        ref={dialogRef}
      >
        <header className="resident-editor-head">
          <div>
            <p className="page-kicker">Directory entry</p>
            <h2 id="resident-editor-title">{formTitle}</h2>
            <p className="form-copy">
              Save the names and contact numbers of repeat requesters and groups so the
              reservation form can be filled in seconds.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-light btn-icon resident-editor-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close editor"
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <form className="resident-editor-form" onSubmit={handleSubmit} noValidate aria-busy={saving ? "true" : undefined}>
          {formError && <div className="alert error" role="alert">{formError}</div>}

          <Field
            id="resident-name"
            label="Full name or group"
            filipino="Pangalan o grupo"
            hint="Example: Liga ng Kabataan, Rodriguez Family, Purok 3 Youth"
            error={fieldErrors.name}
            wide
          >
            <input
              name="name"
              autoComplete="name"
              maxLength={MAX_NAME}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </Field>

          <Field
            id="resident-contactNumber"
            label="Contact number"
            filipino="Cellphone number"
            hint="Digits or +, -, (, ), space, period only."
            error={fieldErrors.contactNumber}
          >
            <input
              name="contactNumber"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={MAX_CONTACT_NUMBER}
              value={form.contactNumber}
              onChange={(event) => updateField("contactNumber", event.target.value)}
              ref={contactInputRef}
              required
            />
          </Field>

          <Field
            id="resident-address"
            label="Address"
            filipino="Tirahan"
            error={fieldErrors.address}
          >
            <input
              name="address"
              autoComplete="street-address"
              maxLength={MAX_ADDRESS}
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
            />
          </Field>

          <Field
            id="resident-group"
            label="Group or organization"
            filipino="Grupo o organisasyon"
            hint="Optional. Use it to group families, leagues, or barangay committees."
            error={fieldErrors.group}
          >
            <input
              name="group"
              autoComplete="organization"
              maxLength={MAX_GROUP}
              value={form.group}
              onChange={(event) => updateField("group", event.target.value)}
            />
          </Field>

          <Field
            id="resident-notes"
            label="Notes"
            filipino="Paalala"
            hint="Optional. Up to 1000 characters."
            error={fieldErrors.notes}
            wide
          >
            <textarea
              name="notes"
              rows="4"
              maxLength={MAX_NOTES}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </Field>

          <div className="button-row form-actions resident-editor-actions">
            <button
              className="btn btn-light"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {submitLabel(saving)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResidentRow({ resident, onEdit, onUse, onRemove }) {
  // The list endpoint never returns password fields; this row only reads
  // the directory-record properties so password / password-hash data
  // cannot leak even if a future backend mistakenly included them.
  const displayName = resident.name || "Unnamed resident";
  const groupLabel = (resident.group || "").trim();
  const notesLabel = (resident.notes || "").trim();

  return (
    <tr title={notesLabel || undefined}>
      <td>
        <div className="resident-name-cell">
          <span className="resident-name">{displayName}</span>
          {groupLabel && <span className="resident-group">{groupLabel}</span>}
        </div>
      </td>
      <td>{resident.contactNumber || ""}</td>
      <td>{resident.address || ""}</td>
      <td>
        <div className="button-row resident-row-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onUse(resident)}
            aria-label={`Use ${displayName} for a new reservation`}
          >
            Use
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onEdit(resident)}
            aria-label={`Edit ${displayName}`}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onRemove(resident)}
            aria-label={`Remove ${displayName}`}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function ResidentCard({ resident, onEdit, onUse, onRemove }) {
  // Mobile / narrow-viewport collapse of the directory row. Same data,
  // stacked vertically so the table doesn't need a horizontal scroll.
  const displayName = resident.name || "Unnamed resident";
  const groupLabel = (resident.group || "").trim();
  const notesLabel = (resident.notes || "").trim();

  return (
    <div className="resident-card" role="listitem">
      <div className="resident-card-main">
        <strong className="resident-name">{displayName}</strong>
        {groupLabel && <span className="resident-group">{groupLabel}</span>}
        <span className="resident-card-meta">
          {resident.contactNumber || "No contact number"}
          {resident.address ? ` · ${resident.address}` : ""}
        </span>
        {notesLabel && (
          <span className="resident-card-notes">{notesLabel}</span>
        )}
      </div>
      <div className="resident-card-actions button-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onUse(resident)}
          aria-label={`Use ${displayName} for a new reservation`}
        >
          Use
        </button>
        <button
          type="button"
          className="btn btn-light"
          onClick={() => onEdit(resident)}
          aria-label={`Edit ${displayName}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => onRemove(resident)}
          aria-label={`Remove ${displayName}`}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function buildSubmitError(error) {
  if (isNetworkError(error)) {
    return OFFLINE_MESSAGE;
  }

  if (error?.status === 401) {
    return "Your session has expired. Sign in again, then save the resident.";
  }

  if (error?.status === 403) {
    return "You do not have permission to save residents. Ask the staff lead.";
  }

  if (error?.status === 404) {
    return "This resident no longer exists. Refresh the directory and try again.";
  }

  if (typeof error?.status === "number" && error.status >= 500) {
    return "The system could not save the resident. The office computer may need a restart.";
  }

  return error?.message || "Resident was not saved.";
}

function isNetworkError(error) {
  if (!error) return false;
  // `apiRequest` throws non-2xx responses with `error.status` set. A
  // network failure (offline, DNS failure, blocked preflight) surfaces
  // as a `TypeError` from `fetch()` with no status.
  if (typeof error.status === "number") return false;
  if (error.name === "TypeError") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
