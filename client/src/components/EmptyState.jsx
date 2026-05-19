import { Icon } from "./Icon.jsx";

export function EmptyState({ title, body, action }) {
  return (
    <div className="state-card empty">
      <div className="state-mark empty-mark" aria-hidden="true">
        <Icon name="info" size={28} />
      </div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
