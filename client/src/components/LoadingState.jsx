export function LoadingState({ label = "Loading records..." }) {
  return (
    <div className="state-card loading-state" role="status" aria-live="polite">
      <div className="state-mark loading-mark" aria-hidden="true" />
      <div className="skeleton-stack" aria-hidden="true">
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
      </div>
      <p>{label}</p>
    </div>
  );
}
