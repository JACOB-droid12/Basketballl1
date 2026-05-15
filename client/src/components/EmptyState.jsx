export function EmptyState({ title, body, action }) {
  return (
    <div className="state-card empty">
      <div className="state-mark empty-mark" aria-hidden="true">i</div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
