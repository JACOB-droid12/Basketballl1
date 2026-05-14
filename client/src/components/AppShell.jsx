import { initials } from "../api/mappers.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", helper: "Today's schedule" },
  { path: "/schedule", label: "Calendar", helper: "See the week" },
  { path: "/reservations/new", label: "New Reservation", helper: "Encode walk-in" },
  { path: "/reservations", label: "All Bookings", helper: "Search records" },
  { path: "/reports", label: "Summary", helper: "Local reports" },
  { path: "/activity-logs", label: "Activity Logs", helper: "Audit trail" },
  { path: "/account", label: "Accounts", helper: "Admin only", adminOnly: true }
];

export function AppShell({ user, path, onNavigate, onLogout, children }) {
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");
  const activePath = visibleNav
    .map((item) => item.path)
    .filter((itemPath) => path === itemPath || (itemPath !== "/dashboard" && path.startsWith(`${itemPath}/`)))
    .sort((a, b) => b.length - a.length)[0] || "/dashboard";

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal small">N</div>
          <div>
            <strong>Barangay Sto. Niño</strong>
            <span>Basketball Court</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span className="avatar">{initials(user.fullName)}</span>
            <span>
              <strong>{user.fullName}</strong>
              <small>{user.role === "ADMIN" ? "Administrator" : "Staff"}</small>
            </span>
          </div>
          <button className="btn btn-light" type="button" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>
      <aside className="sidebar">
        {visibleNav.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${activePath === item.path ? "active" : ""}`}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            <span>{item.label}</span>
            <small>{item.helper}</small>
          </button>
        ))}
        <div className="sidebar-help">
          <strong>Need help?</strong>
          Ask the system administrator before changing account access.
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
