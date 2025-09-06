// server/index.cjs
// MicroCoach — randomized, intensity-specific 5-min workout generator
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const APP_NAME = "MicroCoach";
const app = express();
app.use(cors());
app.use(express.json());

// ---------- Intensity-specific exercise pools (no overlap) ----------
// Each list is intentionally unique so chill vs hardcore share no exercises.
// All times are in seconds (base) to allow precise 5-minute packing.

// CHILL = very gentle movement, low exertion (suitable for quick mobility)
const POOL_CHILL = [
  { name: "Seated leg swings", unit: "time", base: 30, notes: "slow controlled" },
  { name: "Neck rolls", unit: "time", base: 20, notes: "gentle" },
  { name: "Shoulder rolls", unit: "time", base: 30, notes: "small -> big" },
  { name: "Cat-cow", unit: "time", base: 40, notes: "flowing movement" },
  { name: "Seated spinal twist", unit: "time", base: 30, notes: "each side" },
  { name: "Standing calf stretch (gentle)", unit: "time", base: 30, notes: "" },
  { name: "Ankle circles", unit: "time", base: 20, notes: "both sides" },
  { name: "Wrist stretches", unit: "time", base: 20, notes: "both hands" },
  { name: "Slow march in place", unit: "time", base: 40, notes: "easy pace" },
  { name: "Deep diaphragmatic breathing", unit: "time", base: 40, notes: "focus on exhale" }
];

// STRETCH = dedicated flexibility-focused moves
const POOL_STRETCH = [
  { name: "Hamstring stretch (standing)", unit: "time", base: 30, notes: "hold each side" },
  { name: "Quad kneeling stretch", unit: "time", base: 30, notes: "switch legs" },
  { name: "Seated forward fold", unit: "time", base: 40, notes: "relaxed breathing" },
  { name: "Butterfly stretch", unit: "time", base: 40, notes: "gentle" },
  { name: "Triceps stretch", unit: "time", base: 30, notes: "each arm" },
  { name: "Child's pose", unit: "time", base: 45, notes: "calm breathing" },
  { name: "Lying spinal twist", unit: "time", base: 30, notes: "each side" },
  { name: "Calf stretch (wall)", unit: "time", base: 30, notes: "" },
  { name: "Shoulder doorway stretch", unit: "time", base: 30, notes: "" }
];

// REGULAR = balanced beginner-friendly moves (cardio + strength, moderate)
const POOL_REGULAR = [
  { name: "Bodyweight squats", unit: "time", base: 45, notes: "controlled" },
  { name: "Incline push-ups (counter)", unit: "time", base: 40, notes: "hands on counter" },
  { name: "Alternating lunges", unit: "time", base: 40, notes: "steady tempo" },
  { name: "Glute bridge march", unit: "time", base: 40, notes: "squeeze glutes" },
  { name: "Standing knee drives", unit: "time", base: 35, notes: "controlled" },
  { name: "Bicycle crunches (slow)", unit: "time", base: 40, notes: "core focus" },
  { name: "Calf raises (slow)", unit: "time", base: 40, notes: "slow up/down" },
  { name: "Standing side leg lifts", unit: "time", base: 36, notes: "control" },
  { name: "Modified burpee step-back", unit: "time", base: 30, notes: "low impact" },
  { name: "Plank shoulder taps", unit: "time", base: 36, notes: "tight core" }
];

// INTENSE = higher cardio / plyo, challenging for home settings
const POOL_INTENSE = [
  { name: "Jump squats (modified)", unit: "time", base: 36, notes: "soft landing" },
  { name: "Fast mountain climbers", unit: "time", base: 40, notes: "quick pace" },
  { name: "Explosive step-ups", unit: "time", base: 40, notes: "on low step" },
  { name: "Burpees (full)", unit: "time", base: 40, notes: "explosive" },
  { name: "High knees (fast)", unit: "time", base: 45, notes: "drive knees up" },
  { name: "Jumping lunges (alternating)", unit: "time", base: 36, notes: "controlled landings" },
  { name: "Plank jacks", unit: "time", base: 36, notes: "core + cardio" },
  { name: "Speed skaters", unit: "time", base: 40, notes: "lateral power" },
  { name: "Tuck jumps (low)", unit: "time", base: 30, notes: "small hops" }
];

// HARDCORE = advanced, high-intensity moves (expect high exertion)
const POOL_HARDCORE = [
  { name: "Plyo burpees", unit: "time", base: 45, notes: "high effort" },
  { name: "One-legged pistol progression", unit: "time", base: 40, notes: "balance + strength" },
  { name: "Clapping push-ups (or explosive)", unit: "time", base: 40, notes: "power" },
  { name: "Alternating plyo lunges", unit: "time", base: 40, notes: "fast" },
  { name: "Sprint-in-place (high effort)", unit: "time", base: 45, notes: "all-out" },
  { name: "Hand-release push-ups", unit: "time", base: 40, notes: "full range" },
  { name: "Jump tuck progressions", unit: "time", base: 35, notes: "explosive" }
];

// Little-equipment unique moves per intensity (distinct names)
const LITTLE_CHILL = [
  { name: "Band shoulder opener", unit: "time", base: 30, notes: "light band" },
  { name: "Seated band pull-apart", unit: "time", base: 30, notes: "gentle" }
];

const LITTLE_STRETCH = [
  { name: "Band chest opener", unit: "time", base: 30, notes: "use band" },
  { name: "Assisted hamstring (strap)", unit: "time", base: 30, notes: "use strap" }
];

const LITTLE_REGULAR = [
  { name: "Chair tricep dips", unit: "time", base: 36, notes: "sturdy chair" },
  { name: "Resistance band rows (light)", unit: "time", base: 36, notes: "band" }
];

const LITTLE_INTENSE = [
  { name: "Weighted step-ups (light)", unit: "time", base: 40, notes: "hold small weight" },
  { name: "Band sprint pulls", unit: "time", base: 36, notes: "explosive band pull" }
];

const LITTLE_HARDCORE = [
  { name: "Heavy band jump squats", unit: "time", base: 40, notes: "explosive with band" },
  { name: "Weighted pistols (progression)", unit: "time", base: 40, notes: "advanced" }
];

// Cooldown pool (shared gentle stretches)
const COOLDOWN_POOL = [
  { name: "Hamstring stretch", unit: "time", base: 30, notes: "hold gently" },
  { name: "Child's pose", unit: "time", base: 30, notes: "calm breathing" },
  { name: "Quad stretch (standing)", unit: "time", base: 30, notes: "each side" },
  { name: "Chest opener", unit: "time", base: 30, notes: "" },
  { name: "Spinal twist (lying)", unit: "time", base: 30, notes: "each side" }
];

// ---------- Utility helpers ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickNUnique(arr, n) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const s = shuffle(arr);
  return s.slice(0, Math.min(n, s.length));
}

// intensity multipliers (affect base seconds)
const INTENSITY_MULT = {
  chill: 0.55,
  stretch: 0.45,
  regular: 1.0,
  intense: 1.25,
  hardcore: 1.6
};

// timing constants
const TOTAL_SECONDS = 5 * 60;      // 300s total
const COOLDOWN_SECONDS = 60;       // ~60s for cooldown
const MAIN_SECONDS = TOTAL_SECONDS - COOLDOWN_SECONDS; // ~240s for main

function makePlaylistSuggestions(genre) {
  if (!genre || typeof genre !== "string") genre = "workout";
  const g = genre.trim().replace(/\s+/g, "+");
  return [
    { title: `${genre} workout mix`, hint: `YouTube: ${genre} workout mix`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent(g + " workout mix")}` },
    { title: `${genre} upbeat`, hint: `YouTube: upbeat ${genre}`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent("upbeat " + g + " workout")}` },
    { title: `Quick ${genre} beats`, hint: `Short high-energy tracks`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent(g + " short workout mix")}` }
  ];
}

// Build main routine: pick N moves unique within routine, scale durations to MAIN_SECONDS
function buildMainRoutineForIntensity(intensityLabel, equipmentChoice) {
  const mult = INTENSITY_MULT[intensityLabel] || 1.0;
  // pick pool based on intensity
  let pool;
  switch (intensityLabel) {
    case "chill": pool = POOL_CHILL.slice(); break;
    case "stretch": pool = POOL_STRETCH.slice(); break;
    case "intense": pool = POOL_INTENSE.slice(); break;
    case "hardcore": pool = POOL_HARDCORE.slice(); break;
    case "regular":
    default: pool = POOL_REGULAR.slice(); break;
  }

  // append little-equipment moves if requested (keep them distinct)
  if (equipmentChoice === "little") {
    switch (intensityLabel) {
      case "chill": pool = pool.concat(LITTLE_CHILL); break;
      case "stretch": pool = pool.concat(LITTLE_STRETCH); break;
      case "regular": pool = pool.concat(LITTLE_REGULAR); break;
      case "intense": pool = pool.concat(LITTLE_INTENSE); break;
      case "hardcore": pool = pool.concat(LITTLE_HARDCORE); break;
      default: break;
    }
  }

  // target count of main moves — compact for 5-min: 4 moves
  const targetCount = 4;
  const picks = pickNUnique(pool, targetCount);

  // adjust base seconds by intensity multiplier
  const adjusted = picks.map(p => {
    const base = Number(p.base) || 30;
    return { ...p, adjustedBase: Math.max(6, Math.round(base * mult)) };
  });

  // scale to fill MAIN_SECONDS
  const sumBase = adjusted.reduce((s, x) => s + x.adjustedBase, 0) || 1;
  const scale = MAIN_SECONDS / sumBase;

  const final = adjusted.map(x => {
    const secs = Math.max(4, Math.round(x.adjustedBase * scale));
    return {
      name: x.name,
      unit: x.unit || "time",
      duration_or_reps: secs,
      notes: x.notes || ""
    };
  });

  // fix rounding differences by adjusting last time-based item
  const totalAssigned = final.reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0);
  const diff = MAIN_SECONDS - totalAssigned;
  if (diff !== 0 && final.length > 0) {
    for (let i = final.length - 1; i >= 0; i--) {
      if (final[i].unit === "time") {
        final[i].duration_or_reps = Math.max(4, final[i].duration_or_reps + diff);
        break;
      }
    }
  }

  return final;
}

function buildCooldownRoutine() {
  const picks = pickNUnique(COOLDOWN_POOL, 2);
  const each = Math.max(15, Math.round(COOLDOWN_SECONDS / picks.length));
  return picks.map(p => ({
    name: p.name,
    unit: p.unit || "time",
    duration_or_reps: each,
    notes: p.notes || ""
  }));
}

// ---------- API routes ----------

app.get("/health", (req, res) => {
  res.json({ ok: true, app: APP_NAME, time: new Date().toISOString() });
});

app.post("/api/generate-workout", (req, res) => {
  try {
    const body = req.body || {};
    const intensity = (body.level || body.intensity || "regular").toLowerCase();
    const equipment = (body.equipment || "no").toLowerCase();
    const playlist = body.playlist || body.genre || "electronic";

    const main = buildMainRoutineForIntensity(intensity, equipment);
    const cooldown = buildCooldownRoutine();
    const playlistObjs = makePlaylistSuggestions(String(playlist));

    return res.json({
      total_duration_minutes: 5,
      intensity_label: intensity,
      equipment: equipment,
      main,
      cooldown,
      playlist: playlistObjs
    });
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "generation_failed" });
  }
});

// save endpoint (file-based)
const DB = path.join(__dirname, "db.json");
app.post("/api/save-workout", (req, res) => {
  try {
    let db = { workouts: [] };
    if (fs.existsSync(DB)) {
      try { db = JSON.parse(fs.readFileSync(DB, "utf8")); } catch (e) { db = { workouts: [] }; }
    }
    db.workouts.push({ id: Date.now(), created_at: new Date().toISOString(), payload: req.body });
    fs.writeFileSync(DB, JSON.stringify(db, null, 2), "utf8");
    return res.json({ ok: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "save_failed" });
  }
});

// Serve frontend build (if exists)
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.type("text").send(
      "Frontend not found. Build it and place at ../frontend/dist\n\n" +
      "From project root:\n  cd frontend\n  npm install\n  npm run build\n\nThen restart server."
    );
  });
}

// Optional: Telegram bot (polling) if BOT_TOKEN present
async function tryStartBot() {
  const token = process.env.BOT_TOKEN && String(process.env.BOT_TOKEN).trim();
  if (!token) {
    console.log("BOT_TOKEN not set — Telegram bot will not start.");
    return;
  }
  let Telegraf;
  try {
    Telegraf = require("telegraf").Telegraf;
  } catch (err) {
    console.warn("telegraf not installed. Install with `npm install telegraf` to enable bot.");
    return;
  }

  try {
    const bot = new Telegraf(token);
    const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    bot.start(async (ctx) => {
      const url = publicUrl && publicUrl !== "" ? publicUrl : "https://example.com";
      try {
        await ctx.reply("Open MicroCoach:", {
          reply_markup: { inline_keyboard: [[{ text: "Open MicroCoach", web_app: { url } }]] }
        });
      } catch (e) {
        console.warn("Failed to send web_app button:", e && e.message ? e.message : e);
      }
    });

    await bot.launch();
    console.log("Telegram bot started (polling).");
    const stop = () => { bot.stop().then(()=>console.log("Telegram bot stopped.")); process.exit(0); };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (err) {
    console.error("Failed to start Telegram bot:", err && err.message ? err.message : err);
  }
}

// Start server
const PORT = Number(process.env.PORT || 3000);
const srv = app.listen(PORT, () => {
  console.log(`${APP_NAME} server running: http://localhost:${PORT}`);
  tryStartBot().catch(e => console.error("Bot start error:", e));
});

// graceful shutdown
process.on("SIGINT", () => { console.log("Shutting down..."); srv.close(()=>process.exit(0)); });
process.on("SIGTERM", () => { console.log("Shutting down..."); srv.close(()=>process.exit(0)); });
