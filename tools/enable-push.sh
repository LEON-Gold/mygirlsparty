#!/bin/sh
# Turns on push notifications for the party app (run once, from party-app/):  sh tools/enable-push.sh
# 1) lets gh push workflow files (GitHub asks you to approve in the browser)
# 2) stores the push keys as repo secrets (the private key never leaves this Mac otherwise)
# 3) puts the notifier workflow on the `data` branch
set -e
cd "$(dirname "$0")/.."
REPO=LEON-Gold/mygirlsparty

echo "1/3  GitHub permission for workflows (a code appears; approve it in the browser)…"
gh auth refresh -h github.com -s workflow

echo "2/3  Saving the push keys as repo secrets…"
node -pe 'require("./.secrets/vapid.json").priv' | gh secret set VAPID_PRIVATE -R "$REPO"
node -pe 'require("./.secrets/vapid.json").pub'  | gh secret set VAPID_PUBLIC  -R "$REPO"

echo "3/3  Adding the notifier to the data branch…"
git -c http.version=HTTP/1.1 fetch -q origin data
TMP="$(mktemp -d)/data"
git worktree add -q --detach "$TMP" origin/data
mkdir -p "$TMP/.github/workflows"
cp tools/github/notify.yml "$TMP/.github/workflows/notify.yml"
cp tools/github/notify.mjs "$TMP/.github/notify.mjs"
git -C "$TMP" add .github
git -C "$TMP" commit -q -m "Notify admins after each change" || true
git -C "$TMP" -c http.version=HTTP/1.1 push -q origin HEAD:data
git worktree remove --force "$TMP"

echo "Done. The next change in the app sends a notification to the other admins' devices."
