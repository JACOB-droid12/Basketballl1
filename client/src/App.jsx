import { useEffect, useState } from "react";

import { getSession, logout } from "./api/client.js";
import { AppShell } from "./components/AppShell.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import { AccountPasswordPage } from "./pages/AccountPasswordPage.jsx";
import { AccountsPage } from "./pages/AccountsPage.jsx";
import { ActivityLogsPage } from "./pages/ActivityLogsPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { ReservationFormPage } from "./pages/ReservationFormPage.jsx";
import { ReservationsPage } from "./pages/ReservationsPage.jsx";

const ROUTES = {
  "/dashboard": {
    title: "Home",
    body: "Dashboard cards and today's court schedule will be connected in the next screen task."
  },
  "/schedule": {
    title: "Calendar",
    body: "Weekly court availability and reservation blocks will be implemented in the schedule task."
  },
  "/reservations/new": {
    title: "New Reservation",
    body: "The walk-in reservation form will be added after the shell and login are verified."
  },
  "/reservations": {
    title: "All Bookings",
    body: "Reservation search, filters, and record actions will be connected to the staff APIs in a later task."
  },
  "/reports": {
    title: "Summary",
    body: "Local reports will be built from the reports API in the reporting task."
  },
  "/activity-logs": {
    title: "Activity Logs",
    body: "Audit trail records will be displayed here after the activity log screen is implemented."
  },
  "/account": {
    title: "Accounts",
    body: "Admin account management is available to administrator users."
  }
};

export function App() {
  const [sessionState, setSessionState] = useState({ loading: true, user: null, error: "" });
  const [path, setPath] = useState(normalizePath(window.location.pathname));
  const isLoginPath = path === "/login";

  useEffect(() => {
    let active = true;

    getSession()
      .then((data) => {
        if (!active) return;
        setSessionState({ loading: false, user: data.authenticated ? data.user : null, error: "" });
        if (data.authenticated && normalizePath(window.location.pathname) === "/dashboard") {
          window.history.replaceState({}, "", "/dashboard");
        }
      })
      .catch((error) => {
        if (!active) return;
        setSessionState({ loading: false, user: null, error: error.message });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPath(normalizePath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleNavigate(nextPath) {
    const normalized = normalizePath(nextPath);
    window.history.pushState({}, "", normalized);
    setPath(normalized);
  }

  function handleLogin(user) {
    setSessionState({ loading: false, user, error: "" });
    setPath("/dashboard");
  }

  async function handleLogout() {
    await logout();
    setSessionState({ loading: false, user: null, error: "" });
    window.history.replaceState({}, "", "/dashboard");
    setPath("/dashboard");
  }

  if (sessionState.loading) {
    return (
      <main className="boot-screen">
        <LoadingState label="Checking staff session..." />
      </main>
    );
  }

  if (!sessionState.user || isLoginPath) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppShell user={sessionState.user} path={path} onNavigate={handleNavigate} onLogout={handleLogout}>
      {sessionState.error && <div className="alert error">{sessionState.error}</div>}
      {renderPage(path, handleNavigate, sessionState.user)}
    </AppShell>
  );
}

function renderPage(path, navigate, user) {
  if (path === "/account/password") return <AccountPasswordPage user={user} />;
  if (path.startsWith("/account")) return <AccountsPage user={user} />;
  if (path.startsWith("/activity-logs")) return <ActivityLogsPage />;
  if (path.startsWith("/reports")) return <ReportsPage />;
  if (path === "/reservations/new") return <ReservationFormPage onNavigate={navigate} />;
  const editMatch = path.match(/^\/reservations\/(\d+)\/edit$/);
  if (editMatch) return <ReservationFormPage reservationId={editMatch[1]} onNavigate={navigate} />;
  const reservationMatch = path.match(/^\/reservations\/(\d+)$/);
  if (reservationMatch) return <ReservationsPage onNavigate={navigate} initialReservationId={reservationMatch[1]} />;
  if (path.startsWith("/reservations")) return <ReservationsPage onNavigate={navigate} />;
  if (path.startsWith("/schedule")) return <CalendarPage onNavigate={navigate} />;
  if (path.startsWith("/dashboard")) return <DashboardPage onNavigate={navigate} user={user} />;

  const route = resolveRoute(path);
  return <PlaceholderPage title={route.title} body={route.body} />;
}

function PlaceholderPage({ title, body, action }) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Staff Console</p>
          <h1>{title}</h1>
        </div>
      </div>
      <EmptyState title={`${title} screen is next`} body={body} action={action} />
    </section>
  );
}

function resolveRoute(path) {
  if (ROUTES[path]) return ROUTES[path];
  return {
    title: "Screen not found",
    body: "Choose a staff console section from the navigation."
  };
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/" || pathname === "/app" || pathname === "/app/") {
    return "/dashboard";
  }

  return pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}
