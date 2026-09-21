#!/usr/bin/env bash
# Runs every JC Planner test suite from the app/ folder.
#   ./test/run.sh          → all classic suites (correctness, fuzz, harness, interaction, sync)
#   ./test/run.sh full     → the classic suites + the 10 000-file mega suite
#   ./test/run.sh quick    → engines only (correctness + fuzz), no jsdom
#   ./test/run.sh mega     → the generative stress suite alone: 10 000 invented files
#                            in 4 parallel shards (MEGA_N / MEGA_SHARDS override), with
#                            per-engine speed budgets enforced
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
if [ "${1:-all}" = "mega" ] || [ "${1:-all}" = "full" ]; then
  if ! npm ls jsdom >/dev/null 2>&1; then npm i jsdom --no-save --silent >/dev/null 2>&1; fi
  N="${MEGA_N:-10000}"; S="${MEGA_SHARDS:-4}"; OUTDIR="$(mktemp -d)"
  echo; echo "== MEGA ($N invented files, $S shards, speed budgets) =="
  pids=()
  for ((i = 0; i < S; i++)); do node test/mega.mjs --n "$N" --shard "$i" --of "$S" --views 60 --budget --quiet --out "$OUTDIR/mega-$i.json" & pids+=($!); done
  for p in "${pids[@]}"; do wait "$p" || status=1; done
  node -e '
    const fs = require("fs"); const dir = process.argv[1]; let files = 0, checks = 0, fails = 0, views = 0; const log = []; const slow = {};
    for (const f of fs.readdirSync(dir)) { const d = JSON.parse(fs.readFileSync(dir + "/" + f)); files += d.files; checks += d.checks; fails += d.fails; views += d.viewRenders; log.push(...d.failLog);
      for (const [k, v] of Object.entries(d.timing)) if (!k.startsWith("view:")) { slow[k] = slow[k] || []; slow[k].push(v.p95); } }
    console.log(`Files: ${files}   Checks: ${checks}   Failures: ${fails}   View renders: ${views}`);
    console.log("p95 by engine (ms, worst shard): " + Object.entries(slow).map(([k, a]) => `${k}=${Math.max(...a)}`).join("  "));
    if (fails) { log.slice(0, 40).forEach(l => console.log("  ✗ " + l)); process.exit(1); } else console.log("✓ ALL INVARIANTS HOLD");
  ' "$OUTDIR" || status=1
  rm -rf "$OUTDIR"
fi
exit $status
