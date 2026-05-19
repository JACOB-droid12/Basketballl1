import { useEffect, useState } from "react";

import { apiRequest } from "../api/client.js";
import { formatBackendDateTime } from "../api/mappers.js";

// Static instructional line shown on the reminder card. Wording is kept in
// lockstep with `STAFF-DAILY-USE.txt` (the office's daily-use sheet) so
// staff see the same backup instruction in the browser as on paper. The
// launcher name "Barangay Court Scheduler - Maintenance" and the
// "choose ... option from the menu" phrasing both come from that doc.
// Task 10.1 aligns the doc to the wording below (Req. 12.4, 21.1).
const MAINTENANCE_LAUNCHER_INSTRUCTION =
  "Run a backup from the maintenance launcher option: double-click " +
  "Barangay Court Scheduler - Maintenance and choose the backup option from the menu.";

/**
 * Backup reminder widget rendered as a non-modal card inside the dashboard
 * grid. The card never opens a modal dialog, full-screen overlay, or
 * auto-open prompt; the dashboard content stays visible and interactive
 * underneath (Req. 4.5).
 *
 * The component fetches `GET /api/maintenance/backup-status` once on mount
 * via the shared `apiRequest` client. The endpoint wraps its payload as
 * `{ backupStatus: { backupDue, lastBackupAt, daysSinceBackup,
 * reminderThresholdDays } }`, so the post-fetch handling unwraps the
 * inner object with `const status = data?.backupStatus || data || {};`.
 * The `|| data` branch keeps the card resilient if a future API revision
 * inlines the fields at the top level; the `|| {}` branch keeps every
 * downstream `status.X` access safe when the response is empty so the
 * `status.backupDue === true` gate below evaluates to `false` cleanly
 * instead of throwing (Req. 4.3).
 *
 * Palette selection follows the response's `backupDue` flag and the
 * `daysSinceBackup` vs. twice-`reminderThresholdDays` comparison:
 *
 *   - `backupDue === true && daysSinceBackup <= 2 * reminderThresholdDays`
 *     uses the warning palette (`.alert.warning`) and the "Backup due"
 *     heading.
 *   - `backupDue === true && daysSinceBackup >  2 * reminderThresholdDays`
 *     uses the danger palette (`.alert.error`) and the "Backup overdue"
 *     heading.
 *
 * The card is rendered only when `status.backupDue === true`; when the
 * backend reports the office is not due for a backup the component
 * returns `null` so the surrounding page does not fill up with a passive
 * read-out (Req. 4.3, 4.4).
 *
 * `lastBackupAt` is rendered through `formatBackendDateTime` so the
 * timestamp reads the Manila wall-clock value the backend stored,
 * regardless of the browser's local timezone (Req. 2.1, 2.2). The
 * `daysSinceBackup` and `reminderThresholdDays` values are rendered as
 * plain numbers (Req. 4.7).
 *
 * On any fetch error the component returns `null` and logs the failure
 * via `console.error` so the rest of the dashboard or settings page
 * renders without disruption (Req. 4.8).
 *
 * Requirements: 4.3, 4.5, 4.7, 4.8
 */
export function BackupReminderCard() {
  const [status, setStatus] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;

    apiRequest("/api/maintenance/backup-status")
      .then((data) => {
        if (!active) return;
        // Unwrap `data.backupStatus` per Req. 4.3. The `|| data` branch
        // keeps the card working if a future API revision inlines the
        // fields; `|| {}` makes every downstream `status.X` access safe
        // so the `status.backupDue === true` gate below does not throw
        // on an empty response.
        const next = data?.backupStatus || data || {};
        setStatus(next);
      })
      .catch((error) => {
        if (!active) return;
        // Endpoint error: render nothing and log the failure to the
        // console so the rest of the dashboard renders without
        // disruption. The widget never blocks the surface (Req. 4.8).
        console.error("Failed to load backup status", error);
        setHidden(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (hidden) return null;
  if (!status) return null;

  // Reminder card only — when no backup is currently due, render
  // nothing so the surrounding page does not show a passive read-out.
  // The component is a reminder for action, not a status panel
  // (Req. 4.3, 4.4).
  if (status.backupDue !== true) return null;

  const reminderThresholdDays = numberOrNull(status.reminderThresholdDays);
  const daysSinceBackup = numberOrNull(status.daysSinceBackup);

  const palette = paletteFor(daysSinceBackup, reminderThresholdDays);
  const heading = headingForPalette(palette);

  return (
    <section
      className={`alert ${palette === "danger" ? "error" : "warning"} backup-reminder-card`}
      role="alert"
      aria-live="polite"
    >
      <strong>{heading}</strong>
      <dl className="backup-reminder-details">
        <div>
          <dt>Last backup</dt>
          <dd>{formatBackendDateTime(status.lastBackupAt)}</dd>
        </div>
        <div>
          <dt>Days since backup</dt>
          <dd>{daysSinceBackup === null ? "Not available" : daysSinceBackup}</dd>
        </div>
        <div>
          <dt>Reminder threshold</dt>
          <dd>
            {reminderThresholdDays === null
              ? "Not available"
              : `${reminderThresholdDays} day${reminderThresholdDays === 1 ? "" : "s"}`}
          </dd>
        </div>
      </dl>
      <p>{MAINTENANCE_LAUNCHER_INSTRUCTION}</p>
    </section>
  );
}

function paletteFor(daysSinceBackup, reminderThresholdDays) {
  // When the threshold is missing or non-positive we cannot compute the
  // "more than twice the threshold" comparison, so the safer
  // office-friendly default is the warning palette.
  if (
    daysSinceBackup === null ||
    reminderThresholdDays === null ||
    reminderThresholdDays <= 0
  ) {
    return "warning";
  }
  if (daysSinceBackup > 2 * reminderThresholdDays) return "danger";
  return "warning";
}

function headingForPalette(palette) {
  if (palette === "danger") return "Backup overdue";
  return "Backup due";
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
