// Food shares (owner, 2026-11-24): split each shared food item among the people coming and show each family's share.
// People = adults + children × child share (1 = full, 0.5 = half). Who counts: «می‌آید», plus «شاید» if the party says so,
// plus the hosts' own household. Countable units are split in whole pieces (largest remainder), so the shares add up exactly.
export const UNITS = ["عدد", "برش", "تکه", "لیوان", "بطری", "بسته", "ظرف", "پرس", "کیلو", "گرم", "لیتر"];
const WHOLE = new Set(["عدد", "برش", "تکه", "لیوان", "بطری", "بسته", "ظرف", "پرس"]);
export const isWhole = unit => WHOLE.has(unit);

export function counted(guests, ev) {
  return guests.filter(g => g.status === "yes" || (ev.shareMaybe && g.status === "maybe"));
}
export const weight = (g, ev) => (g.adults || 0) + (g.kids || 0) * (ev.kidShare ?? 1);

// → { groups: [{ id, name, weight }], totalWeight, items: [{ id, title, unit, amount, perPerson, shares: { groupId: amount } }] }
export function computeShares(guests, items, ev) {
  const groups = counted(guests, ev).map(g => ({ id: g.id, name: g.name, people: (g.adults || 0) + (g.kids || 0), weight: weight(g, ev) })).filter(g => g.weight > 0);
  if (ev.hosts > 0) groups.push({ id: "host", name: "خانوادهٔ خودمان", people: ev.hosts, weight: ev.hosts });
  const totalWeight = groups.reduce((a, g) => a + g.weight, 0);
  const food = items.filter(i => i.food && i.amount > 0);
  return {
    groups, totalWeight, people: groups.reduce((a, g) => a + g.people, 0),
    items: food.map(i => {
      const shares = {};
      if (!totalWeight) return { id: i.id, title: i.title, unit: i.unit, amount: i.amount, perPerson: 0, shares };
      if (isWhole(i.unit)) {
        // largest remainder: whole pieces, total stays exact
        const raw = groups.map(g => ({ g, x: i.amount * g.weight / totalWeight }));
        let left = Math.round(i.amount) - raw.reduce((a, r) => a + Math.floor(r.x), 0);
        raw.forEach(r => shares[r.g.id] = Math.floor(r.x));
        [...raw].sort((a, b) => (b.x - Math.floor(b.x)) - (a.x - Math.floor(a.x)) || b.g.weight - a.g.weight).forEach(r => { if (left > 0) { shares[r.g.id]++; left--; } });
      } else groups.forEach(g => shares[g.id] = Math.round(i.amount * g.weight / totalWeight * 100) / 100);
      return { id: i.id, title: i.title, unit: i.unit, amount: i.amount, perPerson: Math.round(i.amount / totalWeight * 100) / 100, shares };
    }),
  };
}
