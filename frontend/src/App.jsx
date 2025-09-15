// frontend/src/App.jsx
import React, { useEffect, useRef, useState } from "react";

/*
  Original MicroCoach App.jsx with production-safe guards:
  - dynamic optional icons import (won't crash if file missing)
  - ErrorBoundary + global error handlers to show errors instead of blank page
  - image fallback to inline SVG when /public/images/{slug}.png missing
*/

const BOT_USERNAME = process.env.REACT_APP_BOT_USERNAME || "PocketedCoach_bot";
const TON_RECEIVER = process.env.REACT_APP_TON_RECEIVER || "UQCkO9yhVbY_d0eTqyTyh71zrDtb3DpLIzKxHAZt1IZrqKha";

// Theme
const THEME = {
  bg: "#071022",
  cardGradA: "#071827",
  cardGradB: "#04121a",
  accentA: "#0ea5e9",
  accentB: "#7c3aed",
  success: "#22c55e",
  text: "#e6eef3",
  dim: "#94a3b8",
  cardBg: "#061725",
  thumbBg: "#051421"
};

// exercise -> slug mapping (extend as needed)
const EXERCISE_SLUGS = {
  "Shoulder shrugs": "shouldershrugs",
  "Standing side bend": "standingsidebend",
  "Deep breaths": "deepbreaths",
  "Seated cat-cow": "seatedcatcow",
  "Neck rolls": "armcircles",
  "Child's pose": "childpose",
  "Bodyweight squats": "armcircles",
  "Push-ups (knees if needed)": "armcircles",
  "Jumping jacks": "jumping-jacks",
  "Plank": "plank",
  "Wrist circles": "wristcircles",
  "High knees": "high-knees",
  "Mountain climbers": "mountain-climbers",
  "Lunges (alternating)": "lunges",
  "Burpees (modified)": "burpees",
  "Bicycle crunches (slow)": "bicycle-crunches",
  "Glute bridge": "glute-bridge",
  "Hamstring stretch": "hamstring-stretch",
  "World's greatest stretch": "worlds-greatest-stretch",
};

// Placeholder SVG (used when no image available)
function PlaceholderSVG({ label = "" }) {
  return (
    <svg width="84" height="64" viewBox="0 0 84 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}>
      <rect width="84" height="64" rx="8" fill={THEME.thumbBg} />
      <g transform="translate(10,8)" fill={THEME.accentA}>
        <rect width="64" height="6" rx="3" />
        <rect y="14" width="44" height="6" rx="3" />
        <rect y="28" width="52" height="6" rx="3" />
      </g>
    </svg>
  );
}

// ErrorBoundary to avoid blank page for render-time errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error("ErrorBoundary caught", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 20, color: "#fff", background: "#40197a", borderRadius: 8, margin: 16 }}>
        <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
        <div style={{ fontSize: 13, color: "#fff", opacity: 0.9 }}>{String(this.state.error?.toString())}</div>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12, color: "#eee" }}>
          {this.state.info?.componentStack || ""}
        </pre>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 12px", borderRadius: 6 }}>Reload</button>
        </div>
      </div>
    );
  }
}

// Exercise row (uses only public/images or placeholder)
function ExerciseRow({ idx, step, activeIndex, remainingForActive, icons }) {
  const slug = EXERCISE_SLUGS[step.name] || (step.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const imgSrc = `/images/${slug}.png`;
  const [imgError, setImgError] = useState(false);

  const isActive = idx === activeIndex;
  const completed = !!step._completed;
  const base = Number(step.duration_or_reps) || 0;
  let percent = 0;
  if (base > 0) {
    if (completed) percent = 100;
    else if (isActive) percent = Math.round(((base - remainingForActive) / base) * 100);
  }

  return (
    <div style={{ ...styles.exerciseCard, opacity: completed ? 0.9 : 1 }} aria-live={isActive ? "polite" : "off"}>
      <div style={styles.thumb}>
        {!imgError ? (
          <img src={imgSrc} alt={step.name} style={styles.img} onError={() => setImgError(true)} />
        ) : (
          <PlaceholderSVG label={step.name} />
        )}
      </div>

      <div style={styles.stepInfo}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={styles.stepName}>{step.name}</div>
          <div style={{ fontSize: 12, color: completed ? THEME.success : THEME.dim, fontWeight: 700 }}>
            {completed ? "Done ✓" : (isActive ? `${remainingForActive}s` : `${step.duration_or_reps}s`)}
          </div>
        </div>

        <div style={styles.stepMeta}>{step.notes || ""}</div>

        <div style={{ height: 8, background: "#0b1a20", borderRadius: 6, marginTop: 8, overflow: "hidden" }}>
          <div
            aria-hidden
            style={{
              height: "100%",
              width: `${percent}%`,
              background: completed ? THEME.success : (isActive ? `linear-gradient(90deg, ${THEME.accentA}, ${THEME.accentB})` : "#123b46"),
              transition: isActive ? "width 0.9s linear" : "width 0.3s ease"
            }}
          />
        </div>
      </div>
    </div>
  );
}

const STREAK_KEY = "microcoach_streak_v1";
function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
function yesterdayISO() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
function loadStreak() { try { const raw = localStorage.getItem(STREAK_KEY); if (!raw) return { count: 0, last: null }; return JSON.parse(raw); } catch { return { count: 0, last: null }; } }
function saveStreak(obj) { try { localStorage.setItem(STREAK_KEY, JSON.stringify(obj)); } catch {} }

// Playlists (example)
const PLAYLISTS = {
  electronic: [{ title: "Electronic Short Mix", query: "https://open.spotify.com/playlist/7H0rGB63hUimokOWAFPi9S?si=_LYQ63ghRuCYyORuBICG0Q", hint: "Electronic energy" }],
  lofi: [{ title: "Lofi 5-min", query: "https://open.spotify.com/playlist/71hJFZoqd7Ow3xZq3S5PyM?si=JdMDZsAaRqylB28bFNQbXg", hint: "Chill beats" }],
  hiphop: [{ title: "Hip-Hop Pump", query: "https://open.spotify.com/playlist/5A5cLkWcIc5BifNOa4UZTl?si=8PzFHuNOSe6pwNovba5Rng", hint: "Hip-Hop energy" }],
  rock: [{ title: "Rock Short", query: "https://open.spotify.com/playlist/4BxyA2GrkSiKWwKEqVFh6r?si=SI3W8vj8QtSfVPNv0wBrMA", hint: "Rock pump" }],
  pop: [{ title: "Pop Hits", query: "https://open.spotify.com/playlist/6v84skfMiLBEgUOEHB6LNS?si=fST-cgxETIiEFQDK_Wndaw", hint: "Pop vibes" }]
};

export default function App() {
  // app state (kept as in original)
  const [intensity, setIntensity] = useState("regular");
  const [playlist, setPlaylist] = useState("electronic");
  const [plan, setPlan] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remainingForActive, setRemainingForActive] = useState(0);
  const intervalRef = useRef(null);

  // optional icons — load dynamically, fallback to null (so missing module doesn't crash)
  const [icons, setIcons] = useState(null);
  useEffect(() => {
    let mounted = true;
    import("./icons/exerciseIcons")
      .then(mod => { if (mounted) setIcons(mod.default || mod); })
      .catch(() => { if (mounted) setIcons(null); /* missing icons file is OK */ });
    return () => { mounted = false; };
  }, []);

  // refs for interval closures
  const segmentsRef = useRef(segments);
  const activeIndexRef = useRef(activeIndex);
  const remainingRef = useRef(remainingForActive);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => { remainingRef.current = remainingForActive; }, [remainingForActive]);
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  // global error handlers to surface runtime errors (especially useful in production)
  useEffect(() => {
    const onErr = (msg, source, lineno, colno, err) => {
      console.error("window.onerror", { msg, source, lineno, colno, err });
      setError(err ? (err.message || String(err)) : String(msg));
      return false; // allow normal propagation
    };
    const onReject = (ev) => {
      console.error("unhandledrejection", ev);
      setError(ev?.reason ? (ev.reason.message || String(ev.reason)) : "Unhandled rejection");
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onReject);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onReject); };
  }, []);

  // streak
  const [streak, setStreak] = useState(() => loadStreak().count || 0);
  const [lastDate, setLastDate] = useState(() => loadStreak().last || null);
  useEffect(() => { saveStreak({ count: streak, last: lastDate }); }, [streak, lastDate]);

  const allCompleted = segments.length > 0 && segments.every(s => s._completed);

  // Generate (with fallback to fake plan if server missing)
  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    setSegments([]);

    const MIN_DELAY = 800;
    const start = Date.now();

    try {
      const res = await fetch("/api/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: intensity, duration: 5, playlist })
      });
      const waited = Date.now() - start;
      if (waited < MIN_DELAY) await new Promise(r => setTimeout(r, MIN_DELAY - waited));
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      const main = Array.isArray(data.main) ? data.main.map(s => ({ ...s, _completed: false })) : [];
      const cooldown = Array.isArray(data.cooldown) ? data.cooldown.map(s => ({ ...s, _completed: false })) : [];
      setPlan(data);
      setSegments([...main, ...cooldown]);
      setActiveIndex(-1);
      setRemainingForActive(0);
    } catch (e) {
      console.warn("generate() fallback used", e);
      // fallback fake plan so UI is visible
      const fallback = [
        { name: "Jumping jacks", duration_or_reps: 30, unit: "time", notes: "Warm up", _completed: false },
        { name: "Plank", duration_or_reps: 30, unit: "time", notes: "Hold steady", _completed: false },
        { name: "Deep breaths", duration_or_reps: 30, unit: "time", notes: "Cool down", _completed: false }
      ];
      setPlan({ intensity_label: intensity });
      setSegments(fallback);
    } finally {
      setLoading(false);
    }
  }

  // Save (keeps original server call but also saves to localStorage so "load next time" works)
  async function save() {
    if (!plan) return;
    try {
      localStorage.setItem("microcoach_last_plan", JSON.stringify({ plan, segments, intensity, playlist }));
      const res = await fetch("/api/save-workout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      if (!res.ok) throw new Error("save failed");
      alert("Saved!");
    } catch (e) {
      console.warn("server save failed (or missing), kept local copy", e);
      alert("Saved locally");
    }
  }

  // load last saved plan from localStorage (if present)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("microcoach_last_plan");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.plan) {
          setPlan(parsed.plan);
          setSegments(parsed.segments || []);
          setIntensity(parsed.intensity || "regular");
          setPlaylist(parsed.playlist || "electronic");
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  function markStreakOnStart() {
    const s = loadStreak();
    const today = todayISO();
    const yest = yesterdayISO();
    if (s.last === today) { setStreak(s.count); setLastDate(s.last); return; }
    if (s.last === yest) {
      const newCount = (s.count || 0) + 1;
      setStreak(newCount); setLastDate(today); saveStreak({ count: newCount, last: today });
    } else {
      const newCount = 1;
      setStreak(newCount); setLastDate(today); saveStreak({ count: newCount, last: today });
    }
  }

  // Execution / timer logic (kept original)
  function startOrResumeRoutine() {
    if (!segments || segments.length === 0) return;
    if (!running && !paused) {
      const startIdx = segments.findIndex(s => !s._completed);
      const idx = startIdx === -1 ? 0 : startIdx;
      const seg = segments[idx];
      if (!seg) return;
      setActiveIndex(idx);
      setRemainingForActive(Number(seg.duration_or_reps) || 0);
      setRunning(true);
      setPaused(false);
      markStreakOnStart();
    } else if (!running && paused) {
      setRunning(true);
      setPaused(false);
    } else {
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const curIdx = activeIndexRef.current;
      const curRem = remainingRef.current;
      const segs = segmentsRef.current;

      if (curIdx < 0 || !segs[curIdx]) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        setActiveIndex(-1);
        setRemainingForActive(0);
        return;
      }

      if (curRem > 1) {
        setRemainingForActive(r => r - 1);
        return;
      }

      // finish current
      setSegments(prev => {
        const copy = prev.map(s => ({ ...s }));
        if (copy[curIdx]) copy[curIdx]._completed = true;
        return copy;
      });

      // find next not completed
      const latestSegs = segmentsRef.current;
      let next = -1;
      for (let i = curIdx + 1; i < latestSegs.length; i++) {
        if (!latestSegs[i]._completed) { next = i; break; }
      }

      if (next === -1) {
        // all done
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        setPaused(false);
        setActiveIndex(-1);
        setRemainingForActive(0);
      } else {
        setActiveIndex(next);
        setRemainingForActive(Number(latestSegs[next].duration_or_reps) || 0);
      }
    }, 1000);
  }

  function pauseRoutine() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
    setPaused(true);
  }

  function stopRoutine() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
    setPaused(false);
    setActiveIndex(-1);
    setRemainingForActive(0);
  }

  function computeTotalRemaining() {
    if (running && activeIndex >= 0) {
      const later = segmentsRef.current.slice(activeIndex + 1).reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0);
      return (remainingRef.current || 0) + later;
    }
    return segments.reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0) || 300;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // Share flow (kept simple here)
  async function shareApp({ user } = {}) {
    const uid = (user && (user.id || user.user_id)) ? (user.id || user.user_id) : "default";
    const appUrl = `https://t.me/${BOT_USERNAME}?start=ref_${encodeURIComponent(uid)}`;
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        if (typeof window.Telegram.WebApp.shareLink === "function") {
          window.Telegram.WebApp.shareLink(appUrl, "Quick 5-min workouts — try MicroCoach!");
          return;
        }
        if (typeof window.Telegram.WebApp.openLink === "function") {
          window.Telegram.WebApp.openLink(appUrl);
          return;
        }
      }
    } catch (e) {
      console.warn("Telegram share failed", e);
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: "MicroCoach", text: "Quick 5-min workouts", url: appUrl });
        return;
      }
    } catch (e) {
      console.warn("navigator.share failed", e);
    }

    try {
      const telegramShareUrl = `https://telegram.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("Try MicroCoach — 5-min workouts!")}`;
      window.open(telegramShareUrl, "_blank", "noopener,noreferrer");
      return;
    } catch (e) {
      console.warn("telegram.me fallback failed", e);
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(appUrl);
        alert("Link copied to clipboard!");
        return;
      }
    } catch (e) {
      console.warn("clipboard failed", e);
    }

    window.prompt("Copy this link:", appUrl);
  }

  async function donate() {
    const inTelegram = !!(window.Telegram && window.Telegram.WebApp);
    const hasTonWallet = !!(window.ton && typeof window.ton.sendTransaction === "function");
    const AMOUNT_TON = 1.0;
    const AMOUNT_NANOTON = Math.round(AMOUNT_TON * 1_000_000_000);

    if (inTelegram && hasTonWallet) {
      try {
        const tx = { to: TON_RECEIVER, value: String(AMOUNT_NANOTON) };
        const result = await window.ton.sendTransaction(tx);
        const txHash = typeof result === "string" ? result : (result && (result.transactionHash || result.txHash || result.hash));
        if (txHash) {
          try {
            await fetch("/api/verify-ton-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash, to: TON_RECEIVER, amountNano: String(AMOUNT_NANOTON) }) });
            alert("Thank you! Payment sent.");
            return;
          } catch (err) {
            console.warn("verify-ton failed", err);
            alert("Payment sent — verification pending. Thank you!");
            return;
          }
        }
      } catch (e) {
        console.warn("TON payment error", e);
      }
    }

    try {
      const resp = await fetch("/api/create-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount_label: "Support", currency_hint: "USD" }) });
      if (!resp.ok) throw new Error("invoice_failed");
      const invoicePayload = await resp.json();

      if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openInvoice === "function") {
        try {
          window.Telegram.WebApp.openInvoice(invoicePayload);
          return;
        } catch (e) {
          console.warn("openInvoice failed", e);
        }
      }

      if (invoicePayload && invoicePayload.payment_url) {
        window.open(invoicePayload.payment_url, "_blank", "noopener,noreferrer");
        return;
      }
    } catch (e) {
      console.error("donate fallback failed", e);
      try {
        const fallbackBot = `https://t.me/${BOT_USERNAME}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fallbackBot);
          alert(`Couldn't open invoice. Bot link copied: ${fallbackBot}`);
          return;
        } else {
          window.prompt("Open this in Telegram to support:", `https://t.me/${BOT_USERNAME}`);
        }
      } catch (ee) {
        console.error(ee);
      }
    }
  }

  // UI
  return (
    <ErrorBoundary>
      <div style={{ ...styles.page, background: THEME.bg, color: THEME.text }}>
        {error && (
          <div style={{ padding: 8, background: "#3a0f58", color: "#fff", borderRadius: 6, margin: 12 }}>
            <strong>Runtime error:</strong> {String(error)}
          </div>
        )}
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.brand}>
              <div style={{ ...styles.logo, background: `linear-gradient(90deg, ${THEME.accentA}, ${THEME.accentB})` }} aria-hidden>MC</div>
              <div>
                <div style={styles.title}>MicroCoach — 5-min workouts</div>
                <div style={styles.subtitle}>Stretch, chill or intense — but always on time </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: THEME.accentA, fontWeight: 700 }}>🔥 Streak</div>
              <div style={{ fontSize: 16, color: THEME.text, fontWeight: 800 }}>{streak} day{streak === 1 ? "" : "s"}</div>
              <div style={{ fontSize: 11, color: THEME.dim }}>{lastDate ? `last: ${lastDate}` : "not started"}</div>
            </div>
          </header>

          <section style={styles.controls}>
            <div style={styles.controlsRow}>
              <label style={styles.label}>
                Intensity
                <select aria-label="Intensity" value={intensity} onChange={e => setIntensity(e.target.value)} style={styles.select}>
                  <option value="chill">Chill</option>
                  <option value="stretch">Stretch</option>
                  <option value="regular">Regular</option>
                  <option value="intense">Intense</option>
                  <option value="hardcore">Hardcore</option>
                </select>
              </label>

              <label style={styles.label}>
                Playlist
                <select aria-label="Playlist" value={playlist} onChange={e => setPlaylist(e.target.value)} style={styles.select}>
                  <option value="pop">80s Classic</option>
                  <option value="electronic">Techno</option>
                  <option value="lofi">Relaxed</option>
                  <option value="hiphop">Dark Electro</option>
                  <option value="rock">Hard Rock</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button aria-label="Generate workout" onClick={generate} disabled={loading || running || paused} style={{ ...styles.buttonPrimary, opacity: (loading || running || paused) ? 0.6 : 1 }}>
                {loading ? "Curating…" : "Generate Workout"}
              </button>

              <button aria-label="Reset routine" onClick={() => { setPlan(null); setError(null); setSegments([]); setActiveIndex(-1); setRemainingForActive(0); }} style={styles.buttonGhost} disabled={running || paused}>
                Reset
              </button>

              <div style={{ marginLeft: "auto", alignSelf: "center", color: THEME.dim, fontSize: 13 }}>
                {running ? `In progress — ${formatTime(computeTotalRemaining())}` : paused ? `Paused — ${formatTime(computeTotalRemaining())}` : `Ready • 5 minutes`}
              </div>
            </div>

            {error && <div style={styles.err}>{error}</div>}
          </section>

          <section style={styles.preview}>
            {!plan && !loading && <div style={styles.empty}>Press Generate to create your 5-min workout</div>}
            {loading && <div style={{ padding: 16 }}><em>Loading…</em></div>}

            {plan && (
              <div style={styles.planCard}>
                <div style={styles.planHeader}>
                  <div>
                    <div style={styles.planTitle}>Your 5-min {intensity} routine</div>
                    <div style={styles.planSubtitle}>{plan.intensity_label?.toUpperCase() || intensity}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button aria-label="Save workout" onClick={save} style={styles.smallBtn} disabled={running || paused}>Save</button>

                    <a aria-label="Open playlist" href={(PLAYLISTS[playlist] && PLAYLISTS[playlist][0] && PLAYLISTS[playlist][0].query) ? PLAYLISTS[playlist][0].query : "#"} target="_blank" rel="noreferrer" style={styles.linkBtn}>Open playlist</a>
                  </div>
                </div>

                <div style={styles.steps}>
                  {segments.map((s, i) => (
                    <ExerciseRow key={i} idx={i} step={s} activeIndex={activeIndex} remainingForActive={i === activeIndex ? remainingForActive : 0} icons={icons} />
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {!running && !paused ? (
                    <button aria-label="Start workout" onClick={startOrResumeRoutine} style={styles.primaryBtn} disabled={segments.length === 0}>
                      Start workout
                    </button>
                  ) : running && !paused ? (
                    <button aria-label="Pause workout" onClick={pauseRoutine} style={styles.ghostBtn}>Pause</button>
                  ) : paused ? (
                    <button aria-label="Resume workout" onClick={startOrResumeRoutine} style={styles.primaryBtn}>Resume</button>
                  ) : null}

                  <button aria-label="Stop workout" onClick={stopRoutine} style={styles.ghostBtn} disabled={!running && !paused}>Stop</button>

                  <button aria-label="Share app" onClick={() => shareApp()} style={styles.ghostBtn} disabled={running || paused}>Share</button>

                  {allCompleted && (
                    <button aria-label="Support / Donate" onClick={donate} style={{ ...styles.primaryBtn, background: `linear-gradient(90deg, ${THEME.success}, ${THEME.accentB})` }}>
                      Support if you like the app!
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// styles (kept same as original where possible)
const styles = {
  page: { minHeight: "100vh", padding: 12, fontFamily: "Inter, system-ui, Arial" },
  confettiWrap: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 },
  container: { maxWidth: 900, margin: "8px auto", position: "relative" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  brand: { display: "flex", gap: 12, alignItems: "center" },
  logo: { width: 48, height: 48, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#021826", fontWeight: 800 },
  title: { fontSize: 20, fontWeight: 700 },
  subtitle: { fontSize: 12, color: THEME.dim },
  controls: { background: `linear-gradient(180deg, ${THEME.cardGradA}, ${THEME.cardGradB})`, padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.02)" },
  controlsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  label: { display: "flex", flexDirection: "column", minWidth: 140, fontSize: 13, color: "#cfefff" },
  select: { marginTop: 6, padding: 10, borderRadius: 10, background: THEME.thumbBg, border: "1px solid rgba(255,255,255,0.03)", color: THEME.text },
  buttonGhost: { padding: "10px 12px", borderRadius: 10, background: "transparent", color: "#9fb3c4", border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" },
  buttonPrimary: { padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(90deg, ${THEME.accentA}, ${THEME.accentB})`, color: "#021826", fontWeight: 800 },
  primaryBtn: { padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: THEME.success, color: "#021826", fontWeight: 800 },
  preview: { marginTop: 12 },
  empty: { padding: 16, borderRadius: 12, background: "#061426", color: "#9fb3c4" },
  planCard: { padding: 14, borderRadius: 12, background: `linear-gradient(180deg, ${THEME.cardGradA}, ${THEME.cardGradB})`, border: "1px solid rgba(255,255,255,0.03)" },
  planHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: 18, fontWeight: 800, color: THEME.text },
  planSubtitle: { color: THEME.dim, fontSize: 13 },
  steps: { marginTop: 12 },
  groupTitle: { fontSize: 13, color: "#9fb3c4", marginBottom: 8 },
  exerciseCard: { display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 10, background: THEME.cardBg, marginBottom: 8, border: "1px solid rgba(255,255,255,0.02)" },
  thumb: { width: 84, height: 64, flex: "0 0 84px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, overflow: "hidden", background: THEME.thumbBg },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  stepInfo: { flex: 1 },
  stepName: { fontWeight: 700, color: THEME.text },
  stepMeta: { color: "#9fb3c4", fontSize: 13 },
  smallBtn: { background: "#0f1724", color: "#9be7ff", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" },
  linkBtn: { color: "#9be7ff", background: "transparent", border: "1px solid rgba(255,255,255,0.03)", padding: "6px 8px", borderRadius: 8, textDecoration: "none" },
  err: { marginTop: 8, color: "#ff7b7b" },
  ghostBtn: { padding: "10px 12px", borderRadius: 10, background: "transparent", color: "#9fb3c4", border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }
};
