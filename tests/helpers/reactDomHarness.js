// Provisions a `jsdom` window so React tests can mount components under
// `node:test`. Test files import `setupDom` once at the top of the
// module — the harness is idempotent so subsequent calls are no-ops,
// which lets multiple test files share the same DOM under
// `--experimental-test-isolation=none` without re-installing globals.
//
// The harness wires `@testing-library/react`'s `cleanup` into a
// `node:test` `afterEach` hook so individual tests do not have to
// remember to unmount, matching the convention the new
// `tests/reactCalendarWeek*.test.js` suites depend on.

import { afterEach } from "node:test";

import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";

let dom = null;
let cleanupHookInstalled = false;

export function setupDom() {
  if (!dom) {
    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/",
      pretendToBeVisual: true
    });

    installGlobals(dom.window);
  }

  if (!cleanupHookInstalled) {
    // `afterEach` registered at module top-level applies to every test
    // declared inside the same file. Install it once per process so we
    // do not stack duplicate cleanups.
    afterEach(() => {
      cleanup();
    });
    cleanupHookInstalled = true;
  }
}

export function teardownDom() {
  if (!dom) return;

  cleanup();
  dom.window.close();
  dom = null;
}

function installGlobals(window) {
  // Hand the window-level objects React, Testing Library, and
  // `CalendarPage` reach for during render and event handling. We
  // intentionally avoid copying *every* window key onto `globalThis`
  // — that breaks Node internals (e.g. `globalThis.URL`). The list
  // below covers the surface tested by the calendar suites.
  //
  // Node 22+ exposes `globalThis.navigator` as a getter-only property,
  // so a plain assignment throws. `defineGlobal` falls back to
  // `Object.defineProperty` when the slot is non-writable.
  defineGlobal("window", window);
  defineGlobal("document", window.document);
  defineGlobal("navigator", window.navigator);
  defineGlobal("HTMLElement", window.HTMLElement);
  defineGlobal("Node", window.Node);
  defineGlobal("Element", window.Element);
  defineGlobal("Event", window.Event);
  defineGlobal("MouseEvent", window.MouseEvent);
  defineGlobal("KeyboardEvent", window.KeyboardEvent);
  // `useRovingTabindex` observes the grid via a MutationObserver so the
  // tabindex sweep re-runs when the day-card list mounts. jsdom ships a
  // working implementation; expose it on `globalThis` so the hook can
  // reach it the same way browser code does.
  defineGlobal("MutationObserver", window.MutationObserver);
  defineGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  defineGlobal("requestAnimationFrame", window.requestAnimationFrame.bind(window));
  defineGlobal("cancelAnimationFrame", window.cancelAnimationFrame.bind(window));

  // jsdom does not ship a `matchMedia` implementation. The calendar
  // toolbar and CSS hooks read it indirectly via component code, so
  // provide a no-op shim that returns a non-matching MediaQueryList.
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query) => ({
      matches: false,
      media: String(query || ""),
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });
  }
  defineGlobal("matchMedia", window.matchMedia.bind(window));
}

// `globalThis.navigator` (and a handful of other web globals) ships as a
// getter-only accessor in Node 22+. A bare assignment to such a slot throws
// a TypeError, which would tear down every test that uses this harness.
// `defineGlobal` first tries the cheap path — direct assignment — and falls
// back to redefining the property when assignment is rejected.
function defineGlobal(name, value) {
  try {
    globalThis[name] = value;
    if (globalThis[name] === value) return;
  } catch {
    // fall through to defineProperty
  }
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value
  });
}
