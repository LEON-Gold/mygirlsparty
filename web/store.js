// GitHub mode (owner, 2026-11-24): no server. All data is one JSON file on the `data` branch of the GitHub repo;
// every device reads it and writes it back through the GitHub API with a token that lives only on the devices
// (never in the repo). Same /api routes as server.mjs, so app.js doesn't change. Devices register themselves;
// each change is logged so GitHub Actions can push a notification to the other admins.
import { parseDate } from "./jalali.js";

export const CFG = { owner: "LEON-Gold", repo: "mygirlsparty", branch: "data", file: "data/party.json",
  vapid: "BJ8k1oGpQ4dLZUUIrdDsNXezUyzX6-eZ2ZqsXMoYeNJng1ZFQehoD-_UaLIXdwWNUapYOtxz9big3lnLstGu3zo" };
const API = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/`;
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
export const gh = { token: () => ls.get("party.gh") || "", setToken: t => ls.set("party.gh", t), device: () => ls.get("party.device") || (ls.set("party.device", crypto.randomUUID()), ls.get("party.device")) };
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };

// ---------- GitHub file I/O ----------
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
const headers = () => ({ Accept: "application/vnd.github+json", ...(gh.token() ? { Authorization: "Bearer " + gh.token() } : {}) });
let doc = null, sha = null, etag = null, loadedAt = 0;
async function fetchDoc(force) {
  const r = await fetch(`${API}${CFG.file}?ref=${CFG.branch}`, { headers: { ...headers(), ...(etag && !force ? { "If-None-Match": etag } : {}) }, cache: "no-store" });
  if (r.status === 304) { loadedAt = Date.now(); return false; }
  if (r.status === 401 || r.status === 403) fail(401, "کلید گیت‌هاب این دستگاه معتبر نیست");
  if (r.status === 404) { doc = emptyDoc(); sha = null; etag = null; loadedAt = Date.now(); return true; }
  if (!r.ok) fail(503, "گیت‌هاب در دسترس نیست؛ اینترنت را بررسی کنید");
  const j = await r.json(); doc = JSON.parse(unb64(j.content)); sha = j.sha; etag = r.headers.get("ETag"); loadedAt = Date.now(); return true;
}
async function putFile(path, contentB64, message, prevSha) {
  const r = await fetch(API + path, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message, content: contentB64, branch: CFG.branch, ...(prevSha ? { sha: prevSha } : {}) }) });
  if (r.status === 409 || r.status === 422) return null; // someone else saved first
  if (r.status === 401 || r.status === 403 || r.status === 404) fail(401, "کلید گیت‌هاب اجازهٔ نوشتن ندارد");
  if (!r.ok) fail(503, "ذخیره در گیت‌هاب نشد؛ دوباره امتحان کنید");
  return r.json();
}
const emptyDoc = () => ({ v: 1, seq: { users: 0, events: 0, guests: 0, tasks: 0, items: 0 }, users: [], events: [], guests: [], tasks: [], items: [], devices: [], push: {}, log: [], updated: "" });
const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

// apply a change to the latest copy and save; if another admin saved in between, reload and apply again
async function mutate(fn, text) {
  for (let i = 0; i < 5; i++) {
    if (!doc || i) await fetchDoc(true);
    const next = structuredClone(doc), out = fn(next);
    next.updated = now();
    if (text) { next.log = [...(next.log || []), { at: new Date().toISOString(), by: me()?.name || "", device: gh.device(), text }].slice(-60); }
    const r = await putFile(CFG.file, b64(JSON.stringify(next)), text || "update", sha);
    if (r) { doc = next; sha = r.content.sha; etag = null; return out; }
  }
  fail(409, "هم‌زمان چند نفر ذخیره کردند؛ دوباره امتحان کنید");
}
const ensure = async () => { if (!doc || Date.now() - loadedAt > 15000) await fetchDoc(); };

// ---------- passwords (PBKDF2, browser-native) ----------
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function pbkdf2(pass, saltHex, iter = 150000) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pass)), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16))), iterations: iter }, key, 256));
}
export async function hashPass(p) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); return `pbkdf2$150000$${salt}$${await pbkdf2(p, salt)}`; }
async function checkPass(p, h) { const [, it, salt, k] = String(h).split("$"); return !!k && (await pbkdf2(p, salt, +it)) === k; }

// ---------- session on this device ----------
const me = () => { const id = +ls.get("party.user"); return doc?.users.find(u => u.id === id) || null; };
const needUser = () => { const u = me(); if (!u || !gh.token()) fail(401, "لطفاً دوباره وارد شوید"); if (doc.devices.find(d => d.id === gh.device())?.revoked) { logoutHere(); fail(401, "این دستگاه از فهرست حذف شده"); } return u; };
function logoutHere() { ls.set("party.user", null); }
const pubUser = u => ({ id: u.id, username: u.username, name: u.name, created: u.created });
function deviceLabel() {
  const ua = navigator.userAgent;
  const dev = /iPhone/.test(ua) ? "آیفون" : /iPad/.test(ua) ? "آیپد" : /Android/.test(ua) ? "اندروید" : /Mac OS X/.test(ua) ? "مک" : /Windows/.test(ua) ? "ویندوز" : "دستگاه";
  const br = /CriOS|Chrome/.test(ua) && !/Edg/.test(ua) ? "کروم" : /Safari/.test(ua) ? "سافاری" : /Firefox/.test(ua) ? "فایرفاکس" : /Edg/.test(ua) ? "اج" : "";
  return [dev, br, matchMedia("(display-mode: standalone)").matches ? "اپ نصب‌شده" : ""].filter(Boolean).join(" · ");
}
async function touchDevice(u) {
  const d = doc.devices.find(x => x.id === gh.device());
  if (d && d.user === u.id && Date.now() - Date.parse(d.last) < 10 * 60e3) return;
  await mutate(x => { let e = x.devices.find(y => y.id === gh.device()); if (!e) x.devices.push(e = { id: gh.device(), first: new Date().toISOString() }); Object.assign(e, { user: u.id, name: u.name, label: deviceLabel(), last: new Date().toISOString() }); });
}

// ---------- validation (same rules as server.mjs) ----------
const clean = (v, n = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const int = (v, lo = 0, hi = 1e12) => { const n = Math.round(+String(v ?? "").replace(/[٬,\s]/g, "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)) || 0); return Math.max(lo, Math.min(hi, n)); };
const dec = v => { const n = +String(v ?? "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫/]/g, ".").replace(/[٬,\s]/g, ""); return n > 0 && n < 1e7 ? Math.round(n * 100) / 100 : 0; };
const STATUSES = ["none", "invited", "yes", "maybe", "no"];
const KINDS = {
  guests: { label: "مهمان", read: b => ({ name: clean(b.name, 80) || fail(400, "نام مهمان لازم است"), phone: clean(b.phone, 20), grp: clean(b.grp, 30), adults: int(b.adults ?? 1, 0, 50), kids: int(b.kids, 0, 50), status: STATUSES.includes(b.status) ? b.status : "none", note: clean(b.note, 300) }),
    sort: (a, b) => a.name.localeCompare(b.name, "fa"), say: (o, n) => !o ? `مهمان تازه: ${n.name}` : o.status !== n.status ? `${n.name}: ${({ yes: "می‌آید", maybe: "شاید", no: "نمی‌آید", invited: "دعوت شد", none: "بی‌جواب" })[n.status]}` : `مهمان ${n.name} ویرایش شد` },
  tasks: { label: "کار", read: b => ({ title: clean(b.title, 120) || fail(400, "عنوان کار لازم است"), due: b.due ? (parseDate(b.due) || fail(400, "تاریخ را مثل ۱۴۰۵/۰۹/۱۰ بنویسید")) : "", who: clean(b.who, 40), done: b.done ? 1 : 0, note: clean(b.note, 300) }),
    sort: (a, b) => a.done - b.done || (!a.due) - (!b.due) || (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id - b.id), say: (o, n) => !o ? `کار تازه: ${n.title}` : !o.done && n.done ? `انجام شد: ${n.title}` : `کار «${n.title}» ویرایش شد` },
  items: { label: "خرید", read: b => ({ title: clean(b.title, 120) || fail(400, "نام قلم لازم است"), cat: clean(b.cat, 30), qty: clean(b.qty, 30), est: int(b.est), actual: int(b.actual), bought: b.bought ? 1 : 0, note: clean(b.note, 300), amount: dec(b.amount), unit: clean(b.unit, 12), food: b.food ? 1 : 0 }),
    sort: (a, b) => a.bought - b.bought || (a.cat || "").localeCompare(b.cat || "", "fa") || a.id - b.id, say: (o, n) => !o ? `خرید تازه: ${n.title}` : !o.bought && n.bought ? `خریده شد: ${n.title}` : `«${n.title}» ویرایش شد` },
};
const eventOf = (d, id) => d.events.find(e => e.id === id) || fail(404, "جشن پیدا نشد");

// ---------- routes ----------
const R = {
  "POST /api/login": async b => {
    await fetchDoc(true);
    const u = doc.users.find(x => x.username === clean(b.u, 40).toLowerCase());
    if (!u || !(await checkPass(b.p, u.pass))) fail(401, "نام کاربری یا رمز اشتباه است");
    const d = doc.devices.find(x => x.id === gh.device()); if (d?.revoked) await mutate(x => { x.devices.find(y => y.id === gh.device()).revoked = false; });
    ls.set("party.user", String(u.id)); await touchDevice(u);
    return { token: "gh", user: pubUser(u) };
  },
  "POST /api/logout": () => { logoutHere(); return { ok: true }; },
  "GET /api/me": async () => { await ensure(); const u = needUser(); touchDevice(u).catch(() => {}); return { user: pubUser(u) }; },
  "POST /api/password": async b => {
    await ensure(); const u = needUser();
    if (!(await checkPass(b.old, u.pass))) fail(400, "رمز فعلی اشتباه است");
    if (String(b.new || "").length < 6) fail(400, "رمز جدید حداقل ۶ حرف باشد");
    const h = await hashPass(b.new); await mutate(x => { x.users.find(y => y.id === u.id).pass = h; }); return { ok: true };
  },
  "GET /api/admins": async () => { await ensure(); needUser(); return doc.users.map(pubUser); },
  "POST /api/admins": async b => {
    await ensure(); needUser();
    const username = clean(b.username, 30).toLowerCase(); if (!/^[a-z0-9_.]{3,30}$/.test(username)) fail(400, "نام کاربری: ۳ تا ۳۰ حرف انگلیسی یا عدد");
    const name = clean(b.name, 40) || fail(400, "نام لازم است");
    if (doc.users.some(u => u.username === username && u.id !== +b.id)) fail(400, "این نام کاربری گرفته شده");
    if (!b.id && String(b.password || "").length < 6) fail(400, "رمز حداقل ۶ حرف");
    const h = b.password ? await hashPass(b.password) : null;
    return pubUser(await mutate(x => { let u = b.id ? x.users.find(y => y.id === +b.id) : null; if (u) { Object.assign(u, { username, name }); if (h) u.pass = h; } else x.users.push(u = { id: ++x.seq.users, username, name, pass: h, created: now() }); return u; }, b.id ? "" : `ادمین تازه: ${name}`));
  },
  "POST /api/admins/:id/delete": async (b, id) => {
    await ensure(); const u = needUser();
    if (id === u.id) fail(400, "حساب خودتان را نمی‌توانید حذف کنید"); if (doc.users.length <= 1) fail(400, "حداقل یک ادمین لازم است");
    await mutate(x => { x.users = x.users.filter(y => y.id !== id); x.devices.filter(d => d.user === id).forEach(d => d.revoked = true); }); return { ok: true };
  },
  // devices that have logged in (owner, 2026-11-24)
  "GET /api/devices": async () => { await ensure(); needUser(); return doc.devices.map(d => ({ ...d, me: d.id === gh.device(), push: !!doc.push[d.id] })).sort((a, b) => (b.last || "").localeCompare(a.last || "")); },
  "POST /api/devices/remove": async b => { await ensure(); needUser(); await mutate(x => { const d = x.devices.find(y => y.id === b.id); if (d) d.revoked = true; delete x.push[b.id]; }); return { ok: true }; },
  "POST /api/push": async b => { await ensure(); needUser(); await mutate(x => { if (b.sub) x.push[gh.device()] = b.sub; else delete x.push[gh.device()]; }); return { ok: true }; },

  "GET /api/events": async () => {
    await ensure(); needUser();
    return [...doc.events].sort((a, b) => a.archived - b.archived || (!a.date) - (!b.date) || (a.date < b.date ? -1 : 1)).map(e => ({ ...e,
      coming: doc.guests.filter(g => g.event === e.id && g.status === "yes").reduce((a, g) => a + g.adults + g.kids, 0), guests: doc.guests.filter(g => g.event === e.id).length, tasksLeft: doc.tasks.filter(t => t.event === e.id && !t.done).length }));
  },
  "POST /api/events": async b => {
    await ensure(); needUser();
    const f = { title: clean(b.title, 80) || fail(400, "عنوان جشن لازم است"), date: b.date ? (parseDate(b.date) || fail(400, "تاریخ را مثل ۱۴۰۵/۱۰/۰۵ بنویسید")) : "", time: clean(b.time, 20), place: clean(b.place, 80), address: clean(b.address, 300),
      map: /^https?:\/\//.test(String(b.map || "")) ? String(b.map).slice(0, 500) : "", cover: /^https:\/\/raw\.githubusercontent\.com\//.test(String(b.cover || "")) ? String(b.cover) : "", color: /^#[0-9a-f]{6}$/i.test(String(b.color)) ? b.color : "#c2416b",
      invite: String(b.invite || "").slice(0, 2000), budget: int(b.budget), archived: b.archived ? 1 : 0, kidShare: [1, 0.5, 0.33].includes(+b.kidShare) ? +b.kidShare : 1, shareMaybe: b.shareMaybe === false ? 0 : 1, hosts: int(b.hosts, 0, 50) };
    return mutate(x => { let e = b.id ? eventOf(x, +b.id) : null; if (e) Object.assign(e, f, { updated: now() }); else x.events.push(e = { id: ++x.seq.events, ...f, created: now(), updated: now() }); return e; }, b.id ? `جشن «${f.title}» ویرایش شد` : `جشن تازه: ${f.title}`);
  },
  "POST /api/events/:id/delete": async (b, id) => { await ensure(); needUser(); const t = eventOf(doc, id).title; await mutate(x => { for (const k of ["events"]) x[k] = x[k].filter(e => e.id !== id); for (const k of Object.keys(KINDS)) x[k] = x[k].filter(r => r.event !== id); }, `جشن «${t}» حذف شد`); return { ok: true }; },
  "GET /api/events/:id": async (b, id) => { await ensure(); needUser(); const ev = eventOf(doc, id); return { event: ev, ...Object.fromEntries(Object.entries(KINDS).map(([k, K]) => [k, doc[k].filter(r => r.event === id).sort(K.sort)])) }; },
  "GET /api/events/:id/stamp": async (b, id) => { await fetchDoc(); needUser(); return { updated: eventOf(doc, id).updated }; },
  "POST /api/upload": async b => {
    needUser(); const m = String(b.data).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); if (!m) fail(400, "عکس معتبر نیست");
    const path = `uploads/${crypto.randomUUID().slice(0, 12)}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    await putFile(path, m[2], "photo", null);
    return { url: `https://raw.githubusercontent.com/${CFG.owner}/${CFG.repo}/${CFG.branch}/${path}` };
  },
};
for (const [kind, K] of Object.entries(KINDS)) {
  R[`POST /api/events/:id/${kind}`] = async (b, id) => {
    await ensure(); const u = needUser(); eventOf(doc, id); const f = K.read(b);
    const old = b.id ? doc[kind].find(r => r.id === +b.id) : null;
    return mutate(x => { eventOf(x, id).updated = now(); let r = b.id ? x[kind].find(y => y.id === +b.id && y.event === id) : null;
      if (b.id && !r) fail(404, "پیدا نشد"); if (r) Object.assign(r, f, { by: u.name, updated: now() }); else x[kind].push(r = { id: ++x.seq[kind], event: id, ...f, by: u.name, updated: now() }); return r; }, K.say(old, f));
  };
  R[`POST /api/${kind}/:id/delete`] = async (b, id) => {
    await ensure(); needUser(); const r = doc[kind].find(y => y.id === id); if (!r) return { ok: true };
    await mutate(x => { x[kind] = x[kind].filter(y => y.id !== id); const e = x.events.find(e => e.id === r.event); if (e) e.updated = now(); }, `${K.label} «${r.name || r.title}» حذف شد`); return { ok: true };
  };
}

export async function ghApi(method, path, body) {
  const u = new URL(path, "http://x");
  let key = method + " " + u.pathname, id = null;
  if (!R[key]) { const m = u.pathname.match(/^(.*\/)(\d+)(\/[a-z]+)?$/); if (m) { key = method + " " + m[1] + ":id" + (m[3] || ""); id = +m[2]; } }
  const fn = R[key] || fail(404, "پیدا نشد");
  return JSON.parse(JSON.stringify(await fn(body || {}, id)));
}
// first-time check of a token typed on this device
export async function testToken(t) {
  const r = await fetch(`https://api.github.com/repos/${CFG.owner}/${CFG.repo}`, { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + t } });
  if (!r.ok) return "این کلید کار نمی‌کند";
  const j = await r.json(); if (!j.permissions?.push) return "این کلید اجازهٔ نوشتن در ریپو را ندارد";
  return "";
}
