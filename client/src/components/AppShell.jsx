import { useEffect, useState } from "react";

import { initials } from "../api/mappers.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", helper: "Today's schedule", icon: "home" },
  { path: "/schedule", label: "Calendar", helper: "See the week", icon: "calendar" },
  { path: "/reservations/new", label: "New Reservation", helper: "Encode walk-in", icon: "plus" },
  { path: "/reservations", label: "All Bookings", helper: "Search records", icon: "list" },
  { path: "/reports", label: "Summary", helper: "Local reports", icon: "chart" },
  { path: "/activity-logs", label: "Activity Logs", helper: "Audit trail", icon: "clock" },
  { path: "/account", label: "Accounts", helper: "Admin only", icon: "users", adminOnly: true }
];

export function AppShell({ user, path, onNavigate, onLogout, children }) {
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");
  const [officeTime, setOfficeTime] = useState(getOfficeTime);
  const activePath = visibleNav
    .map((item) => item.path)
    .filter((itemPath) => path === itemPath || (itemPath !== "/dashboard" && path.startsWith(`${itemPath}/`)))
    .sort((a, b) => b.length - a.length)[0] || "/dashboard";

  useEffect(() => {
    const timer = window.setInterval(() => setOfficeTime(getOfficeTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
          <div className="office-clock" aria-label="Office date and time">
            <strong>{officeTime.time}</strong>
            <small>{officeTime.date}</small>
          </div>
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
            <NavIcon name={item.icon} />
            <span className="nav-copy">
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </span>
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

function getOfficeTime() {
  const now = new Date();

  return {
    time: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit"
    }).format(now),
    date: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(now)
  };
}

function NavIcon({ name }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5M12 16V8M16 16v-8" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></>,
    users: <><path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M21 20v-2a4 4 0 0 0-3-3.7" /><path d="M16 3.3a4 4 0 0 1 0 7.4" /></>
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {paths[name] || paths.home}
      </svg>
    </span>
  );
}
