// Sample party for trying the app (made-up guests, prices). Adds nothing if a party already exists.
export function seed(db) {
  if (db.prepare("SELECT 1 FROM events").get()) return;
  const d = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
  const id = Number(db.prepare("INSERT INTO events(title,date,time,place,address,color,invite,budget) VALUES(?,?,?,?,?,?,?,?)")
    .run("جشن تولد (نمونه)", d, "۱۷:۰۰", "خانه", "", "#c2416b", "با خوشحالی شما را به جشن تولد دعوت می‌کنیم.", 60000000).lastInsertRowid);
  const g = db.prepare("INSERT INTO guests(event,name,phone,grp,adults,kids,status,by) VALUES(?,?,?,?,?,?,?,?)");
  [["خانوادهٔ نمونه ۱", "فامیل", 2, 2, "yes"], ["خانوادهٔ نمونه ۲", "فامیل", 2, 1, "maybe"], ["دوست نمونه ۱", "دوستان", 1, 0, "yes"],
   ["دوست نمونه ۲", "دوستان", 2, 0, "invited"], ["همکلاسی نمونه", "بچه‌ها", 1, 1, "none"], ["همسایهٔ نمونه", "دوستان", 2, 1, "no"]]
    .forEach(([n, grp, a, k, s]) => g.run(id, n, "", grp, a, k, s, "نمونه"));
  const t = db.prepare("INSERT INTO tasks(event,title,due,who,done,by) VALUES(?,?,?,?,?,?)");
  const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  [["سفارش کیک", day(14), "", 0], ["خرید بادکنک و تزئینات", day(10), "", 0], ["فهرست مهمان‌ها", day(-2), "", 1], ["رزرو عکاس", day(7), "", 0]]
    .forEach(([ti, du, w, dn]) => t.run(id, ti, du, w, dn, "نمونه"));
  const it = db.prepare("INSERT INTO items(event,title,cat,qty,est,actual,bought,by) VALUES(?,?,?,?,?,?,?,?)");
  [["کیک", "خوراکی", "۱ عدد", 8000000, 0, 0], ["میوه", "خوراکی", "", 5000000, 0, 0], ["بادکنک", "تزئینات", "۱۰۰ عدد", 1500000, 1350000, 1],
   ["شمع و کلاه", "تزئینات", "", 800000, 900000, 1], ["هدیهٔ مهمان‌ها", "هدیه", "۲۰ بسته", 6000000, 0, 0]]
    .forEach(([ti, c, q, e, a, b]) => it.run(id, ti, c, q, e, a, b, "نمونه"));
  console.log("demo party added");
}
