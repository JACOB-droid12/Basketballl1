/**
 * Shared staff page heading used by task surfaces.
 *
 * Props:
 * - kicker: small page-kicker label above the title.
 * - title: required page title text.
 * - subtitle: one-sentence staff-facing context line.
 * - filipino: optional helper copy, rendered below or inline.
 * - actions: right-side action cluster, usually a .button-row.
 */
export function StaffPageHeader({
  kicker,
  title,
  subtitle,
  filipino,
  filipinoInline = false,
  actions,
  className = "",
  children
}) {
  const classes = ["page-header", "page-head", "staff-page-head", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div>
        {kicker && <p className="page-kicker">{kicker}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <div className="page-sub">
            {subtitle}
            {filipino && filipinoInline && <span className="page-sub-fil-inline">{filipino}</span>}
          </div>
        )}
        {filipino && !filipinoInline && <div className="page-sub-fil">{filipino}</div>}
        {children}
      </div>
      {actions}
    </div>
  );
}
