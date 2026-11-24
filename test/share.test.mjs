import { test } from "node:test";
import assert from "node:assert/strict";
import { computeShares } from "../web/share.js";

const guests = [
  { id: 1, name: "الف", adults: 2, kids: 2, status: "yes" },
  { id: 2, name: "ب", adults: 1, kids: 0, status: "yes" },
  { id: 3, name: "ج", adults: 2, kids: 0, status: "maybe" },
  { id: 4, name: "د", adults: 3, kids: 0, status: "no" },
];
const items = [
  { id: 10, title: "کیک", food: 1, amount: 20, unit: "برش" },
  { id: 11, title: "میوه", food: 1, amount: 6, unit: "کیلو" },
  { id: 12, title: "بادکنک", food: 0, amount: 100, unit: "عدد" },
];

test("whole pieces add up exactly; «نمی‌آید» and non-food are left out", () => {
  const r = computeShares(guests, items, { kidShare: 1, shareMaybe: 1, hosts: 3 });
  assert.equal(r.totalWeight, 4 + 1 + 2 + 3);
  assert.equal(r.items.length, 2);
  const cake = r.items[0];
  assert.equal(Object.values(cake.shares).reduce((a, b) => a + b, 0), 20, "all 20 slices handed out");
  assert.equal(cake.shares[1], 8); assert.equal(cake.shares.host, 6); assert.ok(!(4 in cake.shares));
  assert.equal(r.items[1].shares[2], 0.6); assert.equal(r.items[1].perPerson, 0.6);
});

test("half share for children, maybe not counted", () => {
  const r = computeShares(guests, items, { kidShare: 0.5, shareMaybe: 0, hosts: 0 });
  assert.equal(r.totalWeight, 3 + 1);
  assert.equal(r.items[0].shares[1], 15); assert.equal(r.items[0].shares[2], 5); assert.ok(!(3 in r.items[0].shares));
});

test("nobody coming yet → no shares, no crash", () => {
  const r = computeShares([], items, { kidShare: 1, shareMaybe: 1, hosts: 0 });
  assert.equal(r.totalWeight, 0); assert.deepEqual(r.items[0].shares, {});
});
