#!/usr/bin/env bash
# P4 AI Provider Spike validation — run from repo root: ./scripts/validate-p4.sh [--tier docs|full]
set -euo pipefail

TIER="full"
if [[ "${1:-}" == "--tier" ]]; then
  TIER="${2:-full}"
  shift 2
elif [[ "${1:-}" == "--docs-only" ]]; then
  TIER="docs"
  shift
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=validate-lib.sh
source "$SCRIPT_DIR/validate-lib.sh"

EXPECTED_BRANCH="phase/4-ai-provider-spike"
SPEC_DIR="specs/20260520-phase4-ai-provider-spike"
BASE_BRANCH="${VALIDATE_BASE_BRANCH:-master}"

echo "=== Productizer P4 validation (tier: $TIER) ==="
echo "Repo: $REPO_ROOT"
echo ""

echo "## Git & branch"
require_cmd git
assert_branch "$EXPECTED_BRANCH"
assert_no_secrets_in_diff "$BASE_BRANCH"
if git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  if git merge-base --is-ancestor "$BASE_BRANCH" HEAD 2>/dev/null; then
    pass "branch includes commits from $BASE_BRANCH"
  else
    fail "branch may not be based on $BASE_BRANCH (rebase onto latest)"
  fi
fi

echo ""
echo "## Phase spec files"
for f in index.html requirements.html plan.html validation.html; do
  assert_file_exists "$SPEC_DIR/$f"
done

echo ""
echo "## Infra"
assert_file_exists "docker-compose.yml"
assert_file_exists ".env.example"
assert_not_tracked ".env.local"
assert_not_tracked "storage"

if [[ "$TIER" == "docs" ]]; then
  echo ""
  echo "## Docker (docs tier)"
  assert_docker_postgres_healthy || true
  if grep -q '"db:studio"' package.json 2>/dev/null; then
    pass "package.json has db:studio script"
  else
    fail "package.json missing db:studio script"
  fi
  if [[ -f ".cursor/skills/productizer-p4-ai-provider-spike/SKILL.md" ]]; then
    pass "P4 implementation skill present"
  else
    fail "missing .cursor/skills/productizer-p4-ai-provider-spike/SKILL.md"
  fi
  if grep -q "@tanstack/ai" package.json 2>/dev/null; then
    pass "package.json includes @tanstack/ai"
  else
    fail "package.json missing @tanstack/ai"
  fi
  print_summary
fi

echo ""
echo "## Toolchain"
require_cmd node
NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" == "22" ]]; then
  pass "node major version 22 ($(node -v))"
else
  fail "node major version is $NODE_MAJOR (expected 22; got $(node -v))"
fi
require_cmd pnpm

echo ""
echo "## P4 source layout (full tier)"
P4_FILES=(
  "src/lib/ai/types.ts"
  "src/lib/ai/registry.ts"
  "src/lib/ai/providers/mock.ts"
  "src/lib/ai/providers/nanobanana.ts"
  "src/lib/ai/generate-variations.ts"
  "src/lib/schemas/generate-variation.ts"
  "src/app/api/concepts/[id]/variations/generate/route.ts"
  "src/hooks/use-generate-variations.ts"
  "src/components/variations/generate-variations-panel.tsx"
  "e2e/variation-generate.spec.ts"
)
for f in "${P4_FILES[@]}"; do
  assert_file_exists "$f"
done

if grep -q "providers/mock" src/lib/ai/registry.ts 2>/dev/null; then
  pass "registry references mock provider"
else
  fail "registry missing mock provider wiring"
fi

if grep -q "variations/generate" src/app/api/concepts 2>/dev/null || \
   [[ -f "src/app/api/concepts/[id]/variations/generate/route.ts" ]]; then
  pass "generate API route present"
else
  fail "missing variations/generate route"
fi

echo ""
echo "## Environment"
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  pass "created .env.local from .env.example"
else
  pass ".env.local exists"
fi
# Force mock for automated validation (do not require live API key)
if grep -q '^NANOBANANA_API_KEY=$' .env.local 2>/dev/null || ! grep -q '^NANOBANANA_API_KEY=' .env.local 2>/dev/null; then
  pass "NANOBANANA_API_KEY unset for mock provider path"
fi

echo ""
echo "## Docker Postgres"
assert_docker_postgres_healthy

echo ""
echo "## Install & automated gate"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pass "pnpm install"

pnpm db:migrate
pass "pnpm db:migrate"

pnpm lint
pass "pnpm lint"

pnpm test
pass "pnpm test"

pnpm build
pass "pnpm build"

pnpm test:e2e
pass "pnpm test:e2e"

echo ""
echo "## Runtime (curl)"
DEV_PID=""
cleanup_dev() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup_dev EXIT

if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
  pass "dev server already running on :3000"
else
  echo "  → starting pnpm dev in background..."
  AI_PROVIDER=mock pnpm dev >/tmp/productizer-p4-dev.log 2>&1 &
  DEV_PID=$!
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
      pass "dev server ready (pid $DEV_PID)"
      break
    fi
    if [[ $i -eq 60 ]]; then
      fail "dev server did not start in 60s (see /tmp/productizer-p4-dev.log)"
    fi
    sleep 1
  done
fi

curl_http_status "http://localhost:3000/" "200"
curl_json_field "http://localhost:3000/api/health/db" "ok" "true"

UNIQUE_NAME="validate-p4-$(date +%s)"
CREATE_BODY="$(curl -sf -X POST http://localhost:3000/api/concepts \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$UNIQUE_NAME\",\"campaignLabel\":\"validate\"}" 2>/dev/null)" || CREATE_BODY=""
if echo "$CREATE_BODY" | grep -q "\"id\""; then
  pass "POST /api/concepts returned id"
  CONCEPT_ID="$(echo "$CREATE_BODY" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
else
  fail "POST /api/concepts did not return id"
  CONCEPT_ID=""
fi

if [[ -n "$CONCEPT_ID" ]]; then
  STREAM_OUT="$(curl -sf -N -m 120 -X POST "http://localhost:3000/api/concepts/$CONCEPT_ID/variations/generate" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"validate p4 mock generate","count":2}' 2>/dev/null)" || STREAM_OUT=""
  if echo "$STREAM_OUT" | grep -qE 'done|"done"'; then
    pass "POST generate stream includes done event"
  else
    fail "generate stream missing done (output: ${STREAM_OUT:0:200})"
  fi

  LIST_BODY="$(curl -sf "http://localhost:3000/api/concepts/$CONCEPT_ID/variations" 2>/dev/null)" || LIST_BODY=""
  VAR_COUNT="$(echo "$LIST_BODY" | grep -o '"id"' | wc -l | tr -d ' ')"
  if [[ "${VAR_COUNT:-0}" -ge 2 ]]; then
    pass "GET variations lists 2+ items after generate"
  else
    fail "expected 2+ variations after generate (got ${VAR_COUNT:-0})"
  fi

  if echo "$LIST_BODY" | grep -q "validate p4 mock generate"; then
    pass "variations include prompt_snapshot from generate"
  else
    fail "variations missing prompt_snapshot text from generate"
  fi
else
  fail "skipped generate curl (missing concept id)"
fi

echo ""
echo "## UX (Playwright — e2e/variation-generate.spec.ts)"
pass "generate UX delegated to pnpm test:e2e"

print_summary
