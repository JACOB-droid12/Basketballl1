import { useEffect, useState } from "react";

import { initials } from "../api/mappers.js";
import { OFFICIAL_HEADER } from "../api/officialHeader.js";
import { Icon } from "./Icon.jsx";

const NAV_GROUPS = [
  {
    label: "Operate",
    items: [
      { path: "/dashboard", label: "Home", helper: "Today's schedule", icon: "home" },
      { path: "/schedule", label: "Calendar", helper: "See the week", icon: "calendar" },
      { path: "/reservations/new", label: "New Reservation", helper: "Encode walk-in", icon: "plus" },
      { path: "/reservations", label: "All Bookings", helper: "Search records", icon: "list" }
    ]
  },
  {
    label: "Records",
    items: [
      { path: "/residents", label: "Resident Directory", helper: "Repeat requesters", icon: "users" },
      { path: "/reservations/history", label: "Reservation History", helper: "Lookup by contact", icon: "search" },
      { path: "/reports", label: "Summary", helper: "Local reports", icon: "chart" },
      { path: "/activity-logs", label: "Activity Logs", helper: "Audit trail", icon: "clock" }
    ]
  },
  {
    label: "Account",
    items: [
      { path: "/account/password", label: "Password", helper: "Change login", icon: "lock" },
      { path: "/settings/court-policy", label: "Court Policy", helper: "Rules and hours", icon: "info", adminOnly: true },
      { path: "/account", label: "Accounts", helper: "Admin only", icon: "users", adminOnly: true }
    ]
  }
];

export function AppShell({ user, path, onNavigate, onLogout, children }) {
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || user.role === "ADMIN")
    }))
    .filter((group) => group.items.length > 0);
  const allVisibleItems = visibleGroups.flatMap((group) => group.items);
  const [officeTime, setOfficeTime] = useState(getOfficeTime);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activePath = allVisibleItems
    .map((item) => item.path)
    .filter((itemPath) => path === itemPath || (itemPath !== "/dashboard" && path.startsWith(`${itemPath}/`)))
    .sort((a, b) => b.length - a.length)[0] || "/dashboard";
  const activeItem = allVisibleItems.find((item) => item.path === activePath);

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

  function handleMobileNav(itemPath) {
    onNavigate(itemPath);
    setMobileNavOpen(false);
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-panel">Skip to main content</a>
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal small">N</div>
          <div className="brand-text">
            <strong className="brand-title">{`${OFFICIAL_HEADER.courtName} Reservation`}</strong>
            <span className="brand-subtitle">{`${OFFICIAL_HEADER.barangayName} · ${OFFICIAL_HEADER.subtitle}`}</span>
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

      {/* Mobile compact nav: shows current page + toggle */}
      <div className="mobile-nav-bar">
        <button
          className="mobile-nav-toggle"
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-expanded={mobileNavOpen}
          aria-controls="sidebar-nav"
        >
          <NavIcon name={activeItem?.icon || "home"} />
          <span className="mobile-nav-current">{activeItem?.label || "Menu"}</span>
          <Icon name={mobileNavOpen ? "x" : "menu"} size={20} />
        </button>
      </div>

      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`} id="sidebar-nav">
        {visibleGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label" aria-hidden="true">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${activePath === item.path ? "active" : ""}`}
                type="button"
                onClick={() => handleMobileNav(item.path)}
                aria-current={activePath === item.path ? "page" : undefined}
              >
                <NavIcon name={item.icon} />
                <span className="nav-copy">
                  <span>{item.label}</span>
                  <small>{item.helper}</small>
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-help">
          <span className="help-icon" aria-hidden="true">
            <Icon name="question" size={20} />
          </span>
          <strong>Need help?</strong>
          Call the office system administrator before changing account access.
        </div>
      </aside>
      <main className="main-panel" id="main-panel">{children}</main>
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
