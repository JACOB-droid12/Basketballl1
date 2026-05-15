import { useEffect, useState } from "react";

import { initials } from "../api/mappers.js";
import { Icon } from "./Icon.jsx";

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
    let intervalId;
    const now = new Date();
    const nextMinuteDelay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeoutId = window.setTimeout(() => {
      setOfficeTime(getOfficeTime());
      intervalId = window.setInterval(() => setOfficeTime(getOfficeTime()), 60_000);
    }, nextMinuteDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal small">N</div>
          <div className="brand-text">
            <strong className="brand-title">Basketball Court Reservation</strong>
            <span className="brand-subtitle">Barangay Sto. Niño · Office Computer</span>
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
            <Icon name="logout" size={20} />
            <span>Sign Out</span>
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
            aria-current={activePath === item.path ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            <span className="nav-copy">
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </span>
          </button>
        ))}
        <div className="sidebar-help">
          <span className="help-icon" aria-hidden="true">
            <Icon name="question" size={20} />
          </span>
          <strong>Need help?</strong>
          Call the office system administrator before changing account access.
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
  return (
    <span className="nav-icon" aria-hidden="true">
      <Icon name={name} />
    </span>
  );
}
