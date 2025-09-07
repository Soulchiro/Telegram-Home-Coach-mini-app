// frontend/src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import exerciseIcons from "./icons/exerciseIcons"; // optional - keep file if you added icons

/*
  MicroCoach App.jsx - integrated share & donate (TON + invoice fallback)
  - Drop this in frontend/src/App.jsx
  - Expects server endpoints:
      POST /api/generate-workout       (already exists)
      POST /api/create-invoice        (already exists)
      POST /api/verify-ton-payment    (optional but recommended for TON)
  - Env (optional, set in build env):
      REACT_APP_BOT_USERNAME (without @)  -> used as fallback share link
*/

const BOT_USERNAME = process.env.REACT_APP_BOT_USERNAME || "YourWorkoutBot_Bot"; // replace in env or here
const TON_RECEIVER = process.env.REACT_APP_TON_RECEIVER || "EQAhk1...REPLACE_WITH_YOUR_WALLET"; // replace with your TON wallet

// Simplified slug mapping (extend as needed)
const EXERCISE_SLUGS = {
  "Bodyweight squats": "bodyweight-squats",
  "Push-ups (knees if needed)": "push-ups",
  "Jumping jacks": "jumping-jacks",
  "Plank": "plank",
  "High knees": "high-knees",
  "Mountain climbers": "mountain-climbers",
  "Lunges (alternating)": "lunges",
  "Burpees (modified)": "burpees",
  "Bicycle crunches (slow)": "bicycle-crunches",
  "Glute bridge": "glute-bridge",
  "Hamstring stretch": "hamstring-stretch",
  "Child's pose": "childs-pose",
  "World's greatest stretch": "worlds-greatest-stretch",
  // add any other exercise name -> slug mappings you used
};

// placeholder inline SVG
function PlaceholderSVG({ label = "" }) {
  return (
    <svg width="84" height="64" viewBox="0 0 84 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}>
      <rect width="84" height="64" rx="8" fill="#051421" />
      <g transform="translate(10,8)" fill="#1f6d85">
        <rect width="64" height="6" rx="3" />
        <rect y="14" width="44" height="6" rx="3" />
        <rect y="28" width="52" height="6" rx="3" />
      </g>
    </svg>
  );
}

// Exercise row component
function ExerciseRow({ idx, step, activeIndex, remainingForActive }) {
  const slug = EXERCISE_SLUGS[step.name] || step.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const imgSrc = `/images/${slug}.png`;
  const IconComp = exerciseIcons && exerciseIcons[slug];
  const [imgError, setImgError] = useState(false);

  const isActive = idx === activeIndex;
  const completed = !!step._completed;
  const base = Number(step.duration_or_reps) || 0;
  let percent = 0;
  if (base > 0) {
    if (completed) percent = 100;
    else if (isActive) percent = Math.round(((base - remainingForActive) / base) * 100);
    else percent = 0;
  }

  return (
    <div style={{ ...styles.exerciseCard, opacity: completed ? 0.9 : 1 }} aria-live={isActive ? "polite" : "off"}>
      <div style={styles.thumb}>
        {!imgError ? (
          <img src={imgSrc} alt={step.name} style={styles.img} onError={() => setImgError(true)} />
        ) : IconComp ? (
          <IconComp width={84} height={64} />
        ) : (
          <PlaceholderSVG label={step.name} />
        )}
      </div>

      <div style={styles.stepInfo}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={styles.stepName}>{step.name}</div>
          <div style={{ fontSize: 12, color: completed ? "#22c55e" : "#9fb3c4", fontWeight: 700 }}>
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
              background: completed ? "#22c55e" : (isActive ? "linear-gradient(90deg,#0ea5e9,#7c3aed)" : "#123b46"),
              transition: isActive ? "width 0.9s linear" : "width 0.3s ease"
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Simple confetti DOM
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 24 });
  return (
    <div aria-hidden style={styles.confettiWrap}>
      {pieces.map((_, i) => {
        const left = Math.round(Math.random() * 100);
        const delay = Math.random() * 0.6;
        const size = 6 + Math.round(Math.random() * 10);
        const duration = 1200 + Math.round(Math.random() * 1400);
        const bg = ["#0ea5e9", "#7c3aed", "#22c55e", "#f59e0b"][Math.floor(Math.random() * 4)];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-10%",
              width: size,
              height: size * 0.6,
              background: bg,
              opacity: 0.95,
              borderRadius: 3,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `confetti-fall ${duration}ms linear ${delay}s forwards`
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(200deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// STREAK helpers (localStorage)
const STREAK_KEY = "microcoach_streak_v1";
function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
function yesterdayISO() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
function loadStreak() { try { const raw = localStorage.getItem(STREAK_KEY); if (!raw) return { count: 0, last: null }; return JSON.parse(raw); } catch { return { count: 0, last: null }; } }
function saveStreak(obj) { try { localStorage.setItem(STREAK_KEY, JSON.stringify(obj)); } catch {} }

export default function App() {
  const [intensity, setIntensity] = useState("regular");
  const [playlist, setPlaylist] = useState("electronic");
  const [plan, setPlan] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // execution
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remainingForActive, setRemainingForActive] = useState(0);
  const intervalRef = useRef(null);

  // refs for latest values in interval
  const segmentsRef = useRef(segments);
  const activeIndexRef = useRef(activeIndex);
  const remainingRef = useRef(remainingForActive);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => { remainingRef.current = remainingForActive; }, [remainingForActive]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  // streak state
  const [streak, setStreak] = useState(() => loadStreak().count || 0);
  const [lastDate, setLastDate] = useState(() => loadStreak().last || null);
  useEffect(() => { saveStreak({ count: streak, last: lastDate }); }, [streak, lastDate]);

  // completed flag
  const allCompleted = segments.length > 0 && segments.every(s => s._completed);

  // Generate routine
  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    setSegments([]);
    try {
      const res = await fetch("/api/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: intensity, duration: 5, playlist })
      });
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      const main = Array.isArray(data.main) ? data.main.map(s => ({ ...s, _completed: false })) : [];
      const cooldown = Array.isArray(data.cooldown) ? data.cooldown.map(s => ({ ...s, _completed: false })) : [];
      setPlan(data);
      setSegments([...main, ...cooldown]);
      setActiveIndex(-1);
      setRemainingForActive(0);
    } catch (e) {
      console.error(e);
      setError("Failed to generate workout. Check server or network.");
    } finally {
      setLoading(false);
    }
  }

  // Save workout (file-based endpoint)
  async function save() {
    if (!plan) return;
    try {
      const res = await fetch("/api/save-workout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      if (!res.ok) throw new Error("save failed");
      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
  }

  // mark streak when starting
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

  // Start / resume routine
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

  // compute total remaining
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

  // ---- SHARE / DONATE FLOW ----

  // Share: prefer Telegram deep link, then navigator.share, telegram.me share, clipboard
  async function shareApp({ user } = {}) {
    const uid = (user && (user.id || user.user_id)) ? (user.id || user.user_id) : "default";
    const appUrl = `https://t.me/${BOT_USERNAME}?start=ref_${encodeURIComponent(uid)}`;

    // Telegram WebApp openLink
    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === "function") {
      try { window.Telegram.WebApp.openLink(appUrl); return; } catch (e) { console.warn("Telegram openLink failed", e); }
    }

    // Native share
    if (navigator.share) {
      try { await navigator.share({ title: "MicroCoach — 5-min workouts", text: "Quick at-home workout — try MicroCoach!", url: appUrl }); return; } catch (e) { console.warn("navigator.share failed", e); }
    }

    // telegram.me share
    try {
      const telegramShareUrl = `https://telegram.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("Try MicroCoach — quick 5-min home workouts!")}`;
      window.open(telegramShareUrl, "_blank", "noopener,noreferrer");
      return;
    } catch (e) {
      console.warn("telegram.me fallback failed", e);
    }

    // copy to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(appUrl);
        alert("Link copied to clipboard!");
        return;
      }
    } catch (e) { console.warn("clipboard failed", e); }

    window.prompt("Copy this link:", appUrl);
  }

  // Donate: try TON wallet if available, fallback to invoice
  async function donate() {
    const inTelegram = !!(window.Telegram && window.Telegram.WebApp);
    const hasTonWallet = !!(window.ton && typeof window.ton.sendTransaction === "function");

    // Amount configuration (modify as you like)
    const AMOUNT_TON = 1.0; // 1 TON as example
    const AMOUNT_NANOTON = Math.round(AMOUNT_TON * 1_000_000_000); // nanoTON integer

    if (inTelegram && hasTonWallet) {
      try {
        const tx = { to: TON_RECEIVER, value: String(AMOUNT_NANOTON) };
        const result = await window.ton.sendTransaction(tx);
        const txHash = typeof result === "string" ? result : (result && (result.transactionHash || result.txHash || result.hash));
        if (txHash) {
          // notify server to verify the on-chain tx (implement /api/verify-ton-payment)
          try {
            const resp = await fetch("/api/verify-ton-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ txHash, to: TON_RECEIVER, amountNano: String(AMOUNT_NANOTON) })
            });
            const j = await resp.json();
            if (resp.ok && j && j.verified) {
              alert("Thank you! Payment verified. 🎉");
              return;
            } else {
              alert("Payment sent. Verification pending — thank you!");
              return;
            }
          } catch (err) {
            console.warn("verify-ton-payment failed:", err);
            alert("Payment sent — verification pending. Thank you!");
            return;
          }
        } else {
          console.warn("TON wallet returned no txHash, falling back.");
          await donateViaInvoice();
          return;
        }
      } catch (e) {
        console.error("TON payment failed:", e);
        await donateViaInvoice();
        return;
      }
    }

    // fallback
    await donateViaInvoice();
  }

  // Fallback invoice using existing server endpoint
  async function donateViaInvoice() {
    try {
      const res = await fetch("/api/create-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount_label: "Support", currency_hint: "USD" }) });
      if (!res.ok) throw new Error("invoice request failed");
      const invoicePayload = await res.json();

      // Try to open inside Telegram WebApp if available
      if (window.Telegram && window.Telegram.WebApp) {
        if (typeof window.Telegram.WebApp.openInvoice === "function") {
          try { window.Telegram.WebApp.openInvoice(invoicePayload); return; } catch (err) { console.warn("openInvoice failed", err); }
        }
        if (typeof invoicePayload === "string" && typeof window.Telegram.WebApp.openLink === "function") {
          window.Telegram.WebApp.openLink(invoicePayload);
          return;
        }
      }

      if (invoicePayload && invoicePayload.payment_url) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(invoicePayload.payment_url);
          alert("Payment link copied to clipboard. Open it to complete donation.");
        } else {
          window.prompt("Open this link to donate:", invoicePayload.payment_url);
        }
      } else {
        const fallbackBot = `https://t.me/${BOT_USERNAME}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fallbackBot);
          alert(`Couldn't open invoice. Bot link copied: ${fallbackBot}`);
        } else {
          window.prompt("Open this in Telegram to support:", fallbackBot);
        }
      }
    } catch (e) {
      console.error("donateViaInvoice error:", e);
      alert("Couldn't initiate donation UI. Please try contacting the bot directly.");
    }
  }

  // UI render
  return (
    <div style={styles.page}>
      <Confetti active={allCompleted} />
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo} aria-hidden>MC</div>
            <div>
              <div style={styles.title}>MicroCoach — 5-min workouts</div>
              <div style={styles.subtitle}>Sequential timer • Donate & share</div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#9be7ff", fontWeight: 700 }}>🔥 Streak</div>
            <div style={{ fontSize: 16, color: "#e6eef3", fontWeight: 800 }}>{streak} day{streak === 1 ? "" : "s"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{lastDate ? `last: ${lastDate}` : "not started"}</div>
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
                <option value="electronic">Electronic</option>
                <option value="lofi">Lo-Fi</option>
                <option value="hiphop">Hip-Hop</option>
                <option value="rock">Rock</option>
                <option value="pop">Pop</option>
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

            <div style={{ marginLeft: "auto", alignSelf: "center", color: "#94a3b8", fontSize: 13 }}>
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
                  <a aria-label="Open playlist" href={plan.playlist && plan.playlist[0]?.query ? plan.playlist[0].query : "#"} target="_blank" rel="noreferrer" style={styles.linkBtn}>Open playlist</a>
                </div>
              </div>

              <div style={styles.steps}>
                {segments.map((s, i) => (
                  <ExerciseRow key={i} idx={i} step={s} activeIndex={activeIndex} remainingForActive={i === activeIndex ? remainingForActive : 0} />
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
                  <button aria-label="Support / Donate" onClick={donate} style={{ ...styles.primaryBtn, background: "linear-gradient(90deg,#f59e0b,#7c3aed)" }}>
                    Support • Donate
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// styles (unchanged look & feel)
const styles = {
  page: { minHeight: "100vh", background: "#071022", color: "#e6eef3", padding: 12, fontFamily: "Inter, system-ui, Arial" },
  confettiWrap: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 },
  container: { maxWidth: 900, margin: "8px auto", position: "relative" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  brand: { display: "flex", gap: 12, alignItems: "center" },
  logo: { width: 48, height: 48, borderRadius: 10, background: "linear-gradient(90deg,#0ea5e9,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#021826", fontWeight: 800 },
  title: { fontSize: 20, fontWeight: 700 },
  subtitle: { fontSize: 12, color: "#94a3b8" },
  controls: { background: "linear-gradient(180deg,#071827,#04121a)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.02)" },
  controlsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  label: { display: "flex", flexDirection: "column", minWidth: 140, fontSize: 13, color: "#cfefff" },
  select: { marginTop: 6, padding: 10, borderRadius: 10, background: "#061724", border: "1px solid rgba(255,255,255,0.03)", color: "#e6eef3" },
  buttonGhost: { padding: "10px 12px", borderRadius: 10, background: "transparent", color: "#9fb3c4", border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" },
  buttonPrimary: { padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(90deg,#0ea5e9,#7c3aed)", color: "#021826", fontWeight: 800 },
  primaryBtn: { padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#22c55e", color: "#021826", fontWeight: 800 },
  preview: { marginTop: 12 },
  empty: { padding: 16, borderRadius: 12, background: "#061426", color: "#9fb3c4" },
  planCard: { padding: 14, borderRadius: 12, background: "linear-gradient(180deg,#071827,#04121a)", border: "1px solid rgba(255,255,255,0.03)" },
  planHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: 18, fontWeight: 800, color: "#e6eef3" },
  planSubtitle: { color: "#94a3b8", fontSize: 13 },
  steps: { marginTop: 12 },
  groupTitle: { fontSize: 13, color: "#9fb3c4", marginBottom: 8 },
  exerciseCard: { display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 10, background: "#061725", marginBottom: 8, border: "1px solid rgba(255,255,255,0.02)" },
  thumb: { width: 84, height: 64, flex: "0 0 84px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, overflow: "hidden" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  stepInfo: { flex: 1 },
  stepName: { fontWeight: 700, color: "#e6eef3" },
  stepMeta: { color: "#9fb3c4", fontSize: 13 },
  smallBtn: { background: "#0f1724", color: "#9be7ff", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" },
  linkBtn: { color: "#9be7ff", background: "transparent", border: "1px solid rgba(255,255,255,0.03)", padding: "6px 8px", borderRadius: 8, textDecoration: "none" },
  err: { marginTop: 8, color: "#ff7b7b" }
};
