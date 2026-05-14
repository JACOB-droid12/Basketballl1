export function LoadingState({ label = "Loading records..." }) {
  return (
    <div className="state-card">
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <p>{label}</p>
    </div>
  );
}
