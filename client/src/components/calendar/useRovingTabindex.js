import { useEffect, useLayoutEffect, useState } from "react";

const FOCUSABLE_SELECTOR = ".staff-booking-block, .staff-day-overflow";

/**
 * Roving tabindex on the week grid. The whole grid behaves as a single
 * tab stop; arrow keys move focus inside it. ArrowLeft/Right cross
 * day columns (skipping empty ones), ArrowUp/Down move within the
 * focused column, Home/End jump to first/last focusable block in the
 * focused column. Enter and Space let the native button click flow
 * run; the hook does not call preventDefault on those keys.
 *
 * The hook keeps at most one [tabindex="0"] descendant at any time
 * (Property 11). The first focusable child of the first non-empty
 * column is the resting member; every other focusable becomes -1.
 *
 * Re-runs the sweep whenever the grid's child list changes via a
 * MutationObserver — safer than keying off a derived items list
 * because the grid re-renders on every fetch.
 *
 * On the first render `gridRef.current` is `null` because
 * `CalendarPage` shows `<LoadingState />` until the schedule fetch
 * settles, at which point the `.staff-week-grid` mounts. React does
 * not re-run effects when a ref's `.current` changes, so we mirror
 * the live element into local state via `useLayoutEffect` and key
 * the setup effect off that mirrored value. The mirror runs after
 * every render, which lets the setup effect re-run as soon as the
 * grid mounts (or remounts after an error → success transition).
 *
 * @param {React.RefObject<HTMLElement>} gridRef
 */
export function useRovingTabindex(gridRef) {
  const [grid, setGrid] = useState(null);

  useLayoutEffect(() => {
    const next = gridRef.current ?? null;
    setGrid((current) => (current === next ? current : next));
  });

  useEffect(() => {
    if (!grid) return undefined;

    function getColumns() {
      return Array.from(grid.querySelectorAll(".staff-day-card"));
    }

    function getFocusables(scope) {
      return Array.from(scope.querySelectorAll(FOCUSABLE_SELECTOR));
    }

    function sweep() {
      const all = getFocusables(grid);
      if (all.length === 0) return;
      const currentZero = all.find((el) => el.getAttribute("tabindex") === "0");
      if (currentZero && grid.contains(currentZero)) {
        for (const el of all) {
          if (el !== currentZero) el.setAttribute("tabindex", "-1");
        }
        return;
      }
      for (const el of all) el.setAttribute("tabindex", "-1");
      const columns = getColumns();
      for (const column of columns) {
        const first = column.querySelector(FOCUSABLE_SELECTOR);
        if (first) {
          first.setAttribute("tabindex", "0");
          return;
        }
      }
    }

    function moveFocus(target) {
      if (!target) return;
      const all = getFocusables(grid);
      for (const el of all) el.setAttribute("tabindex", el === target ? "0" : "-1");
      target.focus();
    }

    function handleKeyDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.matches(FOCUSABLE_SELECTOR)) return;

      const column = target.closest(".staff-day-card");
      if (!column) return;
      const columns = getColumns();
      const columnIndex = columns.indexOf(column);
      const rows = getFocusables(column);
      const rowIndex = rows.indexOf(target);

      switch (event.key) {
        case "ArrowRight": {
          for (let i = columnIndex + 1; i < columns.length; i++) {
            const candidates = getFocusables(columns[i]);
            if (candidates.length > 0) {
              event.preventDefault();
              moveFocus(candidates[0]);
              return;
            }
          }
          return;
        }
        case "ArrowLeft": {
          for (let i = columnIndex - 1; i >= 0; i--) {
            const candidates = getFocusables(columns[i]);
            if (candidates.length > 0) {
              event.preventDefault();
              moveFocus(candidates[0]);
              return;
            }
          }
          return;
        }
        case "ArrowDown": {
          if (rowIndex >= 0 && rowIndex < rows.length - 1) {
            event.preventDefault();
            moveFocus(rows[rowIndex + 1]);
          }
          return;
        }
        case "ArrowUp": {
          if (rowIndex > 0) {
            event.preventDefault();
            moveFocus(rows[rowIndex - 1]);
          }
          return;
        }
        case "Home": {
          if (rows.length > 0) {
            event.preventDefault();
            moveFocus(rows[0]);
          }
          return;
        }
        case "End": {
          if (rows.length > 0) {
            event.preventDefault();
            moveFocus(rows[rows.length - 1]);
          }
          return;
        }
        default:
          return;
      }
    }

    sweep();

    const observer = new MutationObserver(() => sweep());
    observer.observe(grid, { childList: true, subtree: true });
    grid.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      grid.removeEventListener("keydown", handleKeyDown);
    };
  }, [grid]);
}
