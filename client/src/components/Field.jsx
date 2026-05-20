import { cloneElement } from "react";

export function Field({ id, label, filipino, hint, error, children, wide }) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const isRequired = children.props.required;
  const control = cloneElement(children, {
    id,
    name: children.props.name || id,
    className: [children.props.className, "input"].filter(Boolean).join(" "),
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy
  });

  return (
    <label className={`field staff-field ${wide ? "wide" : ""}`} htmlFor={id}>
      <span className="field-label">
        {label}
        {filipino && <span className="fil">· {filipino}</span>}
        {isRequired && <span className="req" aria-hidden="true"> *</span>}
      </span>
      {hint && <span id={hintId} className="field-hint">{hint}</span>}
      {control}
      {error && <small id={errorId} className="field-error" role="alert">{error}</small>}
    </label>
  );
}
