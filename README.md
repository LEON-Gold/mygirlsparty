# Party manager

A panel for several admins (family) to run a party. There are no guest pages.

Each party has:
- guests, with a reply status the admins set themselves;
- to-dos;
- shopping and budget;
- an overview with a countdown.

```
ADMIN_PASS=<password> npm start -- --demo   # --demo adds one sample party
npm test
```

- Open `http://localhost:3500`. The first admin is `admin`; add more under «ادمین‌ها».
- Data and photos are kept in `data/`, which is not in git.
- When an admin edits something, it shows up in the other admins' open pages within about 20 seconds.
