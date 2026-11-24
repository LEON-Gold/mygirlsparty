// Party manager panel (admins only). Parties → summary, guests, to-dos, shopping, party settings.
import { jalaliText } from "./jalali.js";
import { computeShares, UNITS } from "./share.js?v=2";

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("fa-IR"), fa = n => nf.format(n || 0);
const faDigits = s => String(s ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const latin = s => String(s ?? "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const num = v => +latin(v).replace(/[٬,\s]/g, "") || 0;
const faDate = (iso, long = true) => iso ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")) : "";
const jIn = iso => iso ? faDigits(jalaliText(iso)) : "";
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const daysTo = iso => iso ? Math.round((Date.parse(iso) - Date.parse(today())) / 864e5) : null;
const toman = n => fa(n) + " تومان";
const amt = (n, unit) => `${fa(n)} ${unit || ""}`.trim();
const IC = {
  plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="M9 6l6 6-6 6"/>', users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M16 14.6c2.6.2 4.3 2 4.9 4.9"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>', phone: '<path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
  chat: '<path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.6 19z"/><path d="M9 10.5c.5 1.6 2 3 3.6 3.6l1.3-1 1.9.9"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>', share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14.5h2"/>', list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
  cake: '<path d="M4 20h16v-6.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 13.5z"/><path d="M4 15.5c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0M12 11V8M12 5.5c.8-.6.8-1.6 0-2.5-.8.9-.8 1.9 0 2.5z"/>',
  yes: '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/>', maybe: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.4v.4M12 16.6v.1"/>',
  wait: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l2.8 1.8"/>', no: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>', out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  userplus: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c.8-3.6 3.2-5.6 6-5.6 1.2 0 2.3.3 3.2 1M18 13v6M15 16h6"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M9.5 9.5v10"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  party: '<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 6l-2 1M20 11l-2-.5M11 3.5l.5 2"/>',
};
const ic = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
// a little confetti when something gets done: a few dots, transform + opacity only, gone in 0.8 s
function confetti(el) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !el) return;
  const r = el.getBoundingClientRect(), box = document.createElement("div"); box.className = "confetti"; box.style.left = r.left + r.width / 2 + "px"; box.style.top = r.top + r.height / 2 + "px";
  const colors = ["var(--accent)", "#f5b942", "#5cc7a0", "#7aa7ff", "#ff8fb1"];
  for (let i = 0; i < 14; i++) { const d = document.createElement("i"), a = (i / 14) * Math.PI * 2, dist = 26 + Math.random() * 26;
    d.style.cssText = `--x:${Math.cos(a) * dist}px;--y:${Math.sin(a) * dist - 12}px;--r:${Math.random() * 360}deg;background:${colors[i % colors.length]};animation-delay:${Math.random() * 60}ms`; box.append(d); }
  document.body.append(box); setTimeout(() => box.remove(), 900);
}
const theme = { get: () => { try { return localStorage.getItem("party.theme") || "light"; } catch { return "light"; } },
  set: t => { try { localStorage.setItem("party.theme", t); } catch {} document.documentElement.dataset.theme = t; $("meta[name=theme-color]")?.setAttribute("content", t === "dark" ? "#1d1424" : "#fff7f3"); } };
const FOOD_CATS = ["خوراکی", "کیک", "پذیرایی", "نوشیدنی", "میوه", "شیرینی", "غذا"];
const shares = () => computeShares(S.data.guests, S.data.items, S.ev);

const KEY = "party.token";
const token = { get: () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } }, set: t => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {} } };
async function api(path, body) {
  const r = await fetch(path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token.get() ? { Authorization: "Bearer " + token.get() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 401 && path !== "/api/login") { token.set(""); location.reload(); }
  if (!r.ok) throw new Error(d.error || "ارتباط با سرور برقرار نشد");
  return d;
}
function toast(msg, bad) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); clearTimeout(t._h); t._h = setTimeout(() => t.className = "toast", 2800);
}
function dialog(html, onOk) {
  const d = document.createElement("dialog"); d.innerHTML = `<form method="dialog" novalidate>${html}</form>`;
  document.body.append(d); d.showModal(); d.onclose = () => d.remove();
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  $("form", d).onsubmit = async e => {
    const b = e.submitter; if (!b || b.value !== "ok") return;
    e.preventDefault(); b.disabled = true;
    try { if ((await onOk($("form", d), b)) !== false) d.close(); } catch (err) { toast(err.message, true); } finally { b.disabled = false; }
  };
  return d;
}
const foot = (extra = "") => `<div class="dlg-foot"><button class="btn primary" value="ok">ذخیره</button>${extra}<button class="btn ghost" value="x" formnovalidate>انصراف</button></div>`;
function shrink(file, max = 1600) {
  return new Promise((ok, bad) => { const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL("image/jpeg", .85)); };
    img.onerror = () => bad(new Error("عکس باز نشد")); img.src = u; });
}
// numbers roll up from ۰ when a screen opens (same feel as the owner liked in SAM)
function countUp(root) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const els = $$("[data-count]", root); if (!els.length) return;
  const t0 = performance.now(), dur = 850, ease = t => 1 - Math.pow(1 - t, 4);
  const step = now => { const t = Math.min(1, (now - t0) / dur); for (const el of els) { const v = +el.dataset.count; el.textContent = fa(Math.round(v * ease(t))); } if (t < 1) requestAnimationFrame(step); };
  for (const el of els) el.textContent = fa(0); requestAnimationFrame(step);
}
const cnt = n => `<span class="num" data-count="${Math.round(n) || 0}">${fa(n)}</span>`;
const replay = (el, c = "enter") => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };

// ---------- state ----------
const S = { me: null, events: [], ev: null, data: null, tab: "sum", gFilter: "all", gq: "", tFilter: "open", stamp: "" };
const app = $("#app");
const STATUS = { yes: "می‌آید", maybe: "شاید", no: "نمی‌آید", invited: "دعوت شد", none: "هنوز نه" };
const STATUS_BTNS = ["invited", "yes", "maybe", "no"];
const COLORS = ["#c2416b", "#e0794a", "#d4a017", "#3f9a6b", "#2f7fb8", "#6a4fc7", "#a3478f", "#3c3c46"];
const ICON = {
  sum: '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  guests: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M16 14.6c2.6.2 4.3 2 4.9 4.9"/>',
  tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
  shop: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  party: '<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 6l-2 1M20 11l-2-.5M11 3.5l.5 2"/>',
};
const TABS = [["sum", "خلاصه"], ["guests", "مهمان‌ها"], ["tasks", "کارها"], ["shop", "خرید"], ["party", "جشن"]];
const setAccent = c => document.documentElement.style.setProperty("--accent", c || "#c2416b");

// ---------- login ----------
function loginView(msg = "") {
  setAccent();
  app.innerHTML = `<div class="login"><form class="card" id="lf" novalidate>
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--soft)"/><path d="M20 46l8-22 14 14z" fill="var(--accent)"/><circle cx="44" cy="18" r="3" fill="var(--accent)"/><circle cx="50" cy="30" r="2" fill="var(--accent)" opacity=".6"/><circle cx="34" cy="14" r="2" fill="var(--accent)" opacity=".6"/></svg>
    <h1>مدیریت جشن</h1><p>مهمان‌ها، کارها و خرید، در یک جا</p>
    <label class="field"><span>نام کاربری</span><input name="u" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" dir="ltr" required></label>
    <label class="field"><span>رمز</span><input name="p" type="password" autocomplete="current-password" dir="ltr" required></label>
    <div class="err" role="alert">${esc(msg)}</div><button class="btn primary" style="width:100%">ورود</button></form></div>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try { const r = await api("/api/login", { u: latin(f.u.value), p: latin(f.p.value) }); token.set(r.token); boot(); } catch (err) { $(".err", f).textContent = err.message; }
  };
}

// ---------- parties list ----------
async function listView() {
  S.ev = null; S.data = null; setAccent(); history.replaceState(null, "", "#");
  app.innerHTML = `<header class="top"><h1>جشن‌ها</h1><button class="btn sm ghost" type="button" id="adm">${ic("users")}ادمین‌ها</button></header><main id="main" class="enter"><p class="empty">…</p></main>`;
  $("#adm").onclick = adminsView;
  S.events = await api("/api/events");
  const m = $("#main");
  m.innerHTML = `<div class="parties stagger">${S.events.map((e, i) => { const d = daysTo(e.date);
      return `<button class="party" type="button" data-e="${e.id}" style="--i:${i};--c:${esc(e.color)}"><div class="band" style="${e.cover ? `background-image:url('${esc(e.cover)}')` : ""}">
        <span class="days">${d == null ? "تاریخ ندارد" : d > 0 ? fa(d) + " روز مانده" : d === 0 ? "امروز!" : "برگزار شد"}</span></div>
        <div class="b"><h2>${esc(e.title)}</h2><div class="meta">${e.date ? `<span>${ic("cal")}${faDate(e.date)}</span>` : ""}<span>${ic("users")}${fa(e.coming)} نفر می‌آیند</span><span>${ic("list")}${fa(e.tasksLeft)} کار مانده</span></div></div></button>`; }).join("")}</div>
    ${S.events.length ? "" : `<div class="empty">${ic("party", "big")}<p>هنوز جشنی نساخته‌اید.<br>با «جشن جدید» شروع کنید.</p></div>`}
    <button class="fab" type="button" id="new">${ic("plus")}جشن جدید</button>`;
  $$("[data-e]", m).forEach(b => b.onclick = () => openEvent(+b.dataset.e));
  $("#new").onclick = () => editEvent({ title: "", color: COLORS[0] });
}

// ---------- one party ----------
async function openEvent(id, tab) {
  S.data = await api(`/api/events/${id}`); S.ev = S.data.event; S.stamp = S.ev.updated; setAccent(S.ev.color);
  app.innerHTML = `<header class="top"><button class="btn icon ghost" type="button" id="back" aria-label="همهٔ جشن‌ها">${ic("back")}</button><h1>${esc(S.ev.title)}</h1></header>
    <main id="main"></main>
    <nav class="tabs" aria-label="بخش‌ها">${TABS.map(([k, t]) => `<button type="button" data-tab="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${t}</button>`).join("")}</nav>`;
  $("#back").onclick = listView;
  $$(".tabs button").forEach(b => b.onclick = () => go(b.dataset.tab));
  go(tab || location.hash.split("/")[1] || "sum");
}
function go(tab) {
  if (!VIEWS[tab]) tab = "sum";
  S.tab = tab; history.replaceState(null, "", `#${S.ev.id}/${tab}`);
  $$(".tabs button").forEach(b => b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  render(true);
}
function render(fresh) {
  const m = $("#main"); if (!m || !S.data) return;
  VIEWS[S.tab](m);
  if (fresh) { replay(m); countUp(m); window.scrollTo(0, 0); }
}
async function reload() { S.data = await api(`/api/events/${S.ev.id}`); S.ev = S.data.event; S.stamp = S.ev.updated; render(false); }
const people = g => (g.adults || 0) + (g.kids || 0);

const VIEWS = {};
VIEWS.sum = m => {
  const { event: e, guests, tasks, items } = S.data, d = daysTo(e.date);
  const by = s => guests.filter(g => g.status === s);
  const head = s => by(s).reduce((a, g) => a + people(g), 0);
  const est = items.reduce((a, i) => a + i.est, 0), spent = items.reduce((a, i) => a + (i.actual || (i.bought ? i.est : 0)), 0);
  const doneN = tasks.filter(t => t.done).length, next = tasks.filter(t => !t.done).slice(0, 3);
  const pct = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
  m.innerHTML = `<section class="hero" style="${e.cover ? `background-image:url('${esc(e.cover)}')` : ""}">
      ${d == null ? `<div class="big" style="font-size:26px">تاریخ جشن را در «جشن» بزنید</div>` : d > 0 ? `<div><span class="big">${cnt(d)}</span> <span class="unit">روز تا جشن</span></div>` : d === 0 ? `<div class="big">امروز!</div>` : `<div class="big" style="font-size:30px">برگزار شد</div>`}
      <div class="when">${e.date ? `<span>${ic("cal")}<b>${faDate(e.date)}</b></span>` : ""}${e.time ? `<span>${ic("clock")}ساعت ${esc(faDigits(e.time))}</span>` : ""}${e.place ? `<span>${ic("pin")}${esc(e.place)}</span>` : ""}</div></section>
    <div class="tiles">
      <button class="tile yes" type="button" data-go="yes">${ic("yes")}<b>${cnt(head("yes"))}</b><span>نفر می‌آیند</span></button>
      <button class="tile maybe" type="button" data-go="maybe">${ic("maybe")}<b>${cnt(head("maybe"))}</b><span>نفر شاید</span></button>
      <button class="tile wait" type="button" data-go="wait">${ic("wait")}<b>${cnt(by("invited").length + by("none").length)}</b><span>خانواده بی‌جواب</span></button>
      <button class="tile no" type="button" data-go="no">${ic("no")}<b>${cnt(by("no").length)}</b><span>نمی‌آیند</span></button></div>
    <section class="card panel"><h3><span>${ic("wallet")}بودجه</span> <small>${e.budget ? toman(e.budget) : "بودجه را در «جشن» بزنید"}</small></h3>
      ${e.budget ? `<div class="bar${spent > e.budget ? " over" : ""}"><i style="width:${pct(spent, e.budget)}%"></i></div>` : ""}
      <div class="kv"><span>خرج شده</span><b>${cnt(spent)} تومان</b></div><div class="kv"><span>کل برآورد خرید</span><b>${cnt(est)} تومان</b></div>
      ${e.budget ? `<div class="kv"><span>${e.budget - est >= 0 ? "باقی‌مانده از بودجه (با برآورد)" : "بیشتر از بودجه (با برآورد)"}</span><b style="color:${e.budget - est >= 0 ? "var(--ok)" : "var(--bad)"}">${cnt(Math.abs(e.budget - est))} تومان</b></div>` : ""}</section>
    <section class="card panel"><h3><span>${ic("list")}کارها</span> <small>${fa(doneN)} از ${fa(tasks.length)} انجام شد</small></h3>
      <div class="bar"><i style="width:${pct(doneN, tasks.length)}%"></i></div>
      ${next.length ? `<div style="margin-top:10px">${next.map(t => `<div class="kv"><span>${esc(t.title)}</span>${dueTag(t)}</div>`).join("")}</div>` : `<p class="muted" style="margin:8px 0 0">کار باقی نمانده.</p>`}</section>`;
  $$("[data-go]", m).forEach(b => b.onclick = () => { S.gFilter = b.dataset.go; go("guests"); });
};
const dueTag = t => { if (!t.due) return `<span class="due muted">بدون موعد</span>`; const d = daysTo(t.due); return `<span class="due${!t.done && d < 0 ? " late" : ""}">${!t.done && d < 0 ? "گذشته · " : ""}${faDate(t.due, false)}</span>`; };

// ---------- guests ----------
VIEWS.guests = m => {
  const G = S.data.guests, groups = [...new Set(G.map(g => g.grp).filter(Boolean))];
  const F = { all: ["همه", () => true], yes: ["می‌آیند", g => g.status === "yes"], maybe: ["شاید", g => g.status === "maybe"], wait: ["بی‌جواب", g => g.status === "invited" || g.status === "none"], no: ["نمی‌آیند", g => g.status === "no"],
    ...Object.fromEntries(groups.map(x => ["g:" + x, [x, g => g.grp === x]])) };
  if (!F[S.gFilter]) S.gFilter = "all";
  const q = latin(S.gq).trim(), list = G.filter(F[S.gFilter][1]).filter(g => !q || g.name.includes(q) || latin(g.phone).includes(q));
  const total = list.reduce((a, g) => a + people(g), 0), SH = shares();
  const shareLine = g => { const parts = SH.items.filter(i => i.shares[g.id] > 0).map(i => `${i.title} ${amt(i.shares[g.id], i.unit)}`); return parts.length ? `<div class="share">سهم: ${parts.map(esc).join(" · ")}</div>` : ""; };
  m.innerHTML = `<div class="tools"><input type="search" id="gq" placeholder="جستجوی نام یا تلفن" value="${esc(S.gq)}" aria-label="جستجو"></div>
    <div class="chips" role="group" aria-label="فیلتر">${Object.entries(F).map(([k, [t, f]]) => `<button class="chip" type="button" data-f="${esc(k)}" aria-pressed="${k === S.gFilter}">${esc(t)}<small>${fa(G.filter(f).length)}</small></button>`).join("")}</div>
    <p class="muted" style="margin:0 2px 8px;font-size:13px">${fa(list.length)} خانواده · ${fa(total)} نفر</p>
    <div class="list">${list.map(g => `<div class="row" data-id="${g.id}"><div class="t" data-edit="${g.id}" role="button" tabindex="0"><span>${esc(g.name)}</span><small>${[g.grp, `${fa(g.adults)} بزرگسال${g.kids ? ` + ${fa(g.kids)} کودک` : ""}`, g.phone ? faDigits(g.phone) : ""].filter(Boolean).map(esc).join(" · ")}</small>${shareLine(g)}</div>
        ${g.phone ? `<a class="btn icon ghost call" href="tel:${esc(latin(g.phone))}" aria-label="تماس با ${esc(g.name)}">${ic("phone")}</a>` : "<span></span>"}
        <div class="status" role="group" aria-label="وضعیت ${esc(g.name)}">${STATUS_BTNS.map(s => `<button type="button" data-s="${s}" data-g="${g.id}" aria-pressed="${g.status === s}">${STATUS[s]}</button>`).join("")}</div></div>`).join("") || `<div class="empty">${ic("users", "big")}<p>مهمانی اینجا نیست.</p></div>`}</div>
    <button class="fab" type="button" id="add">${ic("userplus")}مهمان</button>`;
  $("#gq").oninput = e => { S.gq = e.target.value; const pos = e.target.selectionStart; VIEWS.guests(m); const i = $("#gq"); i.focus(); i.setSelectionRange(pos, pos); };
  $$("[data-f]", m).forEach(b => b.onclick = () => { S.gFilter = b.dataset.f; VIEWS.guests(m); });
  $$("[data-s]", m).forEach(b => b.onclick = async () => {
    const g = G.find(x => x.id === +b.dataset.g), s = g.status === b.dataset.s ? "none" : b.dataset.s;
    $$(`[data-g="${g.id}"]`, m).forEach(x => x.setAttribute("aria-pressed", x.dataset.s === s));
    try { Object.assign(g, await api(`/api/events/${S.ev.id}/guests`, { ...g, status: s })); S.stamp = ""; const y = scrollY; VIEWS.guests(m); scrollTo(0, y); } catch (e) { toast(e.message, true); reload(); }
  });
  $$("[data-edit]", m).forEach(el => el.onclick = el.onkeydown = e => { if (e.type === "keydown" && e.key !== "Enter") return; editGuest(G.find(g => g.id === +el.dataset.edit)); });
  $("#add").onclick = () => editGuest({ name: "", phone: "", grp: groups[0] || "", adults: 1, kids: 0, status: "none", note: "" });
};
function editGuest(g) {
  const groups = [...new Set(["فامیل", "دوستان", "همکاران", "بچه‌ها", ...S.data.guests.map(x => x.grp).filter(Boolean)])];
  const wa = g.phone && S.ev.invite ? `https://wa.me/${latin(g.phone).replace(/\D/g, "").replace(/^0/, "98")}?text=${encodeURIComponent(S.ev.invite + (S.ev.date ? "\n" + faDate(S.ev.date) : "") + (S.ev.time ? " ساعت " + S.ev.time : "") + (S.ev.place ? "\n" + S.ev.place : ""))}` : "";
  dialog(`<div class="dlg-head"><h3>${g.id ? "ویرایش مهمان" : "مهمان جدید"}</h3></div>
    <label class="field"><span>نام (یا نام خانواده)</span><input name="name" type="text" value="${esc(g.name)}" required></label>
    <div class="grid2"><label class="field"><span>تلفن</span><input name="phone" type="tel" dir="ltr" value="${esc(g.phone)}"></label>
      <label class="field"><span>گروه</span><input name="grp" type="text" list="grps" value="${esc(g.grp)}"><datalist id="grps">${groups.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <label class="field"><span>بزرگسال</span><input name="adults" type="text" inputmode="numeric" value="${fa(g.adults)}"></label>
      <label class="field"><span>کودک</span><input name="kids" type="text" inputmode="numeric" value="${fa(g.kids)}"></label></div>
    <label class="field"><span>وضعیت</span><select name="status">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${k === g.status ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="field"><span>یادداشت</span><textarea name="note" rows="2">${esc(g.note)}</textarea></label>
    ${g.by ? `<p class="muted" style="font-size:12px;margin:0">آخرین تغییر: ${esc(g.by)}</p>` : ""}`
    + foot(`${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${ic("chat")}دعوت در واتس‌اپ</a>` : ""}${g.id ? `<button class="btn ghost danger" value="ok" data-del>${ic("trash")}حذف</button>` : ""}`), async (f, b) => {
    if (b.hasAttribute("data-del")) { if (!confirm(`«${g.name}» حذف شود؟`)) return false; await api(`/api/guests/${g.id}/delete`, {}); toast("حذف شد"); return reload(); }
    await api(`/api/events/${S.ev.id}/guests`, { id: g.id, name: f.elements.name.value, phone: latin(f.phone.value), grp: f.grp.value, adults: num(f.adults.value), kids: num(f.kids.value), status: f.status.value, note: f.note.value });
    toast("ذخیره شد"); await reload();
  });
}

// ---------- to-dos ----------
VIEWS.tasks = m => {
  const T = S.data.tasks, list = S.tFilter === "open" ? T.filter(t => !t.done) : T;
  m.innerHTML = `<div class="chips" role="group"><button class="chip" type="button" data-f="open" aria-pressed="${S.tFilter === "open"}">مانده<small>${fa(T.filter(t => !t.done).length)}</small></button><button class="chip" type="button" data-f="all" aria-pressed="${S.tFilter === "all"}">همه<small>${fa(T.length)}</small></button></div>
    <div class="list">${list.map(t => `<div class="row task${t.done ? " done" : ""}"><button class="check" type="button" role="checkbox" aria-checked="${!!t.done}" aria-label="انجام شد: ${esc(t.title)}" data-done="${t.id}"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>
      <div class="t" data-edit="${t.id}" role="button" tabindex="0"><span>${esc(t.title)}</span><small>${[t.who && "با " + t.who, t.note].filter(Boolean).map(esc).join(" · ")}</small></div>${dueTag(t)}</div>`).join("") || `<p class="empty">${S.tFilter === "open" ? "همهٔ کارها انجام شده" : "کاری ثبت نشده."}</p>`}</div>
    <button class="fab" type="button" id="add">${ic("plus")}کار</button>`;
  $$("[data-f]", m).forEach(b => b.onclick = () => { S.tFilter = b.dataset.f; VIEWS.tasks(m); });
  $$("[data-done]", m).forEach(b => b.onclick = async () => {
    const t = T.find(x => x.id === +b.dataset.done); t.done = t.done ? 0 : 1; b.setAttribute("aria-checked", !!t.done); b.closest(".row").classList.toggle("done", !!t.done);
    try { await api(`/api/events/${S.ev.id}/tasks`, { ...t, due: t.due ? jalaliText(t.due) : "" }); if (t.done) { confetti(b); toast("آفرین! انجام شد"); } setTimeout(reload, 450); } catch (e) { toast(e.message, true); reload(); }
  });
  $$("[data-edit]", m).forEach(el => el.onclick = () => editTask(T.find(t => t.id === +el.dataset.edit)));
  $("#add").onclick = () => editTask({ title: "", due: "", who: "", done: 0, note: "" });
};
function editTask(t) {
  dialog(`<div class="dlg-head"><h3>${t.id ? "ویرایش کار" : "کار جدید"}</h3></div>
    <label class="field"><span>چه کاری؟</span><input name="title" type="text" value="${esc(t.title)}" required></label>
    <div class="grid2"><label class="field"><span>تا کی؟ (مثل ۱۴۰۵/۱۰/۰۱)</span><input name="due" type="text" inputmode="numeric" dir="ltr" value="${jIn(t.due)}"></label>
      <label class="field"><span>با چه کسی؟</span><input name="who" type="text" value="${esc(t.who)}"></label></div>
    <label class="field"><span>یادداشت</span><textarea name="note" rows="2">${esc(t.note)}</textarea></label>`
    + foot(t.id ? `<button class="btn ghost danger" value="ok" data-del>${ic("trash")}حذف</button>` : ""), async (f, b) => {
    if (b.hasAttribute("data-del")) { if (!confirm("این کار حذف شود؟")) return false; await api(`/api/tasks/${t.id}/delete`, {}); return reload(); }
    await api(`/api/events/${S.ev.id}/tasks`, { id: t.id, title: f.elements.title.value, due: latin(f.due.value), who: f.who.value, note: f.note.value, done: t.done });
    toast("ذخیره شد"); await reload();
  });
}

// ---------- shopping & budget ----------
VIEWS.shop = m => {
  const I = S.data.items, e = S.ev, cats = [...new Set(I.map(i => i.cat || "سایر"))];
  const est = I.reduce((a, i) => a + i.est, 0), spent = I.reduce((a, i) => a + (i.actual || (i.bought ? i.est : 0)), 0);
  m.innerHTML = `<section class="card panel"><div class="kv"><span>بودجه</span><b>${e.budget ? cnt(e.budget) + " تومان" : "—"}</b></div>
      <div class="kv"><span>برآورد کل</span><b>${cnt(est)} تومان</b></div><div class="kv"><span>خرج شده</span><b>${cnt(spent)} تومان</b></div>
      ${e.budget ? `<div class="bar${spent > e.budget ? " over" : ""}" style="margin-top:6px"><i style="width:${Math.min(100, Math.round(spent / e.budget * 100))}%"></i></div>` : ""}</section>
    ${sharePanel()}
    ${cats.map(c => { const L = I.filter(i => (i.cat || "سایر") === c);
      return `<div class="cat"><span>${esc(c)}</span><span>${fa(L.filter(i => i.bought).length)} از ${fa(L.length)}</span></div><div class="list">${L.map(i => `<div class="row task${i.bought ? " done" : ""}">
        <button class="check" type="button" role="checkbox" aria-checked="${!!i.bought}" aria-label="خریده شد: ${esc(i.title)}" data-b="${i.id}"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>
        <div class="t" data-edit="${i.id}" role="button" tabindex="0"><span>${esc(i.title)}</span><small>${esc(i.amount ? amt(i.amount, i.unit) : i.qty)}${i.food && i.amount ? " · تقسیم بین مهمان‌ها" : ""}</small></div>
        <div class="money num">${i.actual ? `${fa(i.actual)}${i.est && i.est !== i.actual ? `<s>${fa(i.est)}</s>` : ""}` : i.est ? fa(i.est) : "—"}</div></div>`).join("")}</div>`; }).join("") || `<p class="empty">چیزی برای خرید ثبت نشده.</p>`}
    <button class="fab" type="button" id="add">${ic("plus")}قلم خرید</button>`;
  $("#shtable", m) && ($("#shtable", m).onclick = shareTable);
  $("#shset", m) && ($("#shset", m).onclick = () => editEvent(S.ev));
  $$("[data-b]", m).forEach(b => b.onclick = async () => {
    const i = I.find(x => x.id === +b.dataset.b); i.bought = i.bought ? 0 : 1; b.setAttribute("aria-checked", !!i.bought); b.closest(".row").classList.toggle("done", !!i.bought);
    if (i.bought) confetti(b);
    try { await api(`/api/events/${S.ev.id}/items`, i); setTimeout(reload, 450); } catch (e) { toast(e.message, true); reload(); }
  });
  $$("[data-edit]", m).forEach(el => el.onclick = () => editItem(I.find(i => i.id === +el.dataset.edit)));
  $("#add").onclick = () => editItem({ title: "", cat: cats[0] === "سایر" ? "" : cats[0] || "", qty: "", est: 0, actual: 0, bought: 0, note: "", amount: 0, unit: "", food: 0 });
};
// the food-share panel on the shopping page
function sharePanel() {
  const SH = shares(), e = S.ev;
  if (!S.data.items.some(i => i.food && i.amount)) return `<section class="card panel"><h3><span>${ic("cake")}تقسیم غذا</span></h3><p class="muted" style="margin:0;font-size:13.5px">برای خوراکی‌ها مقدار و واحد بزنید (مثلاً ۴۰ برش کیک) و «بین مهمان‌ها تقسیم شود» را روشن کنید تا سهم هر نفر حساب شود.</p></section>`;
  return `<section class="card panel"><h3><span>${ic("cake")}تقسیم غذا</span> <small>${fa(SH.people)} نفر${e.kidShare < 1 ? ` · کودک ${e.kidShare === .5 ? "نصف" : "یک‌سوم"} سهم` : ""}${e.shareMaybe ? " · «شاید»ها هم" : ""}</small></h3>
    ${SH.totalWeight ? SH.items.map(i => `<div class="kv"><span>${esc(i.title)} <span class="muted">(${amt(i.amount, i.unit)})</span></span><b>هر نفر ${amt(i.perPerson, i.unit)}</b></div>`).join("") : `<p class="muted" style="margin:0">هنوز کسی «می‌آید» نیست.</p>`}
    <div class="dlg-foot">${SH.totalWeight ? `<button class="btn primary sm" type="button" id="shtable">${ic("table")}سهم هر خانواده</button>` : ""}<button class="btn sm ghost" type="button" id="shset">${ic("gear")}تنظیم تقسیم</button></div></section>`;
}
function shareTable() {
  const SH = shares();
  const d = document.createElement("dialog");
  d.innerHTML = `<form method="dialog"><div class="dlg-head"><h3>سهم هر خانواده</h3><button class="btn sm ghost" value="x">بستن</button></div>
    <div class="list">${SH.groups.map(g => `<div class="row" style="grid-template-columns:1fr"><div class="t"><span>${esc(g.name)}</span><small>${fa(g.people)} نفر</small>
      <div class="share">${SH.items.map(i => `${esc(i.title)}: <b>${amt(i.shares[g.id] || 0, i.unit)}</b>`).join(" · ")}</div></div></div>`).join("")}</div>
    <p class="muted" style="font-size:12.5px;margin:10px 0 0">چیزهای شمردنی (برش، لیوان، عدد) کامل تقسیم شده و جمعشان دقیقاً برابر کل است.</p></form>`;
  document.body.append(d); d.showModal(); d.onclose = () => d.remove(); d.addEventListener("click", e => { if (e.target === d) d.close(); });
}
function editItem(i) {
  const cats = [...new Set(["خوراکی", "تزئینات", "کیک", "هدیه", "پذیرایی", "لباس", ...S.data.items.map(x => x.cat).filter(Boolean)])];
  dialog(`<div class="dlg-head"><h3>${i.id ? "ویرایش خرید" : "قلم جدید"}</h3></div>
    <label class="field"><span>چه چیزی؟</span><input name="title" type="text" value="${esc(i.title)}" required></label>
    <div class="grid2"><label class="field"><span>دسته</span><input name="cat" type="text" list="cats" value="${esc(i.cat)}"><datalist id="cats">${cats.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <label class="field"><span>مقدار (عدد)</span><input name="amount" type="text" inputmode="decimal" value="${i.amount ? fa(i.amount) : ""}" placeholder="مثلاً ۴۰"></label>
      <label class="field"><span>واحد</span><input name="unit" type="text" list="units" value="${esc(i.unit || "")}" placeholder="برش، کیلو، لیوان…"><datalist id="units">${UNITS.map(u => `<option value="${u}">`).join("")}</datalist></label>
      <label class="field" style="grid-column:1/-1;display:flex;gap:8px;align-items:center;margin-top:-4px"><input name="food" type="checkbox" ${(i.id ? i.food : FOOD_CATS.includes(i.cat)) ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--accent)"> بین مهمان‌ها تقسیم شود</label>
      <label class="field"><span>قیمت تخمینی (تومان)</span><input name="est" type="text" inputmode="numeric" value="${i.est ? fa(i.est) : ""}"></label>
      <label class="field"><span>قیمت واقعی (تومان)</span><input name="actual" type="text" inputmode="numeric" value="${i.actual ? fa(i.actual) : ""}"></label></div>
    <label class="field" style="display:flex;gap:8px;align-items:center"><input name="bought" type="checkbox" ${i.bought ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--accent)"> خریده شد</label>
    <label class="field"><span>یادداشت</span><textarea name="note" rows="2">${esc(i.note)}</textarea></label>`
    + foot(i.id ? `<button class="btn ghost danger" value="ok" data-del>${ic("trash")}حذف</button>` : ""), async (f, b) => {
    if (b.hasAttribute("data-del")) { if (!confirm("حذف شود؟")) return false; await api(`/api/items/${i.id}/delete`, {}); return reload(); }
    await api(`/api/events/${S.ev.id}/items`, { id: i.id, title: f.elements.title.value, cat: f.cat.value, est: num(f.est.value), actual: num(f.actual.value), bought: f.bought.checked, note: f.note.value, qty: i.qty || "", amount: latin(f.amount.value).replace(/[٫\/]/g, ".").replace(/[٬,\s]/g, ""), unit: f.unit.value, food: f.food.checked });
    toast("ذخیره شد"); await reload();
  });
}

// ---------- party settings ----------
VIEWS.party = m => {
  const e = S.ev;
  m.innerHTML = `<section class="card panel"><h3>${esc(e.title)}</h3>
      <div class="kv"><span>تاریخ</span><b>${e.date ? faDate(e.date) : "—"}</b></div><div class="kv"><span>ساعت</span><b>${esc(faDigits(e.time)) || "—"}</b></div>
      <div class="kv"><span>مکان</span><b>${esc(e.place) || "—"}</b></div>${e.address ? `<p class="muted" style="margin:4px 0">${esc(e.address)}</p>` : ""}
      ${e.map ? `<a class="btn sm" href="${esc(e.map)}" target="_blank" rel="noopener" style="margin-top:6px">نقشه</a>` : ""}
      ${e.invite ? `<p style="white-space:pre-line;margin:12px 0 0;padding:10px 12px;border-radius:12px;background:var(--soft)">${esc(e.invite)}</p>` : ""}
      <div class="dlg-foot"><button class="btn primary" type="button" id="ed">${ic("edit")}ویرایش جشن</button>${e.invite && navigator.share ? `<button class="btn" type="button" id="sh">${ic("share")}فرستادن متن دعوت</button>` : ""}</div></section>
    <section class="card panel"><h3>کارهای دیگر</h3><div class="dlg-foot" style="margin:0"><button class="btn" type="button" id="adm">${ic("users")}ادمین‌ها</button><button class="btn ghost danger" type="button" id="del">${ic("trash")}حذف این جشن</button></div></section>`;
  $("#ed").onclick = () => editEvent(e);
  $("#adm").onclick = adminsView;
  $("#sh") && ($("#sh").onclick = () => navigator.share({ text: e.invite + (e.date ? "\n" + faDate(e.date) : "") + (e.time ? " ساعت " + e.time : "") + (e.place ? "\n" + e.place : "") + (e.map ? "\n" + e.map : "") }).catch(() => {}));
  $("#del").onclick = async () => { if (!confirm(`«${e.title}» با همهٔ مهمان‌ها، کارها و خریدهایش حذف شود؟`)) return; await api(`/api/events/${e.id}/delete`, {}); toast("حذف شد"); listView(); };
};
function editEvent(e) {
  let cover = e.cover || "";
  const d = dialog(`<div class="dlg-head"><h3>${e.id ? "ویرایش جشن" : "جشن جدید"}</h3></div>
    <label class="field"><span>عنوان</span><input name="title" type="text" value="${esc(e.title)}" placeholder="مثلاً جشن تولد" required></label>
    <div class="grid2"><label class="field"><span>تاریخ (مثل ۱۴۰۵/۱۰/۰۱)</span><input name="date" type="text" inputmode="numeric" dir="ltr" value="${jIn(e.date)}"></label>
      <label class="field"><span>ساعت</span><input name="time" type="text" inputmode="numeric" value="${esc(faDigits(e.time || ""))}" placeholder="۱۷:۰۰"></label></div>
    <label class="field"><span>مکان</span><input name="place" type="text" value="${esc(e.place || "")}"></label>
    <label class="field"><span>آدرس</span><textarea name="address" rows="2">${esc(e.address || "")}</textarea></label>
    <label class="field"><span>لینک نقشه (اختیاری)</span><input name="map" type="url" dir="ltr" value="${esc(e.map || "")}" placeholder="https://"></label>
    <label class="field"><span>بودجه (تومان)</span><input name="budget" type="text" inputmode="numeric" value="${e.budget ? fa(e.budget) : ""}"></label>
    <label class="field"><span>متن دعوت (برای فرستادن به مهمان‌ها)</span><textarea name="invite" rows="3">${esc(e.invite || "")}</textarea></label>
    <div class="cover-pick"><div class="prev" id="cp" style="${cover ? `background-image:url('${esc(cover)}')` : ""}"></div><div><label class="btn sm">عکس کاور<input type="file" accept="image/*" id="cf" hidden></label> ${cover ? `<button class="btn sm ghost" type="button" id="cx">حذف</button>` : ""}</div></div>
    <fieldset class="field" style="border:1px solid var(--line);border-radius:12px;padding:10px 12px"><legend style="font-size:13px;color:var(--muted);padding:0 4px">تقسیم غذا</legend>
      <div class="grid2"><label class="field"><span>سهم هر کودک</span><select name="kidShare">${[[1, "کامل"], [0.5, "نصف"], [0.33, "یک‌سوم"]].map(([v, t]) => `<option value="${v}" ${(e.kidShare ?? 1) == v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="field"><span>نفرات خانهٔ خودمان</span><input name="hosts" type="text" inputmode="numeric" value="${e.hosts ? fa(e.hosts) : ""}" placeholder="۰"></label></div>
      <label style="display:flex;gap:8px;align-items:center"><input name="shareMaybe" type="checkbox" ${e.shareMaybe ?? 1 ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--accent)"> «شاید»ها هم حساب شوند</label></fieldset>
    <div class="field"><span>رنگ جشن</span><div class="swatches">${COLORS.map(c => `<label style="--c:${c}" aria-label="رنگ ${c}"><input type="radio" name="color" value="${c}" ${c === (e.color || COLORS[0]) ? "checked" : ""}><span></span></label>`).join("")}</div></div>`
    + foot(), async f => {
    const r = await api("/api/events", { id: e.id, title: f.elements.title.value, date: latin(f.date.value), time: latin(f.time.value), place: f.place.value, address: f.address.value, map: f.map.value.trim(), budget: num(f.budget.value), invite: f.invite.value, color: f.color.value, cover, kidShare: +f.kidShare.value, hosts: num(f.hosts.value), shareMaybe: f.shareMaybe.checked });
    toast("ذخیره شد"); if (e.id) { await reload(); setAccent(S.ev.color); $(".top h1").textContent = S.ev.title; } else openEvent(r.id);
  });
  $("#cf", d).onchange = async ev => { const file = ev.target.files[0]; if (!file) return; try { cover = (await api("/api/upload", { data: await shrink(file) })).url; $("#cp", d).style.backgroundImage = `url('${cover}')`; } catch (err) { toast(err.message, true); } };
  $("#cx", d) && ($("#cx", d).onclick = () => { cover = ""; $("#cp", d).style.backgroundImage = ""; });
  $$("input[name=color]", d).forEach(r => r.onchange = () => setAccent(r.value));
}

// ---------- admins ----------
async function adminsView() {
  const list = await api("/api/admins");
  dialog(`<div class="dlg-head"><h3>ادمین‌ها</h3></div>
    <p class="muted" style="margin:0 0 10px;font-size:13.5px">همهٔ ادمین‌ها همهٔ جشن‌ها را می‌بینند و ویرایش می‌کنند.</p>
    <div class="list">${list.map(u => `<div class="row" style="grid-template-columns:1fr auto"><div class="t"><span>${esc(u.name)}</span><small dir="ltr" style="text-align:end">${esc(u.username)}</small></div>
      ${u.id === S.me.id ? `<span class="pill">شما</span>` : `<button class="btn sm ghost danger" type="button" data-rm="${u.id}">حذف</button>`}</div>`).join("")}</div>
    <h4 style="margin:16px 0 8px">ادمین جدید</h4>
    <div class="grid2"><label class="field"><span>نام</span><input name="name" type="text"></label><label class="field"><span>نام کاربری (انگلیسی)</span><input name="username" type="text" dir="ltr" autocapitalize="none"></label></div>
    <label class="field"><span>رمز (حداقل ۶ حرف)</span><input name="password" type="text" dir="ltr" autocomplete="off"></label>
    <div class="dlg-foot"><button class="btn primary" value="ok">${ic("userplus")}افزودن</button><button class="btn" type="button" id="pw">${ic("key")}تغییر رمز من</button><button class="btn" type="button" id="th">${theme.get() === "dark" ? ic("sun") + "حالت روشن" : ic("moon") + "حالت تیره"}</button><button class="btn ghost" type="button" id="out">${ic("out")}خروج</button><button class="btn ghost" value="x" formnovalidate>بستن</button></div>`, async f => {
    await api("/api/admins", { name: f.elements.name.value, username: latin(f.username.value), password: latin(f.password.value) }); toast("ادمین اضافه شد"); setTimeout(adminsView, 50);
  });
  $$("[data-rm]").forEach(b => b.onclick = async () => { if (!confirm("این ادمین حذف شود؟")) return; try { await api(`/api/admins/${b.dataset.rm}/delete`, {}); toast("حذف شد"); b.closest("dialog").close(); adminsView(); } catch (e) { toast(e.message, true); } });
  $("#th").onclick = e => { const t = theme.get() === "dark" ? "light" : "dark"; theme.set(t); e.currentTarget.innerHTML = t === "dark" ? ic("sun") + "حالت روشن" : ic("moon") + "حالت تیره"; };
  $("#out").onclick = async () => { try { await api("/api/logout", {}); } catch {} token.set(""); location.hash = ""; location.reload(); };
  $("#pw").onclick = () => { $("#pw").closest("dialog").close(); dialog(`<div class="dlg-head"><h3>تغییر رمز</h3></div><label class="field"><span>رمز فعلی</span><input name="old" type="password" dir="ltr"></label><label class="field"><span>رمز جدید</span><input name="nw" type="password" dir="ltr"></label>` + foot(),
    async f => { await api("/api/password", { old: latin(f.old.value), new: latin(f.nw.value) }); toast("رمز عوض شد"); }); };
}

// ---------- live: other admins' edits show up ----------
setInterval(async () => {
  if (!S.ev || document.visibilityState !== "visible" || $("dialog[open]")) return;
  try { const { updated } = await api(`/api/events/${S.ev.id}/stamp`); if (S.stamp && updated !== S.stamp) { await reload(); toast("به‌روز شد"); } else S.stamp = updated; } catch {}
}, 20000);

// ---------- boot ----------
theme.set(theme.get());
async function boot() {
  if (!token.get()) return loginView();
  try {
    S.me = (await api("/api/me")).user;
    const [id, tab] = location.hash.slice(1).split("/");
    if (+id) await openEvent(+id, tab); else await listView();
  } catch (e) { if (!token.get()) loginView(); else app.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
}
boot();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
