// App shell offline; data always from the network.
const V = "party-v9", SHELL = ["./", "index.html", "app.css", "app.js", "jalali.js", "share.js", "store.js", "fonts/vazirmatn-4.woff2", "fonts/vazirmatn-5.woff2", "icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/api/")) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
// native push from GitHub Actions: «مامان: کیک خریده شد»
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "جشن", { body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || "party", renotify: true, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => { const w = ws.find(x => "focus" in x); return w ? w.focus() : clients.openWindow(e.notification.data.url || "./"); }));
});
