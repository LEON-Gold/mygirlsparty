// Party manager: one shared panel for several admins (family). Parties, guests, to-dos, shopping and budget.
// No guest pages (owner, 2026-11-24): admins set each guest's reply themselves. Node ≥22.5 + SQLite, no packages.
import http from "node:http";
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { hash, checkPass } from "./lib/pass.mjs";
import { parseDate } from "./web/jalali.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(ROOT, "data");
const UPLOADS = path.join(DATA, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

export function openDb(file = path.join(DATA, "party.db")) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, name TEXT NOT NULL, created TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, uid INTEGER NOT NULL, exp INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, title TEXT NOT NULL, date TEXT DEFAULT '', time TEXT DEFAULT '', place TEXT DEFAULT '', address TEXT DEFAULT '',
    map TEXT DEFAULT '', cover TEXT DEFAULT '', color TEXT DEFAULT '#c2416b', invite TEXT DEFAULT '', budget INTEGER DEFAULT 0, archived INTEGER DEFAULT 0,
    created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS guests(id INTEGER PRIMARY KEY, event INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, name TEXT NOT NULL, phone TEXT DEFAULT '',
    grp TEXT DEFAULT '', adults INTEGER DEFAULT 1, kids INTEGER DEFAULT 0, status TEXT DEFAULT 'none', note TEXT DEFAULT '', by TEXT DEFAULT '', updated TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, event INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, title TEXT NOT NULL, due TEXT DEFAULT '',
    who TEXT DEFAULT '', done INTEGER DEFAULT 0, note TEXT DEFAULT '', by TEXT DEFAULT '', updated TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY, event INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, title TEXT NOT NULL, cat TEXT DEFAULT '',
    qty TEXT DEFAULT '', est INTEGER DEFAULT 0, actual INTEGER DEFAULT 0, bought INTEGER DEFAULT 0, note TEXT DEFAULT '', by TEXT DEFAULT '', updated TEXT DEFAULT (datetime('now')));`);
  // food shares (owner, 2026-11-24): amount + unit + "share among guests" on items; child share, maybe-counting and hosts on the party
  const addCol = (t, c, def) => { if (!db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };
  addCol("items", "amount", "REAL DEFAULT 0"); addCol("items", "unit", "TEXT DEFAULT ''"); addCol("items", "food", "INTEGER DEFAULT 0");
  addCol("events", "kidShare", "REAL DEFAULT 1"); addCol("events", "shareMaybe", "INTEGER DEFAULT 1"); addCol("events", "hosts", "INTEGER DEFAULT 0");
  return db;
}

// reply status of a guest, set by an admin (no RSVP pages)
export const STATUSES = ["none", "invited", "yes", "maybe", "no"];
const clean = (v, n = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const int = (v, lo = 0, hi = 1e12) => { const n = Math.round(+String(v ?? "").replace(/[٬,\s]/g, "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)) || 0); return Math.max(lo, Math.min(hi, n)); };
const dec = v => { const n = +String(v ?? "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫\/]/g, ".").replace(/[٬,\s]/g, ""); return n > 0 && n < 1e7 ? Math.round(n * 100) / 100 : 0; };
const color = v => /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : "#c2416b";
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };

function saveImage(dataUrl) {
  const m = String(dataUrl).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!m) fail(400, "عکس معتبر نیست");
  const buf = Buffer.from(m[2], "base64"); if (buf.length > 5e6) fail(400, "عکس بزرگ‌تر از ۵ مگابایت است");
  const name = crypto.randomBytes(9).toString("hex") + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  fs.writeFileSync(path.join(UPLOADS, name), buf); return "uploads/" + name;
}

// guests / tasks / items share one shape: list per party, upsert, delete
const KINDS = {
  guests: { cols: ["name", "phone", "grp", "adults", "kids", "status", "note"], read: b => ({ name: clean(b.name, 80) || fail(400, "نام مهمان لازم است"), phone: clean(b.phone, 20), grp: clean(b.grp, 30),
    adults: int(b.adults ?? 1, 0, 50), kids: int(b.kids, 0, 50), status: STATUSES.includes(b.status) ? b.status : "none", note: clean(b.note, 300) }), order: "name" },
  tasks: { cols: ["title", "due", "who", "done", "note"], read: b => ({ title: clean(b.title, 120) || fail(400, "عنوان کار لازم است"), due: b.due ? (parseDate(b.due) || fail(400, "تاریخ را مثل ۱۴۰۵/۰۹/۱۰ بنویسید")) : "",
    who: clean(b.who, 40), done: b.done ? 1 : 0, note: clean(b.note, 300) }), order: "done, CASE WHEN due='' THEN 1 ELSE 0 END, due, id" },
  items: { cols: ["title", "cat", "qty", "est", "actual", "bought", "note", "amount", "unit", "food"], read: b => ({ title: clean(b.title, 120) || fail(400, "نام قلم لازم است"), cat: clean(b.cat, 30), qty: clean(b.qty, 30),
    est: int(b.est), actual: int(b.actual), bought: b.bought ? 1 : 0, note: clean(b.note, 300), amount: dec(b.amount), unit: clean(b.unit, 12), food: b.food ? 1 : 0 }), order: "bought, cat, id" },
};

export function createApp(db) {
  const tries = new Map();
  const sha = t => crypto.createHash("sha256").update(t).digest("hex");
  function needUser(req) {
    const t = (req.headers.authorization || "").replace(/^Bearer /, "");
    const s = t && db.prepare("SELECT * FROM sessions WHERE token=? AND exp>?").get(sha(t), Date.now());
    const u = s && db.prepare("SELECT * FROM users WHERE id=?").get(s.uid);
    return u || fail(401, "لطفاً دوباره وارد شوید");
  }
  const pubUser = u => ({ id: u.id, username: u.username, name: u.name, created: u.created });
  const event = id => db.prepare("SELECT * FROM events WHERE id=?").get(id) || fail(404, "جشن پیدا نشد");
  const touch = id => db.prepare("UPDATE events SET updated=datetime('now') WHERE id=?").run(id);
  const full = id => ({ event: event(id), guests: db.prepare(`SELECT * FROM guests WHERE event=? ORDER BY ${KINDS.guests.order}`).all(id),
    tasks: db.prepare(`SELECT * FROM tasks WHERE event=? ORDER BY ${KINDS.tasks.order}`).all(id), items: db.prepare(`SELECT * FROM items WHERE event=? ORDER BY ${KINDS.items.order}`).all(id) });

  const routes = {
    "POST /api/login": (req, b) => {
      const ip = req.socket.remoteAddress, t = tries.get(ip) || { n: 0, at: Date.now() };
      if (Date.now() - t.at > 15 * 60e3) { t.n = 0; t.at = Date.now(); }
      if (t.n >= 10) fail(429, "تلاش زیاد؛ ۱۵ دقیقه دیگر امتحان کنید");
      const u = db.prepare("SELECT * FROM users WHERE username=?").get(clean(b.u, 40).toLowerCase());
      if (!u || !checkPass(b.p, u.pass)) { t.n++; tries.set(ip, t); fail(401, "نام کاربری یا رمز اشتباه است"); }
      tries.delete(ip);
      const token = crypto.randomBytes(24).toString("base64url");
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(sha(token), u.id, Date.now() + 90 * 864e5);
      return { token, user: pubUser(u) };
    },
    "POST /api/logout": req => { db.prepare("DELETE FROM sessions WHERE token=?").run(sha((req.headers.authorization || "").replace(/^Bearer /, ""))); return { ok: true }; },
    "GET /api/me": req => ({ user: pubUser(needUser(req)) }),
    "POST /api/password": (req, b) => {
      const u = needUser(req);
      if (!checkPass(b.old, u.pass)) fail(400, "رمز فعلی اشتباه است");
      if (String(b.new || "").length < 6) fail(400, "رمز جدید حداقل ۶ حرف باشد");
      db.prepare("UPDATE users SET pass=? WHERE id=?").run(hash(b.new), u.id); return { ok: true };
    },
    // admins: any admin can add another family member, or remove one (not the last)
    "GET /api/admins": req => { needUser(req); return db.prepare("SELECT * FROM users ORDER BY id").all().map(pubUser); },
    "POST /api/admins": (req, b) => {
      needUser(req);
      const username = clean(b.username, 30).toLowerCase();
      if (!/^[a-z0-9_.]{3,30}$/.test(username)) fail(400, "نام کاربری: ۳ تا ۳۰ حرف انگلیسی یا عدد");
      const name = clean(b.name, 40) || fail(400, "نام لازم است");
      const dup = db.prepare("SELECT id FROM users WHERE username=?").get(username);
      if (dup && dup.id !== +b.id) fail(400, "این نام کاربری گرفته شده");
      if (b.id) {
        db.prepare("UPDATE users SET username=?, name=? WHERE id=?").run(username, name, +b.id);
        if (b.password) { if (String(b.password).length < 6) fail(400, "رمز حداقل ۶ حرف"); db.prepare("UPDATE users SET pass=? WHERE id=?").run(hash(b.password), +b.id); db.prepare("DELETE FROM sessions WHERE uid=?").run(+b.id); }
      } else {
        if (String(b.password || "").length < 6) fail(400, "رمز حداقل ۶ حرف");
        b.id = db.prepare("INSERT INTO users(username,pass,name) VALUES(?,?,?)").run(username, hash(b.password), name).lastInsertRowid;
      }
      return pubUser(db.prepare("SELECT * FROM users WHERE id=?").get(b.id));
    },
    "POST /api/admins/:id/delete": (req, b, id) => {
      const me = needUser(req);
      if (id === me.id) fail(400, "حساب خودتان را نمی‌توانید حذف کنید");
      if (db.prepare("SELECT COUNT(*) n FROM users").get().n <= 1) fail(400, "حداقل یک ادمین لازم است");
      db.prepare("DELETE FROM sessions WHERE uid=?").run(id); db.prepare("DELETE FROM users WHERE id=?").run(id); return { ok: true };
    },

    // parties: list with small counts for the cards
    "GET /api/events": req => {
      needUser(req);
      return db.prepare("SELECT * FROM events ORDER BY archived, CASE WHEN date='' THEN 1 ELSE 0 END, date").all().map(e => ({ ...e,
        coming: db.prepare("SELECT COALESCE(SUM(adults+kids),0) n FROM guests WHERE event=? AND status='yes'").get(e.id).n,
        guests: db.prepare("SELECT COUNT(*) n FROM guests WHERE event=?").get(e.id).n,
        tasksLeft: db.prepare("SELECT COUNT(*) n FROM tasks WHERE event=? AND done=0").get(e.id).n }));
    },
    "POST /api/events": (req, b) => {
      needUser(req);
      const f = { title: clean(b.title, 80) || fail(400, "عنوان جشن لازم است"), date: b.date ? (parseDate(b.date) || fail(400, "تاریخ را مثل ۱۴۰۵/۱۰/۰۵ بنویسید")) : "",
        time: clean(b.time, 20), place: clean(b.place, 80), address: clean(b.address, 300), map: /^https?:\/\//.test(String(b.map || "")) ? String(b.map).slice(0, 500) : "",
        cover: String(b.cover || "").startsWith("uploads/") ? String(b.cover) : "", color: color(b.color), invite: String(b.invite || "").slice(0, 2000), budget: int(b.budget), archived: b.archived ? 1 : 0,
        kidShare: [1, 0.5, 0.33, 0].includes(+b.kidShare) ? +b.kidShare : 1, shareMaybe: b.shareMaybe === false || b.shareMaybe === 0 ? 0 : 1, hosts: int(b.hosts, 0, 50) };
      const cols = Object.keys(f);
      if (b.id) { event(+b.id); db.prepare(`UPDATE events SET ${cols.map(c => c + "=?").join(",")}, updated=datetime('now') WHERE id=?`).run(...Object.values(f), +b.id); }
      else b.id = db.prepare(`INSERT INTO events(${cols}) VALUES(${cols.map(() => "?")})`).run(...Object.values(f)).lastInsertRowid;
      return event(+b.id);
    },
    "POST /api/events/:id/delete": (req, b, id) => { needUser(req); event(id); db.prepare("DELETE FROM events WHERE id=?").run(id); return { ok: true }; },
    "GET /api/events/:id": (req, b, id) => { needUser(req); return full(id); },
    // cheap check so other admins' edits show up without reloading everything
    "GET /api/events/:id/stamp": (req, b, id) => { needUser(req); return { updated: event(id).updated }; },
    "POST /api/upload": (req, b) => { needUser(req); return { url: saveImage(b.data) }; },
  };
  for (const [kind, K] of Object.entries(KINDS)) {
    routes[`POST /api/events/:id/${kind}`] = (req, b, id) => {
      const u = needUser(req); event(id);
      const f = K.read(b), cols = K.cols;
      if (b.id) {
        const r = db.prepare(`UPDATE ${kind} SET ${cols.map(c => c + "=?").join(",")}, by=?, updated=datetime('now') WHERE id=? AND event=?`).run(...cols.map(c => f[c]), u.name, +b.id, id);
        if (!r.changes) fail(404, "پیدا نشد");
      } else b.id = db.prepare(`INSERT INTO ${kind}(event,${cols},by) VALUES(?,${cols.map(() => "?")},?)`).run(id, ...cols.map(c => f[c]), u.name).lastInsertRowid;
      touch(id);
      return db.prepare(`SELECT * FROM ${kind} WHERE id=?`).get(+b.id);
    };
    routes[`POST /api/${kind}/:id/delete`] = (req, b, id) => {
      needUser(req); const row = db.prepare(`SELECT event FROM ${kind} WHERE id=?`).get(id);
      if (row) { db.prepare(`DELETE FROM ${kind} WHERE id=?`).run(id); touch(row.event); }
      return { ok: true };
    };
  }

  return async function handle(req, res) {
    const url = new URL(req.url, "http://x");
    const gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    try {
      if (url.pathname.startsWith("/api/")) {
        let key = req.method + " " + url.pathname, id = null;
        if (!routes[key]) { const m = url.pathname.match(/^(.*\/)(\d+)(\/[a-z]+)?$/); if (m) { key = req.method + " " + m[1] + ":id" + (m[3] || ""); id = +m[2]; } }
        const fn = routes[key] || fail(404, "پیدا نشد");
        let body = {};
        if (req.method === "POST") {
          const chunks = []; let size = 0;
          for await (const c of req) { size += c.length; if (size > 12e6) fail(413, "فایل خیلی بزرگ است"); chunks.push(c); }
          body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
        }
        const json = JSON.stringify(await fn(req, body, id)), z = gz && json.length > 1400;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", Vary: "Accept-Encoding", ...(z ? { "Content-Encoding": "gzip" } : {}) });
        return res.end(z ? zlib.gzipSync(json) : json);
      }
      let p = decodeURIComponent(url.pathname), file;
      if (p.startsWith("/uploads/")) file = path.join(UPLOADS, path.basename(p));
      else {
        if (p.endsWith("/")) p += "index.html";
        file = path.join(ROOT, "web", path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
        if (!file.startsWith(path.join(ROOT, "web"))) fail(403, "no");
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(404, "پیدا نشد");
      const ext = path.extname(file).toLowerCase(), text = [".html", ".js", ".css", ".json", ".webmanifest", ".svg"].includes(ext), z = gz && text;
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": text ? "no-cache" : "public, max-age=86400", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex", Vary: "Accept-Encoding", ...(z ? { "Content-Encoding": "gzip" } : {}) });
      const s = fs.createReadStream(file); (z ? s.pipe(zlib.createGzip()) : s).pipe(res);
    } catch (e) {
      const status = e.status || (e instanceof SyntaxError ? 400 : 500);
      if (status === 500) console.error(e);
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: status === 500 ? "خطای سرور" : e.message }));
    }
  };
}

export function ensureAdmin(db) {
  if (db.prepare("SELECT 1 FROM users").get()) return null;
  const pass = process.env.ADMIN_PASS || crypto.randomBytes(6).toString("base64url");
  db.prepare("INSERT INTO users(username,pass,name) VALUES('admin',?,?)").run(hash(pass), "مدیر");
  return pass;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb(), p = ensureAdmin(db);
  if (p) console.log(`admin account → username: admin  password: ${p}`);
  if (process.argv.includes("--demo")) (await import("./tools/demo.mjs")).seed(db);
  const port = +process.env.PORT || 3500;
  http.createServer(createApp(db)).listen(port, () => console.log(`party app on http://localhost:${port}`));
}
