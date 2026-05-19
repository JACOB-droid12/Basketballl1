/**
 * Shared card section heading for repeated card title + caption rows.
 *
 * Props:
 * - title: required section heading text or node.
 * - caption: optional supporting text under or beside the heading.
 * - id: optional heading id for aria-labelledby relationships.
 */
export function CardSectionHeader({ title, caption, id }) {
  return (
    <div className="card-section-head">
      <h2 id={id}>{title}</h2>
      {caption && <span>{caption}</span>}
    </div>
  );
}
