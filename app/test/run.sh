#!/usr/bin/env bash
# Runs every JC Planner test suite from the app/ folder.
#   ./test/run.sh          → all suites
#   ./test/run.sh quick    → engines only (correctness + fuzz), no jsdom
set -u
cd "$(dirname "$0")/.."
printf '{"type":"module"}' > package.json
trap 'rm -f package.json' EXIT
status=0
run() { echo; echo "== $1 =="; node "test/$2" 2>&1 | tail -${3:-8} || status=1; }
run "CORRECTNESS (golden values, identities)" correctness.mjs 12
run "FUZZ (random + dirty inputs)" fuzz.mjs 8
if [ "${1:-all}" != "quick" ]; then
  if ! npm ls jsdom >/dev/null 2>&1; then npm i jsdom --no-save --silent >/dev/null 2>&1; fi
  run "HARNESS (68 scenarios × 64 views)" harness.mjs 8
  run "INTERACTION (boot, navigation, input fuzz, store)" interaction.mjs 6
  run "SYNC (two-device cloud sync)" synctest.mjs 3
fi
exit $status
