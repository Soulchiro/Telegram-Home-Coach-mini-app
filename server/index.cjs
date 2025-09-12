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
    { name: "Neck rolls", base: 25, unit: "time", notes: "gentle" },
    { name: "Shoulder shrugs", base: 25, unit: "time" },
    { name: "Ankle circles", base: 20, unit: "time" },
    { name: "Seated cat-cow", base: 30, unit: "time" },
    { name: "Child's pose", base: 40, unit: "time" },
    { name: "Standing side bend", base: 25, unit: "time" },
    { name: "Wrist circles", base: 20, unit: "time" },
    { name: "Seated forward fold", base: 30, unit: "time" },
    { name: "Calf stretch", base: 25, unit: "time" },
    { name: "Hip circles", base: 25, unit: "time" },
    { name: "Deep breaths", base: 30, unit: "time" },
    { name: "Seated spinal twist", base: 30, unit: "time" },
    { name: "Glute release", base: 25, unit: "time" },
    { name: "Quadruped cat stretch", base: 25, unit: "time" },
    { name: "Knee hugs", base: 25, unit: "time" },
    { name: "Gentle hamstring pedal", base: 25, unit: "time" },
    { name: "Supine knee rock", base: 25, unit: "time" },
    { name: "Seated shoulder stretch", base: 25, unit: "time" },
    { name: "Thoracic rotation", base: 25, unit: "time" },
    { name: "Child's breathing", base: 30, unit: "time" }
  ],
  stretch: [
    { name: "Hamstring stretch", base: 40, unit: "time" },
    { name: "Quad stretch", base: 40, unit: "time" },
    { name: "Torso twist", base: 35, unit: "time" },
    { name: "Butterfly stretch", base: 40, unit: "time" },
    { name: "Cobra stretch", base: 35, unit: "time" },
    { name: "Seated spinal twist", base: 40, unit: "time" },
    { name: "Standing calf stretch", base: 30, unit: "time" },
    { name: "Hip opener", base: 40, unit: "time" },
    { name: "IT band stretch", base: 35, unit: "time" },
    { name: "Pigeon prep", base: 35, unit: "time" },
    { name: "Glute stretch", base: 30, unit: "time" },
    { name: "Adductor stretch", base: 35, unit: "time" },
    { name: "Chest opener", base: 30, unit: "time" },
    { name: "Triceps stretch", base: 30, unit: "time" },
    { name: "Neck side stretch", base: 25, unit: "time" },
    { name: "Wrist flexor stretch", base: 20, unit: "time" },
    { name: "Seated forward fold", base: 40, unit: "time" },
    { name: "Lying quad release", base: 30, unit: "time" },
    { name: "Hamstring hold", base: 35, unit: "time" },
    { name: "World's greatest stretch", base: 40, unit: "time" }
  ],
  regular: [
    { name: "Bodyweight squats", base: 30, unit: "time" },
    { name: "Push-ups (knees if needed)", base: 30, unit: "time" },
    { name: "Alternating lunges", base: 30, unit: "time" },
    { name: "Plank", base: 40, unit: "time" },
    { name: "Glute bridge", base: 30, unit: "time" },
    { name: "Standing knee lifts", base: 30, unit: "time" },
    { name: "Incline push-ups (hands on counter)", base: 30, unit: "time" },
    { name: "Calf raises", base: 30, unit: "time" },
    { name: "Side lunges", base: 30, unit: "time" },
    { name: "Supermans", base: 30, unit: "time" },
    { name: "Heel taps", base: 30, unit: "time" },
    { name: "Tabletop leg lifts", base: 30, unit: "time" },
    { name: "Reverse lunges", base: 30, unit: "time" },
    { name: "Hip bridges with march", base: 30, unit: "time" },
    { name: "Tricep dips (chair)", base: 30, unit: "time" },
    { name: "Standing oblique crunch", base: 30, unit: "time" },
    { name: "Bird-dog", base: 30, unit: "time" },
    { name: "Step ups (low)", base: 30, unit: "time" },
    { name: "Inner thigh lifts", base: 30, unit: "time" },
    { name: "Wall sits", base: 30, unit: "time" }
  ],
  intense: [
    { name: "Mountain climbers", base: 25, unit: "time" },
    { name: "Jump squats (modified)", base: 20, unit: "time" },
    { name: "Plank shoulder taps", base: 25, unit: "time" },
    { name: "High knees", base: 30, unit: "time" },
    { name: "Burpees (half)", base: 25, unit: "time" },
    { name: "Speed skaters (low impact)", base: 25, unit: "time" },
    { name: "Fast alternating lunges", base: 25, unit: "time" },
    { name: "Bicycle crunches", base: 30, unit: "time" },
    { name: "Tuck jumps (low)", base: 20, unit: "time" },
    { name: "Broad jump singles (low)", base: 20, unit: "time" },
    { name: "Plank jacks (low)", base: 25, unit: "time" },
    { name: "Skips without rope", base: 25, unit: "time" },
    { name: "Reverse burpee step back", base: 25, unit: "time" },
    { name: "Alternating jump lunges", base: 25, unit: "time" },
    { name: "Fast squat pulses", base: 25, unit: "time" },
    { name: "Explosive push-up (low)", base: 20, unit: "time" },
    { name: "Climber holds", base: 30, unit: "time" },
    { name: "Star jumps (low)", base: 20, unit: "time" },
    { name: "Russian twists (fast)", base: 30, unit: "time" },
    { name: "Heel flicks", base: 25, unit: "time" }
  ],
  hardcore: [
    { name: "Burpees (modified)", base: 20, unit: "time" },
    { name: "Explosive step-ups", base: 20, unit: "time" },
    { name: "Tuck jumps (low)", base: 15, unit: "time" },
    { name: "Plyo lunges", base: 20, unit: "time" },
    { name: "One-leg hip thrust", base: 25, unit: "time" },
    { name: "Pistol squats (assisted)", base: 30, unit: "time" },
    { name: "Clap push-ups (knee mod)", base: 20, unit: "time" },
    { name: "Hand-release push-ups (fast)", base: 20, unit: "time" },
    { name: "Burpee tuck", base: 18, unit: "time" },
    { name: "Single-leg plyo hops", base: 18, unit: "time" },
    { name: "One-arm plank hold (mod)", base: 25, unit: "time" },
    { name: "Explosive mountain climbers", base: 20, unit: "time" },
    { name: "Box jump substitute", base: 20, unit: "time" },
    { name: "Tricep plyo dips", base: 20, unit: "time" },
    { name: "Weighted-ish squat pulses (hold)", base: 25, unit: "time" },
    { name: "Heavy core rotations", base: 25, unit: "time" },
    { name: "Sprint-in-place", base: 30, unit: "time" },
    { name: "L-sit hold (mod)", base: 20, unit: "time" },
    { name: "Aztec push-ups (mod)", base: 18, unit: "time" },
    { name: "All-out effort squat jumps", base: 20, unit: "time" }
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

// ------------------ Build routine (single canonical function) ------------------
function buildRoutine(intensity = "regular") {
  // duration is fixed 5 minutes (300s)
  const TOTAL_SEC = 5 * 60;
  // reserve small cooldown
  const COOLDOWN_SEC = 40;
  const MAIN_SEC = TOTAL_SEC - COOLDOWN_SEC;

  const key = String(intensity || "regular").toLowerCase();
  const pool = POOLS[key] || POOLS.regular;

  // choose 4 unique main exercises (more variety)
  const mainChoices = pickUnique(pool, 4);

  // assign seconds proportional to base values (but ensure integer secs and >=6s)
  const totalBase = mainChoices.reduce((s, x) => s + (x.base || 30), 0) || 1;
  const main = mainChoices.map((it) => {
    const base = it.base || 30;
    const secs = Math.max(6, Math.round((base / totalBase) * MAIN_SEC));
    return {
      name: it.name,
      unit: it.unit || "time",
      duration_or_reps: secs,
      notes: it.notes || ""
    };
  });

  // fix rounding differences (adjust last)
  const assigned = main.reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0);
  const diff = MAIN_SEC - assigned;
  if (diff !== 0 && main.length) {
    main[main.length - 1].duration_or_reps = Math.max(6, main[main.length - 1].duration_or_reps + diff);
  }

  // cooldown: pick 2 short stretches
  const cooldownPool = [
    { name: "Child's pose", duration: 20 },
    { name: "Hamstring stretch", duration: 20 },
    { name: "Seated forward fold", duration: 20 },
    { name: "Chest opener", duration: 20 }
  ];
  const cooldownChoices = pickUnique(cooldownPool, 2);
  const cooldown = cooldownChoices.map(c => ({ name: c.name, unit: "time", duration_or_reps: Math.round(COOLDOWN_SEC / cooldownChoices.length) }));

  // playlist hint
  const playlist = [
    { title: `${key} mix`, hint: `${key} playlist`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent(key + " workout mix")}` }
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
      const webAppUrl = publicUrl || "https://your-app.example";
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
