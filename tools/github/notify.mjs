// Runs in GitHub Actions after every save to the `data` branch: finds what changed since the previous commit
// (the log entries the app writes) and sends a Web Push to every other device that turned notifications on.
import fs from "node:fs";
import { execSync } from "node:child_process";
import webpush from "web-push";

const FILE = "data/party.json";
const now = JSON.parse(fs.readFileSync(FILE, "utf8"));
let before = { log: [] };
try { before = JSON.parse(execSync(`git show HEAD~1:${FILE}`, { encoding: "utf8", maxBuffer: 20e6 })); } catch {}
const seen = new Set((before.log || []).map(l => l.at + l.device));
const fresh = (now.log || []).filter(l => !seen.has(l.at + l.device));
if (!fresh.length) { console.log("nothing new"); process.exit(0); }

webpush.setVapidDetails("https://leon-gold.github.io/mygirlsparty/", // Apple wants a real URL or mailto here
   process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
const by = fresh[fresh.length - 1].by, from = new Set(fresh.map(l => l.device));
const body = fresh.length === 1 ? fresh[0].text : `${fresh.slice(-3).map(l => l.text).join("، ")}${fresh.length > 3 ? ` و ${fresh.length - 3} تغییر دیگر` : ""}`;
const payload = JSON.stringify({ title: by ? `${by} در اپ جشن` : "اپ جشن", body, tag: "party-" + Date.now() });

let sent = 0, gone = 0;
for (const [device, sub] of Object.entries(now.push || {})) {
  if (from.has(device) || (now.devices || []).find(d => d.id === device)?.revoked) continue; // not to the one who made the change
  try { await webpush.sendNotification(sub, payload, { TTL: 3600 }); sent++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone++; else console.error(device, e.statusCode, e.body); }
}
console.log(`changes ${fresh.length}, sent ${sent}, expired ${gone}`);
