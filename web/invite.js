// Invitation page. One GSAP timeline drives the whole opening (same on iPhone Safari and Chrome):
// envelope floats → seal cracks → flap opens in 3D → card rises → gold burst → the letter unfolds, its gold frame
// and ornaments draw themselves, lines fade in, the countdown flips in. Petals and gold dust are drawn on a canvas.
const gsap = window.gsap;
const DATA = "https://raw.githubusercontent.com/LEON-Gold/mygirlsparty/data/data/party.json";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fa = n => new Intl.NumberFormat("fa-IR").format(n);
const faDigits = s => String(s ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const latin = s => String(s ?? "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const I = {
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>', map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  add: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

// ---------- data ----------
const q = new URLSearchParams(location.search), eid = +q.get("e"), gid = +q.get("g");
let party = null, guest = null;
const ready = fetch(DATA + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" }).then(r => r.json()).then(d => {
  party = d.events.find(e => e.id === eid) || null;
  guest = gid ? d.guests.find(g => g.id === gid && g.event === eid) || null : null;
}).catch(() => {});

// colours from the party: velvet = a deep version of it
function theme(c) {
  const r = document.documentElement.style; r.setProperty("--a", c);
  const [R, G, B] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), mix = (k, t) => `rgb(${[R, G, B].map(v => Math.round(v * k + t)).join(",")})`;
  r.setProperty("--night1", mix(.34, 6)); r.setProperty("--night2", mix(.12, 3));
  r.setProperty("--env1", mix(.12, 222)); r.setProperty("--env2", mix(.25, 190)); r.setProperty("--env3", mix(.42, 140));
}

// ---------- canvas: gold dust, petals, bursts ----------
const cv = $("#fx"), cx = cv.getContext("2d");
let W, H, DPR, petalColor = [214, 110, 150];
function size() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0); }
size(); addEventListener("resize", size);
const rnd = (a, b) => a + Math.random() * (b - a);
const dust = Array.from({ length: reduced ? 0 : 46 }, () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(.6, 1.8), s: rnd(.004, .015), t: rnd(0, 6.28) }));
const petals = [], sparks = [];
let petalRate = 0; // petals per second
function addPetal(top = true) {
  petals.push({ x: rnd(0, W), y: top ? rnd(-60, -10) : rnd(0, H), z: rnd(.5, 1.25), vx: rnd(-.3, .3), vy: rnd(.6, 1.4), rot: rnd(0, 6.28), vr: rnd(-.03, .03), flip: rnd(0, 6.28), vf: rnd(.03, .07), sway: rnd(0, 6.28) });
}
function burst(x, y, n = 90) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(2, 9); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, d: rnd(.012, .025), r: rnd(1, 3), gold: Math.random() < .8 }); }
}
let last = performance.now(), acc = 0, running = true;
function frame(now) {
  if (!running) return;
  const dt = Math.min(50, now - last) / 16.67; last = now;
  cx.clearRect(0, 0, W, H);
  for (const p of dust) {
    p.t += .02 * dt; p.y -= p.s * .02 * dt; if (p.y < -.02) p.y = 1.02;
    cx.globalAlpha = .35 + .35 * Math.sin(p.t); cx.fillStyle = "#f3d27a";
    cx.beginPath(); cx.arc(p.x * W + Math.sin(p.t * .5) * 6, p.y * H, p.r, 0, 6.28); cx.fill();
  }
  acc += petalRate * dt / 60; while (acc > 1) { addPetal(); acc--; }
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i]; p.sway += .02 * dt; p.x += (p.vx + Math.sin(p.sway) * .8) * dt * p.z; p.y += p.vy * dt * p.z * 1.3; p.rot += p.vr * dt; p.flip += p.vf * dt;
    if (p.y > H + 40) { petals.splice(i, 1); continue; }
    const s = 9 * p.z, f = Math.cos(p.flip);
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.scale(f, 1); cx.globalAlpha = .85;
    const g = cx.createLinearGradient(-s, -s, s, s); g.addColorStop(0, "rgba(255,240,245,1)"); g.addColorStop(1, `rgba(${petalColor},1)`);
    cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, -s * 1.2); cx.bezierCurveTo(s, -s * .6, s * .8, s * .8, 0, s * 1.2); cx.bezierCurveTo(-s * .8, s * .8, -s, -s * .6, 0, -s * 1.2); cx.fill(); cx.restore();
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.vy += .12 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.d * dt;
    if (p.life <= 0) { sparks.splice(i, 1); continue; }
    cx.globalAlpha = p.life; cx.fillStyle = p.gold ? (Math.random() < .3 ? "#fff4c7" : "#f3d27a") : `rgb(${petalColor})`;
    cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.6 + p.life * .6), 0, 6.28); cx.fill();
  }
  cx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } gsap && (document.hidden ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume()); });

// ---------- ambient before opening ----------
if (gsap && !reduced) {
  gsap.from("#env", { y: 120, rotation: -8, opacity: 0, duration: 1.4, ease: "elastic.out(1, .6)" });
  gsap.from("#for", { y: -20, opacity: 0, duration: 1, delay: .3, ease: "power3.out" });
  gsap.from("#tap", { opacity: 0, duration: .8, delay: 1.2 });
  gsap.to("#env", { y: -10, rotation: 1.2, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.4 });
  gsap.to("#seal", { scale: 1.07, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to("#for", { backgroundPosition: "-120% 0", duration: 4, ease: "none", repeat: -1 });
  gsap.to(".g1", { x: "12vw", y: "8vh", duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to(".g2", { x: "-10vw", y: "-6vh", duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1 });
}
ready.then(() => {
  if (!party) return;
  theme(party.color || "#c2416b");
  const ch = (party.title || "✦").replace(/^(جشن|تولد)\s+/, "").trim()[0] || "✦";
  $("#sealMono").textContent = ch; $("#miniMono").textContent = ch;
  if (guest) $("#for").textContent = `${guest.name} عزیز، این دعوت‌نامه برای شماست`;
});

// ---------- the letter ----------
function when(e) {
  if (!e.date) return null;
  const [h, m] = latin(e.time || "").match(/(\d{1,2})[:٫.](\d{2})/)?.slice(1).map(Number) || [18, 0];
  return new Date(`${e.date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+03:30`);
}
function ics(e, t) {
  const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//party//fa", "BEGIN:VEVENT", `UID:party-${e.id}@mygirlsparty`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(t)}`, `DTEND:${f(new Date(t.getTime() + 3 * 3600e3))}`,
    `SUMMARY:${e.title}`, `LOCATION:${[e.place, e.address].filter(Boolean).join(" - ")}`, "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", `DESCRIPTION:${e.title}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
}
const CORNER = '<path d="M68 2 C40 2 22 8 14 22 C8 32 10 44 20 46 C30 48 34 38 28 32 C22 26 14 32 18 38 M68 2 C60 10 56 18 58 28 M2 68 C2 40 8 22 22 14"/>';
function buildLetter() {
  const e = party, t = when(e);
  const dateText = e.date ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(e.date + "T12:00:00Z")) : "";
  const lines = String(e.invite || "با خوشحالی شما را به جشن دعوت می‌کنیم.").split("\n").map(l => `<span>${esc(l.trim())}</span>`).join("");
  const el = document.createElement("article"); el.className = "letter"; el.id = "letter";
  el.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5a12"/><stop offset=".3" stop-color="#f3d27a"/><stop offset=".55" stop-color="#fff4c7"/><stop offset=".8" stop-color="#c9952b"/><stop offset="1" stop-color="#8a5a12"/></linearGradient></defs></svg>
    <svg class="frame" aria-hidden="true"><rect class="r1" x="1" y="1" rx="14"/><rect class="r2" x="7" y="7" rx="10"/></svg>
    ${["c1", "c2", "c3", "c4"].map(c => `<svg class="corner ${c}" viewBox="0 0 70 70" aria-hidden="true">${CORNER}</svg>`).join("")}
    <div class="mono"><svg viewBox="0 0 86 86" aria-hidden="true"><circle cx="43" cy="43" r="40"/><circle cx="43" cy="43" r="35" style="stroke-width:.8;opacity:.6"/></svg><b>${esc($("#sealMono").textContent)}</b></div>
    <p class="dear">${guest ? `${esc(guest.name)} عزیز` : "مهمان عزیز"}</p>
    <h1 class="title">${esc(e.title)}</h1>
    ${dateText ? `<span class="ribbon">${dateText}</span>` : ""}
    <svg class="divider" viewBox="0 0 220 22" aria-hidden="true"><path d="M4 11 H92 M128 11 H216 M110 3 L118 11 L110 19 L102 11 Z M96 11 a3 3 0 1 0 0.1 0 M124 11 a3 3 0 1 0 0.1 0"/></svg>
    <p class="msg">${lines}</p>
    ${t && t > Date.now() ? `<div class="count" aria-label="زمان مانده تا جشن"><div><b id="cd-d">۰</b><span>روز</span></div><div><b id="cd-h">۰</b><span>ساعت</span></div><div><b id="cd-m">۰</b><span>دقیقه</span></div><div><b id="cd-s">۰</b><span>ثانیه</span></div></div>` : ""}
    <div class="info">
      ${dateText ? `<div>${ic("cal")}<span><b>${dateText}</b></span></div>` : ""}
      ${e.time ? `<div>${ic("clock")}<span><b>ساعت ${esc(faDigits(e.time))}</b><small>منتظر شما هستیم</small></span></div>` : ""}
      ${e.place || e.address ? `<div>${ic("pin")}<span><b>${esc(e.place || "")}</b>${e.address ? `<small>${esc(e.address)}</small>` : ""}</span></div>` : ""}
    </div>
    <div class="acts">
      ${e.map ? `<a class="btn" href="${esc(e.map)}" target="_blank" rel="noopener">${ic("map")}مسیریابی روی نقشه</a>` : ""}
      ${t ? `<a class="btn soft" href="${ics(e, t)}" download="party.ics">${ic("add")}افزودن به تقویم</a>` : ""}
    </div>
    <p class="sign">منتظر دیدارتان هستیم</p>
    <button class="again" type="button" id="again">دوباره باز کردن نامه</button>`;
  $("#stage").append(el);
  // gold frame sized in numbers (Safari doesn't take calc() in SVG attributes)
  const fit = () => { const w = el.clientWidth - 20, h = el.clientHeight - 20, f = el.querySelector(".frame");
    f.setAttribute("width", w); f.setAttribute("height", h); f.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const [a, b] = f.querySelectorAll("rect"); a.setAttribute("width", w - 2); a.setAttribute("height", h - 2); b.setAttribute("width", w - 14); b.setAttribute("height", h - 14); };
  fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
  if (t && t > Date.now()) {
    const els = ["d", "h", "m", "s"].map(k => $("#cd-" + k));
    const tick = () => { const s = Math.max(0, Math.floor((t - Date.now()) / 1000)), v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]; els.forEach((x, i) => x.textContent = fa(v[i])); };
    tick(); setInterval(tick, 1000);
  }
  $("#again").onclick = () => location.reload();
  return el;
}
// stroke drawing for any SVG path/rect/circle
function drawable(nodes) { nodes.forEach(n => { const L = n.getTotalLength ? n.getTotalLength() : 600; n.style.strokeDasharray = L; n.style.strokeDashoffset = L; }); return nodes; }

// ---------- opening sequence ----------
let opened = false;
async function open() {
  if (opened) return; opened = true;
  await ready;
  if (!party) { $("#intro").innerHTML = `<p class="empty">این دعوت‌نامه پیدا نشد. لینک را دوباره از میزبان بگیرید.</p>`; return; }
  petalColor = (party.color || "#d66e96").match(/\w\w/g).map(h => Math.min(255, parseInt(h, 16) + 70)).join(",");
  if (!gsap || reduced) { $("#intro").remove(); const l = buildLetter(); l.style.visibility = "visible"; petalRate = reduced ? 0 : 1.5; return; }
  gsap.killTweensOf(["#env", "#seal"]);
  const env = $("#env").getBoundingClientRect(), sx = env.left + env.width / 2, sy = env.top + env.height * .52;
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to("#tap, #for", { opacity: 0, y: -10, duration: .35 })
    .to("#env", { y: 0, rotation: 0, scale: 1.04, duration: .35 }, "<")
    // seal cracks in two and falls away
    .to("#seal", { scale: 1.25, duration: .18, ease: "power2.in" })
    .add(() => burst(sx, sy, 40))
    .to("#seal .l", { x: -46, y: 70, rotation: -50, opacity: 0, duration: .8, ease: "power2.in" })
    .to("#seal .r", { x: 46, y: 70, rotation: 50, opacity: 0, duration: .8, ease: "power2.in" }, "<")
    .to("#seal b", { scale: 0, opacity: 0, duration: .3 }, "<")
    // flap opens in 3D; once past edge-on it shows its inside and goes behind the card
    .to("#flap", { rotationX: 180, duration: .9, ease: "power2.inOut", onUpdate() { const p = this.progress(); $("#flap").classList.toggle("inside", p > .5); $("#flap").style.zIndex = p > .5 ? 0 : 3; } }, "-=.55")
    // card rises out of the envelope
    .to("#envCard", { yPercent: -62, duration: .85, ease: "power2.out" }, "-=.15")
    .add(() => { burst(sx, sy - env.height * .5, 110); petalRate = 14; })
    // envelope drops away, the full letter grows from where the card was
    .to("#env", { y: innerHeight * .7, rotation: 6, opacity: 0, duration: .9, ease: "power3.in" }, "+=.25")
    .add(() => { const l = buildLetter(); prepLetter(l, tl); }, "-=.55");
}
function prepLetter(l, tl) {
  const kids = [".mono", ".dear", ".title", ".ribbon", ".msg span", ".count div", ".info > div", ".acts > *", ".sign", ".again"].flatMap(s => [...l.querySelectorAll(s)]);
  const strokes = drawable([...l.querySelectorAll(".frame rect, .corner path, .mono circle, .divider path")]);
  gsap.set(l, { visibility: "visible", opacity: 0, scale: .6, y: 140, rotationX: 28, transformPerspective: 900 });
  gsap.set(kids, { opacity: 0, y: 16 });
  const t2 = gsap.timeline({ onComplete: () => { $("#intro")?.remove(); petalRate = 2.2; } });
  // from here the petals fall behind the letter, so the text stays readable
  t2.add(() => { $("#fx").style.zIndex = 1; })
    .to(l, { opacity: 1, scale: 1, y: 0, rotationX: 0, duration: 1.2, ease: "expo.out" })
    .to(strokes, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", stagger: .05 }, "-=.7")
    .to(".mono", { opacity: 1, y: 0, scale: 1, duration: .7, ease: "back.out(2)" }, "-=1.4")
    .to(".dear", { opacity: 1, y: 0, duration: .5 }, "-=1.1")
    .fromTo(".title", { opacity: 0, y: 20, scale: .92, letterSpacing: "0.06em" }, { opacity: 1, y: 0, scale: 1, letterSpacing: "0em", duration: 1, ease: "power3.out" }, "-=.9")
    .to(".ribbon", { opacity: 1, y: 0, duration: .5, ease: "back.out(2)" }, "-=.5")
    .to(".msg span", { opacity: 1, y: 0, duration: .55, stagger: .12 }, "-=.2")
    .fromTo(".count div", { opacity: 0, rotationX: -90, y: 0 }, { opacity: 1, rotationX: 0, duration: .7, stagger: .1, ease: "back.out(1.6)" }, "-=.3")
    .to(".info > div", { opacity: 1, y: 0, duration: .5, stagger: .1 }, "-=.3")
    .fromTo(".acts > *", { opacity: 0, scale: .85, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .55, stagger: .1, ease: "back.out(2)" }, "-=.2")
    .to(".sign, .again", { opacity: 1, y: 0, duration: .6, stagger: .15 }, "-=.2");
  gsap.to(".title, .mono b", { backgroundPosition: "-120% 0", duration: 3.5, ease: "none", repeat: -1, delay: 2 });
  tl.add(t2);
}
$("#env").addEventListener("click", open);
$("#env").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
if (reduced) open();
