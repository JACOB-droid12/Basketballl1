import { useEffect, useMemo, useState } from "react";

import { getSession, logout } from "./api/client.js";
import { AppShell } from "./components/AppShell.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { LoadingState } from "./components/LoadingState.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

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
    body: "Admin account management will be implemented in the account screen task.",
    adminOnly: true
  }
};

export function App() {
  const [sessionState, setSessionState] = useState({ loading: true, user: null, error: "" });
  const [path, setPath] = useState(normalizePath(window.location.pathname));

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

  const route = useMemo(() => resolveRoute(path), [path]);

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

  if (!sessionState.user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (route.adminOnly && sessionState.user.role !== "ADMIN") {
    return (
      <AppShell user={sessionState.user} path={path} onNavigate={handleNavigate} onLogout={handleLogout}>
        <PlaceholderPage
          title="Access restricted"
          body="Only administrator accounts can open account management."
          action={<button className="btn btn-primary" type="button" onClick={() => handleNavigate("/dashboard")}>Return Home</button>}
        />
      </AppShell>
    );
  }

  return (
    <AppShell user={sessionState.user} path={path} onNavigate={handleNavigate} onLogout={handleLogout}>
      {sessionState.error && <div className="alert error">{sessionState.error}</div>}
      <PlaceholderPage title={route.title} body={route.body} />
    </AppShell>
  );
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
