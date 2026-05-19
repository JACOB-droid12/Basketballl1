import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { login } from "../api/client.js";
import { OFFICIAL_HEADER } from "../api/officialHeader.js";
import { Icon } from "../components/Icon.jsx";

/* Time-of-day greeting (Asia/Manila). Returns the italic emphasis word that  */
/* sits inside the headline. The set is intentionally short so the headline   */
/* never falls back to English; bilingual italic is the design rule.          */
function getGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false
    }).format(now)
  );
  if (hour >= 5 && hour < 12) return "Magandang umaga";
  if (hour >= 12 && hour < 18) return "Magandang hapon";
  if (hour >= 18 && hour < 23) return "Magandang gabi";
  return "Magandang hatinggabi";
}

const FIL_DAYS = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const FIL_MONTHS = [
  "Enero",
  "Pebrero",
  "Marso",
  "Abril",
  "Mayo",
  "Hunyo",
  "Hulyo",
  "Agosto",
  "Setyembre",
  "Oktubre",
  "Nobyembre",
  "Disyembre"
];
const ASSET_BASE_URL = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SEAL_IMAGE_SRC = `${ASSET_BASE_URL}seal-sto-nino.jpg`;

function getTodayLine(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const day = Number(get("day"));
  const month = Number(get("month"));
  const year = Number(get("year"));
  const hour24 = Number(get("hour"));
  const minute = get("minute");
  const weekdayShort = get("weekday"); // Sun, Mon, ...
  const enWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayIdx = enWeekdays.indexOf(weekdayShort);
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;

  const dayName = weekdayIdx >= 0 ? FIL_DAYS[weekdayIdx] : "";
  const monthName = FIL_MONTHS[month - 1] ?? "";
  return `${dayName} · ika-${day} ng ${monthName}, ${year} · ${hour12}:${minute} ${ampm}`;
}

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [systemReady, setSystemReady] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  /* Live "Today" line and headline greeting both tick on the same minute   */
  /* boundary as the topbar clock so a freshly-logged-in staff sees the     */
  /* same time on both surfaces during the transition.                     */
  useEffect(() => {
    let intervalId;
    const tick = () => setNow(new Date());
    const seconds = new Date().getSeconds();
    const ms = new Date().getMilliseconds();
    const nextMinuteDelay = (60 - seconds) * 1000 - ms;
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, nextMinuteDelay);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  /* "Office system ready" check: fonts loaded + DOM idle. We wait one frame */
  /* past document.fonts.ready so the dot pulses just after the entrance     */
  /* choreography lands, never during it.                                    */
  useEffect(() => {
    let cancelled = false;
    const fontsReady =
      typeof document !== "undefined" && document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    fontsReady.then(() => {
      if (cancelled) return;
      window.setTimeout(() => {
        if (!cancelled) setSystemReady(true);
      }, 700);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Caps Lock surfacing. Listens on key events while the password field is */
  /* in focus; cleared on blur so the banner never lingers.                  */
  useEffect(() => {
    function onKey(event) {
      if (typeof event.getModifierState === "function") {
        setCapsOn(event.getModifierState("CapsLock"));
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const greeting = useMemo(() => getGreeting(now), [now]);
  const todayLine = useMemo(() => getTodayLine(now), [now]);
  const showEnterHint = form.password.length > 0 && !loading;

  function handoffToDashboard(user) {
    /* View Transitions: morph the seal from login centerpiece to its     */
    /* topbar slot, cross-fade the rest. flushSync forces React to paint  */
    /* the new tree synchronously inside the transition so the API can    */
    /* capture both before/after states. Firefox + reduced-motion just    */
    /* swap (no flicker, no broken state).                                */
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(() => {
        flushSync(() => {
          onLogin(user);
          window.history.replaceState({}, "", "/dashboard");
        });
      });
    } else {
      onLogin(user);
      window.history.replaceState({}, "", "/dashboard");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await login(form);
      handoffToDashboard(data.user);
    } catch (loginError) {
      if (mountedRef.current) {
        setError(
          loginError.status === 401
            ? "We could not sign you in with that username and password. If you forgot your password, ask the administrator to reset your account."
            : loginError.message
        );
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="login-side-watermark" aria-hidden="true" />
        <div className="login-side-grain" aria-hidden="true" />        <div className="login-mark">
          <span className="login-republic">Republika ng Pilipinas</span>
          <SealImage />
          <strong className="login-barangay">{OFFICIAL_HEADER.barangayName}</strong>
          <span className="login-locale">City of Parañaque</span>
        </div>
        <div className="login-headline">
          <h1>
            Welcome.
            <br />
            <em key={greeting}>{greeting}.</em>
          </h1>
          <p>
            Sign in to start the basketball court reservation system.{" "}
            <span className="welcome-fil">Mag-sign in upang magsimula.</span>
          </p>
        </div>
        <div className="login-side-foot">
          <div className="login-today" aria-live="polite">
            <span className="login-today-label">Today</span>
            <span className="login-today-value">{todayLine}</span>
          </div>
          <div className="login-install-note">
            <span
              className={`login-ready-dot ${systemReady ? "is-ready" : ""}`}
              aria-hidden="true"
            />
            <span>
              Office computer · System ready · v1.0
            </span>
          </div>
        </div>
      </section>
      <section className="login-form-side">
        <form className="login-form-card" onSubmit={handleSubmit}>
          <div>
            <h2>Sign in</h2>
            <p className="sub">Mag-sign in gamit ang iyong account.</p>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            <span className="field-label">
              Username <span className="fil">· Pangalan ng user</span>
            </span>
            <input
              className="input"
              id="login-username"
              name="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span className="field-label">
              Password <span className="fil">· Password</span>
            </span>
            <input
              className="input"
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete="current-password"
              required
            />
            {capsOn && (
              <span className="login-caps" role="status">
                <Icon name="warn" size={16} />
                <span>
                  Caps Lock is on{" "}
                  <span className="fil">· Naka-on ang Caps Lock</span>
                </span>
              </span>
            )}
          </label>
          <button className="btn btn-primary btn-big" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <span
                  className={`login-enter-hint ${showEnterHint ? "is-shown" : ""}`}
                  aria-hidden="true"
                >
                  <kbd>↵</kbd>
                  <span>Enter</span>
                </span>
              </>
            )}
          </button>
          <div className="login-hint">
            <Icon name="info" />
            <span>
              <strong>Forgot password?</strong> Ask the administrator to reset your account at the
              barangay office.
              <br />
              <span className="login-hint-sub">Only barangay personnel can use this system.</span>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}

/* Seal renderer: tries to load the real official barangay seal image. If */
/* it isn't installed yet (the operator drops it in client/public later)  */
/* render a geometric civic mark — a red 12-tooth cog with the council     */
/* lettering on a thin ring. Strictly geometry + type, no figurative       */
/* imagery; the real seal is the only thing that should ever carry the    */
/* religious image.                                                        */
function SealImage() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <SealFallback />;
  }
  return (
    <img
      className="login-seal"
      src={SEAL_IMAGE_SRC}
      alt={`${OFFICIAL_HEADER.barangayName} official seal`}
      width="132"
      height="132"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function SealFallback() {
  /* 12-tooth cog approximated as a regular star polygon, civic green ring */
  /* lettering above and below. No icon at center; instead, an "N" set in  */
  /* Instrument Serif fills the centerpiece role until the real seal       */
  /* arrives. Designed to look intentionally provisional, not decorative.  */
  const teeth = 12;
  const outer = 56;
  const inner = 42;
  const points = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    points.push(`${(Math.cos(angle) * r + 66).toFixed(2)},${(Math.sin(angle) * r + 66).toFixed(2)}`);
  }

  return (
    <svg
      className="login-seal login-seal--fallback"
      width="132"
      height="132"
      viewBox="0 0 132 132"
      role="img"
      aria-label={`${OFFICIAL_HEADER.barangayName} placeholder seal`}
    >
      <defs>
        <path id="seal-arc-top" d="M 26 66 A 40 40 0 0 1 106 66" fill="none" />
        <path id="seal-arc-bot" d="M 26 66 A 40 40 0 0 0 106 66" fill="none" />
      </defs>
      <circle cx="66" cy="66" r="64" fill="#FFFFFF" />
      <circle cx="66" cy="66" r="64" fill="none" stroke="#1F6F3A" strokeWidth="1.5" />
      <polygon points={points.join(" ")} fill="#C8341E" />
      <circle cx="66" cy="66" r="28" fill="#FFFFFF" />
      <circle cx="66" cy="66" r="28" fill="none" stroke="#1F6F3A" strokeWidth="1" />
      <text fill="#1F6F3A" fontFamily="Instrument Serif, Georgia, serif" fontSize="36" textAnchor="middle" x="66" y="78">
        N
      </text>
      <text fill="#1F6F3A" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="8.5" letterSpacing="1.4">
        <textPath xlinkHref="#seal-arc-top" href="#seal-arc-top" startOffset="50%" textAnchor="middle">
          STO. NIÑO BARANGAY COUNCIL
        </textPath>
      </text>
      <text fill="#1F6F3A" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="8.5" letterSpacing="1.4">
        <textPath xlinkHref="#seal-arc-bot" href="#seal-arc-bot" startOffset="50%" textAnchor="middle">
          CITY OF PARAÑAQUE
        </textPath>
      </text>
    </svg>
  );
}
