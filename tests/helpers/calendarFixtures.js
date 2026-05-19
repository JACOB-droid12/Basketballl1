// Test fixtures for the calendar week-view suite.
//
// `makeWeekDays(anchorDate)` produces a 7-element `{ date, name }`
// array starting on the Sunday of the week containing `anchorDate`,
// matching the shape `/api/schedule` returns under `data.days`.
//
// `makeReservationItem` and `makeBlockItem` produce cell-shaped
// payloads (i.e., the `cells[]` entries inside `data.rows`) so test
// authors can plug them into `scheduleResponse.rows[].cells[]` to
// drive the page-level `buildItemsByDay()` derivation.
//
// `mountCalendarPage({ scheduleResponse, sessionResponse, today })`
// stubs `globalThis.fetch` to dispatch on path (so both the
// `apiRequest('/api/schedule?date=…')` and `getSession()` calls in
// `CalendarPage.jsx` resolve against the supplied responses), freezes
// `Date.now()` at noon Manila on the supplied `today` so the page's
// `getManilaDate()` returns a deterministic date, then mounts the
// page through `@testing-library/react`. Cleanup runs automatically
// in an `afterEach` hook so tests do not have to remember to restore
// the stubs.

import React from "react";
import { afterEach } from "node:test";

import { render } from "@testing-library/react";

import { CalendarPage } from "../../client/src/pages/CalendarPage.jsx";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const stubState = {
  originalFetch: undefined,
  originalNow: undefined,
  fetchInstalled: false,
  nowInstalled: false
};

function ensureCleanupHook() {
  // This helper is imported by many test files while the runner uses
  // `--experimental-test-isolation=none`, so the module instance is shared
  // across files. Register cleanup for every active file/test context instead
  // of guarding it once globally; otherwise a later file can leave the fetch
  // stub installed and break unrelated HTTP tests.
  afterEach(() => {
    restoreFetch();
    restoreNow();
  });
}

export function makeWeekDays(anchorDate) {
  const sunday = getWeekStartDate(anchorDate);
  return Array.from({ length: 7 }, (_unused, index) => {
    const date = addDays(sunday, index);
    return { date, name: DAY_NAMES[index] };
  });
}

export function makeReservationItem(overrides = {}) {
  // Returns a `cells[]`-shaped payload so it can be slotted directly
  // into `scheduleResponse.rows[].cells[<dayIndex>]`. The page's
  // `buildItemsByDay()` reads `cell?.reservation` from each cell.
  const {
    reservationId = 1001,
    referenceNo = "BSN-2026-000001",
    representativeName = "Sample Resident",
    purpose = "Practice",
    startTime = "07:00",
    endTime = "08:00",
    statusCode = "RESERVED",
    statusName = "Reserved",
    ...rest
  } = overrides;

  return {
    reservation: {
      reservationId,
      referenceNo,
      representativeName,
      purpose,
      startTime,
      endTime,
      statusCode,
      statusName,
      ...rest
    }
  };
}

export function makeBlockItem(overrides = {}) {
  // Returns a `cells[]`-shaped payload with a `block` payload set.
  // The page reads both `block.blockType` and the legacy `block.type`,
  // so the helper writes both keys so older fixtures interop with the
  // newer schema.
  const {
    blockId = 5001,
    blockType = "MAINTENANCE",
    type,
    reason = "Court repair",
    startTime = "06:00",
    endTime = "08:00",
    statusCode = "MAINTENANCE",
    statusName = "Maintenance",
    ...rest
  } = overrides;

  return {
    block: {
      blockId,
      blockType,
      type: type || blockType,
      reason,
      startTime,
      endTime,
      statusCode,
      statusName,
      ...rest
    }
  };
}

export function mountCalendarPage({
  scheduleResponse,
  sessionResponse,
  today,
  onNavigate
} = {}) {
  ensureCleanupHook();

  if (today) {
    freezeManilaDateAt(today);
  }

  const fetchStub = installFetchStub({ scheduleResponse, sessionResponse });
  const navigateSpy = onNavigate || (() => {});

  const utils = render(
    React.createElement(CalendarPage, { onNavigate: navigateSpy })
  );

  return {
    ...utils,
    fetchStub,
    onNavigate: navigateSpy
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function installFetchStub({ scheduleResponse, sessionResponse }) {
  if (!stubState.fetchInstalled) {
    stubState.originalFetch = globalThis.fetch;
    stubState.fetchInstalled = true;
  }

  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    calls.push({ url, init });

    if (isAbsoluteHttpUrl(url) && typeof stubState.originalFetch === "function") {
      return stubState.originalFetch(input, init);
    }

    const path = toRequestPath(url);

    if (path.startsWith("/api/session")) {
      return jsonResponse(sessionResponse ?? { authenticated: false, user: null });
    }
    if (path.startsWith("/api/schedule")) {
      return jsonResponse(scheduleResponse ?? { days: [], rows: [] });
    }

    return jsonResponse({}, { ok: false, status: 404 });
  };

  return {
    get calls() {
      return calls.slice();
    }
  };
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers()
  };
}

function toRequestPath(url) {
  if (!isAbsoluteHttpUrl(url)) return url;

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isAbsoluteHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function restoreFetch() {
  if (!stubState.fetchInstalled) return;
  globalThis.fetch = stubState.originalFetch;
  stubState.originalFetch = undefined;
  stubState.fetchInstalled = false;
}

function freezeManilaDateAt(manilaDate) {
  // Pin `Date.now()` (and therefore `new Date()` with no arguments) to
  // 04:00 UTC, which falls at 12:00 noon Manila on the supplied date.
  // That is comfortably inside the day in every timezone the page
  // formats with, so the page's `getManilaDate()` resolves to
  // `manilaDate` deterministically.
  if (!stubState.nowInstalled) {
    stubState.originalNow = Date.now;
    stubState.nowInstalled = true;
  }

  const fixed = Date.parse(`${manilaDate}T04:00:00.000Z`);
  Date.now = () => fixed;
}

function restoreNow() {
  if (!stubState.nowInstalled) return;
  Date.now = stubState.originalNow;
  stubState.originalNow = undefined;
  stubState.nowInstalled = false;
}

function getWeekStartDate(date) {
  const parsed = parseDateOnly(date);
  if (!parsed) return date;

  parsed.setUTCDate(parsed.getUTCDate() - parsed.getUTCDay());
  return parsed.toISOString().slice(0, 10);
}

function addDays(date, offset) {
  const parsed = parseDateOnly(date);
  if (!parsed) return date;
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function parseDateOnly(date) {
  const text = String(date || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
