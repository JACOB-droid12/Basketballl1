import { useEffect, useState } from "react";

import { getSession, logout } from "./api/client.js";
import { AppShell } from "./components/AppShell.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import { AccountPasswordPage } from "./pages/AccountPasswordPage.jsx";
import { AccountsPage } from "./pages/AccountsPage.jsx";
import { ActivityLogsPage } from "./pages/ActivityLogsPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { CourtPolicyPage } from "./pages/CourtPolicyPage.jsx";
import { DailySchedulePrintPage } from "./pages/DailySchedulePrintPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { ReservationFormPage } from "./pages/ReservationFormPage.jsx";
import { ReservationHistoryPage } from "./pages/ReservationHistoryPage.jsx";
import { ReservationSlipPrintPage } from "./pages/ReservationSlipPrintPage.jsx";
import { ReservationsPage } from "./pages/ReservationsPage.jsx";
import { ResidentDirectoryPage } from "./pages/ResidentDirectoryPage.jsx";

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
    window.history.pushState({}, "", nextPath);
    setPath(normalizePath(window.location.pathname));
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

  if (sessionState.user && isLoginPath) {
    // Redirect signed-in users away from the login form within the same render
    // tick. We replace the URL so the back button does not trap the user on
    // the login page (Req. 13.1, 13.2).
    window.history.replaceState({}, "", "/dashboard");
    return (
      <AppShell user={sessionState.user} path="/dashboard" onNavigate={handleNavigate} onLogout={handleLogout}>
        {renderPage("/dashboard", handleNavigate, sessionState.user)}
      </AppShell>
    );
  }

  if (!sessionState.user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Print routes render without `AppShell` chrome so the printed page is
  // ink-friendly and does not include navigation, sidebars, or session
  // banners (Requirements 2.1, 7.1, 18.1).
  const slipMatch = path.match(/^\/reservations\/(\d+)\/slip$/);
  if (slipMatch) {
    return <ReservationSlipPrintPage reservationId={slipMatch[1]} />;
  }
  if (path === "/schedule/daily-print") {
    return <DailySchedulePrintPage />;
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
  if (path.startsWith("/residents")) return <ResidentDirectoryPage onNavigate={navigate} />;
  if (path === "/settings/court-policy") return <CourtPolicyPage user={user} onNavigate={navigate} />;
  if (path === "/reservations/new") return <ReservationFormPage onNavigate={navigate} />;
  if (path === "/reservations/history") return <ReservationHistoryPage onNavigate={navigate} />;
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
  const pathOnly = String(pathname || "").split(/[?#]/)[0];

  if (!pathOnly || pathOnly === "/" || pathOnly === "/app" || pathOnly === "/app/") {
    return "/dashboard";
  }

  return pathOnly.endsWith("/") && pathOnly.length > 1 ? pathOnly.slice(0, -1) : pathOnly;
}
