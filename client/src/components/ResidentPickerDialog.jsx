import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api/client.js";
import { EmptyState } from "./EmptyState.jsx";
import { Field } from "./Field.jsx";
import { LoadingState } from "./LoadingState.jsx";
import { ModalShell } from "./ModalShell.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Resident directory picker dialog used by the reservation form to find a
 * Resident_Directory_Record and prefill the requester fields.
 *
 * The component now renders through the shared `ModalShell` so every
 * overlay shares one set of layout, focus-trap, Escape, and
 * backdrop-dismissal rules (Req. 3.1, 3.7, 3.10). The local
 * `FOCUSABLE_SELECTORS` list, `getFocusableElements` helper, and
 * focus-trap loop that used to live in this file have been consolidated
 * into `ModalShell`.
 *
 * Props (unchanged so callers do not need to be updated, Req. 3.10):
 *   - `open` toggles whether the dialog is mounted.
 *   - `onClose()` is invoked when the user dismisses the dialog
 *     (backdrop click, Escape, the close button, or Cancel).
 *   - `onSelect(prefill)` is invoked with `{ representativeName,
 *     contactNo, address, resident }` so the reservation form can
 *     prefill its inputs.
 *
 * Behavior:
 *   - On open and on each search-input change (debounced by
 *     `SEARCH_DEBOUNCE_MS`), the dialog fetches `GET /api/residents?
 *     search=` and renders the rows. The list only shows the resident's
 *     name, contact number, address, group, and notes; password /
 *     password-hash fields are never read or rendered (Req. 9.5).
 *   - When the response list is empty, an `EmptyState` is rendered with
 *     readable copy.
 *   - On HTTP error the backend `error` message is shown inline (alert).
 *     On a network failure the standard offline copy is shown.
 *   - On select, `onSelect` receives the four reservation-form fields
 *     derived from the resident record so the parent can prefill
 *     `representativeName`, `contactNo`, `address`, and forward the
 *     full `resident` payload (Req. 9.3).
 *
 * Requirements: 3.7, 3.10, 9.1, 9.3, 9.5, 9.6, 17.1, 17.2, 17.4, 18.1
 */
export function ResidentPickerDialog({ open, onClose, onSelect }) {
  // Unmount the body when closed so the search/result state cannot leak
  // between sessions and the focus trap inside `ModalShell` is torn
  // down cleanly.
  if (!open) return null;
  return <ResidentPickerDialogContent onClose={onClose} onSelect={onSelect} />;
}

function ResidentPickerDialogContent({ onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The search input is the most useful keyboard target on mount, so
  // we hand its ref to `ModalShell` via `initialFocusRef` and the shell
  // focuses it instead of the close button.
  const searchInputRef = useRef(null);

  // Debounced fetch: a typing burst collapses into a single backend
  // request after `SEARCH_DEBOUNCE_MS` of quiet. The latest search wins
  // because the cleanup cancels the in-flight timer and ignores the
  // older request's response via `cancelled`.
  useEffect(() => {
    let cancelled = false;
    const trimmed = search.trim();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const path = trimmed
          ? `/api/residents?search=${encodeURIComponent(trimmed)}`
          : "/api/residents";
        const data = await apiRequest(path);
        if (cancelled) return;

        const list = Array.isArray(data?.residents) ? data.residents : [];
        setResidents(list);
      } catch (caught) {
        if (cancelled) return;
        if (isNetworkError(caught)) {
          setError(OFFLINE_MESSAGE);
        } else {
          setError(caught?.message || "Resident directory could not be loaded.");
        }
        setResidents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  function handleSelect(resident) {
    if (typeof onSelect !== "function" || !resident) return;
    // The backend's resident record uses `name` for the display name;
    // older fixtures may use `fullName`. We accept both and forward
    // the three fields the reservation form expects to prefill plus
    // the original `resident` payload (Req. 9.3).
    const representativeName = resident.name || resident.fullName || "";
    const contactNo = resident.contactNumber || "";
    const address = resident.address || "";

    onSelect({
      representativeName,
      contactNo,
      address,
      resident
    });

    if (typeof onClose === "function") onClose();
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      kicker="Resident directory"
      title="Choose a resident"
      subtitle="Pick a saved resident or group to prefill the reservation form."
      size="md"
      initialFocusRef={searchInputRef}
      footer={
        <button className="btn btn-light" type="button" onClick={onClose}>
          Cancel
        </button>
      }
    >
      <div className="form-grid">
        <Field
          id="resident-picker-search"
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
            ref={searchInputRef}
          />
        </Field>
      </div>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {loading && <LoadingState label="Loading residents..." />}

      {!loading && !error && residents.length === 0 && (
        <EmptyState
          title="No residents found"
          body={
            search.trim()
              ? "Try a different name, group, or contact number."
              : "The resident directory is empty. Add a resident to start prefilling the form."
          }
        />
      )}

      {!loading && !error && residents.length > 0 && (
        <ul className="staff-detail-grid" aria-label="Resident directory results">
          {residents.map((resident) => (
            <ResidentRow
              key={resident.residentId}
              resident={resident}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

function ResidentRow({ resident, onSelect }) {
  // Render only the resident-directory fields (name, contact number,
  // address, group, notes). We never read or render password or
  // password-hash fields here (Req. 9.5).
  const displayName = resident.name || resident.fullName || "Unnamed resident";
  const contactNumber = resident.contactNumber || "";
  const address = resident.address || "";
  const group = resident.group || "";
  const notes = resident.notes || "";

  // Reuse the existing `.staff-detail-grid > .detail-row` markup so each
  // resident reads as a name/value pair and the row picks up the shared
  // border, gap, and column tokens from `client/src/styles.css`.
  return (
    <li className="detail-row">
      <dt>
        {displayName}
        {contactNumber && (
          <>
            <br />
            <small>{contactNumber}</small>
          </>
        )}
      </dt>
      <dd>
        {address && <div>{address}</div>}
        {group && (
          <div>
            <small>Group: {group}</small>
          </div>
        )}
        {notes && (
          <div>
            <small>Notes: {notes}</small>
          </div>
        )}
        <div>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onSelect(resident)}
            aria-label={`Use ${displayName}`}
          >
            Use this resident
          </button>
        </div>
      </dd>
    </li>
  );
}

function isNetworkError(error) {
  if (!error) return false;
  // `apiRequest` re-throws non-2xx responses with an `error.status`.
  // Network failures (offline, DNS, expired session that never produced
  // a JSON body) surface as a `TypeError` from `fetch` with no status.
  if (typeof error.status === "number") return false;
  if (error.name === "TypeError") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
