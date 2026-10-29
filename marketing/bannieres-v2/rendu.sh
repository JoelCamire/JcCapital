#!/usr/bin/env bash
# Rendu des bannières v2 : génère les .html puis les PNG dans img/social/bannieres-v2/.
# Usage (Git Bash) : bash marketing/bannieres-v2/rendu.sh [--guides]
set -e
cd "$(dirname "$0")"
NODE="/c/Program Files/nodejs/node"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
OUT="../../img/social/bannieres-v2"
mkdir -p "$OUT"
"$NODE" gabarit-bannieres-v2.js "$@" > /dev/null
for f in *.html; do
  n="${f%.html}"
  case "$n" in
    facebook-*) S="1640,624" ;;
    linkedin-perso-*) S="1584,396" ;;
    linkedin-*) S="1128,191" ;;
  esac
  "$CHROME" --headless=new --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 \
    --virtual-time-budget=8000 --window-size=$S --screenshot="$(cd "$OUT" && pwd -W)/$n.png" "file:///$(pwd -W)/$f" 2>/dev/null
  echo "$OUT/$n.png"
done
