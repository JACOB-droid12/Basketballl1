import { useEffect, useRef, useState } from "react";

import { apiRequest, getSession } from "../api/client.js";
import { CalendarDayColumn } from "../components/calendar/CalendarDayColumn.jsx";
import { CalendarDayDrawer } from "../components/calendar/CalendarDayDrawer.jsx";
import { CalendarLegend } from "../components/calendar/CalendarLegend.jsx";
import { CalendarWeekToolbar } from "../components/calendar/CalendarWeekToolbar.jsx";
import { useRovingTabindex } from "../components/calendar/useRovingTabindex.js";
import { ClearPublicUseModal } from "../components/ClearPublicUseModal.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { MaintenanceBlockModal } from "../components/MaintenanceBlockModal.jsx";
import { buildStatusDialog, ReservationDetailDrawer } from "../components/ReservationDetailDrawer.jsx";

const OFFLINE_MESSAGE =
  "The system is offline or the office network is down. Try again once the network is back.";

export function CalendarPage({ onNavigate }) {
  const [date, setDate] = useState(getManilaDate);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  // Cleared-public-use state is *not* stored locally. We read the user
  // role from `/api/session` only to gate the admin entry points; the
  // cleared-public-use status of any cell is derived only from the
  // backend `/api/schedule` payload (and from `/api/dashboard/alerts`
  // for the dashboard banner) per Req. 13.9.
  const [user, setUser] = useState(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [maintenanceModal, setMaintenanceModal] = useState({ open: false, blockToDeactivate: null });
  const [clearPublicUseOpen, setClearPublicUseOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  // Per-day overflow drawer surfaced when a day carries more than the
  // visible-block cap (4) and the staff member activates the
  // `+ N more` overflow tile. `triggerRef` captures the originating
  // overflow tile (via `document.activeElement` at click time) so
  // focus returns there on close.
  const [dayDrawer, setDayDrawer] = useState({ open: false, day: null, items: [], triggerRef: null });
  const gridRef = useRef(null);

  // Today's alerts moved off the calendar surface to the dashboard so
  // the calendar tab focuses on the week grid alone (user note: "I
  // want the calendar tab to only have the calendar"). The dashboard
  // page now consumes `/api/dashboard/alerts` and renders the
  // `DashboardAlertsCard` in its place.

  // Resolve the signed-in user's role so admin-only entry points
  // ("Add maintenance block", "Deactivate block", "Clear for public
  // use") are mounted only when `user.role === "ADMIN"` (Req. 4.7,
  // 13.10, 16.1). On any session error the user remains null so the
  // admin actions stay hidden — the UI never assumes admin access.
  useEffect(() => {
    let active = true;
    getSession()
      .then((data) => {
        if (!active) return;
        setUser(data && data.authenticated ? data.user : null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setState({ loading: true, data: null, error: "" });
    apiRequest(`/api/schedule?date=${encodeURIComponent(date)}`)
      .then((data) => {
        if (!active) return;
        setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        const message = isNetworkError(error) ? OFFLINE_MESSAGE : error.message;
        setState({ loading: false, data: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [date, scheduleVersion]);

  // Roving tabindex on the week grid: the whole grid behaves as a
  // single Tab stop, with arrow keys moving focus inside it. The
  // hook is mounted unconditionally so the sweep activates on first
  // render and re-runs whenever the grid's child list changes.
  useRovingTabindex(gridRef);

  function refreshSchedule() {
    setScheduleVersion((version) => version + 1);
  }

  function openDayDrawer(day, items) {
    // Capture the element that triggered the overflow tile click so
    // we can return focus to it on close. `document.activeElement`
    // resolves to the overflow tile that just fired the click handler
    // — wrapping it in a `{ current }` shape lets `CalendarDayDrawer`
    // consume it through the same ref-style API as React refs.
    const trigger = typeof document !== "undefined" ? document.activeElement : null;
    setDayDrawer({ open: true, day, items, triggerRef: { current: trigger } });
  }

  function openReservationDetail(reservation) {
    if (!reservation) return;
    setActionError("");
    setSelectedReservation(reservation);
  }

  function closeReservationDetail() {
    setSelectedReservation(null);
    setStatusDialog(null);
    setActionError("");
  }

  async function updateReservationStatus() {
    if (!statusDialog) return;

    const action = statusDialog;
    setStatusDialog(null);
    setBusy(true);
    setActionError("");

    try {
      const data = await apiRequest(`/api/reservations/${action.reservation.reservationId}/status`, {
        method: "POST",
        body: JSON.stringify({ statusCode: action.statusCode })
      });
      const updated = data.reservation;
      if (updated?.reservationId) {
        setSelectedReservation(updated);
      }
      refreshSchedule();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = Boolean(user && user.role === "ADMIN");

  const rawDays = Array.isArray(state.data?.days) ? state.data.days : [];
  const rows = Array.isArray(state.data?.rows) ? state.data.rows : [];
  const weekDays = normalizeWeekDays(rawDays, date);
  const itemsByDay = buildItemsByDay(weekDays, rows);
  const weekLabel = formatWeekLabel(weekDays);
  const today = getManilaDate();

  return (
    <section className="page">
      <div className="page-header page-head staff-page-head">
        <div>
          <h1 className="page-title">Calendar</h1>
          <div className="page-sub">{state.loading ? "Weekly schedule" : weekLabel}</div>
          <div className="page-sub-fil">Tingnan ang lahat ng reserbasyon ngayong linggo.</div>
        </div>
        <button className="btn btn-primary btn-big" type="button" onClick={() => onNavigate("/reservations/new")}>
          New Reservation
        </button>
      </div>

      <CalendarWeekToolbar
        weekLabel={weekLabel}
        isCurrent={weekIncludesDate(weekDays, today)}
        isAdmin={isAdmin}
        date={date}
        onPrev={() => setDate(addDays(date, -7))}
        onNext={() => setDate(addDays(date, 7))}
        onJumpToToday={() => setDate(today)}
        onSelectDate={(value) => setDate(value)}
        onDailyPrint={() => onNavigate(`/schedule/daily-print?date=${encodeURIComponent(date)}`)}
        onAddMaintenance={() => setMaintenanceModal({ open: true, blockToDeactivate: null })}
        onClearPublicUse={() => setClearPublicUseOpen(true)}
      />

      {/* Today's alerts moved off the calendar surface to the
        dashboard so the calendar tab focuses on the week grid alone
        (user note: "I want the calendar tab to only have the
        calendar"). */}

      <CalendarLegend />

      {state.loading ? (
        <div className="calendar-state-card">
          <LoadingState label="Loading weekly calendar..." />
        </div>
      ) : state.error ? (
        <div className="alert error" role="alert">{state.error}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No schedule slots found"
          body="The calendar could not find active court hours for this week."
          action={<button className="btn btn-primary" type="button" onClick={() => onNavigate("/reservations/new")}>New Reservation</button>}
        />
      ) : (
        <div className="staff-week-grid" ref={gridRef} aria-label="Weekly reservation calendar">
          {weekDays.map((day) => {
            const items = itemsByDay.get(day.date) || [];
            return (
              <CalendarDayColumn
                key={day.date}
                day={day}
                items={items}
                isToday={day.date === today}
                isAdmin={isAdmin}
                onOpenReservation={openReservationDetail}
                onDeactivateBlock={(block) => setMaintenanceModal({ open: true, blockToDeactivate: block })}
                onOpenDay={openDayDrawer}
              />
            );
          })}
        </div>
      )}

      <CalendarDayDrawer
        open={dayDrawer.open}
        day={dayDrawer.day}
        items={dayDrawer.items}
        triggerRef={dayDrawer.triggerRef}
        onClose={() => setDayDrawer({ open: false, day: null, items: [], triggerRef: null })}
        onOpenReservation={openReservationDetail}
        onDeactivateBlock={(block) => setMaintenanceModal({ open: true, blockToDeactivate: block })}
        isAdmin={isAdmin}
      />

      {actionError && <div className="alert error" role="alert">{actionError}</div>}

      <ReservationDetailDrawer
        reservation={selectedReservation}
        busy={busy}
        onClose={closeReservationDetail}
        onEdit={() => selectedReservation && onNavigate(`/reservations/${selectedReservation.reservationId}/edit`)}
        onRequestStatus={(action) => selectedReservation && setStatusDialog(buildStatusDialog(selectedReservation, action))}
        suspendEscape={Boolean(statusDialog)}
      />

      {statusDialog && (
        <ConfirmDialog
          title={statusDialog.title}
          body={statusDialog.body}
          confirmLabel={statusDialog.confirmLabel}
          danger={statusDialog.danger}
          onConfirm={updateReservationStatus}
          onCancel={() => setStatusDialog(null)}
          busy={busy}
        />
      )}

      {isAdmin && (
        <>
          <MaintenanceBlockModal
            open={maintenanceModal.open}
            onClose={() => setMaintenanceModal({ open: false, blockToDeactivate: null })}
            onCreated={() => {
              setMaintenanceModal({ open: false, blockToDeactivate: null });
              refreshSchedule();
            }}
            user={user}
            blockToDeactivate={maintenanceModal.blockToDeactivate}
            defaultDate={date}
          />
          <ClearPublicUseModal
            open={clearPublicUseOpen}
            onClose={() => setClearPublicUseOpen(false)}
            onCleared={() => {
              // The backend response is consumed by the modal for the
              // cancellations panel only. The calendar's cleared-public-
              // use state is read fresh from `/api/schedule` so we trigger
              // a refetch instead of writing local cleared-day state
              // (Req. 13.9).
              refreshSchedule();
            }}
            user={user}
            defaultDate={date}
          />
        </>
      )}
    </section>
  );
}

function weekIncludesDate(weekDays, dateKey) {
  if (!Array.isArray(weekDays) || !dateKey) return false;
  return weekDays.some((day) => day && day.date === dateKey);
}

function buildItemsByDay(days, rows) {
  const byDay = new Map(days.map((day) => [day.date, []]));
  const seenReservations = new Set();
  const seenBlocks = new Set();

  rows.forEach((row) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];

    cells.forEach((cell, index) => {
      const day = days[index];
      if (!day) return;

      const reservation = cell?.reservation;
      if (reservation && reservation.reservationId) {
        const key = `${day.date}-${reservation.reservationId}`;
        if (!seenReservations.has(key)) {
          seenReservations.add(key);
          byDay.get(day.date)?.push({
            kind: "reservation",
            id: reservation.reservationId,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            statusCode: String(reservation.statusCode || cell.statusCode || "RESERVED").toUpperCase(),
            statusName: reservation.statusName || cell.statusName || "",
            reservation
          });
        }
      }

      const block = cell?.block;
      if (block && block.blockId !== undefined && block.blockId !== null) {
        const key = `${day.date}-${block.blockId}`;
        if (!seenBlocks.has(key)) {
          seenBlocks.add(key);
          byDay.get(day.date)?.push({
            kind: "block",
            id: block.blockId,
            startTime: block.startTime || cell.startTime,
            endTime: block.endTime || cell.endTime,
            statusCode: String(block.statusCode || cell.statusCode || "").toUpperCase(),
            statusName: block.statusName || cell.statusName || "",
            block
          });
        }
      }
    });
  });

  byDay.forEach((items) => {
    items.sort((first, second) => {
      const timeCompare = String(first.startTime || "").localeCompare(String(second.startTime || ""));
      if (timeCompare !== 0) return timeCompare;
      // Show reservations before blocks at the same start time so the
      // resident-facing record reads first; ties otherwise fall back to id.
      if (first.kind !== second.kind) {
        return first.kind === "reservation" ? -1 : 1;
      }
      return Number(first.id || 0) - Number(second.id || 0);
    });
  });

  return byDay;
}

function formatWeekLabel(days) {
  if (!days.length) return "";

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const firstDate = formatCalendarDate(first, { month: "long", day: "numeric" });
  const lastDate = formatCalendarDate(last, { month: "long", day: "numeric", year: "numeric" });

  return `${firstDate} - ${lastDate}`;
}

function formatShortDate(date) {
  return formatCalendarDate(date, { month: "short", day: "numeric" });
}

function formatCalendarDate(date, options) {
  if (!date) return "";
  const parsed = parseDate(date);
  if (!parsed) return String(date || "");

  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(parsed);
}

function getDayNumber(date) {
  if (!isValidDateString(date)) return "";
  const [, , day] = String(date || "").split("-");
  return Number(day) || "";
}

// `formatShortDate` and `getDayNumber` are kept in this module as
// page-scope helpers. The redesigned day-card head reads its number
// through `CalendarWeekdayHeader` from the canonical day's date
// string, so neither helper has a current call site here — but they
// remain available for future page-level callers that need the
// day-of-month integer or the compact "May 18" string without
// re-deriving them. The `void` references silence the unused-binding
// linter while keeping the helpers attached to the module they
// already belonged to.
void formatShortDate;
void getDayNumber;

function normalizeWeekDays(days, anchorDate) {
  const fallbackDays = buildWeekDays(getWeekStartDate(anchorDate));
  if (!Array.isArray(days) || days.length === 0) return fallbackDays;

  return fallbackDays.map((fallbackDay, index) => {
    const day = days[index] || {};
    const safeDate = isValidDateString(day.date) ? day.date : fallbackDay.date;
    const safeName = String(day.name || "").trim() || fallbackDay.name;

    return {
      date: safeDate,
      name: safeName
    };
  });
}

function buildWeekDays(weekStartDate) {
  return Array.from({ length: 7 }, (_item, index) => {
    const date = addDays(weekStartDate, index);

    return {
      date,
      name: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
    };
  });
}

function getWeekStartDate(date) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) return getManilaDate();

  parsed.setUTCDate(parsed.getUTCDate() - parsed.getUTCDay());
  return parsed.toISOString().slice(0, 10);
}

function addDays(date, offset) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day + offset));

  if (Number.isNaN(parsed.getTime())) return getManilaDate();

  return parsed.toISOString().slice(0, 10);
}

function isValidDateString(date) {
  return Boolean(parseDate(date));
}

function parseDate(date) {
  const text = String(date || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function getManilaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function isNetworkError(error) {
  if (!error) return false;
  if (error.name === "TypeError" && typeof error.status === "undefined") return true;
  if (error.message === "Failed to fetch") return true;
  if (error.message === "Network request failed") return true;
  return false;
}
