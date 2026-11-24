import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "party-"));
process.env.DATA_DIR = dir; process.env.ADMIN_PASS = "admin-pass";
const { openDb, createApp, ensureAdmin } = await import("../server.mjs");
const { seed } = await import("../tools/demo.mjs");
const db = openDb(path.join(dir, "t.db")); ensureAdmin(db); seed(db);
const srv = http.createServer(createApp(db)).listen(0), base = `http://127.0.0.1:${srv.address().port}`;
const call = async (p, body, tok) => { const r = await fetch(base + p, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json(); return Array.isArray(j) ? Object.assign(j, { status: r.status }) : { status: r.status, ...j }; };
const login = async (u, p) => (await call("/api/login", { u, p })).token;

test("nothing without a login", async () => {
  assert.equal((await call("/api/events")).status, 401);
  assert.equal((await call("/api/login", { u: "admin", p: "nope" })).status, 401);
});

test("several admins share the same parties; the last one can't be removed", async () => {
  const a = await login("admin", "admin-pass");
  const mom = await call("/api/admins", { username: "maman", name: "مامان", password: "123456" }, a);
  const m = await login("maman", "123456");
  const ev = await call("/api/events", { title: "تولد", date: "۱۴۰۵/۱۰/۰۱", budget: "50,000,000" }, m);
  assert.equal(ev.date, "2026-12-22"); assert.equal(ev.budget, 50000000);
  assert.ok((await call("/api/events", null, a)).some(e => e.id === ev.id), "the other admin sees it");
  assert.equal((await call(`/api/admins/${(await call("/api/me", null, a)).user.id}/delete`, {}, a)).status, 400, "not yourself");
  await call(`/api/admins/${mom.id}/delete`, {}, a);
  assert.equal((await call("/api/me", null, m)).status, 401, "removed admin is logged out");
});

test("guests, to-dos and shopping: add, edit, who changed it, delete", async () => {
  const a = await login("admin", "admin-pass");
  const ev = (await call("/api/events", null, a))[0];
  const g = await call(`/api/events/${ev.id}/guests`, { name: "مهمان تازه", adults: 2, kids: "۱", status: "invited" }, a);
  assert.equal(g.kids, 1); assert.equal(g.by, "مدیر");
  const g2 = await call(`/api/events/${ev.id}/guests`, { ...g, status: "yes" }, a);
  assert.equal(g2.status, "yes");
  assert.equal((await call(`/api/events/${ev.id}/guests`, { name: "x", status: "hacked" }, a)).status, "none", "unknown status falls back");
  const t = await call(`/api/events/${ev.id}/tasks`, { title: "کارت دعوت", due: "1405/09/20" }, a);
  assert.equal(t.due, "2026-12-11");
  assert.equal((await call(`/api/events/${ev.id}/tasks`, { title: "x", due: "فردا" }, a)).status, 400);
  const it = await call(`/api/events/${ev.id}/items`, { title: "کیک", est: "8,000,000", actual: "۷٬۵۰۰٬۰۰۰", bought: true }, a);
  assert.equal(it.est, 8000000); assert.equal(it.actual, 7500000); assert.equal(it.bought, 1);
  const full = await call(`/api/events/${ev.id}`, null, a);
  assert.ok(full.guests.some(x => x.id === g.id) && full.tasks.some(x => x.id === t.id) && full.items.some(x => x.id === it.id));
  await call(`/api/guests/${g.id}/delete`, {}, a);
  assert.ok(!(await call(`/api/events/${ev.id}`, null, a)).guests.some(x => x.id === g.id));
  const s1 = (await call(`/api/events/${ev.id}/stamp`, null, a)).updated;
  assert.ok(s1, "stamp exists for live refresh");
});

test("deleting a party removes its lists", async () => {
  const a = await login("admin", "admin-pass");
  const ev = await call("/api/events", { title: "موقت" }, a);
  await call(`/api/events/${ev.id}/guests`, { name: "x" }, a);
  await call(`/api/events/${ev.id}/delete`, {}, a);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM guests WHERE event=?").get(ev.id).n, 0);
});

test.after(() => { srv.close(); fs.rmSync(dir, { recursive: true, force: true }); });
