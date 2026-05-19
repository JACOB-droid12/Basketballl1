import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Behavioral test for the shared `ModalShell` overlay container.
//
// Uses the same static-source assertion style as the other React tests
// in this project (JSX cannot be loaded directly under `node --test`
// and no JSDOM-backed renderer is wired into the test runner). The
// assertions pin the behavioral contract a render-based test would
// exercise:
//
//   render <ModalShell open size="md" onClose={spy} title="x"
//                      footer={<button>OK</button>}>body</ModalShell>
//   →  the dialog section carries aria-modal="true"
//   →  the body region (`.modal-shell-body`) declares `overflow: auto`
//   →  the footer (`<footer className="modal-shell-foot">`) is rendered
//       after the body in the DOM order
//   →  pressing Escape calls onClose once (via onCloseRef.current?.())
//
//   render <ModalShell open={false} ...>  →  component returns null
//
// Requirements covered: 3.1, 3.7
// ---------------------------------------------------------------------------

function readSourceFile(relativePath) {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

const modalShellSource = readSourceFile("client/src/components/ModalShell.jsx");
const stylesSource = readSourceFile("client/src/styles.css");

// ---------------------------------------------------------------------------
// Req. 3.1 — `open={false}` mounts nothing (component returns null)
// ---------------------------------------------------------------------------

test("ModalShell returns null when `open` is false so nothing is mounted", () => {
  // The early-return guard runs after the focus-trap effect declaration
  // (so the effect's cleanup still fires when `open` flips from true to
  // false), but before any JSX is produced. With `open={false}` the
  // render path therefore yields `null` and no backdrop, dialog, body,
  // or footer DOM is mounted (Req. 3.1).
  assert.match(
    modalShellSource,
    /if \(!open\) return null;/,
    "ModalShell must early-return null when `open` is false"
  );

  // The early return appears before the JSX `return (` block so the
  // backdrop/section/header/body/footer markup is never produced when
  // `open` is false.
  const earlyReturnIndex = modalShellSource.indexOf("if (!open) return null;");
  const jsxReturnIndex = modalShellSource.indexOf(
    'className="modal-shell-backdrop"'
  );
  assert.ok(
    earlyReturnIndex > 0,
    "early-return guard for !open must be present"
  );
  assert.ok(
    jsxReturnIndex > earlyReturnIndex,
    "the backdrop/section markup must follow the early-return guard"
  );
});

// ---------------------------------------------------------------------------
// Req. 3.7 — single shared overlay with header / body / footer regions
// ---------------------------------------------------------------------------

test("ModalShell renders the dialog with aria-modal=\"true\" so assistive tech treats it as modal", () => {
  // The section is wired with role="dialog" and aria-modal="true" so
  // screen readers and the focus-trap loop both recognize it as a
  // modal dialog (Req. 3.1, 3.7).
  assert.match(modalShellSource, /role="dialog"/);
  assert.match(modalShellSource, /aria-modal="true"/);

  // The accessible name is provided via aria-labelledby to the heading
  // id, so the title="x" prop reaches the assistive-tech name.
  assert.match(modalShellSource, /aria-labelledby=\{titleId\}/);
  assert.match(modalShellSource, /<h2 id=\{titleId\}>\{title\}<\/h2>/);
});

test("ModalShell body region declares `overflow: auto` so only the body scrolls", () => {
  // The JSX renders the body region with the `.modal-shell-body`
  // class (Req. 3.7 — body is the second of three pinned regions).
  assert.match(
    modalShellSource,
    /<div className="modal-shell-body">\{children\}<\/div>/
  );

  // The CSS rule for that class declares `overflow: auto` so the body
  // is the only scrollable region; the header and footer remain pinned
  // (Req. 3.7, 3.9). The same rule also pins `min-height: 0` so the
  // grid row collapses correctly inside the `auto 1fr auto` layout.
  assert.match(
    stylesSource,
    /\.modal-shell-body\s*\{[^}]*overflow:\s*auto[^}]*\}/,
    ".modal-shell-body must declare `overflow: auto` in styles.css"
  );
});

test("ModalShell renders footer after the body so the three regions are header → body → footer", () => {
  // The three regions render in the documented order so footer action
  // buttons sit below the scrollable body region and stay visible
  // (Req. 3.7, 3.8). The static check asserts the JSX index order:
  //   header  <  body  <  footer
  const headerIndex = modalShellSource.indexOf(
    '<header className="modal-shell-head">'
  );
  const bodyIndex = modalShellSource.indexOf(
    '<div className="modal-shell-body">'
  );
  const footerIndex = modalShellSource.indexOf(
    '<footer className="modal-shell-foot">'
  );

  assert.ok(headerIndex > 0, "modal-shell-head must be rendered");
  assert.ok(bodyIndex > 0, "modal-shell-body must be rendered");
  assert.ok(footerIndex > 0, "modal-shell-foot must be rendered");
  assert.ok(
    headerIndex < bodyIndex,
    "header must appear before the body in JSX order"
  );
  assert.ok(
    bodyIndex < footerIndex,
    "body must appear before the footer in JSX order"
  );

  // Footer is conditional on the `footer` prop, so passing
  // `footer={<button>OK</button>}` mounts the `<footer>` region with
  // the OK button as its only child (Req. 3.7 — footer holds primary
  // and secondary action buttons only).
  assert.match(
    modalShellSource,
    /\{footer && <footer className="modal-shell-foot">\{footer\}<\/footer>\}/,
    "footer region must be conditional on the `footer` prop"
  );
});

test("ModalShell pressing Escape calls onClose exactly once when not busy", () => {
  // The keyboard handler reads the latest onClose from a ref so the
  // listener stays stable across re-renders (the effect would otherwise
  // re-bind every time the parent passes a fresh inline function).
  assert.match(modalShellSource, /onCloseRef\.current = onClose;/);

  // The Escape branch:
  //   - is gated on `event.key === "Escape"`
  //   - early-returns when `busy` is true (so a request-in-flight
  //     dialog cannot be dismissed mid-save)
  //   - calls `event.preventDefault()` so the browser's own Escape
  //     handling cannot also fire (preventing duplicate cancellation)
  //   - invokes `onCloseRef.current?.()` exactly once per Escape event
  // (Req. 3.7 — the shared shell is the single Escape handler for
  //  every dialog/drawer in the staff console.)
  assert.match(
    modalShellSource,
    /if \(event\.key === "Escape"\)\s*\{[\s\S]*?if \(busy\) return;[\s\S]*?event\.preventDefault\(\);[\s\S]*?onCloseRef\.current\?\.\(\);/,
    "Escape handler must guard on busy, preventDefault, and call onClose once"
  );

  // The handler is registered exactly once via document.addEventListener
  // and removed in the effect cleanup, so a single Escape press fires
  // one listener invocation.
  assert.match(
    modalShellSource,
    /document\.addEventListener\("keydown", handleKeyDown\);/
  );
  assert.match(
    modalShellSource,
    /document\.removeEventListener\("keydown", handleKeyDown\);/
  );

  // The Escape branch contains a single `onCloseRef.current?.()` call
  // (the other onClose invocations live in the backdrop click handler
  // and the close-button onClick — both separate code paths). The
  // assertion below pins the call count inside the keydown handler.
  const keyDownStart = modalShellSource.indexOf("const handleKeyDown");
  const keyDownEnd = modalShellSource.indexOf(
    "document.addEventListener",
    keyDownStart
  );
  assert.ok(
    keyDownStart > 0 && keyDownEnd > keyDownStart,
    "handleKeyDown definition must be located"
  );
  const keyDownBody = modalShellSource.slice(keyDownStart, keyDownEnd);
  const escapeOnCloseCalls = keyDownBody.match(/onCloseRef\.current\?\.\(\)/g) || [];
  assert.equal(
    escapeOnCloseCalls.length,
    1,
    "Escape handler must call onCloseRef.current exactly once per keypress"
  );
});
