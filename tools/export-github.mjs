// Turns the local SQLite data into the JSON file the GitHub version reads (data/party.json on the `data` branch).
// Usage: node --experimental-sqlite tools/export-github.mjs <db> <out.json> <admin password>
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import crypto from "node:crypto";

const [db, out, pass] = process.argv.slice(2);
const d = new DatabaseSync(db, { readOnly: true });
const salt = crypto.randomBytes(16).toString("hex");
const hash = `pbkdf2$150000$${salt}$${crypto.pbkdf2Sync(pass, Buffer.from(salt, "hex"), 150000, 32, "sha256").toString("hex")}`;
const rows = t => d.prepare(`SELECT * FROM ${t}`).all();
const max = t => Math.max(0, ...rows(t).map(r => r.id));
const users = rows("users").map(u => ({ id: u.id, username: u.username, name: u.name, pass: hash, created: u.created }));
// local photos stay on the Mac; add the cover again in the app
const events = rows("events").map(e => ({ ...e, cover: "" }));
const doc = {
  v: 1, seq: { users: max("users"), events: max("events"), guests: max("guests"), tasks: max("tasks"), items: max("items") },
  users, events, guests: rows("guests"), tasks: rows("tasks"), items: rows("items"), devices: [], push: {}, log: [],
  updated: new Date().toISOString().replace("T", " ").slice(0, 19),
};
fs.writeFileSync(out, JSON.stringify(doc));
console.log(`users ${users.length}, events ${events.length}, guests ${doc.guests.length}, tasks ${doc.tasks.length}, items ${doc.items.length}`);
