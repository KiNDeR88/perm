// server.js (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Конфиг целевого API и авторизации ─────────────────────────────────────────
const API_KEY     = process.env.API_KEY;
const PB_BASE     = (process.env.PB_BASE || "https://site-v2.apipb.ru").replace(/\/$/, "");
const PB_PREFIX   = (process.env.PB_PREFIX || "").replace(/\/$/, ""); // "", "/api", "/v2"
const AUTH_MODE   = (process.env.AUTH_MODE || "bearer").toLowerCase(); // bearer | plain | x-api-key | x-auth-token | token | auth-token | auth-prefix
const AUTH_PREFIX = process.env.AUTH_PREFIX || "";                     // для auth-prefix, напр. "IIP_lending:"

if (!API_KEY) {
  console.error("❌ API_KEY is missing in environment (.env)");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// ── Заголовки авторизации по режиму ───────────────────────────────────────────
function authHeaders() {
  switch (AUTH_MODE) {
    case "bearer":       return { Authorization: `Bearer ${API_KEY}` };
    case "plain":        return { Authorization: API_KEY };
    case "x-api-key":    return { "X-API-Key": API_KEY };
    case "x-auth-token": return { "X-Auth-Token": API_KEY };
    case "token":        return { Token: API_KEY };
    case "auth-token":   return { Authorization: `Token ${API_KEY}` };
    case "auth-prefix":  return { Authorization: `${AUTH_PREFIX}${API_KEY}` }; // Authorization: IIP_lending:<TOKEN>
    default:             return { Authorization: `Bearer ${API_KEY}` };
  }
}

// ── Универсальный POST-форвардер ──────────────────────────────────────────────
async function forward(endpoint, payload) {
  const path = `${PB_PREFIX}/${endpoint}`.replace(/\/{2,}/g, "/");
  const url  = `${PB_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  console.log(`\nPB → ${url}`);
  console.log(`   auth=${AUTH_MODE}${AUTH_MODE === "auth-prefix" ? `(${AUTH_PREFIX}...)` : ""}`);
  if (payload && Object.keys(payload).length) console.log("   payload:", payload);

  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload || {}) });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  console.log(`PB ← ${r.status} ${url}`);
  if (typeof data === "string") console.log("   body:", data.slice(0, 300));
  else console.log("   body:", JSON.stringify(data)?.slice(0, 300));

  if (r.ok && data && data.success === false) {
    const msg = data.error_description || data.error || "Unauthorized";
    return { status: 401, data: { success: false, error: msg }, headers: r.headers, url };
  }

  return { status: r.status, data, headers: r.headers, url };
}

// ── Роуты ─────────────────────────────────────────────────────────────────────
app.post("/api/buyer-info",               async (req, res) => { try { const r = await forward("buyer-info", req.body);                       res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("buyer-info error:", e);               res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/send-register-code",       async (req, res) => { try { const r = await forward("send-register-code", { phone:req.body.phone });res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("send-register-code error:", e);       res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/send-custom-code",         async (req, res) => { try { const r = await forward("send-custom-code", { phone:req.body.phone, text:req.body.text||"Код подтверждения: {{code}}" }); res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("send-custom-code error:", e);         res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/verify-confirmation-code", async (req, res) => { try { const r = await forward("verify-confirmation-code", req.body);         res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("verify-confirmation-code error:", e);  res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/register",                 async (req, res) => { try { const r = await forward("buyer-register", req.body);                   res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("buyer-register error:", e);           res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/trigger",                  async (req, res) => { try { const r = await forward("trigger", req.body);                          res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("trigger error:", e);                  res.status(500).json({ success:false, error:"Server error" }); }});
app.post("/api/card-get-info",            async (req, res) => { try { const r = await forward("card-get-info", req.body);                   res.status(r.status).type(r.headers.get("content-type")||"application/json").send(r.data); } catch (e) { console.error("card-get-info error:", e);            res.status(500).json({ success:false, error:"Server error" }); }});

// healthcheck
app.get("/api/health", (req, res) => res.json({
  ok: true,
  PB_BASE, PB_PREFIX, AUTH_MODE,
  AUTH_PREFIX: AUTH_MODE === "auth-prefix" ? AUTH_PREFIX : undefined
}));

app.listen(PORT, () => {
  console.log(`\n✅ Proxy server running on http://localhost:${PORT}`);
  console.log(`→ Target: ${PB_BASE}${PB_PREFIX || ""} (auth=${AUTH_MODE}${AUTH_MODE === "auth-prefix" ? `, prefix="${AUTH_PREFIX}"` : ""})`);
});