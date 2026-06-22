#!/usr/bin/env bash
# Push the site to GitHub and deploy it to DigitalOcean App Platform (static site).
# Idempotent: first run creates the repo + app; later runs push + redeploy.
set -euo pipefail

REPO="Gerahammer/realpalestine"          # GitHub owner/name
APP_NAME="realpalestine"                   # DO App Platform app name
BRANCH="main"
cd "$(dirname "$0")"

say(){ printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

command -v doctl >/dev/null || die "doctl not found. Install it and run 'doctl auth init'."
command -v gh    >/dev/null || die "gh (GitHub CLI) not found."
gh auth status >/dev/null 2>&1 || die "GitHub not authenticated. Run 'gh auth login' first."
doctl account get >/dev/null 2>&1 || die "doctl not authenticated. Run 'doctl auth init'."

# --- Git ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q
git add -A
git commit -q -m "Deploy realpalestine.com" 2>/dev/null || say "Nothing new to commit."
git branch -M "$BRANCH"

if gh repo view "$REPO" >/dev/null 2>&1; then
  say "Repo $REPO exists."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
  git push -u origin "$BRANCH"
else
  say "Creating public repo $REPO and pushing…"
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

# --- DigitalOcean App Platform ---
APP_ID="$(doctl apps list --format ID,Spec.Name --no-header | awk -v n="$APP_NAME" '$2==n{print $1}')"
if [ -n "${APP_ID:-}" ]; then
  say "Updating existing app ($APP_ID)…"
  doctl apps update "$APP_ID" --spec .do/app.yaml >/dev/null
  doctl apps create-deployment "$APP_ID" >/dev/null
else
  say "Creating App Platform app…"
  APP_ID="$(doctl apps create --spec .do/app.yaml --format ID --no-header)"
fi

say "App ID: $APP_ID"
say "Building… (this takes a couple of minutes)"
URL="$(doctl apps get "$APP_ID" --format DefaultIngress --no-header)"
say "Live URL: ${URL:-pending — check 'doctl apps get $APP_ID'}"
