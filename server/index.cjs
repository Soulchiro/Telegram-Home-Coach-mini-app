// server/index.cjs
// Clean, self-contained server for MicroCoach
// - Express API: /api/generate-workout, /api/save-workout, /api/create-invoice, /health
// - Safe Telegram bot startup (verifies token first)
// - Uses a single POOLS object and buildRoutine (no POOL_REGULAR undefined bug)

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const APP_NAME = "MicroCoach";
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 10000);

// ------------------ POOLS (expanded lists, ~20 each) ------------------
const POOLS = {
  chill: [
    { name: "Neck rolls", base: 20, unit: "time", slug: "neck-rolls" },
    { name: "Shoulder shrugs", base: 20, unit: "time", slug: "shoulder-shrugs" },
    { name: "Ankle circles", base: 18, unit: "time", slug: "ankle-circles" },
    { name: "Wrist circles", base: 15, unit: "time", slug: "wrist-circles" },
    { name: "Seated cat-cow", base: 30, unit: "time", slug: "seated-cat-cow" },
    { name: "Child's pose", base: 40, unit: "time", slug: "childs-pose" },
    { name: "Seated forward fold", base: 30, unit: "time", slug: "seated-forward-fold" },
    { name: "Calf stretch", base: 25, unit: "time", slug: "calf-stretch" },
    { name: "Hip circles", base: 20, unit: "time", slug: "hip-circles" },
    { name: "Knee hugs", base: 20, unit: "time", slug: "knee-hugs" },
    { name: "Supine knee rock", base: 20, unit: "time", slug: "supine-knee-rock" },
    { name: "Hamstring pedal (gentle)", base: 20, unit: "time", slug: "hamstring-pedal" },
    { name: "Seated shoulder stretch", base: 18, unit: "time", slug: "seated-shoulder-stretch" },
    { name: "Thoracic rotation (seated)", base: 22, unit: "time", slug: "thoracic-rotation" },
    { name: "Ankle dorsiflexor mobility", base: 18, unit: "time", slug: "ankle-dorsiflexor-mobility" },
    { name: "Breathing focus", base: 30, unit: "time", slug: "breathing-focus" },
    { name: "Seated side bend", base: 22, unit: "time", slug: "seated-side-bend" },
    { name: "Gentle torso twist", base: 20, unit: "time", slug: "gentle-torso-twist" },
    { name: "Neck side stretch", base: 18, unit: "time", slug: "neck-side-stretch" },
    { name: "Wrist flexor stretch", base: 15, unit: "time", slug: "wrist-flexor-stretch" }
  ],

  stretch: [
    { name: "Hamstring stretch", base: 40, unit: "time", slug: "hamstring-stretch" },
    { name: "Quad stretch", base: 40, unit: "time", slug: "quad-stretch" },
    { name: "Butterfly stretch", base: 35, unit: "time", slug: "butterfly-stretch" },
    { name: "Pigeon prep", base: 35, unit: "time", slug: "pigeon-prep" },
    { name: "Glute stretch", base: 30, unit: "time", slug: "glute-stretch" },
    { name: "Adductor stretch", base: 30, unit: "time", slug: "adductor-stretch" },
    { name: "Lying quad release", base: 30, unit: "time", slug: "lying-quad-release" },
    { name: "Torso twist", base: 30, unit: "time", slug: "torso-twist" },
    { name: "Chest opener", base: 25, unit: "time", slug: "chest-opener" },
    { name: "Triceps stretch", base: 20, unit: "time", slug: "triceps-stretch" },
    { name: "Seated spinal twist", base: 30, unit: "time", slug: "seated-spinal-twist" },
    { name: "Standing calf stretch", base: 25, unit: "time", slug: "standing-calf-stretch" },
    { name: "Hamstring hold", base: 30, unit: "time", slug: "hamstring-hold" },
    { name: "World's greatest stretch", base: 40, unit: "time", slug: "worlds-greatest-stretch" },
    { name: "IT band lean", base: 25, unit: "time", slug: "it-band-lean" },
    { name: "Hip opener (kneeling)", base: 30, unit: "time", slug: "hip-opener-kneeling" },
    { name: "Figure-4 lying", base: 30, unit: "time", slug: "figure4-lying" },
    { name: "Shoulder cross-body", base: 20, unit: "time", slug: "shoulder-cross-body" },
    { name: "Neck mobility hold", base: 18, unit: "time", slug: "neck-mobility-hold" },
    { name: "Wrist mobility stretch", base: 15, unit: "time", slug: "wrist-mobility-stretch" }
  ],

  regular: [
    { name: "Bodyweight squats", base: 30, unit: "time", slug: "bodyweight-squats" },
    { name: "Incline push-ups", base: 28, unit: "time", slug: "incline-push-ups" },
    { name: "Alternating lunges", base: 30, unit: "time", slug: "alternating-lunges" },
    { name: "Plank (forearms)", base: 40, unit: "time", slug: "plank-forearms" },
    { name: "Glute bridge", base: 30, unit: "time", slug: "glute-bridge" },
    { name: "Standing knee lifts", base: 25, unit: "time", slug: "standing-knee-lifts" },
    { name: "Calf raises", base: 25, unit: "time", slug: "calf-raises" },
    { name: "Side lunges", base: 28, unit: "time", slug: "side-lunges" },
    { name: "Supermans", base: 24, unit: "time", slug: "supermans" },
    { name: "Reverse lunges", base: 28, unit: "time", slug: "reverse-lunges" },
    { name: "Bird-dog", base: 24, unit: "time", slug: "bird-dog" },
    { name: "Step ups (low)", base: 28, unit: "time", slug: "step-ups-low" },
    { name: "Tricep dips (chair)", base: 26, unit: "time", slug: "tricep-dips-chair" },
    { name: "Heel taps", base: 24, unit: "time", slug: "heel-taps" },
    { name: "Hip bridges with march", base: 26, unit: "time", slug: "hip-bridges-march" },
    { name: "Standing oblique crunch", base: 24, unit: "time", slug: "standing-oblique-crunch" },
    { name: "Wall sits", base: 30, unit: "time", slug: "wall-sits" },
    { name: "Tabletop leg lifts", base: 24, unit: "time", slug: "tabletop-leg-lifts" },
    { name: "Reverse fly (bodyweight)", base: 22, unit: "time", slug: "reverse-fly-bodyweight" },
    { name: "Deadbug core", base: 24, unit: "time", slug: "deadbug-core" }
  ],

  intense: [
    { name: "Mountain climbers", base: 28, unit: "time", slug: "mountain-climbers" },
    { name: "Jump squats (modified)", base: 26, unit: "time", slug: "jump-squats-modified" },
    { name: "Plank shoulder taps", base: 26, unit: "time", slug: "plank-shoulder-taps" },
    { name: "High knees", base: 30, unit: "time", slug: "high-knees" },
    { name: "Burpees (half)", base: 28, unit: "time", slug: "burpees-half" },
    { name: "Speed skaters", base: 26, unit: "time", slug: "speed-skaters" },
    { name: "Fast alternating lunges", base: 26, unit: "time", slug: "fast-alternating-lunges" },
    { name: "Bicycle crunches", base: 28, unit: "time", slug: "bicycle-crunches" },
    { name: "Tuck jump (low)", base: 22, unit: "time", slug: "tuck-jump-low" },
    { name: "Plank jacks (low)", base: 26, unit: "time", slug: "plank-jacks-low" },
    { name: "Skips without rope", base: 24, unit: "time", slug: "skips-without-rope" },
    { name: "Explosive push-up (knee mod)", base: 22, unit: "time", slug: "explosive-pushup-knee" },
    { name: "Alternating jump lunges", base: 26, unit: "time", slug: "alternating-jump-lunges" },
    { name: "Fast squat pulses", base: 24, unit: "time", slug: "fast-squat-pulses" },
    { name: "Russian twists (fast)", base: 26, unit: "time", slug: "russian-twists-fast" },
    { name: "Mountain climber hold", base: 28, unit: "time", slug: "mountain-climber-hold" },
    { name: "Climber bursts", base: 26, unit: "time", slug: "climber-bursts" },
    { name: "Star jumps (low)", base: 22, unit: "time", slug: "star-jumps-low" },
    { name: "Heel flicks", base: 24, unit: "time", slug: "heel-flicks" },
    { name: "Explosive step-ups", base: 24, unit: "time", slug: "explosive-step-ups" }
  ],

  hardcore: [
    { name: "Burpees (modified)", base: 30, unit: "time", slug: "burpees-modified" },
    { name: "Plyo lunges", base: 28, unit: "time", slug: "plyo-lunges" },
    { name: "Pistol squat (assisted)", base: 30, unit: "time", slug: "pistol-squat-assisted" },
    { name: "Tuck jumps", base: 26, unit: "time", slug: "tuck-jumps" },
    { name: "Explosive mountain climbers", base: 28, unit: "time", slug: "explosive-mountain-climbers" },
    { name: "One-leg hip thrust", base: 28, unit: "time", slug: "one-leg-hip-thrust" },
    { name: "Clap push-ups (mod)", base: 26, unit: "time", slug: "clap-pushups-mod" },
    { name: "Single-leg plyo hops", base: 26, unit: "time", slug: "single-leg-plyo-hops" },
    { name: "Sprint-in-place", base: 30, unit: "time", slug: "sprint-in-place" },
    { name: "L-sit hold (mod)", base: 24, unit: "time", slug: "l-sit-hold-mod" },
    { name: "Aztec push-ups (mod)", base: 24, unit: "time", slug: "aztec-pushups-mod" },
    { name: "All-out squat jumps", base: 26, unit: "time", slug: "all-out-squat-jumps" },
    { name: "Explosive plank taps", base: 24, unit: "time", slug: "explosive-plank-taps" },
    { name: "Plyo push-up (mod)", base: 24, unit: "time", slug: "plyo-pushup-mod" },
    { name: "Box jump substitute", base: 24, unit: "time", slug: "box-jump-substitute" },
    { name: "Weighted-ish squat pulses", base: 26, unit: "time", slug: "weightedish-squat-pulses" },
    { name: "Heavy core rotations", base: 26, unit: "time", slug: "heavy-core-rotations" },
    { name: "Burpee tuck", base: 26, unit: "time", slug: "burpee-tuck" },
    { name: "One-arm plank (mod)", base: 24, unit: "time", slug: "one-arm-plank-mod" },
    { name: "Aztec hold (mod)", base: 22, unit: "time", slug: "aztec-hold-mod" }
  ]
};

// ------------------ Utilities ------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(arr, n) {
  const s = shuffle(arr);
  return s.slice(0, Math.min(n, s.length));
}

// ------------------ Helpers & buildRoutine (drop-in replacement) ------------------

// shuffleArray - Fisher-Yates
function shuffleArray(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// pickUnique - pick up to n unique items from a pool (returns shallow copies)
function pickUnique(pool, n) {
  const pick = shuffleArray(pool).slice(0, Math.min(n, pool.length));
  return pick.map(x => ({ ...x }));
}

// distributeDurations - split MAIN_SEC proportionally by item.base, ensure integers and exact sum
function distributeDurations(items, MAIN_SEC, minSec = 6) {
  if (!items || items.length === 0) return items;
  const timeItems = items.map(it => ({ ...it })); // copy so we don't mutate POOLS
  const totalBase = timeItems.reduce((s, it) => s + (it.base || 30), 0) || 1;

  // First pass: proportional allocation (rounded)
  const result = timeItems.map((it) => {
    const share = ((it.base || 30) / totalBase) * MAIN_SEC;
    const secs = Math.max(minSec, Math.round(share));
    return { ...it, duration_or_reps: secs, unit: it.unit || "time" };
  });

  // Fix rounding mismatch by adjusting the last time-unit item
  const sumAssigned = result.reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0);
  const diff = MAIN_SEC - sumAssigned;
  if (diff !== 0) {
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].unit === "time") {
        result[i].duration_or_reps = Math.max(minSec, Number(result[i].duration_or_reps) + diff);
        break;
      }
    }
  }

  return result;
}

// buildRoutine - uses full 5 minutes (300s) for main, returns slug & empty cooldown
function buildRoutine(intensity = "regular") {
  const TOTAL_SEC = 5 * 60; // 300s used entirely for main
  const MAIN_SEC = TOTAL_SEC;

  const key = String(intensity || "regular").toLowerCase();
  const pool = POOLS[key] || POOLS.regular;

  // Decide how many main exercises to pick
  let count;
  switch (key) {
    case "chill": count = 5; break;
    case "stretch": count = 5; break;
    case "regular": count = 5; break;
    case "intense": count = 6; break;
    case "hardcore": count = 6; break;
    default: count = 5;
  }

  // Pick unique exercises from the chosen pool only
  const picked = pickUnique(pool, count);

  // Distribute MAIN_SEC across picked items
  const withDurations = distributeDurations(picked, MAIN_SEC, 6);

  // Shuffle final order to avoid predictable long/short sequence
  const mainShuffled = shuffleArray(withDurations);

  // Normalize the returned objects and include slug
  const main = mainShuffled.map(it => ({
    name: it.name,
    slug: it.slug || (it.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    unit: it.unit || "time",
    duration_or_reps: Number(it.duration_or_reps || 20),
    notes: it.notes || ""
  }));

  // Cooldown removed (empty array for compatibility)
  const cooldown = [];

  const playlist = [
    { title: `${key} mix`, hint: `${key} playlist`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent(key + " workout mix 5 minutes")}` }
  ];

  return {
    total_duration_minutes: 5,
    intensity_label: key,
    main,
    cooldown,
    playlist
  };
}


// ------------------ API endpoints ------------------
app.get("/health", (req, res) => res.json({ ok: true, app: APP_NAME, time: new Date().toISOString() }));

app.post("/api/generate-workout", (req, res) => {
  try {
    // Accept either JSON body with level, or query intensity
    const bodyLevel = req.body && req.body.level ? String(req.body.level) : null;
    const queryLevel = req.query && req.query.intensity ? String(req.query.intensity) : null;
    const intensity = (bodyLevel || queryLevel || "regular").toLowerCase();
    const routine = buildRoutine(intensity);
    return res.json(routine);
  } catch (err) {
    console.error("generate error:", err);
    return res.status(500).json({ error: "generate_failed" });
  }
});

app.post("/api/save-workout", (req, res) => {
  try {
    const payload = req.body || {};
    const DBPATH = path.join(__dirname, "workouts.json");
    let db = { workouts: [] };
    if (fs.existsSync(DBPATH)) {
      try { db = JSON.parse(fs.readFileSync(DBPATH, "utf8") || "{}"); } catch (e) { db = { workouts: [] }; }
    }
    db.workouts = db.workouts || [];
    db.workouts.push({ id: Date.now(), created_at: new Date().toISOString(), payload });
    fs.writeFileSync(DBPATH, JSON.stringify(db, null, 2), "utf8");
    return res.json({ ok: true });
  } catch (err) {
    console.error("save error:", err);
    return res.status(500).json({ error: "save_failed" });
  }
});

// Simple /api/create-invoice fallback (returns payment_url or invoice payload)
// If you integrate Telegraf's createInvoiceLink, replace the fallback with a proper invoice payload.
app.post("/api/create-invoice", async (req, res) => {
  try {
    // Accept amount/currency in body if you want
    const body = req.body || {};
    // Basic fallback: return a payment URL to bot or support page
    const botUsername = process.env.BOT_USERNAME || "";
    const fallbackUrl = botUsername ? `https://t.me/${botUsername}` : "https://t.me";
    return res.json({ payment_url: fallbackUrl, message: "Fallback invoice. Implement createInvoiceLink on the server for proper invoices." });
  } catch (err) {
    console.error("invoice error:", err);
    return res.status(500).json({ error: "invoice_failed" });
  }
});

// ------------------ Serve frontend (if built) ------------------
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.type("text").send(
      "Frontend not found. Build it and place at frontend/dist\n\nFrom project root:\n  npm run build\n\nThen restart server."
    );
  });
}

// ------------------ Telegram bot safe startup ------------------
async function verifyToken(token, timeoutMs = 6000) {
  const url = `https://api.telegram.org/bot${token}/getMe`;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    const j = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, json: j };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

async function startBotSafely() {
  const token = (process.env.BOT_TOKEN || "").trim();
  if (!token) {
    console.log("BOT_TOKEN not provided. Skipping bot startup.");
    return;
  }
  console.log("Verifying BOT_TOKEN via getMe...");
  let ok = false;
  for (let i = 0; i < 3; i++) {
    const r = await verifyToken(token, 7000);
    console.log("getMe result:", r && (r.json || r));
    if (r.ok && r.json && r.json.ok) { ok = true; break; }
    await new Promise(s => setTimeout(s, 1000 * Math.pow(2, i)));
  }
  if (!ok) {
    console.error("BOT_TOKEN verification failed. Bot will not start (token invalid or network issue).");
    return;
  }

  try {
    const { Telegraf } = require("telegraf");
    const bot = new Telegraf(token);

    bot.start((ctx) => {
      const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "") || "";
      const webAppUrl = publicUrl || "https://telegram-home-coach-mini-app-1.onrender.com";
      ctx.reply("Welcome to MicroCoach! Open the app:", {
        reply_markup: { inline_keyboard: [[{ text: "Open MicroCoach", web_app: { url: webAppUrl } }]] }
      });
    });

    bot.help((ctx) => ctx.reply("Use /start to open the app"));

    await bot.launch();
    console.log("Bot launched (polling).");
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (err) {
    console.warn("Telegraf not present or failed to start:", err && err.message ? err.message : err);
  }
}

// start bot without blocking main flow
startBotSafely().catch(e => console.error("startBotSafely err:", e));

// ------------------ Start server ------------------
const server = app.listen(PORT, () => {
  console.log(`${APP_NAME} server running: http://localhost:${PORT}`);
});

// graceful shutdown
process.on("SIGINT", () => { console.log("SIGINT -> shutting down"); server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { console.log("SIGTERM -> shutting down"); server.close(() => process.exit(0)); });