const MISSING_REFERENCE_LABEL = "No reference number";

/**
 * Returns the backend-provided reference string verbatim.
 * Falls back to a clear placeholder when the value is missing
 * so reservation surfaces never crash on absent data.
 *
 * Requirements: 1.1, 1.2, 1.4
 */
export function formatReferenceNo(value) {
  if (value === null || value === undefined) return MISSING_REFERENCE_LABEL;

  const text = String(value);
  if (text.trim() === "") return MISSING_REFERENCE_LABEL;

  return text;
}

/**
 * Case-insensitive substring match against the reservation's
 * backend-provided `referenceNo`. Used by reservation list filtering.
 *
 * Returns false when either the reservation lacks a reference number
 * or the query is empty, so the caller can compose this with other
 * search predicates without false positives.
 *
 * Requirements: 1.3
 */
export function matchesReferenceNo(reservation, query) {
  const reference = reservation && reservation.referenceNo;
  if (reference === null || reference === undefined) return false;

  const referenceText = String(reference);
  if (referenceText === "") return false;

  const needle = String(query == null ? "" : query).trim();
  if (needle === "") return false;

  return referenceText.toLowerCase().includes(needle.toLowerCase());
}
