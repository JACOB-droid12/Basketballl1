import { useEffect, useId, useRef } from "react";

import { Icon } from "./Icon.jsx";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

/**
 * Shared overlay container for every dialog and drawer in the staff
 * console. The component consolidates the focus-trap loop, backdrop
 * dismissal, and Escape handling that previously lived in three copies
 * across `ConfirmDialog`, `MaintenanceBlockModal`, and
 * `ResidentPickerDialog`, so every overlay shares one implementation
 * and one set of layout rules.
 *
 * Props:
 *   - `open` (boolean): controls mount. When `false` the component
 *     returns `null` so form state cannot leak between mounts (Req. 3.1).
 *   - `onClose` (function): invoked on backdrop click and Escape (only
 *     when `busy` is falsy). Latest value is read from a ref so the
 *     keyboard handler stays stable across re-renders.
 *   - `title` (node): heading content rendered inside `<h2>`. Provides
 *     the accessible name via `aria-labelledby`.
 *   - `kicker` (node, optional): small page-kicker line above the
 *     heading.
 *   - `subtitle` (node, optional): descriptive copy below the heading.
 *     When present, the section is wired to it via `aria-describedby`.
 *   - `size` ("sm" | "md" | "lg"): max-width preset, defaults to "md".
 *     Mirrored on the container as `modal-shell-{size}` so the CSS
 *     additions in task 2.2 can swap max-widths (440 / 560 / 720).
 *   - `busy` (boolean): suppresses Escape close and backdrop dismissal
 *     while a request is in flight, and disables the close button so
 *     the staff member cannot dismiss the dialog mid-save.
 *   - `footer` (node, optional): sticky footer content (typically
 *     primary/secondary `.btn` buttons). When omitted, the footer
 *     region is not rendered.
 *   - `initialFocusRef` (ref, optional): element to focus on mount.
 *     Falls back to the close button so keyboard users land inside the
 *     dialog regardless of the consumer's setup.
 *   - `children` (node): body content. The body region scrolls when
 *     content exceeds the viewport; header and footer remain pinned.
 *
 * Layout rules are sourced exclusively from existing Barangay tokens
 * (`--surface`, `--border`, `--shadow-lg`, `--radius-lg`, the
 * `--space-*` scale). No new tokens, gradients, or color variants are
 * introduced (Req. 3.11). The CSS rules for `.modal-shell-*` are added
 * in task 2.2.
 *
 * Requirements: 3.1, 3.4, 3.7, 3.8, 3.9, 3.11
 */
export function ModalShell({
  open,
  onClose,
  title,
  kicker,
  subtitle,
  size = "md",
  busy = false,
  footer,
  initialFocusRef,
  children
}) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const reactId = useId();
  const titleId = `modal-shell-title-${reactId}`;
  const subtitleId = `modal-shell-subtitle-${reactId}`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Focus trap + Escape close + focus restoration. The effect only runs
  // while `open` is true; when `open` flips to false the component
  // returns `null` below and the cleanup runs automatically. The same
  // pattern is used by the existing `ConfirmDialog`,
  // `MaintenanceBlockModal`, and `ResidentPickerDialog` components.
  useEffect(() => {
    if (!open) return undefined;
    if (typeof document === "undefined") return undefined;

    const previouslyFocusedElement = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      const target =
        (initialFocusRef && initialFocusRef.current) || closeButtonRef.current;
      if (target && typeof target.focus === "function") {
        target.focus();
      }
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (busy) return;
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !containerRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !containerRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
    };
  }, [open, busy, initialFocusRef]);

  if (!open) return null;

  function handleBackdropClick() {
    // Backdrop dismissal is disabled while a request is in flight so
    // the staff member cannot accidentally drop the form mid-save.
    if (busy) return;
    onCloseRef.current?.();
  }

  function stopPropagation(event) {
    event.stopPropagation();
  }

  const sizeClass = size === "sm" || size === "lg" ? `modal-shell-${size}` : "modal-shell-md";

  return (
    <div
      className="modal-shell-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        className={`modal-shell ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        ref={containerRef}
        onClick={stopPropagation}
      >
        <header className="modal-shell-head">
          <div className="modal-shell-heading">
            {kicker && <p className="page-kicker">{kicker}</p>}
            <h2 id={titleId}>{title}</h2>
            {subtitle && (
              <div id={subtitleId} className="d-sub">
                {subtitle}
              </div>
            )}
          </div>
          <button
            className="modal-shell-close"
            type="button"
            onClick={() => onCloseRef.current?.()}
            disabled={busy}
            aria-label="Close dialog"
            ref={closeButtonRef}
          >
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="modal-shell-body">{children}</div>
        {footer && <footer className="modal-shell-foot">{footer}</footer>}
      </section>
    </div>
  );
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter((element) => {
    if (element.hasAttribute("disabled")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    return element.offsetParent !== null || element === document.activeElement;
  });
}
