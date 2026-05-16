import { Icon } from "./Icon.jsx";

export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  const iconVariant = danger ? "danger" : "ok";
  const iconName = danger ? "warn" : "check";

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-body">
          <div className={`confirm-icon ${iconVariant}`} aria-hidden="true">
            <Icon name={iconName} size={36} />
          </div>
          <h2 id="confirm-title">{title}</h2>
          <p>{body}</p>
        </div>
        <div className="dialog-foot">
          <button className="btn btn-light" type="button" onClick={onCancel} disabled={busy}>
            Go back
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
