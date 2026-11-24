// The invitation a guest opens from the WhatsApp link: envelope → letter, falling petals, live countdown,
// date / time / place / map, add to calendar. Reads the party straight from the public data file (no login).
const DATA = "https://raw.githubusercontent.com/LEON-Gold/mygirlsparty/data/data/party.json";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fa = n => new Intl.NumberFormat("fa-IR").format(n);
const faDigits = s => String(s ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const latin = s => String(s ?? "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const PAL = { "#c2416b": "#ff8a5c", "#7c4dff": "#ff6fb5", "#e0503d": "#ffb547", "#0e8f8f": "#5b7cfa", "#b07a12": "#e86a92", "#2f6fe0": "#28c2b0", "#d03a8c": "#7a5cff", "#3f4fd6": "#f0a020", "#2c8a57": "#c9b02c" };
const I = {
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>', map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  add: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// petals
function petals(n = 12) {
  if (reduced) return;
  const box = $("#petals");
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div"), d = 7 + Math.random() * 7;
    p.className = "petal"; p.style.cssText = `left:${Math.random() * 100}%;animation-duration:${d}s;animation-delay:${-Math.random() * d}s`;
    p.innerHTML = `<i style="--s:${10 + Math.random() * 12}px;animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${-Math.random() * 3}s"></i>`;
    box.append(p);
  }
}
document.addEventListener("visibilitychange", () => document.querySelectorAll(".petal, .petal i").forEach(e => e.style.animationPlayState = document.hidden ? "paused" : "running"));

const q = new URLSearchParams(location.search), eid = +q.get("e"), gid = +q.get("g");
let party = null, guest = null;
const ready = fetch(DATA + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" }).then(r => r.json()).then(d => {
  party = d.events.find(e => e.id === eid) || null;
  guest = gid ? d.guests.find(g => g.id === gid && g.event === eid) || null : null;
}).catch(() => {});

function when(e) {
  if (!e.date) return null;
  const [h, m] = latin(e.time || "").match(/(\d{1,2})[:٫.](\d{2})/)?.slice(1).map(Number) || [18, 0];
  return new Date(`${e.date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+03:30`); // Tehran
}
function ics(e, t) {
  const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//party//fa", "BEGIN:VEVENT", `UID:party-${e.id}@mygirlsparty`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(t)}`, `DTEND:${f(new Date(t.getTime() + 3 * 3600e3))}`,
    `SUMMARY:${e.title}`, `LOCATION:${[e.place, e.address].filter(Boolean).join(" - ")}`, `DESCRIPTION:${(e.invite || "").replace(/\n/g, "\\n")}`, "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", "DESCRIPTION:جشن", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
}

function letter() {
  const e = party;
  if (!e) { $("#stage").innerHTML = `<p class="empty">این دعوت‌نامه پیدا نشد. لینک را دوباره از میزبان بگیرید.</p>`; return; }
  document.documentElement.style.setProperty("--a", e.color || "#c2416b"); document.documentElement.style.setProperty("--b", PAL[e.color] || "#ff8a5c");
  document.title = "دعوت‌نامه · " + e.title;
  const t = when(e);
  const dateText = e.date ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(e.date + "T12:00:00Z")) : "";
  $("#stage").innerHTML = `<article class="letter">
    <p class="to">${guest ? `${esc(guest.name)} عزیز` : "مهمان عزیز"}</p>
    <h1>${esc(e.title)}</h1>
    <div class="orn">✦</div>
    <p class="msg">${esc(e.invite || "با خوشحالی شما را دعوت می‌کنیم.")}</p>
    ${t && t > Date.now() ? `<div class="count" aria-live="off"><div><b id="cd-d">۰</b><span>روز</span></div><div><b id="cd-h">۰</b><span>ساعت</span></div><div><b id="cd-m">۰</b><span>دقیقه</span></div><div><b id="cd-s">۰</b><span>ثانیه</span></div></div>` : ""}
    <div class="info">
      ${dateText ? `<div>${ic("cal")}<span><b>${dateText}</b></span></div>` : ""}
      ${e.time ? `<div>${ic("clock")}<span><b>ساعت ${esc(faDigits(e.time))}</b></span></div>` : ""}
      ${e.place || e.address ? `<div>${ic("pin")}<span><b>${esc(e.place || "")}</b>${e.address ? `<small>${esc(e.address)}</small>` : ""}</span></div>` : ""}
    </div>
    <div class="acts">
      ${e.map ? `<a class="btn" href="${esc(e.map)}" target="_blank" rel="noopener">${ic("map")}مسیریابی روی نقشه</a>` : ""}
      ${t ? `<a class="btn soft" href="${ics(e, t)}" download="party.ics">${ic("add")}افزودن به تقویم</a>` : ""}
    </div>
    <p class="sign">منتظر دیدنتان هستیم 🌸</p>
  </article>`;
  if (t && t > Date.now()) {
    const els = ["d", "h", "m", "s"].map(k => $("#cd-" + k));
    const tick = () => { let s = Math.max(0, Math.floor((t - Date.now()) / 1000)); const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]; els.forEach((el, i) => el.textContent = fa(v[i])); };
    tick(); setInterval(tick, 1000);
  }
}

// open: flap lifts, letter peeks out, then the letter takes the screen
let opened = false;
async function open() {
  if (opened) return; opened = true;
  const env = $("#env"); env.classList.add("open"); $(".hint").style.visibility = "hidden";
  petals();
  await Promise.all([ready, new Promise(r => setTimeout(r, reduced ? 0 : 1300))]);
  env.classList.add("gone"); setTimeout(letter, reduced ? 0 : 450);
}
$("#env").addEventListener("click", open);
$("#env").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
petals(8);
