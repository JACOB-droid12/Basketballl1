/**
 * Official header configuration.
 *
 * Single source of truth for the three official strings rendered in the
 * staff console topbar (`AppShell`), the printed Reservation_Slip
 * (`ReservationSlipPrintView`), and the Daily_Schedule_Printout
 * (`DailySchedulePrintView`). Centralising the strings here keeps the
 * Barangay Sto. Niño official copy byte-for-byte consistent across the
 * three surfaces so the office never sees a mismatched header on a
 * printed permit (Req. 18.1, 18.2).
 *
 * The object is frozen so consumers cannot mutate the official copy at
 * runtime. No new design tokens or third-party libraries are introduced
 * (Req. 24.13). The module contains no outbound network references and
 * no CDN URLs, so the application keeps running on the office computer
 * with no internet connection (Req. 24.14).
 *
 * Requirements: 18.1, 18.2, 24.13, 24.14
 */

export const OFFICIAL_HEADER = Object.freeze({
  barangayName: "Barangay Sto. Niño",
  courtName: "Basketball Court",
  subtitle: "Office Computer"
});

/**
 * Accessor for the shared `OFFICIAL_HEADER` constant. Exported for
 * symmetry with the rest of `client/src/api/` (`getStatusDisplay`,
 * `formatReferenceNo`, etc.) so consumers that prefer a function call
 * over importing the constant read the same values.
 *
 * Requirements: 18.1, 18.2
 */
export function getOfficialHeader() {
  return OFFICIAL_HEADER;
}
