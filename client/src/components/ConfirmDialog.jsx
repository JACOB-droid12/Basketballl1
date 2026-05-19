import { Icon } from "./Icon.jsx";
import { ModalShell } from "./ModalShell.jsx";

/**
 * Ceremonial confirm dialog used across the staff console for
 * destructive and high-stakes confirmations (e.g. cancelling a
 * reservation, deactivating an account, removing a resident).
 *
 * The component now renders through the shared `ModalShell` so every
 * overlay shares one set of layout, focus-trap, and Escape rules
 * (Req. 3.1, 3.7). The local focus-trap loop and the
 * `dialog-backdrop` / `dialog` markup that used to live here have been
 * consolidated into `ModalShell`; this file only owns the ceremonial
 * body (centered icon + body copy) and the action buttons in the
 * footer slot.
 *
 * Props (unchanged from the previous implementation so callers do not
 * need to be updated, Req. 3.10):
 *   - `title`         -> rendered as the modal heading.
 *   - `body`          -> wired to `aria-describedby` via the shell's
 *                        subtitle slot and rendered as the centered
 *                        body copy beneath the icon.
 *   - `confirmLabel`  -> label of the primary action button.
 *   - `danger`        -> when truthy, swaps the icon variant and
 *                        renders the primary action with `btn-danger`;
 *                        otherwise the action uses `btn-primary`.
 *   - `onConfirm`     -> primary action click handler.
 *   - `onCancel`      -> secondary action click handler; also wired to
 *                        the shell's `onClose` so backdrop click and
 *                        Escape (when not busy) dismiss the dialog
 *                        through the same path.
 *   - `busy`          -> while truthy, both buttons are disabled, the
 *                        primary button shows "Saving...", and the
 *                        shell suppresses Escape / backdrop dismissal
 *                        so the dialog cannot be closed mid-save.
 */
export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  const iconVariant = danger ? "danger" : "ok";
  const iconName = danger ? "warn" : "check";

  return (
    <ModalShell
      open
      onClose={onCancel}
      title={title}
      subtitle={body}
      busy={busy}
      footer={
        <>
          <button
            className="btn btn-light"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Go back
          </button>
          <button
            className={"btn " + (danger ? "btn-danger" : "btn-primary")}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-body">
        <div className={`confirm-icon ${iconVariant}`} aria-hidden="true">
          <Icon name={iconName} size={36} />
        </div>
        <p>{body}</p>
      </div>
    </ModalShell>
  );
}
