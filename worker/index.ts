import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { cors } from "hono/cors";

type Env = { DB: D1Database; ASSETS: Fetcher; SETUP_KEY?: string };
type Role = "admin" | "super_distributor" | "distributor" | "provider" | "customer";
type User = {
  id: number; username: string; name: string; phone: string | null; city: string | null;
  role: Role; status: string; referral_code: string | null; created_at: string;
};

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// the Android app runs on its own origin and talks to this API with a Bearer token
app.use("/api/*", cors({
  origin: (o) => (["https://localhost", "capacitor://localhost", "http://localhost", "http://localhost:5173"].includes(o) ? o : ""),
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// who can create whom (enforced here on the server, never only in the UI)
const CAN_CREATE: Record<string, Role[]> = {
  admin: ["super_distributor", "distributor", "provider", "customer"],
  super_distributor: ["distributor", "provider"],
  distributor: ["provider"],
};

/* ---------- crypto helpers ---------- */
const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function pbkdf2(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${b64(salt)}:${b64(await pbkdf2(password, salt))}`;
}
async function verifyPassword(password: string, stored: string) {
  const [s, h] = stored.split(":");
  const got = new Uint8Array(await pbkdf2(password, unb64(s)));
  const want = unb64(h);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
async function sha256(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
function refCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint8Array(7));
  return [...r].map((x) => chars[x % chars.length]).join("");
}

/* ---------- validation ---------- */
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
function validate(body: any) {
  const username = String(body.username || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const phone = body.phone ? String(body.phone).trim().slice(0, 15) : null;
  const city = body.city ? String(body.city).trim().slice(0, 60) : null;
  if (!USERNAME_RE.test(username)) return { error: "यूज़रनेम 3-30 अक्षर का हो: a-z, 0-9 और _ ही" };
  if (name.length < 2 || name.length > 80) return { error: "पूरा नाम लिखें" };
  if (password.length < 8 || password.length > 100) return { error: "पासवर्ड कम से कम 8 अक्षर का हो" };
  if (phone && !/^[0-9+ ]{7,15}$/.test(phone)) return { error: "फ़ोन नंबर सही नहीं है" };
  return { username, name, password, phone, city };
}

async function audit(db: D1Database, actor: number | null, action: string, target?: string) {
  await db.prepare("INSERT INTO audit_log (actor_id, action, target) VALUES (?,?,?)").bind(actor, action, target ?? null).run();
}

async function insertUser(
  db: D1Database,
  v: { username: string; name: string; password: string; phone: string | null; city: string | null },
  role: Role, createdBy: number | null, referredBy: number | null
) {
  const hash = await hashPassword(v.password);
  const code = role === "admin" || role === "customer" ? null : refCode();
  try {
    const r = await db
      .prepare(
        `INSERT INTO users (username,name,phone,city,role,password_hash,created_by,referred_by,referral_code)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .bind(v.username, v.name, v.phone, v.city, role, hash, createdBy, referredBy, code)
      .run();
    return { id: r.meta.last_row_id as number, referral_code: code };
  } catch (e: any) {
    if (String(e.message).includes("UNIQUE")) return { error: "यह यूज़रनेम पहले से किसी ने ले रखा है" };
    throw e;
  }
}

async function startSession(c: any, userId: number) {
  const token = randomToken();
  const exp = new Date(Date.now() + 30 * 864e5).toISOString();
  await c.env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), userId, exp).run();
  setCookie(c, "sid", token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 30 * 86400 });
  return token;
}
const sessionToken = (c: any) => {
  const h = c.req.header("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : getCookie(c, "sid");
};

/* ---------- auth middleware ---------- */
const requireUser = async (c: any, next: any) => {
  const token = sessionToken(c);
  if (!token) return c.json({ error: "login required" }, 401);
  const row = await c.env.DB.prepare(
    `SELECT u.id,u.username,u.name,u.phone,u.city,u.role,u.status,u.referral_code,u.created_at
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.expires_at > ?`
  ).bind(await sha256(token), new Date().toISOString()).first();
  if (!row || (row as any).status === "blocked") return c.json({ error: "login required" }, 401);
  c.set("user", row as User);
  await next();
};
const requireRole = (...roles: Role[]) => async (c: any, next: any) => {
  if (!roles.includes(c.get("user").role)) return c.json({ error: "इसकी अनुमति नहीं है" }, 403);
  await next();
};

/* ---------- public ---------- */
// One-time admin creation: POST /api/setup {key, username, name, password}. Works only while no admin exists.
app.post("/api/setup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!c.env.SETUP_KEY || body.key !== c.env.SETUP_KEY) return c.json({ error: "forbidden" }, 403);
  const exists = await c.env.DB.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").first();
  if (exists) return c.json({ error: "admin पहले से बना हुआ है" }, 409);
  const v: any = validate(body);
  if (v.error) return c.json({ error: v.error }, 400);
  const r: any = await insertUser(c.env.DB, v, "admin", null, null);
  if (r.error) return c.json({ error: r.error }, 400);
  await audit(c.env.DB, r.id, "setup_admin", v.username);
  return c.json({ ok: true });
});

app.get("/api/categories", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,name,icon FROM categories WHERE active=1 ORDER BY sort_order,id LIMIT 200"
  ).all();
  return c.json({ categories: results });
});

app.post("/api/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const v: any = validate(body);
  if (v.error) return c.json({ error: v.error }, 400);
  let referredBy: number | null = null;
  if (body.ref) {
    const r: any = await c.env.DB.prepare("SELECT id FROM users WHERE referral_code=?")
      .bind(String(body.ref).toUpperCase().slice(0, 12)).first();
    if (r) referredBy = r.id;
  }
  const r: any = await insertUser(c.env.DB, v, "customer", null, referredBy);
  if (r.error) return c.json({ error: r.error }, 400);
  const token = await startSession(c, r.id);
  return c.json({ ok: true, token });
});

app.post("/api/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const ip = c.req.header("CF-Connecting-IP") || "";
  const since = new Date(Date.now() - 15 * 60e3).toISOString().replace("T", " ").slice(0, 19);
  const cnt: any = await c.env.DB.prepare(
    "SELECT COUNT(*) n FROM login_attempts WHERE (username=? OR ip=?) AND at > ?"
  ).bind(username, ip, since).first();
  if (cnt.n >= 10) return c.json({ error: "बहुत ज़्यादा कोशिशें। 15 मिनट बाद फिर करें" }, 429);
  const u: any = await c.env.DB.prepare("SELECT id,password_hash,status FROM users WHERE username=?").bind(username).first();
  const ok = u ? await verifyPassword(password, u.password_hash) : false;
  if (!ok || u.status === "blocked") {
    await c.env.DB.prepare("INSERT INTO login_attempts (username,ip) VALUES (?,?)").bind(username, ip).run();
    return c.json({ error: "यूज़रनेम या पासवर्ड ग़लत है" }, 401);
  }
  const token = await startSession(c, u.id);
  return c.json({ ok: true, token });
});

app.post("/api/logout", async (c) => {
  const token = sessionToken(c);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  deleteCookie(c, "sid", { path: "/" });
  return c.json({ ok: true });
});

/* ---------- logged-in ---------- */
app.get("/api/me", requireUser, (c) => c.json({ user: c.get("user") }));

// Visible people: admin = everyone; others = everyone below them in their own chain
const TREE_CTE = `WITH RECURSIVE tree(id) AS (
  SELECT id FROM users WHERE created_by = ?1 OR referred_by = ?1
  UNION
  SELECT u.id FROM users u JOIN tree t ON u.created_by = t.id OR u.referred_by = t.id
)`;

app.get("/api/stats", requireUser, requireRole("admin", "super_distributor", "distributor"), async (c) => {
  const me = c.get("user");
  const scope = me.role === "admin" ? "" : "AND id IN (SELECT id FROM tree)";
  const pre = me.role === "admin" ? "" : TREE_CTE;
  const bind = me.role === "admin" ? [] : [me.id];
  const counts = await c.env.DB.prepare(
    `${pre} SELECT role, COUNT(*) n FROM users WHERE role!='admin' ${scope} GROUP BY role`
  ).bind(...bind).all();
  const monthly = await c.env.DB.prepare(
    `${pre} SELECT substr(created_at,1,7) m, role, COUNT(*) n FROM users
     WHERE role!='admin' AND created_at >= date('now','-11 months','start of month') ${scope}
     GROUP BY m, role ORDER BY m`
  ).bind(...bind).all();
  const pending = await c.env.DB.prepare("SELECT COUNT(*) n FROM provider_profiles WHERE approval='pending'").first<any>();
  return c.json({
    counts: Object.fromEntries((counts.results as any[]).map((r) => [r.role, r.n])),
    monthly: monthly.results,
    pending: me.role === "admin" ? pending?.n ?? 0 : 0,
  });
});

app.get("/api/users", requireUser, requireRole("admin", "super_distributor", "distributor"), async (c) => {
  const me = c.get("user");
  const role = c.req.query("role");
  const q = (c.req.query("q") || "").trim().slice(0, 40);
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const size = 20;
  const conds: string[] = ["role!='admin'"];
  const params: any[] = [];
  let pre = "";
  if (me.role !== "admin") {
    pre = TREE_CTE;
    conds.push("id IN (SELECT id FROM tree)");
  }
  if (role && ["super_distributor", "distributor", "provider", "customer"].includes(role)) {
    conds.push("role=?"); params.push(role);
  }
  if (q) {
    conds.push("(name LIKE ? OR username LIKE ? OR phone LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = conds.join(" AND ");
  const base = me.role === "admin" ? params : [me.id, ...params];
  const total: any = await c.env.DB.prepare(`${pre} SELECT COUNT(*) n FROM users WHERE ${where}`).bind(...base).first();
  const { results } = await c.env.DB.prepare(
    `${pre} SELECT id,username,name,phone,city,role,status,created_at,created_by,
       (SELECT approval FROM provider_profiles WHERE user_id=users.id) approval FROM users
     WHERE ${where} ORDER BY id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`
  ).bind(...base).all();
  return c.json({ users: results, total: total.n, page, size });
});

app.post("/api/users", requireUser, requireRole("admin", "super_distributor", "distributor"), async (c) => {
  const me = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const role = body.role as Role;
  if (!CAN_CREATE[me.role]?.includes(role)) return c.json({ error: "आप यह खाता नहीं बना सकते" }, 403);
  const v: any = validate(body);
  if (v.error) return c.json({ error: v.error }, 400);
  const r: any = await insertUser(c.env.DB, v, role, me.id, role === "customer" ? me.id : null);
  if (r.error) return c.json({ error: r.error }, 400);
  if (role === "provider") {
    const cat = Number(body.category_id) || null;
    const shop = body.shop_name ? String(body.shop_name).trim().slice(0, 80) : null;
    await c.env.DB.prepare(
      "INSERT INTO provider_profiles (user_id,category_id,shop_name,approval) VALUES (?,?,?,?)"
    ).bind(r.id, cat, shop, me.role === "admin" ? "approved" : "pending").run();
  }
  await audit(c.env.DB, me.id, `create_${role}`, v.username);
  return c.json({ ok: true, id: r.id, username: v.username });
});

app.post("/api/users/:id/status", requireUser, requireRole("admin"), async (c) => {
  const status = (await c.req.json().catch(() => ({}))).status;
  if (!["active", "blocked"].includes(status)) return c.json({ error: "bad status" }, 400);
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("UPDATE users SET status=? WHERE id=? AND role!='admin'").bind(status, id).run();
  if (status === "blocked") await c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id).run();
  await audit(c.env.DB, c.get("user").id, `status_${status}`, String(id));
  return c.json({ ok: true });
});

app.get("/api/audit", requireUser, requireRole("admin"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT a.id,a.action,a.target,a.at,u.username actor FROM audit_log a
     LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100`
  ).all();
  return c.json({ rows: results });
});

/* ---------- Step 2: categories, services, providers ---------- */
const ICON_RE = /^[a-z0-9-]{1,30}$/;
const clean = (v: any, n: number) => String(v ?? "").trim().slice(0, n);
async function runChunks(db: D1Database, stmts: D1PreparedStatement[]) {
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
}

app.get("/api/categories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const cat = await c.env.DB.prepare("SELECT id,name,icon FROM categories WHERE id=? AND active=1").bind(id).first();
  if (!cat) return c.json({ error: "नहीं मिला" }, 404);
  const { results } = await c.env.DB.prepare(
    "SELECT id,name FROM services WHERE category_id=? AND active=1 ORDER BY name LIMIT 300"
  ).bind(id).all();
  return c.json({ category: cat, services: results });
});

app.get("/api/categories/:id/providers", async (c) => {
  const id = Number(c.req.param("id"));
  const q = clean(c.req.query("q"), 40);
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const size = 20;
  const conds = ["p.category_id=?", "p.approval='approved'", "u.status='active'"];
  const params: any[] = [id];
  if (q) { conds.push("(p.shop_name LIKE ? OR u.name LIKE ? OR u.city LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const where = conds.join(" AND ");
  const total: any = await c.env.DB.prepare(
    `SELECT COUNT(*) n FROM provider_profiles p JOIN users u ON u.id=p.user_id WHERE ${where}`).bind(...params).first();
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, COALESCE(p.shop_name,u.name) title, u.name, u.city, p.about
     FROM provider_profiles p JOIN users u ON u.id=p.user_id WHERE ${where}
     ORDER BY u.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`).bind(...params).all();
  return c.json({ providers: results, total: total.n, page, size });
});

app.get("/api/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row: any = await c.env.DB.prepare(
    `SELECT u.id, COALESCE(p.shop_name,u.name) title, u.name, u.city, u.phone, p.about, p.address, p.whatsapp, p.category_id,
            (SELECT name FROM categories WHERE id=p.category_id) category
     FROM provider_profiles p JOIN users u ON u.id=p.user_id
     WHERE u.id=? AND p.approval='approved' AND u.status='active'`).bind(id).first();
  if (!row) return c.json({ error: "नहीं मिला" }, 404);
  return c.json({ provider: row });
});

// provider: own profile
app.get("/api/provider/profile", requireUser, requireRole("provider"), async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM provider_profiles WHERE user_id=?").bind(c.get("user").id).first();
  return c.json({ profile: row ?? null });
});
app.put("/api/provider/profile", requireUser, requireRole("provider"), async (c) => {
  const me = c.get("user");
  const b = await c.req.json().catch(() => ({}));
  const cat = Number(b.category_id) || null;
  if (cat) {
    const ok = await c.env.DB.prepare("SELECT 1 FROM categories WHERE id=? AND active=1").bind(cat).first();
    if (!ok) return c.json({ error: "श्रेणी सही नहीं है" }, 400);
  }
  const shop = clean(b.shop_name, 80), about = clean(b.about, 600), address = clean(b.address, 200), wa = clean(b.whatsapp, 15);
  if (wa && !/^[0-9+ ]{7,15}$/.test(wa)) return c.json({ error: "WhatsApp नंबर सही नहीं है" }, 400);
  // any edit sends the profile back for approval, except for admin-approved unchanged state
  await c.env.DB.prepare(
    `INSERT INTO provider_profiles (user_id,category_id,shop_name,about,address,whatsapp,approval)
     VALUES (?1,?2,?3,?4,?5,?6,'pending')
     ON CONFLICT(user_id) DO UPDATE SET category_id=?2,shop_name=?3,about=?4,address=?5,whatsapp=?6,
       approval='pending', updated_at=datetime('now')`
  ).bind(me.id, cat, shop, about, address, wa).run();
  await audit(c.env.DB, me.id, "provider_profile_update", String(me.id));
  return c.json({ ok: true });
});

// admin: categories and services
const admin = [requireUser, requireRole("admin")] as const;
app.get("/api/admin/categories", ...admin, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id,c.name,c.icon,c.active,c.sort_order,
       (SELECT COUNT(*) FROM services s WHERE s.category_id=c.id) services,
       (SELECT COUNT(*) FROM provider_profiles p WHERE p.category_id=c.id) providers
     FROM categories c ORDER BY c.sort_order,c.id LIMIT 500`).all();
  return c.json({ categories: results });
});
app.post("/api/admin/categories", ...admin, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const name = clean(b.name, 60), icon = ICON_RE.test(b.icon || "") ? b.icon : "wrench";
  if (name.length < 2) return c.json({ error: "श्रेणी का नाम लिखें" }, 400);
  try {
    await c.env.DB.prepare("INSERT INTO categories (name,icon,sort_order) VALUES (?,?,(SELECT COALESCE(MAX(sort_order),0)+1 FROM categories))").bind(name, icon).run();
  } catch { return c.json({ error: "यह श्रेणी पहले से है" }, 400); }
  await audit(c.env.DB, c.get("user").id, "category_add", name);
  return c.json({ ok: true });
});
app.put("/api/admin/categories/:id", ...admin, async (c) => {
  const id = Number(c.req.param("id"));
  const b = await c.req.json().catch(() => ({}));
  const name = clean(b.name, 60), icon = ICON_RE.test(b.icon || "") ? b.icon : "wrench";
  if (name.length < 2) return c.json({ error: "श्रेणी का नाम लिखें" }, 400);
  try {
    await c.env.DB.prepare("UPDATE categories SET name=?,icon=?,active=?,sort_order=? WHERE id=?")
      .bind(name, icon, b.active ? 1 : 0, Number(b.sort_order) || 0, id).run();
  } catch { return c.json({ error: "इस नाम की श्रेणी पहले से है" }, 400); }
  await audit(c.env.DB, c.get("user").id, "category_edit", `${id}:${name}`);
  return c.json({ ok: true });
});
app.get("/api/admin/categories/:id/services", ...admin, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id,name,active FROM services WHERE category_id=? ORDER BY name LIMIT 500").bind(Number(c.req.param("id"))).all();
  return c.json({ services: results });
});
app.post("/api/admin/categories/:id/services", ...admin, async (c) => {
  const id = Number(c.req.param("id"));
  const b = await c.req.json().catch(() => ({}));
  const names: string[] = [...new Set<string>(String(b.names || "").split("\n").map((x) => clean(x, 80)).filter(Boolean))].slice(0, 200);
  if (!names.length) return c.json({ error: "सेवा का नाम लिखें" }, 400);
  await runChunks(c.env.DB, names.map((n) =>
    c.env.DB.prepare("INSERT OR IGNORE INTO services (category_id,name) VALUES (?,?)").bind(id, n)));
  await audit(c.env.DB, c.get("user").id, "services_add", `${id}:${names.length}`);
  return c.json({ ok: true, added: names.length });
});
app.put("/api/admin/services/:id", ...admin, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const name = clean(b.name, 80);
  if (name.length < 2) return c.json({ error: "नाम लिखें" }, 400);
  try {
    await c.env.DB.prepare("UPDATE services SET name=?,active=? WHERE id=?").bind(name, b.active ? 1 : 0, Number(c.req.param("id"))).run();
  } catch { return c.json({ error: "यह सेवा पहले से है" }, 400); }
  return c.json({ ok: true });
});
// CSV import: rows = [{category, service}]. replace=true removes categories that are not in the file and have no providers.
app.post("/api/admin/import", ...admin, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const rows: { category: string; service: string }[] = (Array.isArray(b.rows) ? b.rows : []).slice(0, 3000)
    .map((r: any) => ({ category: clean(r.category, 60), service: clean(r.service, 80) }))
    .filter((r: any) => r.category);
  if (!rows.length) return c.json({ error: "फ़ाइल में कोई पंक्ति नहीं मिली" }, 400);
  const cats = [...new Set(rows.map((r) => r.category))];
  const db = c.env.DB;
  await runChunks(db, cats.map((n) =>
    db.prepare("INSERT OR IGNORE INTO categories (name,icon,sort_order) VALUES (?,'wrench',(SELECT COALESCE(MAX(sort_order),0)+1 FROM categories))").bind(n)));
  await runChunks(db, rows.filter((r) => r.service).map((r) =>
    db.prepare("INSERT OR IGNORE INTO services (category_id,name) SELECT id,? FROM categories WHERE name=?").bind(r.service, r.category)));
  let removed = 0;
  if (b.replace) {
    const { results } = await db.prepare(
      "SELECT id,name FROM categories WHERE id NOT IN (SELECT category_id FROM provider_profiles WHERE category_id IS NOT NULL)").all();
    const drop = (results as any[]).filter((r) => !cats.includes(r.name));
    await runChunks(db, drop.flatMap((r) => [
      db.prepare("DELETE FROM services WHERE category_id=?").bind(r.id),
      db.prepare("DELETE FROM categories WHERE id=?").bind(r.id)]));
    removed = drop.length;
  }
  await audit(db, c.get("user").id, "import", `${cats.length} cat, ${rows.length} rows, removed ${removed}`);
  return c.json({ ok: true, categories: cats.length, rows: rows.length, removed });
});

// admin: approvals of provider profiles
app.get("/api/admin/approvals", ...admin, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id,u.name,u.username,u.phone,u.city,p.shop_name,p.about,p.address,
            (SELECT name FROM categories WHERE id=p.category_id) category, p.updated_at
     FROM provider_profiles p JOIN users u ON u.id=p.user_id
     WHERE p.approval='pending' ORDER BY p.updated_at LIMIT 100`).all();
  return c.json({ rows: results });
});
app.post("/api/admin/approvals/:id", ...admin, async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!["approved", "rejected"].includes(b.decision)) return c.json({ error: "bad" }, 400);
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("UPDATE provider_profiles SET approval=? WHERE user_id=?").bind(b.decision, id).run();
  await audit(c.env.DB, c.get("user").id, `provider_${b.decision}`, String(id));
  return c.json({ ok: true });
});

export default app;
