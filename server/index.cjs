// server/index.cjs
// MicroCoach server: workout generator + invoice scaffolding + safe Telegram bot startup

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const fetch = require("node-fetch"); // used for token verification and any future HTTP calls

const APP_NAME = "MicroCoach";
const app = express();
app.use(cors());
app.use(express.json());

// PORT: Render sets this; fallback to 3000 (or 5000)
const PORT = Number(process.env.PORT || 3000);

// -----------------------------
// Exercise pools (sample, extendable)
// -----------------------------
const POOL_CHILL = [
  { name: "Slow march in place", base: 30, unit: "time", notes: "Gentle march" },
  { name: "Ankle circles", base: 20, unit: "time", notes: "" },
  { name: "Shoulder rolls", base: 20, unit: "time" },
  { name: "Neck rolls", base: 20, unit: "time" }
];

const POOL_STRETCH = [
  { name: "Hamstring stretch", base: 30, unit: "time" },
  { name: "Child's pose", base: 30, unit: "time" },
  { name: "Seated forward fold", base: 30, unit: "time" },
  { name: "Butterfly stretch", base: 30, unit: "time" }
];

const POOL_REGULAR = [
  { name: "Bodyweight squats", base: 30, unit: "time" },
  { name: "Incline push-ups (counter)", base: 30, unit: "time" },
  { name: "Alternating lunges", base: 30, unit: "time" },
  { name: "Glute bridge march", base: 30, unit: "time" },
  { name: "Plank shoulder taps", base: 30, unit: "time" }
];

const POOL_INTENSE = [
  { name: "Fast mountain climbers", base: 25, unit: "time" },
  { name: "Jump squats (modified)", base: 20, unit: "time" },
  { name: "Explosive step-ups", base: 20, unit: "time" },
  { name: "Plank jacks", base: 20, unit: "time" }
];

const POOL_HARDCORE = [
  { name: "Burpees (full)", base: 20, unit: "time" },
  { name: "High knees (fast)", base: 30, unit: "time" },
  { name: "Jumping lunges (alternating)", base: 30, unit: "time" },
  { name: "Tuck jumps (low)", base: 15, unit: "time" }
];

// Cooldown pool
const COOLDOWN_POOL = [
  { name: "Hamstring stretch", base: 30, unit: "time" },
  { name: "Child's pose (cooldown)", base: 30, unit: "time" },
  { name: "World's greatest stretch", base: 30, unit: "time" }
];

// -----------------------------
// Helpers: shuffle, pick unique, generator
// -----------------------------
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
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

const INTENSITY_MULT = { chill: 0.55, stretch: 0.45, regular: 1.0, intense: 1.25, hardcore: 1.6 };
const TOTAL_SECONDS = 5 * 60;
const COOLDOWN_SECONDS = 60;
const MAIN_SECONDS = TOTAL_SECONDS - COOLDOWN_SECONDS;

function makePlaylistSuggestions(genre) {
  if (!genre || typeof genre !== "string") genre = "workout";
  const g = genre.trim().replace(/\s+/g, "+");
  return [
    { title: `${genre} workout mix`, hint: `YouTube: ${genre} workout mix`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent(g + " workout mix")}` },
    { title: `${genre} upbeat`, hint: `YouTube: upbeat ${genre}`, query: `https://www.youtube.com/results?search_query=${encodeURIComponent("upbeat " + g + " workout")}` }
  ];
}

function buildMainRoutineForIntensity(intensityLabel) {
  const mult = INTENSITY_MULT[intensityLabel] || 1.0;
  let pool;
  switch (intensityLabel) {
    case "chill": pool = POOL_CHILL.slice(); break;
    case "stretch": pool = POOL_STRETCH.slice(); break;
    case "intense": pool = POOL_INTENSE.slice(); break;
    case "hardcore": pool = POOL_HARDCORE.slice(); break;
    case "regular":
    default: pool = POOL_REGULAR.slice(); break;
  }
  const targetCount = 4;
  const picks = pickNUnique(pool, targetCount);
  const adjusted = picks.map(p => {
    const base = Number(p.base) || 30;
    return { ...p, adjustedBase: Math.max(6, Math.round(base * mult)) };
  });
  const sumBase = adjusted.reduce((s, x) => s + x.adjustedBase, 0) || 1;
  const scale = MAIN_SECONDS / sumBase;
  const final = adjusted.map(x => {
    const secs = Math.max(4, Math.round(x.adjustedBase * scale));
    return { name: x.name, unit: x.unit || "time", duration_or_reps: secs, notes: x.notes || "" };
  });
  const totalAssigned = final.reduce((s, it) => s + (it.unit === "time" ? Number(it.duration_or_reps) : 0), 0);
  const diff = MAIN_SECONDS - totalAssigned;
  if (diff !== 0 && final.length > 0) {
    for (let i = final.length - 1; i >= 0; i--) {
      if (final[i].unit === "time") { final[i].duration_or_reps = Math.max(4, final[i].duration_or_reps + diff); break; }
    }
  }
  return final;
}
function buildCooldownRoutine() {
  const picks = pickNUnique(COOLDOWN_POOL, 2);
  const each = Math.max(15, Math.round(COOLDOWN_SECONDS / picks.length));
  return picks.map(p => ({ name: p.name, unit: p.unit || "time", duration_or_reps: each, notes: p.notes || "" }));
}

// -----------------------------
// Routes
// -----------------------------
app.get("/health", (req, res) => {
  res.json({ ok: true, app: APP_NAME, time: new Date().toISOString() });
});

app.post("/api/generate-workout", (req, res) => {
  try {
    const body = req.body || {};
    const intensity = (body.level || body.intensity || "regular").toLowerCase();
    const playlist = body.playlist || body.genre || "electronic";
    const main = buildMainRoutineForIntensity(intensity);
    const cooldown = buildCooldownRoutine();
    const playlistObjs = makePlaylistSuggestions(String(playlist));
    return res.json({
      total_duration_minutes: 5,
      intensity_label: intensity,
      main,
      cooldown,
      playlist: playlistObjs
    });
  } catch (err) {
    console.error("Generate error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "generation_failed" });
  }
});

// Simple file-based save (db.json in server folder)
const DB_PATH = path.join(__dirname, "db.json");
app.post("/api/save-workout", (req, res) => {
  try {
    let db = { workouts: [] };
    if (fs.existsSync(DB_PATH)) {
      try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (e) { db = { workouts: [] }; }
    }
    db.workouts.push({ id: Date.now(), created_at: new Date().toISOString(), payload: req.body });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    return res.json({ ok: true });
  } catch (err) {
    console.error("Save error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "save_failed" });
  }
});

/*
 /api/create-invoice
 Returns an invoice payload for Telegram WebApp.openInvoice or a minimal invoice structure.
 To actually use Telegram Payments you must set PROVIDER_TOKEN in env (token from payment provider via BotFather or provider).
*/
app.post("/api/create-invoice", (req, res) => {
  try {
    const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN || "";
    const CURRENCY = (process.env.DONATE_CURRENCY || "USD").toUpperCase();
    const AMOUNT_CENTS = Number(process.env.DONATE_AMOUNT_CENTS || 100);
    const TITLE = process.env.DONATE_TITLE || "Support MicroCoach";
    const DESCRIPTION = process.env.DONATE_DESCRIPTION || "Buy me a coffee ☕️ — thank you!";
    const PAYLOAD = `microcoach_donate_${Date.now()}`;

    if (!PROVIDER_TOKEN) {
      return res.status(400).json({ error: "provider_token_missing", message: "Provider token not configured on server." });
    }

    const prices = [{ label: (req.body && req.body.amount_label) || "Support", amount: AMOUNT_CENTS }];

    const invoicePayload = {
      provider_token: PROVIDER_TOKEN,
      title: TITLE,
      description: DESCRIPTION,
      currency: CURRENCY,
      prices,
      payload: PAYLOAD,
      need_name: false,
      need_email: false
    };

    return res.json(invoicePayload);
  } catch (err) {
    console.error("Create invoice error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "invoice_failed" });
  }
});

/*
 /api/verify-ton-payment (stub)
 This endpoint expects: { txHash, to, amountNano }
 For production, wire this to a TON explorer or node to verify on-chain.
 If you set TON_VERIFIER_URL (a service or API) you can have this server call it.
*/
app.post("/api/verify-ton-payment", async (req, res) => {
  try {
    const body = req.body || {};
    const { txHash, to, amountNano } = body;
    if (!txHash || !to || !amountNano) {
      return res.status(400).json({ ok: false, verified: false, message: "txHash, to and amountNano are required" });
    }

    // If you configured a verifier endpoint, call it here:
    const verifierUrl = process.env.TON_VERIFIER_URL || "";
    if (!verifierUrl) {
      console.warn("TON verification not configured. Received txHash:", txHash);
      return res.json({ ok: true, verified: false, message: "verification_not_configured" });
    }

    // Example: call verifier service (the verifier should reply with { verified: true/false })
    try {
      const resp = await fetch(verifierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, to, amountNano })
      });
      const j = await resp.json();
      return res.status(resp.ok ? 200 : 502).json({ ok: resp.ok, verified: !!j.verified, detail: j });
    } catch (err) {
      console.error("Verifier call failed:", err && err.stack ? err.stack : err);
      return res.status(502).json({ ok: false, verified: false, message: "verifier_error" });
    }
  } catch (err) {
    console.error("verify-ton-payment error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, verified: false, message: "server_error" });
  }
});

// -----------------------------
// Serve frontend (if built)
// -----------------------------
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

// -----------------------------
// Safe Telegram bot starter
// -----------------------------
async function verifyTokenWithGetMe(token, timeoutMs = 5000) {
  const url = `https://api.telegram.org/bot${token}/getMe`;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    const j = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json: j };
  } catch (err) {
    return { ok: false, error: err };
  }
}

async function startTelegramBotSafely() {
  const token = (process.env.BOT_TOKEN || "").trim();
  if (!token) {
    console.log("Telegram BOT_TOKEN not set — skipping bot startup.");
    return;
  }

  console.log("Verifying Telegram BOT_TOKEN (calling getMe)...");
  const maxAttempts = 3;
  let attempt = 0;
  let verified = false;
  let lastResult = null;

  while (attempt < maxAttempts && !verified) {
    attempt++;
    console.log(`getMe attempt ${attempt} / ${maxAttempts}...`);
    lastResult = await verifyTokenWithGetMe(token, 8000);
    if (lastResult.ok && lastResult.json && lastResult.json.ok) {
      verified = true;
      console.log("✅ Telegram token verified:", lastResult.json.result && lastResult.json.result.username ? `@${lastResult.json.result.username}` : "(unknown)");
      break;
    } else {
      console.warn("getMe response:", lastResult);
      const waitMs = 1000 * Math.pow(2, attempt);
      console.log(`Retrying in ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  if (!verified) {
    console.error("❌ Could not verify BOT_TOKEN after retries. Bot will not start. See getMe logs above.");
    return;
  }

  // Token valid — try to start a bot runtime (prefer telegraf)
  try {
    let Telegraf;
    try { Telegraf = require("telegraf").Telegraf; } catch (e) { Telegraf = null; }

    if (Telegraf) {
      const bot = new Telegraf(token);
      bot.start(async (ctx) => {
        try {
          const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "") || "";
          const webAppUrl = publicUrl || "https://telegram-home-coach-mini-app-1.onrender.com";
          await ctx.reply("Open MicroCoach:", {
            reply_markup: { inline_keyboard: [[{ text: "Open MicroCoach", web_app: { url: webAppUrl } }]] }
          });
        } catch (e) {
          console.warn("Failed to send web_app button in start handler:", e && e.message ? e.message : e);
        }
      });
      await bot.launch();
      console.log("✅ Telegraf bot started (polling).");
      process.once("SIGINT", () => bot.stop("SIGINT"));
      process.once("SIGTERM", () => bot.stop("SIGTERM"));
      return;
    }

    try {
      const TelegramBot = require("node-telegram-bot-api");
      const bot = new TelegramBot(token, { polling: true });
      bot.on("message", (msg) => {
        const chatId = msg.chat && msg.chat.id;
        if (!chatId) return;
        if (msg.text && msg.text.toLowerCase().includes("/start")) {
          const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "") || "https://your-app-url.example";
          bot.sendMessage(chatId, `Welcome to MicroCoach!\nOpen the app here: ${publicUrl}`);
        } else {
          bot.sendMessage(chatId, "💪 Type /start to get your workout app link!");
        }
      });
      console.log("✅ node-telegram-bot-api started (polling).");
      process.once("SIGINT", () => bot.stopPolling && bot.stopPolling());
      process.once("SIGTERM", () => bot.stopPolling && bot.stopPolling());
      return;
    } catch (e) {
      console.warn("No bot runtime started (telegraf/node-telegram-bot-api not present or failed):", e && e.message ? e.message : e);
    }

    console.log("Token validated but no supported bot library started. Bot verification passed but runtime skipped.");
  } catch (err) {
    console.error("Unexpected error while starting bot:", err && err.stack ? err.stack : err);
  }
}

// Call safe starter (non-blocking)
startTelegramBotSafely().catch(err => {
  console.error("startTelegramBotSafely fatal error:", err && err.stack ? err.stack : err);
});

// -----------------------------
// Start server
// -----------------------------
const server = app.listen(PORT, () => {
  console.log(`${APP_NAME} server running: http://localhost:${PORT}`);
});

// graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
});
